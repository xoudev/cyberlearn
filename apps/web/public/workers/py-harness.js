/* eslint-disable */
/**
 * The Python side of the lesson runner, loaded by py-runner.js with
 * importScripts before the worker is locked down, and read by the tests
 * (apps/web/lib/python/__tests__) against a real Pyodide in Node.
 *
 * Why it exists. User code used to run straight through runPythonAsync, in the
 * interpreter's global namespace:
 *
 *  - Globals survived from one run to the next, and from one exercise of the
 *    page to another. Delete a helper, and code that still called it went on
 *    passing until the page was reloaded: results that looked random.
 *  - A failure printed Pyodide's own frames first ("await CodeRunner(",
 *    "coroutine = eval(self.code, globals, locals)"), and the line numbers
 *    counted the test call appended under the learner's code.
 *
 * Here each run gets a fresh namespace and its own copy of the builtins, the
 * learner's code and the test call are compiled under names of their own,
 * and a failure is reported with the learner's frames only, with the line as
 * they wrote it and a hint in French.
 *
 * Imported modules are shared by design: dropping them from sys.modules after
 * a run is how C extensions and half-imported packages break. A run that
 * rewrites an attribute of a standard module keeps that change until the
 * page is reloaded; the namespace, which is where the stale results came
 * from, does not.
 * Results cross back to JavaScript as JSON strings, so no Python object
 * outlives the call.
 */
self.CL_PY_HARNESS = String.raw`
import ast as _ast
import builtins as _builtins
import contextlib as _contextlib
import inspect as _inspect
import io as _io
import json as _json
import linecache as _linecache
import traceback as _traceback

# Taken now, before any learner code runs: what a run replaces in builtins
# stays in that run, and the harness keeps working whatever it replaced.
_PRISTINE_BUILTINS = dict(_builtins.__dict__)
_dumps = _json.dumps
_str = str

USER_FILE = "<ton code>"
CALL_FILE = "<appel teste>"
MAX_FRAMES = 6
MAX_OUTPUT = 20000

HINTS = {
    "NameError": "Un nom est utilisé sans avoir été défini : faute de frappe, variable créée plus bas, ou guillemets oubliés autour d'un texte ?",
    "UnboundLocalError": "Une variable est lue dans la fonction avant d'y avoir reçu une valeur.",
    "TypeError": "Une opération a reçu une valeur d'un type qu'elle n'accepte pas. Regarde ce que contient chaque variable à cette ligne.",
    "IndexError": "Cette position n'existe pas : dans une liste de n éléments, les positions vont de 0 à n - 1.",
    "KeyError": "Cette clé n'existe pas dans le dictionnaire. dico.get(cle) renvoie None au lieu de lever une erreur.",
    "ValueError": "La valeur a le bon type mais pas un contenu accepté, comme int(\"abc\").",
    "ZeroDivisionError": "Une division par zéro : vérifie le diviseur avant de diviser.",
    "AttributeError": "Cette valeur n'a pas l'attribut ou la méthode demandé : vérifie son type et l'orthographe.",
    "SyntaxError": "Python ne comprend pas cette ligne : parenthèse, deux-points ou guillemet manquant ?",
    "IndentationError": "Le décalage des lignes n'est pas cohérent : un bloc qui suit un « : » se décale de 4 espaces.",
    "TabError": "Tabulations et espaces sont mélangés dans le décalage : garde uniquement des espaces.",
    "RecursionError": "La fonction s'appelle elle-même sans jamais s'arrêter : il manque un cas d'arrêt.",
    "ModuleNotFoundError": "Ce module n'est pas disponible dans l'environnement des leçons.",
    "ImportError": "Ce module n'est pas disponible dans l'environnement des leçons.",
    "AssertionError": "Un assert a échoué : la condition vérifiée est fausse.",
    "StopIteration": "Un next() a été appelé alors qu'il n'y avait plus d'élément.",
    "OverflowError": "Le nombre calculé est trop grand.",
}

FLAGS = _ast.PyCF_ALLOW_TOP_LEVEL_AWAIT


def _remember(filename, source):
    # Tracebacks read source lines through linecache; a pseudo-file has none
    # unless it is registered.
    _linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)


def _collapse(frames):
    # A runaway recursion is a thousand identical frames: say it once.
    out = []
    for f in frames:
        if out and out[-1][0].filename == f.filename and out[-1][0].lineno == f.lineno and out[-1][0].name == f.name:
            out[-1][1] += 1
        else:
            out.append([f, 1])
    return out


def _where(f):
    if f.filename == CALL_FILE:
        return "Dans l'appel testé"
    if f.name == "<module>":
        return f"Ligne {f.lineno}"
    return f"Ligne {f.lineno}, dans {f.name}"


def describe(exc):
    name = type(exc).__name__
    lines = []
    if isinstance(exc, SyntaxError):
        lines.append("Dans l'appel testé" if exc.filename == CALL_FILE else f"Ligne {exc.lineno}")
        if exc.text:
            text = exc.text.rstrip("\n")
            stripped = text.lstrip()
            lines.append("    " + stripped)
            if exc.offset and exc.offset > 0:
                col = max(0, exc.offset - 1 - (len(text) - len(stripped)))
                lines.append("    " + " " * col + "^")
        lines.append(f"{name}: {exc.msg}")
    else:
        frames = [
            f
            for f in _traceback.extract_tb(exc.__traceback__)
            if f.filename in (USER_FILE, CALL_FILE)
        ]
        grouped = _collapse(frames)
        hidden = max(0, len(grouped) - MAX_FRAMES)
        if hidden:
            lines.append(f"({hidden} appels plus anciens masqués)")
        for f, count in grouped[-MAX_FRAMES:]:
            lines.append(_where(f) + (f" (répété {count} fois)" if count > 1 else ""))
            if f.filename == USER_FILE and f.line:
                lines.append("    " + f.line.strip())
        lines.append("".join(_traceback.format_exception_only(type(exc), exc)).strip())
    return {"error": "\n".join(lines), "hint": HINTS.get(name)}


def _capped(text):
    return text if len(text) <= MAX_OUTPUT else text[:MAX_OUTPUT] + "\n[sortie tronquée]"


def _namespace():
    return {"__name__": "__main__", "__builtins__": dict(_PRISTINE_BUILTINS)}


async def _execute(code, ns):
    _remember(USER_FILE, code)
    result = eval(compile(code, USER_FILE, "exec", flags=FLAGS, dont_inherit=True), ns)
    if _inspect.iscoroutine(result):
        await result


async def run_script(code):
    """A playground run: the code, in a namespace of its own."""
    ns = _namespace()
    out = _io.StringIO()
    try:
        with _contextlib.redirect_stdout(out), _contextlib.redirect_stderr(out):
            await _execute(code, ns)
        return _dumps({"ok": True, "output": _capped(out.getvalue())})
    except BaseException as exc:
        return _dumps({"ok": False, "output": _capped(out.getvalue()), **describe(exc)})


async def run_test(code, call):
    """One challenge test: the code, then the call, in a namespace of its own."""
    ns = _namespace()
    out = _io.StringIO()
    try:
        with _contextlib.redirect_stdout(out), _contextlib.redirect_stderr(out):
            await _execute(code, ns)
            _remember(CALL_FILE, call)
            value = eval(compile(call, CALL_FILE, "eval", flags=FLAGS, dont_inherit=True), ns)
            if _inspect.iscoroutine(value):
                value = await value
            actual = _str(value)
        return _dumps({"ok": True, "actual": actual, "output": _capped(out.getvalue())})
    except BaseException as exc:
        return _dumps({"ok": False, "output": _capped(out.getvalue()), **describe(exc)})
`;

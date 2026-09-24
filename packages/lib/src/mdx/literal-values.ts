/**
 * Values between a lesson's braces, never code.
 *
 * A lesson is written by an admin or a teacher and rendered on the server, and
 * MDX turns every `{...}` into JavaScript. The lesson page runs it through
 * next-mdx-remote, which removes imports and exports and refuses a list of
 * dangerous names. The save-time check did neither: it evaluated the author's
 * braces as they were, so an attribute written as a function that throws
 * `process.env` came back to the author as the error message, variables and
 * all.
 *
 * Lessons never needed code there. Every Quiz, challenge and playground in
 * content/ passes values: text, numbers, true or false, lists and objects of
 * those. So this is an allowlist rather than a blocklist: an attribute's braces
 * must hold a value written out in full, and anything else - a name, a call, an
 * operator, a template with `${}` - is refused before a line of it is
 * generated. What cannot run cannot leak.
 *
 * It sits in LESSON_REMARK_PLUGINS, so the page and the check both apply it.
 */

/** Why a piece of MDX was refused, in French, for the person who wrote it. */
export class LessonMdxValueError extends Error {
  override name = "LessonMdxValueError";
}

/** The subset of an ESTree node this file reads. */
interface EsNode {
  type: string;
  [key: string]: unknown;
}

/** The subset of an mdast node this file reads. */
interface MdNode {
  type: string;
  name?: string | null;
  attributes?: unknown[];
  children?: unknown[];
}

/** Names a value may use: they are values themselves, not references. */
const VALUE_NAMES = new Set(["undefined", "NaN", "Infinity"]);

export function remarkLiteralValuesOnly() {
  return (tree: unknown): void => {
    visit(tree);
  };
}

function isNode(value: unknown): value is MdNode {
  return typeof value === "object" && value !== null && typeof (value as MdNode).type === "string";
}

function visit(node: unknown): void {
  if (!isNode(node)) return;

  if (node.children) {
    // Imports and exports are dropped, as next-mdx-remote drops them on the
    // page: a lesson cannot bring in modules, and an `export const` is code
    // run as the module loads.
    node.children = node.children.filter((child) => !isNode(child) || child.type !== "mdxjsEsm");
  }

  if (node.type === "mdxFlowExpression" || node.type === "mdxTextExpression") {
    // remarkStripProseExpressions runs first and removes these. Meeting one
    // means the plugins were reordered, and then it is refused, not run.
    throw new LessonMdxValueError(
      "Des accolades ne sont acceptées que comme valeur d'un attribut de composant.",
    );
  }

  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    checkElement(node);
  }

  for (const child of node.children ?? []) visit(child);
}

function checkElement(element: MdNode): void {
  const name = element.name ?? "";
  // <a.b> reads a property of whatever `a` is; a lesson only uses plain tags.
  if (/[.:]/.test(name)) {
    throw new LessonMdxValueError(`La balise <${name}> n'est pas acceptée dans une leçon.`);
  }

  for (const attribute of element.attributes ?? []) {
    if (!isNode(attribute)) continue;
    if (attribute.type === "mdxJsxExpressionAttribute") {
      throw new LessonMdxValueError(
        `<${name}> : un attribut s'écrit nom={valeur}. Un bloc {...} seul dans la balise n'est pas accepté.`,
      );
    }
    if (attribute.type !== "mdxJsxAttribute") continue;

    // SAFETY: an mdxJsxAttribute has a string name and a value that is a
    // string, null, or an mdxJsxAttributeValueExpression carrying its ESTree.
    const { name: attributeName, value } = attribute as unknown as {
      name: string;
      value: unknown;
    };
    if (typeof value !== "object" || value === null) continue;
    checkAttributeValue(name, attributeName, value as { value?: unknown; data?: unknown });
  }
}

function checkAttributeValue(
  element: string,
  attribute: string,
  value: { value?: unknown; data?: unknown },
): void {
  const where = `<${element}>, attribut « ${attribute} »`;
  // SAFETY: micromark-extension-mdx-expression attaches the parsed program
  // as data.estree; its absence is handled as a refusal just below.
  const program = (value.data as { estree?: EsNode } | undefined)?.estree;
  const body = program?.body;
  const statement = Array.isArray(body) && body.length === 1 ? (body[0] as EsNode) : null;
  if (statement?.type !== "ExpressionStatement") {
    throw new LessonMdxValueError(`${where} : les accolades doivent contenir une valeur.`);
  }

  const problem = problemIn(statement.expression as EsNode);
  if (problem !== null) throw new LessonMdxValueError(`${where} : ${problem}`);
}

/** What makes an expression more than a value, or null when it is one. */
function problemIn(node: EsNode): string | null {
  switch (node.type) {
    case "Literal":
      return null;

    case "TemplateLiteral":
      return (node.expressions as unknown[]).length === 0
        ? null
        : "un texte entre ` ` ne peut pas contenir ${...}. Écris \\${ si c'est du code à montrer.";

    case "ArrayExpression":
      for (const item of node.elements as (EsNode | null)[]) {
        if (item === null) continue;
        const problem = item.type === "SpreadElement" ? spreadProblem() : problemIn(item);
        if (problem !== null) return problem;
      }
      return null;

    case "ObjectExpression":
      for (const property of node.properties as EsNode[]) {
        const problem = propertyProblem(property);
        if (problem !== null) return problem;
      }
      return null;

    case "UnaryExpression": {
      const argument = node.argument as EsNode;
      const signed =
        (node.operator === "-" || node.operator === "+") &&
        argument.type === "Literal" &&
        typeof argument.value === "number";
      return signed ? null : notAValue();
    }

    case "Identifier": {
      const name = String(node.name);
      if (VALUE_NAMES.has(name)) return null;
      if (name === "True" || name === "False" || name === "None") return pythonAdvice(name);
      return `« ${name} » est un nom, pas une valeur. Écris la valeur elle-même, ou "${name}" entre guillemets si c'est du texte.`;
    }

    default:
      return notAValue();
  }
}

function propertyProblem(property: EsNode): string | null {
  if (property.type !== "Property") return spreadProblem();
  if (property.computed === true || property.method === true || property.kind !== "init") {
    return "une clé d'objet s'écrit clé: valeur.";
  }
  if (property.shorthand === true) {
    const key = property.key as EsNode;
    return `« ${String(key.name)} » seul n'est pas une valeur : écris ${String(key.name)}: suivi de sa valeur.`;
  }
  return problemIn(property.value as EsNode);
}

function spreadProblem(): string {
  return "« ... » n'est pas accepté : écris chaque élément.";
}

function notAValue(): string {
  return "entre accolades, seules des valeurs écrites en toutes lettres sont acceptées (texte, nombre, true, false, null, liste [...] ou objet {...}), pas un calcul.";
}

/**
 * The mistake that happened: an author thinking in Python writes `True`, and
 * between braces that is JavaScript, where it does not exist.
 */
function pythonAdvice(name: "True" | "False" | "None"): string {
  const js = name === "None" ? "null" : name.toLowerCase();
  return (
    `« ${name} » n'existe pas ici : entre accolades, c'est du JavaScript. ` +
    `Écris ${js}, ou "${name}" entre guillemets si c'est le texte que Python doit afficher.`
  );
}

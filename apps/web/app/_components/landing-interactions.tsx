"use client";

// Client boundary: the demo dialog and the three preview exercises keep local interaction state.
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Play, RotateCcw } from "lucide-react";
import { z } from "zod";
import { VideoModal } from "@/components/video-modal";

const methodSchema = z.enum(["GET", "POST"]);
const functionSchema = z.enum(["len", "count", "size"]);
type Method = z.infer<typeof methodSchema>;
type PythonFunction = z.infer<typeof functionSchema>;

export function LandingDemo(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="home-button home-button--quiet"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Play size={15} aria-hidden="true" />
        Voir la démo
      </button>
      <VideoModal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        src="/videos/launch.mp4"
        poster="/videos/launch-poster.jpg"
        eyebrow="La démo"
        title="CyberLearn en 30 secondes"
        actions={
          <Link href="/register" className="home-button home-button--primary">
            Créer mon compte gratuit
          </Link>
        }
      />
    </>
  );
}

const EXERCISES = [
  { id: "http", domain: "Réseaux", topic: "HTTP" },
  { id: "faille", domain: "Cybersécurité", topic: "Injection SQL" },
  { id: "python", domain: "Développement", topic: "Python" },
] as const;

// The login function of the lesson « Injection SQL » (content/lessons/cyber-web), flaw on line 3.
const FLAW_CODE = [
  "def connexion(cursor, login, mot_de_passe):",
  "    empreinte = hacher(mot_de_passe)",
  '    requete = "SELECT id FROM users WHERE login = \'" + login + "\' AND hash = ?"',
  "    cursor.execute(requete, (empreinte,))",
  "    return cursor.fetchone() is not None",
];
const FLAW_LINE = 3;
const lineSchema = z.number().int().min(1).max(FLAW_CODE.length);

const PYTHON_ERRORS: Record<Exclude<PythonFunction, "len">, string> = {
  count: "count n'est pas une fonction native. C'est une méthode, comme mots.count(\"root\").",
  size: "size n'existe pas en Python. La longueur d'une chaîne se lit avec une fonction native.",
};

type Verdict = "idle" | "right" | "wrong";

function Feedback({
  verdict,
  title,
  children,
  onNext,
}: {
  verdict: Verdict;
  title?: string;
  children: React.ReactNode;
  onNext: (() => void) | null;
}): React.JSX.Element {
  return (
    <div className="home-ex-feedback" data-verdict={verdict} aria-live="polite" aria-atomic="true">
      <div key={`${verdict}:${title ?? ""}`} className="home-ex-feedback-body">
        <span className="home-ex-mark" aria-hidden="true">
          {verdict === "right" && <Check size={18} />}
          {verdict === "wrong" && <RotateCcw size={16} />}
        </span>
        <div>
          {title !== undefined && <strong>{title}</strong>}
          <p>{children}</p>
          {verdict === "right" && onNext !== null && (
            <button type="button" className="home-ex-next" onClick={onNext}>
              Exercice suivant <ArrowRight size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HttpExercise({
  answer,
  onAnswer,
  onNext,
}: {
  answer: Method | null;
  onAnswer: (method: Method) => void;
  onNext: (() => void) | null;
}): React.JSX.Element {
  const correct = answer === "GET";
  function choose(input: unknown): void {
    const result = methodSchema.safeParse(input);
    if (result.success) onAnswer(result.data);
  }
  return (
    <div className="home-ex">
      <div className="home-ex-brief">
        <h3>Ton navigateur veut lire une page.</h3>
        <p>Quelle méthode HTTP doit-il envoyer ?</p>
      </div>
      <div className="home-ex-work">
        <pre className="home-code" data-solved={correct}>
          <code>
            <span className="home-code-slot">{answer ?? "???"}</span>
            {" /apprendre HTTP/1.1\n"}
            <span className="home-code-key">Host:</span>
            {" cyberlearn.fr\n"}
            <span className="home-code-key">Accept:</span>
            {" text/html"}
          </code>
        </pre>
        <div className="home-ex-choices" role="group" aria-label="Méthode HTTP">
          {methodSchema.options.map((method) => (
            <button
              key={method}
              type="button"
              className="home-choice"
              aria-pressed={answer === method}
              onClick={() => {
                choose(method);
              }}
            >
              {method}
            </button>
          ))}
        </div>
      </div>
      {answer === null ? (
        <Feedback verdict="idle" onNext={null}>
          Choisis une méthode : la requête se complète avec ta réponse.
        </Feedback>
      ) : correct ? (
        <Feedback
          verdict="right"
          title="Oui. GET demande une ressource sans la modifier."
          onNext={onNext}
        >
          Le serveur répond avec la page. La suite de la leçon lit cette réponse, ligne par ligne.
        </Feedback>
      ) : (
        <Feedback
          verdict="wrong"
          title="Pas tout à fait. POST envoie des données au serveur."
          onNext={null}
        >
          Pour lire une page sans rien changer, essaie l&apos;autre méthode.
        </Feedback>
      )}
    </div>
  );
}

function FlawExercise({
  wrongLines,
  found,
  onPick,
  onNext,
}: {
  wrongLines: number[];
  found: boolean;
  onPick: (line: number) => void;
  onNext: (() => void) | null;
}): React.JSX.Element {
  function pick(input: unknown): void {
    const result = lineSchema.safeParse(input);
    if (result.success) onPick(result.data);
  }
  return (
    <div className="home-ex">
      <div className="home-ex-brief">
        <h3>Une requête à moitié paramétrée.</h3>
        <p>Ce code de connexion laisse passer une injection. Clique sur la ligne vulnérable.</p>
      </div>
      <ol className="home-code home-code-lines" aria-label="Code Python">
        {FLAW_CODE.map((text, index) => {
          const line = index + 1;
          const isFlaw = found && line === FLAW_LINE;
          const isWrong = wrongLines.includes(line);
          return (
            <li key={text}>
              <button
                type="button"
                disabled={found}
                data-state={isFlaw ? "flaw" : isWrong ? "wrong" : undefined}
                aria-label={`Ligne ${String(line)} : ${text.trim()}${isWrong ? ", pas celle-ci" : ""}${isFlaw ? ", la ligne vulnérable" : ""}`}
                onClick={() => {
                  pick(line);
                }}
              >
                <span className="home-code-number" aria-hidden="true">
                  {line}
                </span>
                <code>{text}</code>
              </button>
            </li>
          );
        })}
      </ol>
      {found ? (
        <Feedback verdict="right" title="Ligne 3 : une injection SQL." onNext={onNext}>
          Le login est collé dans le texte de la requête. Avec alice&apos; -- comme login, la
          vérification du mot de passe passe en commentaire. Le ? ne protège que l&apos;empreinte.
        </Feedback>
      ) : wrongLines.length === 0 ? (
        <Feedback verdict="idle" onNext={null}>
          Cinq lignes, une seule fautive. Elle vient de la leçon « Injection SQL ».
        </Feedback>
      ) : (
        <Feedback verdict="wrong" title="Pas celle-ci." onNext={null}>
          {wrongLines.length > 1
            ? "Indice : toutes les valeurs de la requête passent-elles par un paramètre ?"
            : "Cherche l'endroit où une valeur venue de l'extérieur rejoint la requête."}
        </Feedback>
      )}
    </div>
  );
}

function PythonExercise({
  answer,
  onAnswer,
  onNext,
}: {
  answer: PythonFunction | null;
  onAnswer: (fn: PythonFunction) => void;
  onNext: (() => void) | null;
}): React.JSX.Element {
  const correct = answer === "len";
  function choose(input: unknown): void {
    const result = functionSchema.safeParse(input);
    if (result.success) onAnswer(result.data);
  }
  return (
    <div className="home-ex">
      <div className="home-ex-brief">
        <h3>Il manque une fonction.</h3>
        <p>Ce script doit afficher les mots de plus de quatre lettres. Complète la ligne 3.</p>
      </div>
      <div className="home-ex-work">
        <pre className="home-code" data-solved={correct}>
          <code>
            {'mots = ["admin", "root", "invite"]\nfor mot in mots:\n    if '}
            <span className="home-code-slot">{answer ?? "___"}</span>
            {"(mot) > 4:\n        print(mot)"}
          </code>
        </pre>
        <div className="home-ex-choices" role="group" aria-label="Fonction manquante">
          {functionSchema.options.map((fn) => (
            <button
              key={fn}
              type="button"
              className="home-choice"
              aria-pressed={answer === fn}
              onClick={() => {
                choose(fn);
              }}
            >
              {fn}
            </button>
          ))}
        </div>
      </div>
      <div
        className="home-output"
        data-verdict={answer === null ? "idle" : correct ? "right" : "wrong"}
      >
        <span className="home-output-label">Sortie</span>
        {answer === null ? (
          <span className="home-output-empty">Rien pour l&apos;instant.</span>
        ) : correct ? (
          <pre key="right">
            <span>admin</span>
            <span>invite</span>
          </pre>
        ) : (
          <pre key={answer}>
            <span>{`NameError: name '${answer}' is not defined`}</span>
          </pre>
        )}
      </div>
      {answer === null ? (
        <Feedback verdict="idle" onNext={null}>
          Choisis une fonction : la sortie du script s&apos;affiche au-dessus.
        </Feedback>
      ) : correct ? (
        <Feedback verdict="right" title="C'est ça : len() renvoie la longueur." onNext={onNext}>
          « root » fait quatre lettres, il reste dehors. Dans une leçon, tu écris le script entier
          et il s&apos;exécute dans ton navigateur.
        </Feedback>
      ) : (
        <Feedback verdict="wrong" title="Le script plante." onNext={null}>
          {PYTHON_ERRORS[answer]}
        </Feedback>
      )}
    </div>
  );
}

export function Playground(): React.JSX.Element {
  const [active, setActive] = useState(0);
  const [method, setMethod] = useState<Method | null>(null);
  const [wrongLines, setWrongLines] = useState<number[]>([]);
  const [flawFound, setFlawFound] = useState(false);
  const [pythonFunction, setPythonFunction] = useState<PythonFunction | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const solved = [method === "GET", flawFound, pythonFunction === "len"];
  const solvedCount = solved.filter(Boolean).length;
  const allSolved = solvedCount === EXERCISES.length;

  function open(index: number): void {
    setActive(index);
    tabs.current[index]?.focus();
  }
  function onTabKey(event: React.KeyboardEvent, index: number): void {
    const last = EXERCISES.length - 1;
    const target =
      event.key === "ArrowRight"
        ? (index + 1) % EXERCISES.length
        : event.key === "ArrowLeft"
          ? (index + last) % EXERCISES.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    open(target);
  }
  const nextUnsolved = solved.findIndex((done, index) => !done && index !== active);
  const onNext =
    nextUnsolved === -1
      ? null
      : (): void => {
          open(nextUnsolved);
        };

  function pickLine(line: number): void {
    if (line === FLAW_LINE) setFlawFound(true);
    else if (!wrongLines.includes(line)) setWrongLines([...wrongLines, line]);
  }

  const current = EXERCISES[active] ?? EXERCISES[0];
  return (
    <section id="essai" className="home-bench" aria-labelledby="bench-title">
      <header className="home-bench-head">
        <h2 id="bench-title">Banc d&apos;essai</h2>
        <p className="home-bench-score">
          <span className="home-bench-segments" aria-hidden="true">
            {EXERCISES.map((exercise, index) => (
              <span key={exercise.id} data-done={solved[index]} />
            ))}
          </span>
          <span aria-live="polite">{solvedCount} sur 3</span>
        </p>
      </header>
      <div className="home-bench-tabs" role="tablist" aria-label="Exercices d'aperçu">
        {EXERCISES.map((exercise, index) => (
          <button
            key={exercise.id}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`bench-tab-${exercise.id}`}
            className="home-bench-tab"
            aria-selected={index === active}
            aria-controls="bench-panel"
            tabIndex={index === active ? 0 : -1}
            onClick={() => {
              setActive(index);
            }}
            onKeyDown={(event) => {
              onTabKey(event, index);
            }}
          >
            <span className="home-bench-tab-index" aria-hidden="true">
              {solved[index] ? <Check size={15} /> : `0${String(index + 1)}`}
            </span>
            <span className="home-bench-tab-text">
              <span>{exercise.domain}</span>
              <span className="home-bench-tab-topic">{exercise.topic}</span>
            </span>
            {solved[index] && <span className="sr-only">, résolu</span>}
          </button>
        ))}
      </div>
      <div
        key={current.id}
        id="bench-panel"
        className="home-bench-panel"
        role="tabpanel"
        aria-labelledby={`bench-tab-${current.id}`}
      >
        {current.id === "http" && (
          <HttpExercise answer={method} onAnswer={setMethod} onNext={onNext} />
        )}
        {current.id === "faille" && (
          <FlawExercise
            wrongLines={wrongLines}
            found={flawFound}
            onPick={pickLine}
            onNext={onNext}
          />
        )}
        {current.id === "python" && (
          <PythonExercise answer={pythonFunction} onAnswer={setPythonFunction} onNext={onNext} />
        )}
      </div>
      {allSolved ? (
        <footer className="home-bench-foot home-bench-foot--done">
          <p>
            <strong>Trois sur trois.</strong> Une leçon enchaîne ce genre d&apos;exercices, et garde
            ta progression.
          </p>
          <Link href="/register" className="home-button home-button--ink">
            Créer mon compte
          </Link>
        </footer>
      ) : (
        <footer className="home-bench-foot">
          <p>Aperçu sans compte : rien n&apos;est enregistré, trompe-toi autant que tu veux.</p>
        </footer>
      )}
    </section>
  );
}

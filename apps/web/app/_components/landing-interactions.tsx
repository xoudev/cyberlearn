"use client";

// Client boundary: the demo dialog and sample quiz keep local interaction state.
import { useState } from "react";
import Link from "next/link";
import { Check, Play, RotateCcw } from "lucide-react";
import { z } from "zod";
import { VideoModal } from "@/components/video-modal";

const methodSchema = z.enum(["GET", "POST"]);

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
            Commencer gratuitement
          </Link>
        }
      />
    </>
  );
}

export function PracticePreview(): React.JSX.Element {
  const [answer, setAnswer] = useState<z.infer<typeof methodSchema> | null>(null);
  const correct = answer === "GET";
  function chooseAnswer(input: unknown): void {
    const result = methodSchema.safeParse(input);
    if (result.success) setAnswer(result.data);
  }
  return (
    <div className="home-practice">
      <div className="home-practice-lesson">
        <div className="home-practice-context">
          <span>Réseaux & systèmes</span>
          <span>Exercice d&apos;aperçu</span>
        </div>
        <h2>
          Parler le langage
          <br /> du web.
        </h2>
        <p>Ton navigateur veut lire une page. Quelle méthode HTTP doit-il utiliser ?</p>
      </div>
      <div className={`home-request${correct ? " home-request--correct" : ""}`}>
        <div className="home-request-label">
          <span>La requête</span>
          <span className="home-mono">HTTP/1.1</span>
        </div>
        <pre>
          <code>
            <span className="home-request-method">{answer ?? "???"}</span>
            {" /apprendre HTTP/1.1\n"}
            <span className="home-code-key">Host:</span>
            {" cyberlearn.fr\n"}
            <span className="home-code-key">Accept:</span>
            {" text/html"}
          </code>
        </pre>
        <div className="home-request-answer">
          <span>La méthode :</span>
          <div>
            {methodSchema.options.map((method) => (
              <button
                key={method}
                type="button"
                className="home-method-choice"
                aria-pressed={answer === method}
                onClick={() => {
                  chooseAnswer(method);
                }}
              >
                {method}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        className={`home-practice-feedback${answer ? " home-practice-feedback--answered" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {answer ? (
          <>
            <span className="home-feedback-mark" aria-hidden="true">
              {correct ? <Check size={19} /> : <RotateCcw size={18} />}
            </span>
            <div>
              <strong>
                {correct
                  ? "Exactement. GET permet de lire une ressource."
                  : "Pas tout à fait. POST sert à envoyer des données."}
              </strong>
              <p>
                {correct
                  ? "Tu viens de faire le premier pas. La suite, c’est comprendre la réponse du serveur."
                  : "Pour demander une page sans la modifier, essaie GET."}
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="home-feedback-placeholder" aria-hidden="true" />
            <p>Essaie. Tu peux te tromper : c&apos;est aussi comme ça qu&apos;on apprend.</p>
          </>
        )}
      </div>
      <p className="home-practice-disclaimer">
        Exemple interactif · aucune progression enregistrée
      </p>
    </div>
  );
}

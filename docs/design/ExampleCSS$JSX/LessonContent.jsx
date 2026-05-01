// LessonContent.jsx — Hero, progress, prose, code, callout
function LessonHero() {
  return (
    <>
      <nav className="breadcrumb">
        <a href="#">Leçons</a>
        <span className="breadcrumb__sep">›</span>
        <a href="#">Cybersécurité</a>
        <span className="breadcrumb__sep">›</span>
        <span className="breadcrumb__current">Introduction aux injections SQL</span>
      </nav>

      <div className="hero__meta">
        <span className="tag tag--cybersec">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1 L8.5 2.5 V5 C8.5 7 7 8.5 5 9 C3 8.5 1.5 7 1.5 5 V2.5 Z" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          Cybersec
        </span>
        <span className="tag tag--intermediate">Intermédiaire</span>
        <span className="tag tag--time">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="3.8" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M5 3 V5 L6.5 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          12 min
        </span>
        <span className="tag tag--xp">100 XP</span>
      </div>

      <h1 className="hero__title">Introduction aux injections SQL</h1>
      <p className="hero__subtitle">
        Comprends comment les attaquants manipulent les requêtes SQL, reconnais
        les patterns vulnérables dans du code réel, et apprends les trois défenses
        qui fonctionnent vraiment — requêtes préparées, validation, et principe du moindre privilège.
      </p>

      <div className="progress">
        <span className="progress__label"><b>3 / 5</b> sections complétées</span>
        <div className="progress__dots">
          <span className="dot is-complete" />
          <span className="dot is-complete" />
          <span className="dot is-complete" />
          <span className="dot is-current" />
          <span className="dot" />
        </div>
      </div>
    </>
  );
}

function CodeBlock() {
  return (
    <div className="codeblock">
      <div className="codeblock__head">
        <span className="codeblock__lang">Python · vulnérable</span>
        <button className="codeblock__copy" type="button">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="3" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M3 3 V2 C3 1.5 3.5 1 4 1 H8 C8.5 1 9 1.5 9 2 V3" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          Copier
        </button>
      </div>
      <div className="codeblock__body">
        <pre>
<span className="tok-cmt"># ⚠ Ne faites JAMAIS ça en production</span>{"\n"}
<span className="tok-kw">def</span> <span className="tok-fn">login</span><span className="tok-punct">(</span><span className="tok-var">username</span><span className="tok-punct">,</span> <span className="tok-var">password</span><span className="tok-punct">):</span>{"\n"}
{"    "}<span className="tok-var">query</span> <span className="tok-punct">=</span> <span className="tok-str">f"SELECT * FROM users WHERE name='</span><span className="tok-punct">{"{"}</span><span className="tok-var">username</span><span className="tok-punct">{"}"}</span><span className="tok-str">' AND pwd='</span><span className="tok-punct">{"{"}</span><span className="tok-var">password</span><span className="tok-punct">{"}"}</span><span className="tok-str">'"</span>{"\n"}
{"    "}<span className="tok-kw">return</span> <span className="tok-var">db</span><span className="tok-punct">.</span><span className="tok-fn">execute</span><span className="tok-punct">(</span><span className="tok-var">query</span><span className="tok-punct">).</span><span className="tok-fn">fetchone</span><span className="tok-punct">()</span>{"\n"}
{"\n"}
<span className="tok-cmt"># Entrée attaquant : username = admin' -- </span>{"\n"}
<span className="tok-cmt"># Requête finale : SELECT * FROM users WHERE name='admin' --' AND pwd='...'</span>{"\n"}
<span className="tok-cmt"># Le `--` commente le reste : authentification contournée.</span>
        </pre>
      </div>
    </div>
  );
}

function Callout() {
  return (
    <aside className="callout">
      <svg className="callout__icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M9 5.5 V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="12.5" r="0.9" fill="currentColor"/>
      </svg>
      <div className="callout__body">
        <strong className="callout__title">Retiens ceci</strong>
        La concaténation de chaînes pour construire du SQL est <b>la</b> cause racine.
        Les requêtes préparées résolvent ~95% des cas — pas parce qu'elles
        “échappent mieux”, mais parce qu'elles séparent <i>données</i> de <i>code</i>.
      </div>
    </aside>
  );
}

function LessonBody() {
  return (
    <article className="prose">
      <h2>Qu'est-ce qu'une injection SQL ?</h2>
      <p>
        Une <b>injection SQL</b> se produit lorsqu'un attaquant insère du code SQL
        dans une requête via un champ d'entrée mal contrôlé. L'application exécute
        alors du code que son auteur n'avait jamais prévu — souvent pour contourner
        l'authentification, extraire des données, ou prendre le contrôle de la base.
      </p>
      <p>
        Le principe est simple : si ton code construit une requête en concaténant
        des entrées utilisateur, tu fais confiance à l'utilisateur pour écrire du SQL correct.
        Mauvaise idée.
      </p>

      <h2>Un exemple concret</h2>
      <p>
        Regarde ce bout de code Python. Repères-tu le problème avant qu'on ne le signale ?
      </p>

      <CodeBlock />
      <Callout />

      <h2>Comment s'en défendre</h2>
      <p>
        La règle d'or : <code>utilise des requêtes préparées</code>. Ton driver base
        de données envoie la structure de la requête et les valeurs <b>séparément</b>.
        Les valeurs ne peuvent plus être interprétées comme du SQL.
      </p>
    </article>
  );
}

function Quiz() {
  return (
    <section className="quiz">
      <div className="quiz__eyebrow">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M4.5 4.5 C4.5 3.5 5.5 3 6 3 C7 3 7.5 3.8 7.5 4.5 C7.5 5.3 6 5.5 6 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="6" cy="8.7" r="0.6" fill="currentColor"/>
        </svg>
        Question 4 — vérifie ta compréhension
      </div>
      <h3 className="quiz__question">
        Parmi ces protections, laquelle bloque <em>structurellement</em> les injections SQL ?
      </h3>
      <div className="quiz__options">
        <label className="q-option">
          <span className="q-option__radio" />
          <span><span className="q-option__letter">A.</span> Échapper les apostrophes avec <code>addslashes()</code></span>
        </label>
        <label className="q-option is-selected">
          <span className="q-option__radio" />
          <span><span className="q-option__letter">B.</span> Filtrer les mots-clés SQL dans les entrées (<code>SELECT</code>, <code>DROP</code>…)</span>
        </label>
        <label className="q-option is-correct">
          <span className="q-option__radio" />
          <span><span className="q-option__letter">C.</span> Utiliser des requêtes préparées avec paramètres liés</span>
        </label>
        <label className="q-option">
          <span className="q-option__radio" />
          <span><span className="q-option__letter">D.</span> Chiffrer la connexion entre l'app et la base</span>
        </label>
      </div>
      <div className="cta-row">
        <button className="btn btn--ghost" type="button">Passer</button>
        <button className="btn btn--primary" type="button">
          Valider la leçon
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </section>
  );
}

window.LessonHero = LessonHero;
window.LessonBody = LessonBody;
window.Quiz = Quiz;

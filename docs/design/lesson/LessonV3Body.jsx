// LessonV3Body.jsx — Prose, code, callout, sandbox, terminal, quiz, section-nav
function LV3Body() {
  return (
    <article className="prose-v2">
      <h2 className="content-heading"><span className="content-heading__n">01.</span>Qu'est-ce qu'une injection SQL&nbsp;?</h2>
      <p>
        Une <b>injection SQL</b> se produit lorsqu'un attaquant insère du code SQL
        dans une requête via un champ d'entrée mal contrôlé. L'application exécute
        alors du code que son auteur n'avait jamais prévu — contourner
        l'authentification, extraire des données, ou prendre le contrôle complet de la base.
      </p>
      <p>
        Le principe est simple : si ton code construit une requête en concaténant
        des entrées utilisateur, tu fais confiance à l'utilisateur pour écrire
        du SQL correct. Mauvaise idée.
      </p>

      <h2 className="content-heading"><span className="content-heading__n">02.</span>Le code vulnérable</h2>
      <p>
        Ce bout de code Python fait partie d'un vrai login. Repères-tu le problème
        avant qu'on ne le signale&nbsp;?
      </p>

      {/* 2 — STATIC CODE BLOCK */}
      <div className="code-term">
        <div className="code-term__head">
          <span className="code-term__file">~/auth/<b>login.py</b></span>
          <span className="code-term__lang">Python · vulnérable</span>
          <button className="code-term__copy" type="button">copier</button>
        </div>
        <div className="code-term__body">
          <div className="code-term__ln"><span className="code-term__num">01</span><span><span className="c"># ⚠ ne fais JAMAIS ça en prod</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">02</span><span><span className="k">def</span> <span className="fn">login</span><span className="p">(</span><span className="v">username</span><span className="p">,</span> <span className="v">password</span><span className="p">):</span></span></div>
          <div className="code-term__ln code-term__ln--hl"><span className="code-term__num">03</span><span>    q <span className="p">=</span> <span className="s">f"SELECT * FROM users WHERE name='</span><span className="p">&#123;</span><span className="inj">username</span><span className="p">&#125;</span><span className="s">' AND pwd='</span><span className="p">&#123;</span><span className="inj">password</span><span className="p">&#125;</span><span className="s">'"</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">04</span><span>    <span className="k">return</span> db<span className="p">.</span><span className="fn">execute</span><span className="p">(</span>q<span className="p">).</span><span className="fn">fetchone</span><span className="p">()</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">05</span><span></span></div>
          <div className="code-term__ln"><span className="code-term__num">06</span><span><span className="c"># payload attaquant : username = admin'-- </span></span></div>
          <div className="code-term__ln"><span className="code-term__num">07</span><span><span className="c"># requête finale : SELECT * FROM users WHERE name='admin' --' AND pwd='...'</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">08</span><span><span className="c"># → `--` commente le reste · auth contournée</span></span></div>
        </div>
      </div>

      {/* 3 — CALLOUT */}
      <div className="callout-v2">
        <div className="callout-v2__icon">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 5.5 V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="12.5" r="0.9" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <span className="callout-v2__title">› Retenir</span>
          <div className="callout-v2__body">
            La concaténation de chaînes pour construire du SQL est <b>la</b> cause racine.
            Les requêtes préparées résolvent 95% des cas — pas parce qu'elles
            échappent mieux, mais parce qu'elles séparent <b>données</b> et <b>code</b>.
          </div>
        </div>
      </div>

      <h2 className="content-heading"><span className="content-heading__n">03.</span>Corrige le bug — sandbox live</h2>
      <p>
        Le code ci-dessous est la version <b>corrigée</b>. Lance-la pour voir le payload
        attaquant échouer silencieusement. Modifie le code puis relance — tout tourne
        dans ton navigateur via Pyodide.
      </p>

      {/* 4 — PYTHON SANDBOX */}
      <LV3Sandbox />

      <h2 className="content-heading"><span className="content-heading__n">04.</span>Reconnais ta cible</h2>
      <p>
        Avant d'attaquer, tu dois savoir <i>quoi</i> attaquer. Utilise le terminal
        ci-dessous pour scanner la machine cible. Tape <code>help</code> pour la
        liste des commandes disponibles.
      </p>

      {/* 5 — LINUX TERMINAL */}
      <LV3Terminal />

      <h2 className="content-heading"><span className="content-heading__n">05.</span>Vérification</h2>
      <p>
        Tu as vu la théorie, le code, et tu as pratiqué. Vérifions que tu as
        retenu l'essentiel.
      </p>

      {/* 6 — QUIZ */}
      <LV3Quiz />

      {/* 7 — SECTION NAV */}
      <div className="sec-nav">
        <button type="button" className="sec-nav__btn sec-nav__btn--ghost">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M11 7 H3 M6 4 L3 7 L6 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Précédent
        </button>
        <div className="sec-nav__current">
          <span className="sec-nav__current-label">Section 04 / 05</span>
          <span className="sec-nav__current-name">Pratique live</span>
        </div>
        <a href="#" className="sec-nav__btn sec-nav__btn--primary">
          Section suivante
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M3 7 H11 M8 4 L11 7 L8 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </article>
  );
}

function LV3Quiz() {
  return (
    <section className="quiz-v2">
      <div className="quiz-v2__head">
        <span className="quiz-v2__eyebrow">› Vérification · Question 4/5</span>
        <span className="quiz-v2__progress"><b>04</b>/05</span>
      </div>
      <h3 className="quiz-v2__q">
        Parmi ces protections, laquelle bloque <em>structurellement</em> les injections SQL&nbsp;?
      </h3>

      <label className="q-opt-v2">
        <span className="q-opt-v2__letter">A</span>
        <span className="q-opt-v2__radio" />
        <span>Échapper les apostrophes avec <code>addslashes()</code></span>
        <span className="q-opt-v2__state">—</span>
      </label>
      <label className="q-opt-v2 is-wrong">
        <span className="q-opt-v2__letter">B</span>
        <span className="q-opt-v2__radio" />
        <span>Filtrer les mots-clés SQL dans les entrées (<code>SELECT</code>, <code>DROP</code>…)</span>
        <span className="q-opt-v2__state">Incorrect</span>
      </label>
      <label className="q-opt-v2 is-correct">
        <span className="q-opt-v2__letter">C</span>
        <span className="q-opt-v2__radio" />
        <span>Utiliser des requêtes préparées avec paramètres liés</span>
        <span className="q-opt-v2__state">Bonne réponse</span>
      </label>
      <label className="q-opt-v2 is-selected">
        <span className="q-opt-v2__letter">D</span>
        <span className="q-opt-v2__radio" />
        <span>Chiffrer la connexion entre l'app et la base</span>
        <span className="q-opt-v2__state">Ton choix</span>
      </label>

      <button className="quiz-v2__submit" type="button">
        Valider →
      </button>
    </section>
  );
}

window.LV3Body = LV3Body;
window.LV3Quiz = LV3Quiz;

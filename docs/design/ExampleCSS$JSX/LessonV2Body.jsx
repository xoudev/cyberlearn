// LessonV2Body.jsx — Prose, code, callout, quiz
function LV2Body() {
  return (
    <article className="prose-v2">
      <h2 className="content-heading"><span className="content-heading__n">01</span>Qu'est-ce qu'une injection SQL ?</h2>
      <p>
        Une <b>injection SQL</b> se produit lorsqu'un attaquant insère du code SQL
        dans une requête via un champ d'entrée mal contrôlé. L'application exécute
        alors du code que son auteur n'avait jamais prévu — contourner
        l'authentification, extraire des données, ou prendre le contrôle complet de la base.
      </p>
      <p>
        Le principe est simple : si ton code construit une requête en concaténant
        des entrées utilisateur, tu fais confiance à l'utilisateur pour écrire du SQL correct.
        Mauvaise idée.
      </p>

      <h2 className="content-heading"><span className="content-heading__n">02</span>Un exemple concret</h2>
      <p>
        Ce bout de code Python fait partie d'un vrai login. Repères-tu le problème avant
        qu'on ne le signale ?
      </p>

      <div className="code-term">
        <div className="code-term__head">
          <span className="code-term__file">~/auth/<b>login.py</b></span>
          <span className="code-term__lang">vulnérable</span>
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

      <div className="callout-v2">
        <div className="callout-v2__icon">
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 5.5 V9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="9" cy="12.5" r="0.9" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <span className="callout-v2__title">Retiens ceci</span>
          <div className="callout-v2__body">
            La concaténation de chaînes pour construire du SQL est <b>la</b> cause racine.
            Les requêtes préparées résolvent 95% des cas — pas parce qu'elles
            échappent mieux, mais parce qu'elles séparent <b>données</b> et <b>code</b>.
          </div>
        </div>
      </div>

      <h2 className="content-heading"><span className="content-heading__n">03</span>Comment s'en défendre</h2>
      <p>
        La règle d'or : <code>utilise des requêtes préparées</code>. Ton driver base
        de données envoie la structure de la requête et les valeurs <b>séparément</b>.
        Les valeurs ne peuvent plus être interprétées comme du SQL — problème résolu à la racine.
      </p>

      <LV2Quiz />
    </article>
  );
}

function LV2Quiz() {
  return (
    <section className="quiz-v2">
      <div className="quiz-v2__head">
        <span className="quiz-v2__eyebrow">› Vérification · Question 4</span>
        <span className="quiz-v2__progress"><b>04</b>/05</span>
      </div>
      <h3 className="quiz-v2__q">
        Parmi ces protections, laquelle bloque <em>structurellement</em> les injections SQL ?
      </h3>

      <label className="q-opt-v2">
        <span className="q-opt-v2__letter">A</span>
        <span className="q-opt-v2__radio" />
        <span>Échapper les apostrophes avec <code>addslashes()</code></span>
        <span className="q-opt-v2__state">—</span>
      </label>
      <label className="q-opt-v2 is-selected">
        <span className="q-opt-v2__letter">B</span>
        <span className="q-opt-v2__radio" />
        <span>Filtrer les mots-clés SQL dans les entrées (<code>SELECT</code>, <code>DROP</code>…)</span>
        <span className="q-opt-v2__state">Ton choix</span>
      </label>
      <label className="q-opt-v2 is-correct">
        <span className="q-opt-v2__letter">C</span>
        <span className="q-opt-v2__radio" />
        <span>Utiliser des requêtes préparées avec paramètres liés</span>
        <span className="q-opt-v2__state">Bonne réponse</span>
      </label>
      <label className="q-opt-v2">
        <span className="q-opt-v2__letter">D</span>
        <span className="q-opt-v2__radio" />
        <span>Chiffrer la connexion entre l'app et la base</span>
        <span className="q-opt-v2__state">—</span>
      </label>

      <button className="quiz-v2__submit" type="button">
        Valider la leçon · +100 XP →
      </button>
    </section>
  );
}

window.LV2Body = LV2Body;

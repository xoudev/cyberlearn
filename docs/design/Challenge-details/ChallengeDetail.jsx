// ChallengeDetail.jsx — Caesar cipher challenge

function ChalCrumb() {
  return (
    <div className="chal-crumb">
      <span className="chal-crumb__seg">~</span>
      <span className="chal-crumb__sep">/</span>
      <span className="chal-crumb__seg">cyberlearn</span>
      <span className="chal-crumb__sep">/</span>
      <span className="chal-crumb__seg">défis</span>
      <span className="chal-crumb__sep">/</span>
      <span className="chal-crumb__cur">cesar-cipher-python</span>
    </div>
  );
}

function ChalHero() {
  return (
    <section className="chal-hero">
      <div>
        <div className="chal-hero__id">SCRIPT-001</div>
        <h1 className="chal-hero__title">Chiffrement de César — <em>Déchiffre&nbsp;en&nbsp;Python</em></h1>
        <div className="chal-hero__tags">
          <span className="angular-tag angular-tag--cybersec">Cybersec</span>
          <span className="angular-tag angular-tag--facile">Facile</span>
          <span className="angular-tag angular-tag--script">Script</span>
        </div>
        <p className="chal-hero__lede">
          Un message intercepté chiffré par décalage. Écris un script Python qui teste
          tous les décalages possibles, repère le bon, et extrait le flag — le tout
          dans la sandbox intégrée. Pas de copier-coller depuis Stack Overflow.
        </p>
      </div>

      <div className="chal-stats">
        <span className="chal-stats__corner chal-stats__corner--tl" />
        <span className="chal-stats__corner chal-stats__corner--tr" />
        <span className="chal-stats__corner chal-stats__corner--bl" />
        <span className="chal-stats__corner chal-stats__corner--br" />
        <div className="chal-stats__head">
          <span className="chal-stats__head-dot">défi · briefing</span>
          <span>id · CTF·001</span>
        </div>
        <div className="chal-stats__body">
          <div className="chal-stats__row">
            <span className="chal-stats__label">XP Récompense</span>
            <span className="chal-stats__value chal-stats__value--xp">+250 XP</span>
          </div>
          <div className="chal-stats__row">
            <span className="chal-stats__label">Limite de temps</span>
            <span className="chal-stats__value">Illimitée</span>
          </div>
          <div className="chal-stats__row">
            <span className="chal-stats__label">Tentatives</span>
            <span className="chal-stats__value">10/10</span>
          </div>
          <div className="chal-stats__row">
            <span className="chal-stats__label">Statut</span>
            <span className="chal-stats__status">Disponible</span>
          </div>
        </div>
        <button className="chal-stats__cta" type="button">Relever le défi →</button>
      </div>
    </section>
  );
}

function ChalSandbox() {
  const [output, setOutput] = React.useState([
    { kind: 'info', text: 'sandbox prête · pyodide v0.24 · 6ms' },
  ]);
  const [flag, setFlag] = React.useState('');

  const run = () => {
    setOutput([
      { kind: 'info', text: 'Exécution du script...' },
      { kind: 'good', text: "Décalage 13 → 'SYNT{caesar_rot13_is_easy}'" },
      { kind: 'good', text: "Décalage 13 → 'FLAG{caesar_rot13_is_easy}'  ✓ format reconnu" },
    ]);
  };

  return (
    <div className="csb">
      <div className="csb__head">
        <span className="csb__title">Python Sandbox</span>
        <span className="csb__badge">Pyodide · WASM</span>
      </div>
      <div className="csb__editor">
        <div className="csb__gutter">
          {Array.from({length: 11}, (_, i) => <div key={i}>{String(i+1).padStart(2,'0')}</div>)}
        </div>
        <div className="csb__code">
          <div><span className="c"># Décode le message intercepté.</span></div>
          <div><span className="v">cipher</span> <span className="p">=</span> <span className="s">"SYNT&#123;pnrfne_ebg13_vf_ernl&#125;"</span></div>
          <div></div>
          <div><span className="k">def</span> <span className="fn">caesar</span><span className="p">(</span><span className="v">text</span><span className="p">,</span> <span className="v">shift</span><span className="p">):</span></div>
          <div>{'    '}<span className="v">out</span> <span className="p">=</span> <span className="s">""</span></div>
          <div>{'    '}<span className="k">for</span> <span className="v">c</span> <span className="k">in</span> <span className="v">text</span><span className="p">:</span></div>
          <div>{'        '}<span className="placeholder"># TODO : applique le décalage sur les lettres</span></div>
          <div>{'    '}<span className="k">return</span> <span className="v">out</span></div>
          <div></div>
          <div><span className="k">for</span> <span className="v">s</span> <span className="k">in</span> <span className="fn">range</span><span className="p">(</span><span className="n">26</span><span className="p">):</span></div>
          <div>{'    '}<span className="fn">print</span><span className="p">(</span><span className="v">s</span><span className="p">,</span> <span className="fn">caesar</span><span className="p">(</span><span className="v">cipher</span><span className="p">,</span> <span className="v">s</span><span className="p">))</span></div>
        </div>
      </div>
      <div className="csb__bar">
        <button type="button" className="csb__run" onClick={run}>Exécuter</button>
        <div className="csb__status">
          <span>Prêt</span>
          <span className="csb__status-meta">solution.py · 11 lignes · python 3.11</span>
        </div>
        <button type="button" className="csb__submit">Soumettre le flag →</button>
      </div>
      <div className="csb__output">
        {output.map((l, i) => (
          <div key={i} className={`csb__output-line ${l.kind === 'good' ? 'is-good' : 'is-info'}`}>
            <span>{l.text}</span>
          </div>
        ))}
      </div>
      <form className="csb__flag" onSubmit={(e) => { e.preventDefault(); }}>
        <span className="csb__flag-label">Flag</span>
        <input
          className="csb__flag-input"
          placeholder="FLAG{...}"
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
        <button type="submit" className="csb__flag-validate">Valider →</button>
      </form>
    </div>
  );
}

function ChalLeft() {
  return (
    <div>
      <h2 className="chal-section-head">
        Instructions
        <span className="meta">5 sections · 250 XP</span>
      </h2>

      <h3 className="chal-h3"><span className="chal-h3__n">01.</span>Contexte</h3>
      <p>
        Une transmission radio interceptée hier soir. Le département du chiffrement
        a confirmé : <b>chiffrement par décalage</b> (César) — l'un des plus anciens
        systèmes connus, et toujours utilisé pour de l'obfuscation paresseuse.
        Tu n'as pas la clé, mais tu sais que l'alphabet ne fait que 26 lettres.
      </p>

      <div className="chal-cipher">
        <span className="chal-cipher__label">Message intercepté</span>
        <div className="chal-cipher__text">SYNT<span className="brace">&#123;</span>pnrfne_ebg13_vf_ernl<span className="brace">&#125;</span></div>
      </div>

      <h3 className="chal-h3"><span className="chal-h3__n">02.</span>Objectif</h3>
      <ul className="chal-bullets">
        <li>Écris une fonction <b>caesar(text, shift)</b> qui décale chaque lettre.</li>
        <li>Teste les <b>26 décalages possibles</b> et trouve celui qui produit du texte lisible.</li>
        <li>Extrais le flag au format <code>FLAG&#123;...&#125;</code> et soumets-le ci-dessous.</li>
        <li>Bonus : ne touche ni aux chiffres ni à la ponctuation.</li>
      </ul>

      <h3 className="chal-h3"><span className="chal-h3__n">03.</span>Algorithme de base</h3>
      <p>
        Référence pédagogique — utilise-la comme point de départ, pas comme solution.
      </p>

      <div className="code-term code-term--ref">
        <div className="code-term__head">
          <span className="code-term__file">~/algo/<b>caesar.py</b></span>
          <span className="code-term__lang code-term__lang--ref">Référence</span>
          <button className="code-term__copy" type="button">copier</button>
        </div>
        <div className="code-term__body">
          <div className="code-term__ln"><span className="code-term__num">01</span><span><span className="c"># Décale c de shift positions dans l'alphabet</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">02</span><span><span className="k">def</span> <span className="fn">shift_char</span><span className="p">(</span><span className="v">c</span><span className="p">,</span> <span className="v">shift</span><span className="p">):</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">03</span><span>    <span className="k">if</span> c<span className="p">.</span><span className="fn">isupper</span><span className="p">():</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">04</span><span>        <span className="k">return</span> <span className="fn">chr</span><span className="p">((</span><span className="fn">ord</span><span className="p">(</span>c<span className="p">) - </span><span className="fn">ord</span><span className="p">(</span><span className="s">'A'</span><span className="p">) + </span>shift<span className="p">) % 26 + </span><span className="fn">ord</span><span className="p">(</span><span className="s">'A'</span><span className="p">))</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">05</span><span>    <span className="k">if</span> c<span className="p">.</span><span className="fn">islower</span><span className="p">():</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">06</span><span>        <span className="k">return</span> <span className="fn">chr</span><span className="p">((</span><span className="fn">ord</span><span className="p">(</span>c<span className="p">) - </span><span className="fn">ord</span><span className="p">(</span><span className="s">'a'</span><span className="p">) + </span>shift<span className="p">) % 26 + </span><span className="fn">ord</span><span className="p">(</span><span className="s">'a'</span><span className="p">))</span></span></div>
          <div className="code-term__ln"><span className="code-term__num">07</span><span>    <span className="k">return</span> c  <span className="c"># laisse les autres caractères inchangés</span></span></div>
        </div>
      </div>

      <h3 className="chal-h3"><span className="chal-h3__n">04.</span>Ta solution</h3>
      <p>
        Édite le code, exécute, vérifie l'output, puis soumets le flag.
      </p>

      <ChalSandbox />
    </div>
  );
}

function ChalRail() {
  return (
    <aside className="chal-rail">
      <section>
        <h2 className="chal-section-head">Hints<span className="meta">3 disponibles</span></h2>
        <div className="hint">
          <span className="hint__num">01</span>
          <div className="hint__body">
            <span className="hint__cta">Révéler l'indice 1</span>
            <span className="hint__cost hint__cost--free">Gratuit</span>
          </div>
          <span className="hint__chev">›</span>
        </div>
        <div className="hint is-revealed">
          <div className="hint__head">
            <span className="label">› Indice 02 · révélé</span>
            <span className="cost">-10 XP</span>
          </div>
          <div className="hint__text">
            ROT13 est un cas particulier de César avec <b>shift = 13</b>. Si tu vois
            beaucoup de consonnes inhabituelles, essaie d'abord ce décalage.
          </div>
        </div>
        <div className="hint">
          <span className="hint__num">03</span>
          <div className="hint__body">
            <span className="hint__cta">Révéler l'indice 3</span>
            <span className="hint__cost hint__cost--xp">-25 XP</span>
          </div>
          <span className="hint__chev">›</span>
        </div>
      </section>

      <section>
        <h2 className="chal-section-head">Statistiques</h2>
        <div className="chal-stat-line">
          <div className="chal-stat-line__row">
            <span className="chal-stat-line__label">Agents résolus</span>
            <span><b>247</b></span>
          </div>
          <div className="chal-stat-line__row">
            <span className="chal-stat-line__label">Taux de réussite</span>
            <span><b>73%</b></span>
          </div>
          <div className="chal-stat-line__row">
            <span className="chal-stat-line__label">Temps médian</span>
            <span><b>12m 04s</b></span>
          </div>
          <div className="chal-stat-line__row">
            <span className="chal-stat-line__label">First blood</span>
            <span><b>sofia.lefranc</b></span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="chal-section-head">Soumissions<span className="meta">3 récentes</span></h2>
        <div className="subm">
          <span className="subm__time">14:32:18</span>
          <span className="subm__flag">FLAG&#123;caesar_••••••••&#125;</span>
          <span className="subm__status subm__status--correct">Correct</span>
        </div>
        <div className="subm">
          <span className="subm__time">14:30:51</span>
          <span className="subm__flag">FLAG&#123;rot13_is_easy&#125;</span>
          <span className="subm__status subm__status--wrong">Incorrect</span>
        </div>
        <div className="subm">
          <span className="subm__time">14:28:09</span>
          <span className="subm__flag">SYNT&#123;pnrfne_ebg13••&#125;</span>
          <span className="subm__status subm__status--wrong">Incorrect</span>
        </div>
      </section>
    </aside>
  );
}

function ChalBottomNav() {
  return (
    <nav className="chal-bottom-nav">
      <a href="#" className="chal-bottom-nav__btn">
        ← Défi précédent
        <span className="meta">XSS injection</span>
      </a>
      <a href="#" className="chal-bottom-nav__btn">
        Défi suivant →
        <span className="meta">Buffer overflow 101</span>
      </a>
    </nav>
  );
}

function ChallengeApp() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <main className="main">
        <div className="chal">
          <ChalCrumb />
          <ChalHero />
          <div className="chal-grid">
            <ChalLeft />
            <ChalRail />
          </div>
          <ChalBottomNav />
        </div>
      </main>
    </div>
  );
}

const chRoot = ReactDOM.createRoot(document.getElementById('root'));
chRoot.render(<ChallengeApp />);

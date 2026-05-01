// LandingPage.jsx — Cyber Learn marketing landing

function Nav() {
  return (
    <nav className="lp-nav">
      <a href="#" className="lp-nav__brand">
        <div className="lp-nav__mark">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" fill="#0AFFD4"/></svg>
        </div>
        <span className="lp-nav__name">cyber<span>learn</span></span>
      </a>
      <div className="lp-nav__actions">
        <a href="#" className="btn">Connexion</a>
        <a href="#" className="btn btn--primary">
          Commencer gratuitement
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
        </a>
      </div>
    </nav>
  );
}

const TERMINAL_LINES = [
  { type: 'cmd', text: <><span className="pr">$</span> <span className="id">cd</span> ~/ctf/web-101 && <span className="id">cat</span> exploit.py</> },
  { type: 'comment', text: <><span className="cm"># Boolean-based blind SQLi — extract admin pwd</span></> },
  { type: 'code', text: <><span className="kw">import</span> <span className="id">requests</span></> },
  { type: 'code', text: <><span className="kw">def</span> <span className="fn">leak</span><span className="op">(</span><span className="id">i</span><span className="op">,</span> <span className="id">c</span><span className="op">):</span></> },
  { type: 'code', text: <>{'    '}<span className="id">payload</span> <span className="op">=</span> <span className="st">f"' OR ASCII(SUBSTR(p,&#123;i&#125;,1))=&#123;c&#125;-- "</span></> },
  { type: 'code', text: <>{'    '}<span className="kw">return</span> <span className="st">"Welcome"</span> <span className="kw">in</span> <span className="id">requests</span><span className="op">.</span><span className="fn">post</span><span className="op">(</span><span className="id">URL</span><span className="op">,</span> <span className="id">payload</span><span className="op">).</span><span className="id">text</span></> },
  { type: 'code', text: <><span className="id">flag</span> <span className="op">=</span> <span className="st">""</span></> },
  { type: 'code', text: <><span className="kw">for</span> <span className="id">i</span> <span className="kw">in</span> <span className="fn">range</span><span className="op">(</span><span className="nm">1</span><span className="op">,</span> <span className="nm">33</span><span className="op">):</span></> },
  { type: 'code', text: <>{'    '}<span className="kw">for</span> <span className="id">c</span> <span className="kw">in</span> <span className="fn">range</span><span className="op">(</span><span className="nm">32</span><span className="op">,</span> <span className="nm">127</span><span className="op">):</span></> },
  { type: 'code', text: <>{'        '}<span className="kw">if</span> <span className="fn">leak</span><span className="op">(</span><span className="id">i</span><span className="op">,</span> <span className="id">c</span><span className="op">):</span> <span className="id">flag</span> <span className="op">+=</span> <span className="fn">chr</span><span className="op">(</span><span className="id">c</span><span className="op">)</span></> },
  { type: 'cmd',  text: <><span className="pr">$</span> <span className="id">python</span> exploit.py</> },
  { type: 'out',  text: <><span className="ok">[+]</span> <span className="id">leaked</span>: <span className="st">CTF&#123;bl1nd_sql_w1ns&#125;</span></> },
];

function Terminal() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    if (count >= TERMINAL_LINES.length) {
      const t = setTimeout(() => setCount(0), 5000);
      return () => clearTimeout(t);
    }
    const delay = TERMINAL_LINES[count].type === 'cmd' ? 600 : 320;
    const t = setTimeout(() => setCount(c => c + 1), delay);
    return () => clearTimeout(t);
  }, [count]);

  return (
    <div className="lp-term">
      <div className="lp-term__bar">
        <div className="lp-term__dots"><span/><span/><span/></div>
        <span className="lp-term__path">~/<b>ctf/web-101</b> · sandbox</span>
        <span className="lp-term__chip">LIVE</span>
      </div>
      <div className="lp-term__body">
        {TERMINAL_LINES.slice(0, count).map((l, i) => (
          <span key={i} className={`lp-term__line ${i === count - 1 && count < TERMINAL_LINES.length ? 'is-typing' : ''}`}>
            {l.text}
          </span>
        ))}
        {count >= TERMINAL_LINES.length && (
          <div className="lp-term__granted">
            ● ACCESS GRANTED
            <span className="pct">+240 XP · 02:14</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="lp-hero">
      <div>
        <div className="lp-hero__eyebrow">
          <span><b>v2.4</b> · Plateforme FR · 100% en ligne</span>
        </div>
        <h1 className="lp-hero__title">
          Maîtrise la <em>cybersécurité</em>, le dev et les réseaux.
        </h1>
        <p className="lp-hero__sub">
          Apprends en piratant, en codant et en cassant des systèmes — dans un sandbox dédié, accompagné·e de mentors et d'une communauté FR.
        </p>
        <div className="lp-hero__ctas">
          <a href="#" className="btn btn--primary btn--lg">
            Commencer gratuitement
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
          </a>
          <a href="#" className="btn btn--lg">Voir les parcours</a>
        </div>
        <div className="lp-hero__trust">
          <span className="dot" />
          <span>+ 12 400 apprenant·es actifs</span>
          <span>·</span>
          <span>4.8 / 5 sur 1 240 avis</span>
        </div>
      </div>
      <Terminal />
    </section>
  );
}

function Strip() {
  return (
    <div className="lp-strip">
      <div className="lp-strip__inner">
        <span className="lp-strip__item"><b>3</b> Domaines</span>
        <span className="lp-strip__sep" />
        <span className="lp-strip__item"><b>142</b> Leçons</span>
        <span className="lp-strip__sep" />
        <span className="lp-strip__item"><b>12</b> Parcours</span>
        <span className="lp-strip__sep" />
        <span className="lp-strip__item">Certifications vérifiables</span>
      </div>
    </div>
  );
}

/* ---- Feature visuals ---- */
function CodeVisual() {
  return (
    <div className="feat-code">
      <div className="ln"><span className="num">01</span><span><span className="cm"># nmap quickscan</span></span></div>
      <div className="ln"><span className="num">02</span><span><span className="kw">def</span> <span className="fn">scan</span>(host):</span></div>
      <div className="ln"><span className="num">03</span><span>{'    '}ports = [<span className="st">22</span>, <span className="st">80</span>, <span className="st">443</span>]</span></div>
      <div className="ln"><span className="num">04</span><span>{'    '}<span className="kw">return</span> probe(host, ports)</span></div>
      <div className="ln"><span className="num">05</span><span>{' '}</span></div>
      <div className="ln"><span className="num">06</span><span><span className="fn">scan</span>(<span className="st">"10.0.0.1"</span>)</span></div>
    </div>
  );
}

function GamVisual() {
  const Hex = ({ kind, glyph }) => (
    <div className={`feat-gam__hex feat-gam__hex--${kind}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{glyph}</svg>
    </div>
  );
  return (
    <div className="feat-gam">
      <div>
        <div className="feat-gam__label" style={{marginBottom: 8}}>
          <span>LVL · 14 → 15</span><span><b>2840</b> / 3500 XP</span>
        </div>
        <div className="feat-gam__row">
          <span className="feat-gam__lvl">14</span>
          <div className="feat-gam__bar"><div className="feat-gam__fill" style={{width: '81%'}} /></div>
        </div>
      </div>
      <div className="feat-gam__hexes">
        <Hex kind="leg" glyph={<path d="M12 3 C12 9 17 11 17 16 C17 19 14.7 21 12 21 C9.3 21 7 19 7 16 C7 11 12 9 12 3 Z"/>} />
        <Hex kind="epi" glyph={<><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></>} />
        <Hex kind="rar" glyph={<path d="M5 9 L7 17 H17 L19 9 L15 12 L12 6 L9 12 Z"/>} />
      </div>
    </div>
  );
}

function CertVisual() {
  // Simple deterministic QR-ish pattern
  const cells = Array.from({ length: 64 }, (_, i) => {
    const x = i % 8, y = Math.floor(i / 8);
    const corner = (x < 3 && y < 3) || (x > 4 && y < 3) || (x < 3 && y > 4);
    const on = corner ? ((x === 0 || x === 2 || x === 7) || (y === 0 || y === 2 || y === 7) || (x === 1 && y === 1) || (x === 6 && y === 1) || (x === 1 && y === 6)) : ((x * 3 + y * 5 + x*y) % 3 === 0);
    return on;
  });
  return (
    <div className="feat-cert">
      <div className="feat-cert__doc">
        <div className="feat-cert__seal">// CYL-CERT · VERIFIED</div>
        <div className="feat-cert__name">Fondamentaux Cybersécurité</div>
        <div className="feat-cert__hash">
          SHA-256<br/>
          7f3a9e2c · 4b1d8f6a<br/>
          5e2b0c9d · 3a4f1e8b
        </div>
      </div>
      <div className="feat-cert__qr">
        {cells.map((on, i) => <span key={i} className={on ? 'on' : ''} />)}
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className="lp-section">
      <div className="lp-section__head">
        <div className="lp-section__eyebrow">02 · LE SYSTÈME</div>
        <h2 className="lp-section__title">Une plateforme pensée pour <em>les hackers en herbe</em>.</h2>
        <p className="lp-section__sub">Pas de slides poussiéreuses. Du code, des labs, et un parcours de progression qui rend la pratique addictive.</p>
      </div>
      <div className="lp-features">
        <div className="lp-feat">
          <div className="lp-feat__visual"><CodeVisual /></div>
          <div className="lp-feat__num">/ 01 · <b>PRATIQUE</b></div>
          <h3 className="lp-feat__title">Leçons interactives</h3>
          <p className="lp-feat__desc">Code dans un éditeur intégré, exécute dans un sandbox isolé, valide étape par étape. Chaque leçon est un mini-CTF.</p>
        </div>
        <div className="lp-feat">
          <div className="lp-feat__visual"><GamVisual /></div>
          <div className="lp-feat__num">/ 02 · <b>PROGRESSION</b></div>
          <h3 className="lp-feat__title">Gamification complète</h3>
          <p className="lp-feat__desc">XP, niveaux, badges hexagonaux, streaks, classement FR. La courbe d'apprentissage devient une courbe de score.</p>
        </div>
        <div className="lp-feat">
          <div className="lp-feat__visual"><CertVisual /></div>
          <div className="lp-feat__num">/ 03 · <b>PREUVE</b></div>
          <h3 className="lp-feat__title">Certifications signées</h3>
          <p className="lp-feat__desc">Chaque parcours validé délivre un certificat signé SHA-256, vérifiable publiquement. Affichable sur LinkedIn.</p>
        </div>
      </div>
    </section>
  );
}

const PathIcon = ({ kind }) => {
  const s = { width: 56, height: 56, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'cyber') return (<svg viewBox="0 0 64 64" {...s}><path d="M32 6 L52 14 V32 C52 44 42 52 32 58 C22 52 12 44 12 32 V14 Z"/><path d="M24 32 L30 38 L42 24"/></svg>);
  if (kind === 'dev')   return (<svg viewBox="0 0 64 64" {...s}><path d="M22 20 L8 32 L22 44"/><path d="M42 20 L56 32 L42 44"/><path d="M36 14 L28 50"/></svg>);
  return (<svg viewBox="0 0 64 64" {...s}><circle cx="32" cy="14" r="4"/><circle cx="14" cy="48" r="4"/><circle cx="50" cy="48" r="4"/><path d="M32 18 L14 44 M32 18 L50 44 M18 48 L46 48"/></svg>);
};

function Paths() {
  const items = [
    { kind: 'cyber', tag: 'CYBERSEC', title: 'Pentester débutant', desc: "Recon, scan, exploit, post-exploitation. Le cycle complet d'un test d'intrusion réaliste.", lvl: 'DÉBUTANT → INTERM.', lessons: 18, xp: '4 200' },
    { kind: 'dev',   tag: 'DEV',      title: 'Sécurité applicative', desc: "OWASP Top 10, auth, sessions, JWT. Apprends à écrire du code qui ne se fait pas pwn.", lvl: 'INTERMÉDIAIRE',    lessons: 14, xp: '3 600' },
    { kind: 'net',   tag: 'RÉSEAU',   title: 'Réseaux & TLS',         desc: "OSI, TCP/IP, captures Wireshark, TLS 1.3. Comprends ce qui circule sur le câble.",         lvl: 'DÉBUTANT',         lessons: 12, xp: '2 800' },
  ];
  return (
    <section className="lp-section" style={{paddingTop: 0}}>
      <div className="lp-section__head">
        <div className="lp-section__eyebrow">03 · LES PARCOURS</div>
        <h2 className="lp-section__title">Choisis ta <em>spécialité</em>.</h2>
        <p className="lp-section__sub">12 parcours structurés. Chacun te mène d'une compétence brute à un certificat vérifiable.</p>
      </div>
      <div className="lp-paths">
        {items.map(p => (
          <a key={p.title} href="#" className={`lp-path lp-path--${p.kind}`}>
            <div className="lp-path__head">
              <span className="lp-path__tag">{p.tag}</span>
              <span className="lp-path__lvl">{p.lvl}</span>
            </div>
            <div className="lp-path__visual"><PathIcon kind={p.kind} /></div>
            <h3 className="lp-path__title">{p.title}</h3>
            <p className="lp-path__desc">{p.desc}</p>
            <div className="lp-path__foot">
              <span><b>{p.lessons}</b> leçons · <b>{p.xp}</b> XP</span>
              <span className="arrow">→</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="lp-cta">
      <div className="lp-cta__grid" />
      <div className="lp-cta__inner">
        <div className="lp-cta__eyebrow">// READY · PLAYER · ONE</div>
        <h2 className="lp-cta__title">Prêt à commencer <em>ta mission</em> ?</h2>
        <a href="#" className="btn btn--primary btn--lg lp-cta__btn">
          Commencer gratuitement
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
        </a>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-foot__inner">
        <div className="lp-foot__brand">
          <div className="lp-nav__mark">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" fill="#0AFFD4"/></svg>
          </div>
          <span className="lp-nav__name">cyber<span>learn</span></span>
        </div>
        <div className="lp-foot__links">
          <a href="#">Parcours</a>
          <a href="#">Tarifs</a>
          <a href="#">Entreprises</a>
          <a href="#">Communauté</a>
          <a href="#">Mentions légales</a>
        </div>
        <span className="lp-foot__copy">© 2024 Cyber Learn</span>
      </div>
    </footer>
  );
}

function App() {
  return (
    <div className="lp">
      <Nav />
      <Hero />
      <Strip />
      <Features />
      <Paths />
      <CTA />
      <Footer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

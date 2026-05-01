// PathDetail.jsx — Cyber Learn learning path detail

const NODES = [
  // MODULE 01 — FONDAMENTAUX
  { module: 1, n: '01', title: 'Anatomie d\'une requête HTTP', diff: 'beg', diffLabel: 'Débutant', xp: 120, dur: '14 min', state: 'unlocked' },
  { module: 1, n: '02', title: 'Méthodes, en-têtes et codes de statut', diff: 'beg', diffLabel: 'Débutant', xp: 140, dur: '16 min', state: 'unlocked' },
  { module: 1, n: '03', title: 'Reconnaissance passive — OSINT de base', diff: 'beg', diffLabel: 'Débutant', xp: 160, dur: '20 min', state: 'locked' },
  { module: 1, n: '04', title: 'Mapper l\'application avec Burp Suite', diff: 'int', diffLabel: 'Intermédiaire', xp: 180, dur: '24 min', state: 'locked' },

  // MODULE 02 — INJECTIONS
  { module: 2, n: '05', title: 'Injection SQL — détection & exploit', diff: 'int', diffLabel: 'Intermédiaire', xp: 240, dur: '28 min', state: 'locked' },
  { module: 2, n: '06', title: 'Blind SQLi — boolean & time-based', diff: 'int', diffLabel: 'Intermédiaire', xp: 280, dur: '34 min', state: 'locked' },
  { module: 2, n: '07', title: 'XSS — stored, reflected, DOM', diff: 'int', diffLabel: 'Intermédiaire', xp: 220, dur: '26 min', state: 'locked' },
  { module: 2, n: '08', title: 'CSRF & SSRF — comprendre la confiance', diff: 'int', diffLabel: 'Intermédiaire', xp: 260, dur: '30 min', state: 'locked' },

  // MODULE 03 — AUTHENTIFICATION & SESSIONS
  { module: 3, n: '09', title: 'Auth JWT — les pièges courants', diff: 'int', diffLabel: 'Intermédiaire', xp: 220, dur: '26 min', state: 'locked' },
  { module: 3, n: '10', title: 'Brute-force, credential stuffing & 2FA', diff: 'int', diffLabel: 'Intermédiaire', xp: 200, dur: '24 min', state: 'locked' },
  { module: 3, n: '11', title: 'OAuth 2.0 — détourner les redirects', diff: 'adv', diffLabel: 'Avancé', xp: 320, dur: '38 min', state: 'locked' },

  // MODULE 04 — CTF FINAL
  { module: 4, n: '12', title: 'Lab final — exfiltrer le drapeau', diff: 'adv', diffLabel: 'Avancé', xp: 480, dur: '90 min', state: 'locked' },
];

const MODULES = {
  1: 'Module 01 · Fondamentaux',
  2: 'Module 02 · Injections',
  3: 'Module 03 · Auth & sessions',
  4: 'Module 04 · CTF Final',
};

function PathBreadcrumb() {
  return (
    <div className="path-crumb">
      <span className="p">$</span>
      <span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span>parcours</span>
      <span className="slash">/</span><span className="current">pentester-web</span>
      <span className="caret" />
    </div>
  );
}

function DiffBars({ level }) {
  const count = level === 'beg' ? 1 : level === 'int' ? 2 : 3;
  return (
    <span className="path-tag__bars">
      {[1,2,3].map(i => <span key={i} className={`path-tag__bar ${i <= count ? 'is-on' : ''}`} />)}
    </span>
  );
}

function Hero() {
  return (
    <section className="path-hero">
      <div>
        <div className="path-hero__tags">
          <span className="path-tag path-tag--cyber">CYBERSEC</span>
          <span className="path-tag path-tag--diff"><DiffBars level="int" /> Intermédiaire</span>
        </div>
        <h1 className="path-title">Pentester Web — de zéro à <em>CTF</em>.</h1>
        <p className="path-desc">
          Apprends à mapper, fuzzer et exploiter une application web réaliste. Du premier scan
          aux exfiltrations finales — 24 missions guidées dans un sandbox isolé.
        </p>
      </div>
      <div className="path-stats">
        <span className="path-stats__corner tl" />
        <span className="path-stats__corner tr" />
        <span className="path-stats__corner bl" />
        <span className="path-stats__corner br" />
        <div className="path-stats__eyebrow">// MISSION.BRIEF</div>
        <div className="path-stats__grid">
          <div className="path-stats__cell">
            <div className="lbl">Missions</div>
            <div className="val">24</div>
          </div>
          <div className="path-stats__cell">
            <div className="lbl">Durée estimée</div>
            <div className="val">~18<span className="unit">h</span></div>
          </div>
          <div className="path-stats__cell path-stats__cell--xp">
            <div className="lbl">XP total</div>
            <div className="val">1 800</div>
          </div>
          <div className="path-stats__cell path-stats__cell--cert">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="8" r="4"/><path d="M7 11.5 L6 17 L10 15 L14 17 L13 11.5"/></svg>
            <span>Certificat<br/>inclus</span>
          </div>
        </div>
        <a href="#" className="path-cta">
          Commencer le parcours
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
        </a>
      </div>
    </section>
  );
}

function Progress() {
  return (
    <div className="path-prog">
      <div className="path-prog__label"><b>0%</b> complété</div>
      <div className="path-prog__bar">
        <div className="path-prog__fill" style={{ width: '0%' }} />
      </div>
      <div className="path-prog__count"><b>0</b> / 24 missions</div>
    </div>
  );
}

function Node({ n }) {
  const Wrapper = n.state === 'unlocked' || n.state === 'completed' ? 'a' : 'div';
  return (
    <article className={`node node--${n.state}`}>
      <span className="node__dot" />
      <Wrapper href="#" className="node__card">
        <div className="node__num">MISSION · <b>{n.n}</b></div>
        {n.state === 'locked' && (
          <span className="node__lock">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7 V5 C5 3.3 6.3 2 8 2 C9.7 2 11 3.3 11 5 V7"/></svg>
          </span>
        )}
        {n.state === 'completed' && (
          <span className="node__check">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 L7 12 L13 4"/></svg>
          </span>
        )}
        <div className="node__main">
          <h3 className="node__title">{n.title}</h3>
          <div className="node__meta">
            <span className={`diff diff--${n.diff}`}>{n.diffLabel}</span>
            <span className="xp">+{n.xp} XP</span>
            <span className="sep">/</span>
            <span>{n.dur}</span>
          </div>
        </div>
        <div className="node__action">
          {n.state === 'unlocked' && 'Accéder'}
          {n.state === 'locked' && 'Complète la mission précédente'}
          {n.state === 'completed' && 'Revoir'}
        </div>
      </Wrapper>
    </article>
  );
}

function Tree() {
  const grouped = [1, 2, 3, 4].map(m => ({ m, items: NODES.filter(n => n.module === m) }));
  return (
    <div className="tree">
      {grouped.map(({ m, items }) => (
        <React.Fragment key={m}>
          <div className="tree__module">
            <span className="tree__module-rule tree__module-rule--left" />
            <span>── {MODULES[m]} ──</span>
            <span className="tree__module-rule" />
          </div>
          <div className="tree__list">
            {items.map(n => <Node key={n.n} n={n} />)}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const SKILLS = [
  'Cartographier une application web inconnue avec des outils pro (Burp, ffuf, gobuster).',
  'Détecter et exploiter les injections SQL classiques, blind boolean et time-based.',
  'Identifier les 3 variantes de XSS et écrire des payloads adaptés au contexte.',
  'Comprendre les pièges JWT (alg:none, secret faible) et durcir une auth.',
  'Détourner un flow OAuth via redirects mal validés.',
  'Mener un CTF web complet, du recon à l\'exfiltration du drapeau.',
];

function Skills() {
  return (
    <div className="aside-block">
      <div className="aside-block__eyebrow">01 · OBJECTIFS</div>
      <h3 className="aside-block__title">Ce que tu vas maîtriser</h3>
      <ul className="skill-list">
        {SKILLS.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}

function CertCard() {
  const cells = Array.from({ length: 64 }, (_, i) => {
    const x = i % 8, y = Math.floor(i / 8);
    const corner = (x < 3 && y < 3) || (x > 4 && y < 3) || (x < 3 && y > 4);
    const on = corner ? ((x === 0 || x === 2 || x === 7) || (y === 0 || y === 2 || y === 7) || (x === 1 && y === 1)) : ((x * 3 + y * 5 + x*y) % 3 === 0);
    return on;
  });
  return (
    <div className="aside-block">
      <div className="aside-block__eyebrow">// CERT · À DÉBLOQUER</div>
      <div className="cert-card">
        <span className="cert-card__corner tl" />
        <span className="cert-card__corner tr" />
        <span className="cert-card__corner bl" />
        <span className="cert-card__corner br" />
        <div>
          <div className="cert-card__eyebrow">CYL · WEB-PENTEST</div>
          <h4 className="cert-card__name">Pentester Web — Niveau Intermédiaire</h4>
          <div className="cert-card__meta">
            Vérifiable publiquement<br/>
            Signé · <b>SHA-256</b>
          </div>
        </div>
        <div className="cert-card__qr">
          {cells.map((on, i) => <span key={i} className={on ? 'on' : ''} />)}
        </div>
      </div>
    </div>
  );
}

function PathBadges() {
  return (
    <div className="aside-block">
      <div className="aside-block__eyebrow">02 · BADGES</div>
      <h3 className="aside-block__title">Badges du parcours</h3>
      <div className="aside-badges">
        <div className="ab-hex ab-hex--leg">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9 L7 17 H17 L19 9 L15 12 L12 6 L9 12 Z"/></svg>
        </div>
        <div className="ab-hex ab-hex--epi">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></svg>
        </div>
        <div className="ab-hex ab-hex--rar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="9" width="12" height="10" rx="1"/><path d="M9 9 V6 C9 4.5 10.3 3 12 3 C13.7 3 15 4.5 15 6 V9"/></svg>
        </div>
        <div className="aside-badges__more">
          <b>12</b>
          badges à<br/>débloquer
        </div>
      </div>
      <a href="#" className="aside-cta">Voir la collection →</a>
    </div>
  );
}

function PathDetail() {
  return (
    <main className="main">
      <div className="path">
        <PathBreadcrumb />
        <Hero />
        <Progress />
        <div className="path-body">
          <Tree />
          <aside className="path-aside">
            <Skills />
            <CertCard />
            <PathBadges />
          </aside>
        </div>
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <PathDetail />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

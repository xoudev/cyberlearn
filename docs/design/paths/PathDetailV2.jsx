// PathDetailV2.jsx — Cyber Learn · Path detail as a checkpoint path (quest log)

// 12 missions. 01–08 completed, 09 active (matches catalog "next mission"), 10–12 locked.
const NODES = [
  { module: 1, n: '01', title: "Anatomie d'une requête HTTP", diff: 'beg', diffLabel: 'Débutant', xp: 120, dur: '14 min', state: 'done' },
  { module: 1, n: '02', title: 'Méthodes, en-têtes & codes de statut', diff: 'beg', diffLabel: 'Débutant', xp: 140, dur: '16 min', state: 'done' },
  { module: 1, n: '03', title: 'Reconnaissance passive — OSINT', diff: 'beg', diffLabel: 'Débutant', xp: 160, dur: '20 min', state: 'done' },
  { module: 1, n: '04', title: "Mapper l'app avec Burp Suite", diff: 'int', diffLabel: 'Intermédiaire', xp: 180, dur: '24 min', state: 'done' },
  { module: 2, n: '05', title: 'Injection SQL — détection & exploit', diff: 'int', diffLabel: 'Intermédiaire', xp: 240, dur: '28 min', state: 'done' },
  { module: 2, n: '06', title: 'Blind SQLi — boolean & time-based', diff: 'int', diffLabel: 'Intermédiaire', xp: 280, dur: '34 min', state: 'done' },
  { module: 2, n: '07', title: 'XSS — stored, reflected, DOM', diff: 'int', diffLabel: 'Intermédiaire', xp: 220, dur: '26 min', state: 'done' },
  { module: 2, n: '08', title: 'CSRF & SSRF — la confiance trahie', diff: 'int', diffLabel: 'Intermédiaire', xp: 260, dur: '30 min', state: 'done' },
  { module: 3, n: '09', title: 'Auth JWT — les pièges courants', diff: 'int', diffLabel: 'Intermédiaire', xp: 220, dur: '26 min', state: 'active' },
  { module: 3, n: '10', title: 'Brute-force, credential stuffing & 2FA', diff: 'int', diffLabel: 'Intermédiaire', xp: 200, dur: '24 min', state: 'locked' },
  { module: 3, n: '11', title: 'OAuth 2.0 — détourner les redirects', diff: 'adv', diffLabel: 'Avancé', xp: 320, dur: '38 min', state: 'locked' },
  { module: 4, n: '12', title: 'Lab final — exfiltrer le drapeau', diff: 'adv', diffLabel: 'Avancé', xp: 480, dur: '90 min', state: 'locked' },
];

const MODULES = {
  1: { name: 'Fondamentaux', count: 4 },
  2: { name: 'Injections', count: 4 },
  3: { name: 'Auth & sessions', count: 3 },
  4: { name: 'CTF Final', count: 1 },
};

const DONE = NODES.filter(n => n.state === 'done').length;
const TOTAL = NODES.length;
const PCT = Math.round((DONE / TOTAL) * 100);

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
);
function Brackets() { return (<><span className="bk tl" /><span className="bk tr" /><span className="bk bl" /><span className="bk br" /></>); }

/* -------------------------------------------------------------------------- */
function Breadcrumb() {
  return (
    <div className="pd2-crumb">
      <span className="p">$</span><span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span>parcours</span>
      <span className="slash">/</span><span className="current">pentester-web</span>
      <span className="caret" />
    </div>
  );
}

function Hero() {
  return (
    <section className="pd2-hero">
      <div>
        <div className="pd2-hero__tags">
          <span className="pd2-tag pd2-tag--cyber"><span className="dom-dot" />CYBERSEC</span>
          <span className="pd2-tag pd2-tag--diff"><span className="diff-bars lv2"><span /><span /><span /></span> Intermédiaire</span>
        </div>
        <h1 className="pd2-title">Pentester Web —<br/>de zéro à <em>CTF</em>.</h1>
        <p className="pd2-desc">
          Apprends à mapper, fuzzer et exploiter une application web réaliste. Du premier scan
          aux exfiltrations finales — dans un sandbox isolé.
        </p>
      </div>
      <div className="brief">
        <Brackets />
        <div className="brief__eyebrow">// MISSION.BRIEF</div>
        <div className="brief__grid">
          <div className="brief__cell"><div className="lbl">Missions</div><div className="val">12</div></div>
          <div className="brief__cell"><div className="lbl">Durée estimée</div><div className="val">~18<span className="unit">h</span></div></div>
          <div className="brief__cell brief__cell--xp"><div className="lbl">XP total</div><div className="val">1 800</div></div>
          <div className="brief__cell brief__cell--cert">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="8" r="4"/><path d="M7 11.5 L6 17 L10 15 L14 17 L13 11.5"/></svg>
            <span>Certificat<br/>inclus</span>
          </div>
        </div>
        <a href="Lesson Detail Page.html" className="brief__cta">Continuer le parcours {ARROW}</a>
      </div>
    </section>
  );
}

function GlobalProgress() {
  return (
    <div className="pd2-prog">
      <div className="pd2-prog__label"><b>{PCT}%</b> complété</div>
      <div className="pd2-prog__bar"><div className="pd2-prog__fill" style={{ width: `${PCT}%` }} /></div>
      <div className="pd2-prog__count"><b>{DONE}</b> / {TOTAL} missions</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- node icons */
function NodeIcon({ state }) {
  if (state === 'done') return (<svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 L7 12 L13 4"/></svg>);
  if (state === 'locked') return (<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7"/></svg>);
  return null;
}

function MissionCard({ node }) {
  const isLink = node.state === 'done';
  const Tag = isLink ? 'a' : 'div';
  return (
    <Tag href={isLink ? 'Lesson Detail Page.html' : undefined} className="cp-card">
      {node.state === 'active' && <Brackets />}
      <span className="cp-card__leader" />
      <div className="cp-card__head">
        <span className="cp-card__mn">MISSION · <b>{node.n}</b></span>
        {node.state === 'done' && <span className="cp-statepill cp-statepill--done">Complété</span>}
        {node.state === 'active' && <span className="cp-statepill cp-statepill--active"><span className="pulse-dot" />En cours</span>}
        {node.state === 'locked' && <span className="cp-statepill cp-statepill--locked">Verrouillé</span>}
      </div>
      <h3 className="cp-card__title">{node.title}</h3>
      <div className="cp-card__meta">
        <span className={`diff diff--${node.diff}`}>{node.diffLabel}</span>
        <span className="xp">+{node.xp} XP</span>
        <span className="sep">·</span>
        <span>{node.dur}</span>
      </div>
      {node.state === 'done' && <div className="cp-card__action">↺ Revoir la mission</div>}
      {node.state === 'active' && <a href="Lesson Detail Page.html" className="cp-card__cta">Accéder {ARROW}</a>}
      {node.state === 'locked' && <div className="cp-card__action">🔒 Complète la mission précédente</div>}
    </Tag>
  );
}

function MissionRow({ node, side, first }) {
  return (
    <div className={`cp-row cp-row--${node.state} ${side} ${first ? 'cp-row--first' : ''}`}>
      {side === 'is-left'
        ? <div className="cp-cell cp-cell--card"><MissionCard node={node} /></div>
        : <div className="cp-cell cp-cell--empty" />}
      <div className="cp-mid">
        <span className="cp-node">
          {node.state === 'active' && <span className="cp-node__ring" />}
          {node.state === 'locked'
            ? <NodeIcon state="locked" />
            : node.state === 'done'
              ? <NodeIcon state="done" />
              : <span className="cp-node__n">{node.n}</span>}
        </span>
      </div>
      {side === 'is-right'
        ? <div className="cp-cell cp-cell--card"><MissionCard node={node} /></div>
        : <div className="cp-cell cp-cell--empty" />}
    </div>
  );
}

function ModuleGate({ mod, name, count, done }) {
  return (
    <div className={`cp-gate ${done ? 'cp-gate--done' : ''}`}>
      <div className="cp-gate__side cp-gate__side--l">
        <span className="cp-gate__rule" />
        <span className="cp-gate__label"><span className="mod">MODULE {mod}</span> <span className="nm">· {name}</span></span>
      </div>
      <div className="cp-mid"><span className="cp-gate__marker" /></div>
      <div className="cp-gate__side">
        <span className="cp-gate__count"><b>{count}</b> missions</span>
        <span className="cp-gate__rule" />
      </div>
    </div>
  );
}

function CheckpointPath() {
  const rows = [];
  let visibleIndex = 0; // for alternating + first-stub
  let firstDone = false;
  [1, 2, 3, 4].forEach(m => {
    const items = NODES.filter(n => n.module === m);
    const gateDone = items[0].state === 'done' || items.some(n => n.state === 'done');
    rows.push(<ModuleGate key={`g${m}`} mod={String(m).padStart(2, '0')} name={MODULES[m].name} count={MODULES[m].count} done={gateDone || items.some(n => n.state === 'active')} />);
    items.forEach(node => {
      const side = visibleIndex % 2 === 0 ? 'is-left' : 'is-right';
      const isFirst = m === 1 && !firstDone;
      firstDone = true;
      rows.push(<MissionRow key={node.n} node={node} side={side} first={false} />);
      visibleIndex++;
    });
  });
  return <div className="cpath">{rows}<FinalNode /></div>;
}

function FinalNode() {
  return (
    <div className="cp-final">
      <div className="cp-cell cp-cell--empty" />
      <div className="cp-mid" />
      <div className="cp-cell cp-cell--empty" />
      <div className="cp-boss">
        <Brackets />
        <span className="cp-boss__connector" />
        <div className="cp-boss__eyebrow">// RÉCOMPENSE FINALE · CERTIFICAT</div>
        <div className="cp-boss__medal">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5"/><path d="M7.5 13 L6 21.5 L12 18.5 L18 21.5 L16.5 13"/></svg>
          <span className="lockmark"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7"/></svg></span>
        </div>
        <h3 className="cp-boss__title">Certificat Pentester Web</h3>
        <p className="cp-boss__sub">Termine les 12 missions pour débloquer un certificat vérifiable, signé SHA-256 et partageable.</p>
        <div className="cp-boss__req">
          <span><b>{DONE}</b> / {TOTAL} missions</span>
          <span className="mini-bar"><i style={{ width: `${PCT}%` }} /></span>
          <span>encore <b>{TOTAL - DONE}</b></span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- aside */
const SKILLS = [
  'Cartographier une app web inconnue avec des outils pro (Burp, ffuf, gobuster).',
  'Détecter et exploiter les injections SQL classiques, blind boolean et time-based.',
  'Identifier les 3 variantes de XSS et écrire des payloads adaptés au contexte.',
  'Comprendre les pièges JWT (alg:none, secret faible) et durcir une auth.',
  'Mener un CTF web complet, du recon à l\'exfiltration du drapeau.',
];

function Skills() {
  return (
    <div className="ablock">
      <div className="ablock__eyebrow">— <b>01</b> · OBJECTIFS</div>
      <h3 className="ablock__title">Ce que tu vas maîtriser</h3>
      <ul className="skill-list">{SKILLS.map((s, i) => <li key={i}>{s}</li>)}</ul>
    </div>
  );
}

const LOCK_SVG = (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.2 7 V5 C5.2 3.4 6.4 2.2 8 2.2 C9.6 2.2 10.8 3.4 10.8 5 V7"/></svg>);

const BADGES = [
  { rarity: 'common', name: 'First Blood', locked: false, glyph: 'drop' },
  { rarity: 'rare', name: 'SQL Slayer', locked: false, glyph: 'db' },
  { rarity: 'rare', name: 'XSS Hunter', locked: true, glyph: 'bug' },
  { rarity: 'epic', name: 'Token Forger', locked: true, glyph: 'key' },
  { rarity: 'epic', name: 'Recon Master', locked: true, glyph: 'radar' },
  { rarity: 'legendary', name: 'Flag Captured', locked: true, glyph: 'flag' },
];

function BadgeGlyph({ glyph }) {
  const s = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (glyph) {
    case 'drop':  return (<svg {...s}><path d="M12 4 C12 4 6 11 6 15 a6 6 0 0 0 12 0 C18 11 12 4 12 4 Z"/></svg>);
    case 'db':    return (<svg {...s}><ellipse cx="12" cy="6" rx="6" ry="2.4"/><path d="M6 6 V12 C6 13.3 8.7 14.4 12 14.4 C15.3 14.4 18 13.3 18 12 V6"/><path d="M6 12 V18 C6 19.3 8.7 20.4 12 20.4 C15.3 20.4 18 19.3 18 18 V12"/></svg>);
    case 'bug':   return (<svg {...s}><rect x="8" y="8" width="8" height="10" rx="4"/><path d="M12 8 V5 M9 6 L7 4 M15 6 L17 4 M8 11 H5 M16 11 H19 M8 15 H5 M16 15 H19"/></svg>);
    case 'key':   return (<svg {...s}><circle cx="8" cy="8" r="4"/><path d="M11 11 L19 19 M16 16 L18 14 M14 14 L16 12"/></svg>);
    case 'radar': return (<svg {...s}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 12 L18 6"/></svg>);
    case 'flag':  return (<svg {...s}><path d="M6 3 V21 M6 4 H17 L14.5 8 L17 12 H6"/></svg>);
    default: return null;
  }
}

function PathBadges() {
  return (
    <div className="ablock">
      <div className="ablock__eyebrow">— <b>02</b> · BADGES</div>
      <h3 className="ablock__title">Badges du parcours</h3>
      <div className="badge-grid">
        {BADGES.map((b, i) => (
          <div key={i} className={`badge badge--${b.rarity} ${b.locked ? 'is-locked' : ''}`}>
            <span className="badge__hex">
              <span className="facet" />
              <BadgeGlyph glyph={b.glyph} />
              {b.locked && <span className="badge__lock">{LOCK_SVG}</span>}
            </span>
            <span className="badge__name">{b.name}</span>
          </div>
        ))}
      </div>
      <div className="badge-legend">
        <span><i className="bz-common" />Common</span>
        <span><i className="bz-rare" />Rare</span>
        <span><i className="bz-epic" />Epic</span>
        <span><i className="bz-legendary" />Legendary</span>
      </div>
      <a href="Badges Collection.html" className="aside-cta">Voir la collection →</a>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function PathDetail() {
  return (
    <main className="main">
      <div className="pd2">
        <Breadcrumb />
        <Hero />
        <GlobalProgress />
        <div className="pd2-body">
          <CheckpointPath />
          <aside className="pd2-aside">
            <Skills />
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

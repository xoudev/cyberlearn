// BadgesCollection.jsx — full badge collection page

const BADGES = [
  // ---------- LEGENDARY (3 total: 1 earned, 2 locked) ----------
  { id: 'LGD-001', tier: 'legendary', tierLabel: 'Légendaire', name: 'First Blood', desc: "Premier·e à valider une leçon avancée le jour de sa sortie. Réflexe de pro.", glyph: 'drop', earned: true, date: '14/03/2026' },
  { id: 'LGD-002', tier: 'legendary', tierLabel: 'Légendaire', name: 'Zero Day Hunter', desc: "Trouve une vulnérabilité réelle dans un challenge sandbox et soumets-la.", glyph: 'skull', earned: false, prog: { done: 0, total: 1, label: 'soumission validée' } },
  { id: 'LGD-003', tier: 'legendary', tierLabel: 'Légendaire', name: 'Path Master', desc: "Termine un parcours complet avec un score moyen ≥ 95/100.", glyph: 'crown', earned: false, prog: { done: 12, total: 18, label: 'leçons du parcours' } },

  // ---------- EPIC (4 total: 2 earned, 2 locked) ----------
  { id: 'EPI-001', tier: 'epic', tierLabel: 'Épique', name: 'Streak 7 jours', desc: "Apprends 7 jours d'affilée sans rompre la chaîne.", glyph: 'flame', earned: true, date: "29/04/2026" },
  { id: 'EPI-002', tier: 'epic', tierLabel: 'Épique', name: 'Recon Master', desc: "Termine 5 leçons de la catégorie Réseau avec ≥ 90 %.", glyph: 'radar', earned: true, date: '20/04/2026' },
  { id: 'EPI-003', tier: 'epic', tierLabel: 'Épique', name: 'Streak 30 jours', desc: "Garde ta streak intacte pendant un mois entier.", glyph: 'flame', earned: false, prog: { done: 7, total: 30, label: 'jours consécutifs' } },
  { id: 'EPI-004', tier: 'epic', tierLabel: 'Épique', name: 'Speed Runner', desc: "Termine 10 leçons en moins de la durée estimée.", glyph: 'bolt', earned: false, prog: { done: 4, total: 10, label: 'leçons rapides' } },

  // ---------- RARE (4 total: 2 earned, 2 locked) ----------
  { id: 'RAR-001', tier: 'rare', tierLabel: 'Rare', name: 'SQL Survivor', desc: "Survit à la leçon Injection SQL au premier essai.", glyph: 'db', earned: true, date: '24/04/2026' },
  { id: 'RAR-002', tier: 'rare', tierLabel: 'Rare', name: 'XSS Hunter', desc: "Identifie correctement les 3 variantes de XSS dans le quiz final.", glyph: 'bug', earned: true, date: '11/04/2026' },
  { id: 'RAR-003', tier: 'rare', tierLabel: 'Rare', name: 'Pwn the Stack', desc: "Réussis l'exploit buffer overflow x86 sans regarder la solution.", glyph: 'stack', earned: false, prog: { done: 3, total: 5, label: 'sections complétées' } },
  { id: 'RAR-004', tier: 'rare', tierLabel: 'Rare', name: 'TLS Whisperer', desc: "Comprends et explique le handshake TLS 1.3 dans le forum.", glyph: 'lock', earned: false, prog: { done: 2, total: 4, label: 'sections complétées' } },

  // ---------- COMMON (4 total: 3 earned, 1 locked) ----------
  { id: 'COM-001', tier: 'common', tierLabel: 'Commun', name: 'Premier Pas', desc: "Termine ta toute première leçon.", glyph: 'flag', earned: true, date: '02/04/2024' },
  { id: 'COM-002', tier: 'common', tierLabel: 'Commun', name: 'OSI Initié', desc: "Maîtrise les 7 couches du modèle OSI.", glyph: 'layers', earned: true, date: '07/04/2026' },
  { id: 'COM-003', tier: 'common', tierLabel: 'Commun', name: 'Profile Builder', desc: "Complète ta bio et ajoute un avatar.", glyph: 'user', earned: true, date: '02/04/2024' },
  { id: 'COM-004', tier: 'common', tierLabel: 'Commun', name: 'Bookworm', desc: "Lis 3 ressources externes recommandées.", glyph: 'book', earned: false, prog: { done: 1, total: 3, label: 'ressources lues' } },
];

const Glyph = ({ name, size = 36 }) => {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'drop':   return (<svg viewBox="0 0 40 40" {...s}><path d="M20 4 C20 13 28 16 28 24 C28 28 24.5 32 20 32 C15.5 32 12 28 12 24 C12 16 20 13 20 4 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    case 'skull':  return (<svg viewBox="0 0 40 40" {...s}><path d="M10 18 C10 11 14 6 20 6 C26 6 30 11 30 18 V24 L27 27 V32 H23 V28 H17 V32 H13 V27 L10 24 Z" fill="currentColor" fillOpacity="0.2"/><circle cx="16" cy="20" r="2" fill="currentColor"/><circle cx="24" cy="20" r="2" fill="currentColor"/><path d="M19 26 L20 28 L21 26"/></svg>);
    case 'crown':  return (<svg viewBox="0 0 40 40" {...s}><path d="M6 14 L10 26 H30 L34 14 L27 19 L20 8 L13 19 Z" fill="currentColor" fillOpacity="0.22"/><path d="M10 30 H30"/></svg>);
    case 'flame':  return (<svg viewBox="0 0 40 40" {...s}><path d="M20 4 C20 11 15 13 15 20 C15 22 16 23 17.5 23 C16 25 15 27 15 29 C15 33 18 36 21 36 C25 36 28 33 28 28 C28 22 22 20 22 14 C22 11 21 7 20 4 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    case 'radar':  return (<svg viewBox="0 0 40 40" {...s}><circle cx="20" cy="20" r="14"/><circle cx="20" cy="20" r="8"/><circle cx="20" cy="20" r="2" fill="currentColor"/><path d="M20 20 L32 12"/></svg>);
    case 'bolt':   return (<svg viewBox="0 0 40 40" {...s}><path d="M22 4 L10 22 H19 L17 36 L30 18 H21 Z" fill="currentColor" fillOpacity="0.22"/></svg>);
    case 'db':     return (<svg viewBox="0 0 40 40" {...s}><ellipse cx="20" cy="10" rx="12" ry="4"/><path d="M8 10 V22 C8 25 13 27 20 27 C27 27 32 25 32 22 V10"/><path d="M8 22 V32 C8 35 13 37 20 37 C27 37 32 35 32 32 V22"/></svg>);
    case 'bug':    return (<svg viewBox="0 0 40 40" {...s}><rect x="12" y="14" width="16" height="18" rx="6"/><path d="M14 22 H8 M26 22 H32 M14 16 L9 12 M26 16 L31 12 M14 30 L9 34 M26 30 L31 34"/><path d="M16 10 C16 7 18 6 20 6 C22 6 24 7 24 10"/></svg>);
    case 'stack':  return (<svg viewBox="0 0 40 40" {...s}><rect x="8" y="10" width="24" height="6"/><rect x="8" y="20" width="24" height="6"/><rect x="8" y="30" width="24" height="6"/><path d="M14 13 H18 M14 23 H18 M14 33 H18"/></svg>);
    case 'lock':   return (<svg viewBox="0 0 40 40" {...s}><rect x="10" y="18" width="20" height="16" rx="2"/><path d="M14 18 V12 C14 8.5 16.5 6 20 6 C23.5 6 26 8.5 26 12 V18"/><circle cx="20" cy="26" r="2" fill="currentColor"/></svg>);
    case 'flag':   return (<svg viewBox="0 0 40 40" {...s}><path d="M10 6 V36"/><path d="M10 8 H30 L26 14 L30 20 H10 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    case 'layers': return (<svg viewBox="0 0 40 40" {...s}><path d="M20 6 L34 13 L20 20 L6 13 Z"/><path d="M6 20 L20 27 L34 20"/><path d="M6 27 L20 34 L34 27"/></svg>);
    case 'user':   return (<svg viewBox="0 0 40 40" {...s}><circle cx="20" cy="14" r="6"/><path d="M8 34 C8 27 13 23 20 23 C27 23 32 27 32 34"/></svg>);
    case 'book':   return (<svg viewBox="0 0 40 40" {...s}><path d="M8 8 H18 C20 8 21 9 21 11 V34 C21 32 20 31 18 31 H8 Z"/><path d="M32 8 H22 C20 8 19 9 19 11 V34 C19 32 20 31 22 31 H32 Z"/></svg>);
    default: return null;
  }
};

const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="10" height="7" rx="1"/>
    <path d="M5 7 V5 C5 3.3 6.3 2 8 2 C9.7 2 11 3.3 11 5 V7"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8 L7 12 L13 4"/>
  </svg>
);

function BadgeCard({ b }) {
  const isLeg = b.tier === 'legendary';
  return (
    <article className={`bcard bcard--${b.tier} ${b.earned ? 'is-earned' : 'bcard--locked'}`}>
      <span className="bcard__strip" />
      {isLeg && (
        <>
          <span className="bcard__corner tl" />
          <span className="bcard__corner tr" />
          <span className="bcard__corner bl" />
          <span className="bcard__corner br" />
        </>
      )}
      <div className="bcard__id">// <b>{b.id}</b></div>
      {!b.earned && (
        <div className="bcard__lock"><LockIcon /></div>
      )}

      <div className="bcard__hex">
        <div className="bcard__glyph"><Glyph name={b.glyph} size={isLeg ? 52 : 36} /></div>
      </div>
      <div className="bcard__rarity">· {b.tierLabel} ·</div>
      <h3 className="bcard__name">{b.name}</h3>
      <p className="bcard__desc">{b.desc}</p>

      {b.earned ? (
        <div className="bcard__foot">
          <span className="check"><CheckIcon /></span>
          Obtenu le <b>{b.date}</b>
        </div>
      ) : (
        <div className="bcard__prog">
          <div className="bcard__prog-head">
            <span><b>{b.prog.done}/{b.prog.total}</b> {b.prog.label}</span>
            <span className="pct">{Math.round((b.prog.done / b.prog.total) * 100)}%</span>
          </div>
          <div className="bcard__prog-bar">
            <div className="bcard__prog-fill" style={{ width: `${(b.prog.done / b.prog.total) * 100}%` }} />
          </div>
        </div>
      )}
    </article>
  );
}

function Section({ tier, label, items }) {
  const earnedCount = items.filter(i => i.earned).length;
  return (
    <section className={`bdg-section bdg-section--${tier}`}>
      <div className="bdg-section__head">
        <span className="bdg-section__rule bdg-section__rule--left" />
        <span>── {label} ──</span>
        <span className="bdg-section__count"><b>{earnedCount}</b> / {items.length} obtenus</span>
        <span className="bdg-section__rule" />
      </div>
      <div className={`bdg-grid ${tier === 'legendary' ? 'bdg-grid--legendary' : ''}`}>
        {items.map(b => <BadgeCard key={b.id} b={b} />)}
      </div>
    </section>
  );
}

function Filters({ active, setActive }) {
  const totals = {
    all: BADGES.length,
    legendary: BADGES.filter(b => b.tier === 'legendary').length,
    epic: BADGES.filter(b => b.tier === 'epic').length,
    rare: BADGES.filter(b => b.tier === 'rare').length,
    common: BADGES.filter(b => b.tier === 'common').length,
  };
  const pills = [
    { id: 'all', label: 'Tous', cls: 'all' },
    { id: 'legendary', label: 'Légendaire', cls: 'legendary' },
    { id: 'epic', label: 'Épique', cls: 'epic' },
    { id: 'rare', label: 'Rare', cls: 'rare' },
    { id: 'common', label: 'Commun', cls: 'common' },
  ];
  return (
    <div className="bdg-filters">
      <span className="bdg-filters__label">› RARETÉ</span>
      {pills.map(p => (
        <button
          key={p.id}
          className={`r-pill r-pill--${p.cls} ${active === p.id ? 'is-active' : ''}`}
          onClick={() => setActive(p.id)}
        >
          <span className="r-pill__dot" />
          <span>{p.label}</span>
          <span className="r-pill__count">{totals[p.id]}</span>
        </button>
      ))}
      <label className="bdg-search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input type="text" placeholder="/ chercher un badge..." />
      </label>
    </div>
  );
}

function Header() {
  const earned = BADGES.filter(b => b.earned).length;
  const total = 47; // total catalog beyond what we render
  const pct = (earned / total) * 100;
  return (
    <>
      <div className="bdg-crumb">
        <span className="p">$</span>
        <span>~/</span><b>cyberlearn</b>
        <span className="slash">/</span><span className="current">badges</span>
        <span className="caret" />
      </div>
      <header className="bdg-head">
        <div>
          <h1 className="bdg-title">
            Ton <em>arsenal</em>
            <span className="ratio"><b>{earned}</b> / {total}</span>
          </h1>
          <p className="bdg-sub">Badges groupés par rareté. Continue à grinder pour débloquer le reste — chaque palier raconte une compétence.</p>
        </div>
        <div className="bdg-meta">
          <div className="bdg-meta__row">
            <span><b className="leg">1</b> légendaire</span>
            <span className="bdg-meta__sep">/</span>
            <span><b className="epi">2</b> épiques</span>
            <span className="bdg-meta__sep">/</span>
            <span><b className="rar">2</b> rares</span>
            <span className="bdg-meta__sep">/</span>
            <span><b className="com">3</b> communs</span>
          </div>
          <div className="bdg-progress">
            <div className="bdg-progress__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="bdg-meta__row">
            <span>PROGRESSION · <b>{Math.round(pct)}%</b></span>
            <span className="bdg-meta__sep">/</span>
            <span>+ <b>4</b> bientôt débloquables</span>
          </div>
        </div>
      </header>
    </>
  );
}

function Collection() {
  const [active, setActive] = React.useState('all');
  const groups = [
    { tier: 'legendary', label: 'Légendaire' },
    { tier: 'epic',      label: 'Épique' },
    { tier: 'rare',      label: 'Rare' },
    { tier: 'common',    label: 'Commun' },
  ];
  const filtered = (tier) => BADGES.filter(b => b.tier === tier);
  const visibleGroups = active === 'all' ? groups : groups.filter(g => g.tier === active);
  return (
    <main className="main">
      <div className="bdg">
        <Header />
        <Filters active={active} setActive={setActive} />
        {visibleGroups.map(g => (
          <Section key={g.tier} tier={g.tier} label={g.label} items={filtered(g.tier)} />
        ))}
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <Collection />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

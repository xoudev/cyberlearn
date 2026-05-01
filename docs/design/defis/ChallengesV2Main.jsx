// ChallengesV2Main.jsx — Cyber Learn défis & CTF (terminal/danger aesthetic)

/* ============================== ICONS ============================== */
const Icon = {
  Target: ({ size = 56 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="14" />
      <circle cx="32" cy="32" r="6" />
      <circle cx="32" cy="32" r="1.5" fill="currentColor" />
      <path d="M32 4 V16 M32 48 V60 M4 32 H16 M48 32 H60" />
    </svg>
  ),
  Crosshair: ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="18" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      <path d="M32 6 V20 M32 44 V58 M6 32 H20 M44 32 H58" />
    </svg>
  ),
  Puzzle: ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 18 H26 V14 C26 10 28 8 32 8 C36 8 38 10 38 14 V18 H50 V30 H46 C42 30 40 32 40 36 C40 40 42 42 46 42 H50 V54 H38 V50 C38 46 36 44 32 44 C28 44 26 46 26 50 V54 H14 V42 H18 C22 42 24 40 24 36 C24 32 22 30 18 30 H14 Z" />
    </svg>
  ),
  Terminal: ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="10" width="52" height="44" rx="2" />
      <path d="M6 20 H58" />
      <path d="M16 32 L24 38 L16 44" />
      <path d="M30 46 H44" />
    </svg>
  ),
  Lock: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7 V5 C5 3 6 2 8 2 C10 2 11 3 11 5 V7" />
    </svg>
  ),
  Check: ({ size = 13 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8 L7 12 L13 4" />
    </svg>
  ),
  Clock: ({ size = 11 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5 V8 L10.5 9.5" />
    </svg>
  ),
  Arrow: ({ size = 11 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8 H13 M9 4 L13 8 L9 12" />
    </svg>
  ),
  Search: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="5" />
      <path d="M11 11 L14 14" />
    </svg>
  ),
};

/* ============================== HEADER ============================== */
function Breadcrumb() {
  return (
    <div className="chx-breadcrumb">
      <span className="p">$</span>
      <span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span className="current">défis</span>
      <span className="caret" />
    </div>
  );
}

function Header() {
  return (
    <div className="chx-head">
      <div>
        <h1 className="chx-title">DÉFIS &amp; <em>CHALLENGES</em></h1>
        <p className="chx-sub">Teste tes compétences en conditions réelles. CTF, puzzles de code, labs réseau&nbsp;— le terrain attaque, à toi de défendre.</p>
      </div>
      <div className="chx-stats">
        <span className="chx-stats__item chx-stats__item--prog">
          <span className="chx-stats__dot chx-stats__dot--prog" /><b>3</b> EN COURS
        </span>
        <span className="chx-stats__sep">·</span>
        <span className="chx-stats__item chx-stats__item--done">
          <span className="chx-stats__dot chx-stats__dot--done" /><b>2</b> COMPLÉTÉS
        </span>
        <span className="chx-stats__sep">·</span>
        <span className="chx-stats__item chx-stats__item--avail">
          <span className="chx-stats__dot chx-stats__dot--avail" /><b>12</b> DISPONIBLES
        </span>
      </div>
    </div>
  );
}

/* ============================== FILTERS ============================== */
function Filters() {
  const [cat, setCat] = React.useState('TOUS');
  const [type, setType] = React.useState('TOUS');
  return (
    <div className="chx-filters">
      <div className="chx-filters__row">
        <span className="chx-filters__label">// CAT</span>
        {[
          ['TOUS', 'all'],
          ['CYBERSEC', 'cyber'],
          ['DEV', 'dev'],
          ['RÉSEAU', 'net'],
        ].map(([label, dot]) => (
          <button
            key={label}
            className={`x-pill ${cat === label ? 'is-active' : ''}`}
            onClick={() => setCat(label)}
          >
            <span className={`x-pill__dot x-pill__dot--${dot}`} />
            {label}
          </button>
        ))}

        <span className="chx-filters__split" />

        <span className="chx-filters__label">// TYPE</span>
        {['CTF', 'PUZZLE', 'LAB'].map((t) => (
          <button
            key={t}
            className={`x-pill x-pill--type ${type === t ? 'is-active' : ''}`}
            onClick={() => setType(type === t ? 'TOUS' : t)}
          >
            {t}
          </button>
        ))}
      </div>

      <select className="x-sel" defaultValue="">
        <option value="">DIFFICULTÉ · TOUTES</option>
        <option>FACILE</option>
        <option>INTERMÉDIAIRE</option>
        <option>AVANCÉ</option>
        <option>EXPERT</option>
      </select>

      <select className="x-sel" defaultValue="">
        <option value="">STATUT · TOUS</option>
        <option>NON COMMENCÉ</option>
        <option>EN COURS</option>
        <option>COMPLÉTÉ</option>
        <option>VERROUILLÉ</option>
      </select>
    </div>
  );
}

/* ============================== FEATURED ============================== */
function DiffBars({ level, kind }) {
  return (
    <span className={`cc__diff cc__diff--${kind}`}>
      <span className="cc__diff-bars">
        {[0,1,2,3].map(i => <span key={i} className={i < level ? 'on' : ''} />)}
      </span>
      {kind === 'easy' && 'FACILE'}
      {kind === 'med' && 'INTERMÉDIAIRE'}
      {kind === 'hard' && 'AVANCÉ'}
    </span>
  );
}

function Featured() {
  return (
    <section className="feat">
      {/* cover */}
      <div className="feat__cover">
        <span className="feat__corner tl" />
        <span className="feat__corner tr" />
        <span className="feat__corner bl" />
        <span className="feat__corner br" />
        <span className="feat__coords">// PAYLOAD.LIVE</span>
        <span className="feat__coords feat__coords--right">[CTF · 0x4D]</span>
        <div className="feat__cover-glyph">
          <Icon.Target size={140} />
        </div>
        <span className="feat__bonus">+2X XP</span>
      </div>

      {/* body */}
      <div className="feat__body">
        <span className="feat__label">
          <span className="feat__label__pulse" />
          DÉFI DE LA SEMAINE
        </span>

        <div className="feat__ref">// CHL-W17 · BREACHED-PERIMETER</div>

        <h2 className="feat__title">Operation: Faille Zéro — Infiltration d'un cluster Kubernetes compromis</h2>

        <p className="feat__desc">
          Un acteur malveillant a déposé un payload dans le namespace prod. Ta mission&nbsp;:
          identifier la chaîne d'exploitation, exfiltrer la preuve et patcher avant la rotation.
        </p>

        <div className="feat__tags" style={{ marginTop: 6 }}>
          <span className="cc__tag cc__tag--cyber">CYBERSEC</span>
          <DiffBars level={4} kind="hard" />
          <span className="cc__type">CTF</span>
        </div>

        <div className="feat__countdown">
          <span className="feat__countdown-label">SE TERMINE DANS</span>
          <span className="feat__countdown-time">
            <span>2<u>J</u></span>
            <span>14<u>H</u></span>
            <span>32<u>M</u></span>
            <span>08<u>S</u></span>
          </span>
        </div>

        <div className="feat__cta">
          <a href="#" className="cc__btn" style={{ borderTop: 0 }}>
            RELEVER LE DÉFI <Icon.Arrow size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ============================== CHALLENGE CARD ============================== */
function CCCard({ data }) {
  const {
    state, cat, type, ref, title, desc, xp, time, tries,
    diff, diffKind, lockedBy, progress
  } = data;

  const catCls = cat === 'CYBERSEC' ? 'cyber' : cat === 'DEV' ? 'dev' : 'net';
  const TypeIcon = type === 'CTF' ? Icon.Crosshair : type === 'PUZZLE' ? Icon.Puzzle : Icon.Terminal;
  const typeCls = type === 'CTF' ? '' : type === 'PUZZLE' ? 'cc__type--puzzle' : 'cc__type--lab';

  let cls = `cc cc--${catCls}`;
  if (state === 'done') cls += ' cc--done';
  if (state === 'prog') cls += ' cc--prog';
  if (state === 'locked') cls += ' cc--locked';

  return (
    <article className={cls}>
      <span className="cc__tick tl" />
      <span className="cc__tick tr" />
      <span className="cc__tick bl" />
      <span className="cc__tick br" />

      <div className="cc__cover">
        <div className="cc__cover-tl">
          <span className={`cc__tag cc__tag--${catCls}`}>{cat}</span>
        </div>
        <div className="cc__cover-tr">
          {state === 'done' ? (
            <span className="cc__solved"><Icon.Check size={11} /> RÉSOLU</span>
          ) : state === 'locked' ? (
            <span className="cc__lock"><Icon.Lock /></span>
          ) : (
            <>
              <DiffBars level={diff} kind={diffKind} />
              <span className={`cc__type ${typeCls}`}>{type}</span>
            </>
          )}
        </div>
        <span className="cc__icon"><TypeIcon size={48} /></span>
      </div>

      <div className="cc__body">
        <div className="cc__ref">// {ref}</div>
        <h3 className="cc__title">{title}</h3>
        <p className="cc__desc">{desc}</p>
      </div>

      {state === 'prog' && (
        <>
          <div className="cc__progbar">
            <div className="cc__progbar-fill" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}

      <div className="cc__meta">
        <span className="cc__meta-xp">{xp} XP</span>
        <span className="cc__meta-time"><Icon.Clock /> {time} MIN</span>
        {state === 'prog' ? (
          <span className="cc__prog-ind" style={{ marginLeft: 'auto' }}>{progress}% · EN COURS</span>
        ) : state === 'done' ? (
          <span className="cc__meta-tries" style={{ color: 'var(--brand-turquoise)' }}>RÉSOLU EN 32 MIN</span>
        ) : state === 'locked' ? (
          <span className="cc__meta-tries">VERROUILLÉ</span>
        ) : (
          <span className="cc__meta-tries">{tries} ESSAIS RESTANTS</span>
        )}
      </div>

      {state === 'locked' && (
        <div className="cc__lock-msg">
          <Icon.Lock size={12} />
          <span>Complète d'abord&nbsp;: <b>{lockedBy}</b></span>
        </div>
      )}

      {state === 'done' ? (
        <a href="#" className="cc__btn cc__btn--ghost">
          VOIR LA SOLUTION <Icon.Arrow size={12} />
        </a>
      ) : state === 'prog' ? (
        <a href="#" className="cc__btn cc__btn--orange">
          CONTINUER <Icon.Arrow size={12} />
        </a>
      ) : state === 'locked' ? (
        <span className="cc__btn cc__btn--disabled">
          <Icon.Lock size={12} /> VERROUILLÉ
        </span>
      ) : (
        <a href="#" className="cc__btn">
          RELEVER LE DÉFI <Icon.Arrow size={12} />
        </a>
      )}
    </article>
  );
}

/* ============================== DATA ============================== */
const CHALLENGES = [
  {
    state: 'prog', cat: 'CYBERSEC', type: 'CTF',
    ref: 'CHL-001', title: 'SQL Injection — Bypass de l\'authentification admin',
    desc: 'Trouve la faille dans le formulaire de login d\'un panneau d\'administration legacy et capture le flag stocké en base.',
    xp: 450, time: 45, tries: 2, diff: 3, diffKind: 'hard', progress: 62,
  },
  {
    state: 'open', cat: 'DEV', type: 'PUZZLE',
    ref: 'CHL-002', title: 'Algo — Le détecteur de cycle minimal',
    desc: 'Implémente une fonction qui détecte un cycle dans un graphe orienté en O(V+E) sans utiliser de structure tierce.',
    xp: 320, time: 30, tries: 3, diff: 2, diffKind: 'med',
  },
  {
    state: 'done', cat: 'RÉSEAU', type: 'LAB',
    ref: 'CHL-003', title: 'Wireshark — Reconstruire la session TCP exfiltrée',
    desc: 'Une capture réseau contient une exfiltration cachée dans des en-têtes DNS. Extrais le payload caché.',
    xp: 280, time: 25, tries: 0, diff: 2, diffKind: 'med',
  },
  {
    state: 'open', cat: 'CYBERSEC', type: 'CTF',
    ref: 'CHL-004', title: 'JWT Forgery — Élève tes privilèges au rang root',
    desc: 'Le token de session utilise un algorithme faible. Trouve la clé, forge un token admin et capture le drapeau.',
    xp: 520, time: 50, tries: 3, diff: 4, diffKind: 'hard',
  },
  {
    state: 'prog', cat: 'DEV', type: 'LAB',
    ref: 'CHL-005', title: 'Race Condition — Patch le double-spend avant le déploiement',
    desc: 'Le service de transfert est vulnérable à une race condition. Identifie le bug, propose un patch atomique.',
    xp: 380, time: 40, tries: 2, diff: 3, diffKind: 'hard', progress: 28,
  },
  {
    state: 'locked', cat: 'CYBERSEC', type: 'CTF',
    ref: 'CHL-006', title: 'Blind SQL — Exfiltrer le hash root caractère par caractère',
    desc: 'Aucun retour visible : seul le temps de réponse du serveur trahit le contenu. Automatise et extrais.',
    xp: 600, time: 60, tries: 0, diff: 4, diffKind: 'hard',
    lockedBy: 'Introduction aux injections SQL',
  },
  {
    state: 'done', cat: 'DEV', type: 'PUZZLE',
    ref: 'CHL-007', title: 'Régex Golf — Match le pattern, rien d\'autre',
    desc: 'Crée la regex la plus courte qui valide la liste verte sans jamais déclencher la liste rouge.',
    xp: 240, time: 20, tries: 0, diff: 2, diffKind: 'med',
  },
  {
    state: 'prog', cat: 'RÉSEAU', type: 'CTF',
    ref: 'CHL-008', title: 'DNS Tunneling — Décode le canal caché du botnet',
    desc: 'Le trafic DNS sortant masque un C2. Décode les sous-domaines, reconstruis les commandes émises.',
    xp: 460, time: 45, tries: 1, diff: 3, diffKind: 'hard', progress: 84,
  },
  {
    state: 'open', cat: 'RÉSEAU', type: 'LAB',
    ref: 'CHL-009', title: 'BGP Hijack — Reroute le trafic dans une topologie isolée',
    desc: 'Compose une session BGP malicieuse dans le lab fermé. Comprends comment un AS peut détourner un préfixe.',
    xp: 540, time: 55, tries: 3, diff: 3, diffKind: 'hard',
  },
  {
    state: 'locked', cat: 'DEV', type: 'PUZZLE',
    ref: 'CHL-010', title: 'Buffer Overflow — Écris ton propre exploit ROP',
    desc: 'Stack non-exécutable, mais ASLR partiellement levée. Construis une chaîne ROP fonctionnelle.',
    xp: 720, time: 75, tries: 0, diff: 4, diffKind: 'hard',
    lockedBy: 'Mémoire & Exploitation Niveau 2',
  },
];

/* ============================== ROOT ============================== */
function Challenges() {
  return (
    <main className="main">
      <div className="chx">
        <Breadcrumb />
        <Header />
        <Filters />
        <Featured />

        <div className="chx-section-head">
          <div>
            <span className="chx-section-head__eyebrow">// AVAILABLE.STACK</span>
            <h2 className="chx-section-head__title">Tous les défis</h2>
          </div>
          <span className="chx-section-head__count"><b>10</b> ENTRÉES · TRIÉ PAR PERTINENCE</span>
        </div>

        <div className="chx-grid">
          {CHALLENGES.map((c, i) => <CCCard key={i} data={c} />)}
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
      <Challenges />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

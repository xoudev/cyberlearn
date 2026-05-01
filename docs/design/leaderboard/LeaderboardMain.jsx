// LeaderboardMain.jsx — Cyber Learn global leaderboard

const FlameIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3 C12 7.5 8 9 8 13.5 C8 14.8 8.7 15.5 9.6 15.5 C8.6 17 8 18.3 8 19.5 C8 22 10 24 13 24 C16.5 24 19 21.5 19 17.8 C19 13.5 14.5 12 14.5 8 C14.5 6 13.7 4.5 12 3 Z"/>
  </svg>
);

const TOP3 = [
  { rank: 2, handle: 'n3onbyte', name: 'Naomi K.', mono: 'NK', xp: 184320, level: 28, tier: 'Maître',  streak: 42, me: false, kind: 'silver' },
  { rank: 1, handle: 'r00tcake', name: 'Anaïs M.', mono: 'AM', xp: 218750, level: 31, tier: 'Maître',  streak: 96, me: false, kind: 'gold' },
  { rank: 3, handle: '0xfennec', name: 'Théo L.',  mono: 'TL', xp: 167410, level: 26, tier: 'Expert',  streak: 31, me: false, kind: 'bronze' },
];

const ROWS = [
  { rank: 1,  handle: 'r00tcake',     name: 'Anaïs Marchand',     mono: 'AM', xp: 218750, level: 31, tier: 'Maître', streak: 96 },
  { rank: 2,  handle: 'n3onbyte',     name: 'Naomi Kuroda',       mono: 'NK', xp: 184320, level: 28, tier: 'Maître', streak: 42 },
  { rank: 3,  handle: '0xfennec',     name: 'Théo Lambert',       mono: 'TL', xp: 167410, level: 26, tier: 'Expert', streak: 31 },
  { rank: 4,  handle: 'silv3rsh3ll',  name: 'Lucas Brun',         mono: 'LB', xp: 152800, level: 25, tier: 'Expert', streak: 18 },
  { rank: 5,  handle: 'kr4kken',      name: 'Yasmine Ould',       mono: 'YO', xp: 148230, level: 24, tier: 'Expert', streak: 22 },
  { rank: 6,  handle: 'bytewolf',     name: 'Maxime Garnier',     mono: 'MG', xp: 141015, level: 24, tier: 'Expert', streak: 9  },
  { rank: 7,  handle: 'phant0m_',     name: 'Inès Roussel',       mono: 'IR', xp: 138400, level: 23, tier: 'Expert', streak: 56 },
  { rank: 8,  handle: 'glitch_owl',   name: 'Élodie Vasseur',     mono: 'EV', xp: 132990, level: 23, tier: 'Expert', streak: 0  },
  { rank: 9,  handle: 'wirewitch',    name: 'Sara Belkacem',      mono: 'SB', xp: 128340, level: 22, tier: 'Expert', streak: 14 },
  { rank: 10, handle: 'h3xjuno',      name: 'Camille Petit',      mono: 'CP', xp: 124110, level: 22, tier: 'Expert', streak: 7  },
  { rank: 11, handle: 'nullp0inter',  name: 'Adrien Caron',       mono: 'AC', xp: 119840, level: 21, tier: 'Adepte', streak: 11 },
  { rank: 12, handle: 'mdr_tnx',      name: 'Hugo Merlin',        mono: 'HM', xp: 115620, level: 21, tier: 'Adepte', streak: 4  },
  { rank: 341,handle: 'shadowfox',    name: 'Léa Fournier',       mono: 'LF', xp:  29110, level: 14, tier: 'Adepte', streak: 12 },
  { rank: 342,handle: 'xoudark',      name: 'Xavier Doudou',      mono: 'XD', xp:  28840, level: 14, tier: 'Adepte', streak: 7, me: true },
  { rank: 343,handle: 'cipher_kit',   name: 'Margaux Aubert',     mono: 'MA', xp:  28590, level: 14, tier: 'Adepte', streak: 0  },
  { rank: 344,handle: 'pkt_loss',     name: 'Romain Vidal',       mono: 'RV', xp:  28210, level: 13, tier: 'Adepte', streak: 3  },
  { rank: 345,handle: 'volt_a',       name: 'Sofiane El Amrani',  mono: 'SE', xp:  27905, level: 13, tier: 'Adepte', streak: 21 },
];

function Breadcrumb() {
  return (
    <div className="lb-breadcrumb">
      <span className="p">$</span>
      <span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span className="current">classement</span>
      <span className="caret" />
    </div>
  );
}

function Filters({ active, setActive }) {
  const tabs = [
    { id: 'global', label: 'Global' },
    { id: 'mois',   label: 'Ce mois' },
    { id: 'sem',    label: 'Cette semaine' },
  ];
  return (
    <div className="lb-pills" role="tablist">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`lb-pill ${active === t.id ? 'is-on' : ''}`}
          onClick={() => setActive(t.id)}
        >
          <span className="dot" />
          {t.label}
        </button>
      ))}
    </div>
  );
}

function PodiumCard({ p }) {
  const cls = p.me ? 'podium--me' : `podium--${p.kind}`;
  return (
    <div className={`podium ${cls}`}>
      <span className="podium__corner tl" />
      <span className="podium__corner tr" />
      <span className="podium__corner bl" />
      <span className="podium__corner br" />
      {p.me && <span className="podium__you">› TOI</span>}
      <span className="podium__rank">RANG · <b>#{p.rank}</b></span>

      <div className="podium__hex">
        <div className="podium__hex-inner">
          <span className="podium__hex-mono">{p.mono}</span>
        </div>
      </div>
      <span className="podium__glow" />

      <h2 className="podium__handle"><span className="at">@</span>{p.handle}</h2>
      <p className="podium__name">{p.name}</p>

      <div className="podium__xp">
        <span className="podium__xp-n">{p.xp.toLocaleString('fr-FR')}</span>
        <span className="podium__xp-unit">XP</span>
      </div>

      <div className="podium__lvl">
        LVL · <b>{p.level}</b>
        <span className="name">{p.tier}</span>
      </div>

      <div className="podium__streak">
        <FlameIcon size={13} />
        STREAK · <b>{p.streak}j</b>
      </div>
    </div>
  );
}

function Podium() {
  // order: silver, gold (center), bronze
  return (
    <section className="lb-podium">
      {TOP3.map(p => <PodiumCard key={p.rank} p={p} />)}
    </section>
  );
}

function YouBanner() {
  return (
    <section className="lb-you">
      <div className="lb-you__eyebrow">
        <span className="lbl">TA POSITION</span>
        <span className="sub">SESSION · LIVE</span>
      </div>
      <div className="lb-you__rank">
        <span className="hash">#</span>
        <span className="n">342</span>
      </div>
      <div className="lb-you__handle">
        <h2><span className="at">@</span>xoudark</h2>
        <span className="delta">
          Top <b>4%</b><span className="sep">/</span>FR · 8 412 pl.<span className="sep">/</span><b>↑ 17</b> · 7 jours
        </span>
      </div>
      <span className="lb-you__sep" />
      <div className="lb-you__metric">
        <span className="lbl">XP TOTAL</span>
        <span className="val is-tq">28 840</span>
      </div>
      <div className="lb-you__metric">
        <span className="lbl">NIVEAU · ADEPTE</span>
        <span className="val">14</span>
      </div>
    </section>
  );
}

function Row({ r }) {
  const tierClass =
    r.tier === 'Maître' ? 'is-tier-master' :
    r.tier === 'Expert' ? 'is-tier-expert' :
    'is-tier-adept';
  const cls = [
    'lb-row',
    r.rank <= 3 ? `is-rk${r.rank}` : '',
    r.me ? 'is-me' : '',
    tierClass,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <div className="col-rank">
        <span className="hash">#</span>{r.rank}
      </div>
      <div className="col-player">
        <div className="av"><span className="av-mono">{r.mono}</span></div>
        <div className="who">
          <span className="handle"><span className="at">@</span>{r.handle}</span>
          <span className="name">{r.name}</span>
        </div>
      </div>
      <div className="col-xp">
        {r.xp.toLocaleString('fr-FR')}<span className="unit">XP</span>
      </div>
      <div className="col-lvl">
        <span className="n">{r.level}</span>
        <span className="tier">{r.tier}</span>
      </div>
      <div className={`col-streak ${r.streak === 0 ? 'is-cold' : ''}`}>
        <span className="flame"><FlameIcon size={14} /></span>
        <span className="n">{r.streak}</span>
        <span>j</span>
      </div>
    </div>
  );
}

function Table() {
  const top = ROWS.filter(r => r.rank <= 12);
  const me  = ROWS.filter(r => r.rank >= 341);
  return (
    <div>
      <div className="lb-table-head">
        <h3>JOUEURS · TOP MONDIAL</h3>
        <span className="pager"><b>1–12</b> sur 8 412</span>
      </div>
      <div className="lb-table">
        <div className="lb-row lb-row--head">
          <div className="col-rank">#</div>
          <div className="col-player">JOUEUR</div>
          <div className="col-xp" style={{textAlign: 'right'}}>XP TOTAL</div>
          <div className="col-lvl">NIVEAU</div>
          <div className="col-streak" style={{justifySelf: 'end'}}>STREAK</div>
        </div>

        {top.map(r => <Row key={r.rank} r={r} />)}

        <div className="lb-ellipsis">··· 329 joueurs ···</div>

        {me.map(r => <Row key={r.rank} r={r} />)}
      </div>
    </div>
  );
}

function Leaderboard() {
  const [filter, setFilter] = React.useState('global');
  return (
    <main className="main">
      <div className="lb-wrap">
        <Breadcrumb />

        <div className="lb-head">
          <div>
            <span className="lb-title">
              <span className="sub">SAISON · 04 · 2026 · <b>LIVE</b></span>
            </span>
            <h1 className="lb-title">
              <span className="pre">&gt;</span>CLASSEMENT GLOBAL
            </h1>
          </div>
          <Filters active={filter} setActive={setFilter} />
        </div>

        <div className="lb-meta">
          <span className="live">SESSION SÉCURISÉE</span>
          <span className="sep">/</span>
          <span><b>8 412</b> joueurs</span>
          <span className="sep">/</span>
          <span>FR · EUROPE</span>
          <span className="sep">/</span>
          <span>maj · <b>il y a 12s</b></span>
        </div>

        <Podium />
        <YouBanner />
        <Table />
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <Leaderboard />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

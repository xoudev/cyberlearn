// ProfileMain.jsx — Cyber Learn user profile page

const BADGES = [
  { rarity: 'legendary', rarityLabel: 'Légendaire', name: 'First Blood',     date: 'il y a 2 j',   glyph: 'drop'   },
  { rarity: 'epic',      rarityLabel: 'Épique',     name: 'Streak 7 jours',  date: "aujourd'hui",  glyph: 'flame'  },
  { rarity: 'rare',      rarityLabel: 'Rare',       name: 'SQL Survivor',    date: 'il y a 5 j',   glyph: 'db'     },
  { rarity: 'epic',      rarityLabel: 'Épique',     name: 'Recon Master',    date: 'il y a 9 j',   glyph: 'radar'  },
  { rarity: 'rare',      rarityLabel: 'Rare',       name: 'Pwn the Stack',   date: 'il y a 12 j',  glyph: 'stack'  },
  { rarity: 'common',    rarityLabel: 'Commun',     name: 'Premier Pas',     date: 'il y a 28 j',  glyph: 'flag'   },
  { rarity: 'rare',      rarityLabel: 'Rare',       name: 'XSS Hunter',      date: 'il y a 18 j',  glyph: 'bug'    },
  { rarity: 'common',    rarityLabel: 'Commun',     name: 'OSI Initié',      date: 'il y a 22 j',  glyph: 'layers' },
];

const BadgeGlyph = ({ name }) => {
  const s = { width: 36, height: 36, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'drop':   return (<svg viewBox="0 0 40 40" {...s}><path d="M20 4 C20 13 28 16 28 24 C28 28 24.5 32 20 32 C15.5 32 12 28 12 24 C12 16 20 13 20 4 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    case 'flame':  return (<svg viewBox="0 0 40 40" {...s}><path d="M20 4 C20 11 15 13 15 20 C15 22 16 23 17.5 23 C16 25 15 27 15 29 C15 33 18 36 21 36 C25 36 28 33 28 28 C28 22 22 20 22 14 C22 11 21 7 20 4 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    case 'db':     return (<svg viewBox="0 0 40 40" {...s}><ellipse cx="20" cy="10" rx="12" ry="4"/><path d="M8 10 V22 C8 25 13 27 20 27 C27 27 32 25 32 22 V10"/><path d="M8 22 V32 C8 35 13 37 20 37 C27 37 32 35 32 32 V22"/></svg>);
    case 'radar':  return (<svg viewBox="0 0 40 40" {...s}><circle cx="20" cy="20" r="14"/><circle cx="20" cy="20" r="8"/><circle cx="20" cy="20" r="2" fill="currentColor"/><path d="M20 20 L32 12"/></svg>);
    case 'stack':  return (<svg viewBox="0 0 40 40" {...s}><rect x="8" y="10" width="24" height="6"/><rect x="8" y="20" width="24" height="6"/><rect x="8" y="30" width="24" height="6"/><path d="M14 13 H18 M14 23 H18 M14 33 H18"/></svg>);
    case 'flag':   return (<svg viewBox="0 0 40 40" {...s}><path d="M10 6 V36"/><path d="M10 8 H30 L26 14 L30 20 H10 Z" fill="currentColor" fillOpacity="0.25"/></svg>);
    case 'bug':    return (<svg viewBox="0 0 40 40" {...s}><rect x="12" y="14" width="16" height="18" rx="6"/><path d="M14 22 H8 M26 22 H32 M14 16 L9 12 M26 16 L31 12 M14 30 L9 34 M26 30 L31 34"/><path d="M16 10 C16 7 18 6 20 6 C22 6 24 7 24 10"/></svg>);
    case 'layers': return (<svg viewBox="0 0 40 40" {...s}><path d="M20 6 L34 13 L20 20 L6 13 Z"/><path d="M6 20 L20 27 L34 20"/><path d="M6 27 L20 34 L34 27"/></svg>);
    default: return null;
  }
};

function HexAvatar() {
  return (
    <div className="pf-avatar">
      <div className="pf-avatar__inner">
        <span className="pf-avatar__mono">XD</span>
      </div>
      <span className="pf-avatar__rarity">★ Légendaire</span>
    </div>
  );
}

function RankCard() {
  return (
    <div className="pf-rank">
      <span className="pf-rank__corner tl" />
      <span className="pf-rank__corner tr" />
      <span className="pf-rank__corner bl" />
      <span className="pf-rank__corner br" />
      <div className="pf-rank__eyebrow">
        Rang global
        <span className="live">LIVE</span>
      </div>
      <div className="pf-rank__num">
        <span className="hash">#</span>
        <span className="n">342</span>
      </div>
      <div className="pf-rank__meta">
        <span>Top <b>4%</b></span>
        <span className="sep">/</span>
        <span>FR · 8 412 pl.</span>
        <span className="sep">/</span>
        <span><b>↑ 17</b> 7j</span>
      </div>
    </div>
  );
}

function XPBar() {
  const pct = (2840 / 3500) * 100;
  return (
    <div className="pf-xp">
      <div className="pf-xp__lvl">
        <span className="pf-xp__lvl-num">14</span>
        <div className="pf-xp__lvl-tag">
          <span>Niveau actuel</span>
          <b>Adepte</b>
        </div>
      </div>
      <div className="pf-xp__track-wrap">
        <div className="pf-xp__track-head">
          <span className="val"><b>2 840</b> / 3 500 XP</span>
          <span>→ Expert (LVL 15)</span>
          <span className="pct">{Math.round(pct)}%</span>
        </div>
        <div className="pf-xp__bar">
          <div className="pf-xp__bar-fill" style={{ width: `${pct}%` }} />
          <span className="pf-xp__bar-marker" style={{ left: `${pct}%` }}>YOU · 2840</span>
        </div>
      </div>
      <div className="pf-xp__remaining">
        <b>660 XP</b>
        <span className="lbl">avant le prochain palier</span>
      </div>
    </div>
  );
}

function FlameIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 C12 7.5 8 9 8 13.5 C8 14.8 8.7 15.5 9.6 15.5 C8.6 17 8 18.3 8 19.5 C8 22 10 24 13 24 C16.5 24 19 21.5 19 17.8 C19 13.5 14.5 12 14.5 8 C14.5 6 13.7 4.5 12 3 Z" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  );
}

function StatsRow() {
  return (
    <div className="pf-stats">
      <div className="pf-stat">
        <div className="pf-stat__label"><span className="idx">01 ·</span> Niveau</div>
        <div className="pf-stat__n">14</div>
        <div className="pf-stat__sub">+<b>1</b> ce mois-ci</div>
      </div>
      <div className="pf-stat pf-stat--streak">
        <div className="pf-stat__label"><span className="idx">02 ·</span> Streak</div>
        <div className="pf-stat__flame"><FlameIcon /></div>
        <div className="pf-stat__n">7<span className="unit">j</span></div>
        <div className="pf-stat__sub">record · <b>14j</b></div>
      </div>
      <div className="pf-stat">
        <div className="pf-stat__label"><span className="idx">03 ·</span> Leçons</div>
        <div className="pf-stat__n">12</div>
        <div className="pf-stat__sub">terminées · <b>+3</b> 7j</div>
      </div>
      <div className="pf-stat pf-stat--badges">
        <div className="pf-stat__label"><span className="idx">04 ·</span> Badges</div>
        <div className="pf-stat__n">8</div>
        <div className="pf-stat__sub">obtenus · <b>1</b> légendaire</div>
      </div>
      <div className="pf-stat pf-stat--cert">
        <div className="pf-stat__label"><span className="idx">05 ·</span> Certificats</div>
        <div className="pf-stat__n">1</div>
        <div className="pf-stat__sub">délivré · <b>vérifié</b></div>
      </div>
    </div>
  );
}

function Tabs({ active, setActive }) {
  const tabs = [
    { id: 'activity', label: 'Activité', count: 142 },
    { id: 'badges',   label: 'Badges',   count: 8   },
    { id: 'certs',    label: 'Certificats', count: 1 },
  ];
  return (
    <div className="pf-tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`pf-tab ${active === t.id ? 'is-active' : ''}`}
          onClick={() => setActive(t.id)}
        >
          <span>{t.label}</span>
          <span className="pf-tab__count">{t.count}</span>
        </button>
      ))}
      <div className="pf-tabs__suffix">
        <span>TRIER · RÉCENTS</span>
        <span className="sep">/</span>
        <span>VUE · <b>GRILLE</b></span>
      </div>
    </div>
  );
}

function BadgeCard({ b }) {
  return (
    <article className={`pf-badge pf-badge--${b.rarity}`}>
      <span className="pf-badge__strip" />
      <div className="pf-badge__hex">
        <div className="pf-badge__glyph"><BadgeGlyph name={b.glyph} /></div>
      </div>
      <div className="pf-badge__rarity">· {b.rarityLabel} ·</div>
      <h3 className="pf-badge__name">{b.name}</h3>
      <div className="pf-badge__date">Obtenu · {b.date}</div>
    </article>
  );
}

function BadgesGrid() {
  return (
    <div className="pf-badges">
      {BADGES.map(b => <BadgeCard key={b.name} b={b} />)}
    </div>
  );
}

function CertificatePreview() {
  return (
    <section className="pf-certs">
      <div className="pf-certs__head">
        <h3><span className="idx">// CERT.PREVIEW</span>Dernier certificat délivré</h3>
        <a href="#" className="cta">Voir tous les certificats →</a>
      </div>
      <div className="pf-cert">
        <span className="pf-cert__corner tl" />
        <span className="pf-cert__corner tr" />
        <span className="pf-cert__corner bl" />
        <span className="pf-cert__corner br" />
        <div className="pf-cert__seal">VERIFIED</div>
        <div className="pf-cert__body">
          <div className="pf-cert__eyebrow">Parcours · validé</div>
          <h4 className="pf-cert__path">Fondamentaux Cybersécurité — Niveau Débutant</h4>
          <div className="pf-cert__meta">
            <span>Délivré · <b>14 mars 2026</b></span>
            <span className="sep">/</span>
            <span>ID · <b>CYL-2026-03-0184</b></span>
            <span className="sep">/</span>
            <span>Score · <b>92/100</b></span>
          </div>
          <div className="pf-cert__hash">
            <span className="lbl">SHA-256</span>
            <span className="v">7f3a9e2c4b1d8f6a · 5e2b0c9d3a4f1e8b · 6c5d2a9f0e3b7c4d…</span>
          </div>
        </div>
        <div className="pf-cert__actions">
          <a href="#" className="pf-cert__btn">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2 V11 M4 7 L8 11 L12 7 M2 14 H14"/></svg>
            Télécharger PDF
          </a>
          <a href="#" className="pf-cert__verify">Vérifier →</a>
        </div>
      </div>
    </section>
  );
}

function ProfileBreadcrumb() {
  return (
    <div className="pf-breadcrumb">
      <span className="p">$</span>
      <span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span>profil</span>
      <span className="slash">/</span><span className="current">@xoudark</span>
      <span className="caret" />
    </div>
  );
}

function Profile() {
  const [active, setActive] = React.useState('badges');
  return (
    <main className="main">
      <div className="profile">
        <ProfileBreadcrumb />

        <section className="pf-hero">
          <div className="pf-id">
            <HexAvatar />
            <div className="pf-id__text">
              <h1 className="pf-id__handle"><span className="at">@</span>xoudark</h1>
              <p className="pf-id__display">
                <b>Xavier Doudou</b>
                <span className="sep">/</span>
                Paris, FR
                <span className="sep">/</span>
                pentester en herbe
              </p>
              <p className="pf-id__bio">
                Apprenti red team, je touche un peu à tout — du nmap aux buffer overflows.
                Ici pour grinder les CTF et me certifier avant la fin de l'année.
                Disponible pour collaborer sur des challenges.
              </p>
              <div className="pf-id__since">Membre depuis <b>Avril 2024</b></div>
            </div>
          </div>
          <RankCard />
        </section>

        <XPBar />
        <StatsRow />

        <Tabs active={active} setActive={setActive} />

        {active === 'badges' && <BadgesGrid />}
        {active === 'activity' && (
          <div style={{padding: '60px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase'}}>
            // FLUX D'ACTIVITÉ — non disponible dans cette vue
          </div>
        )}
        {active === 'certs' && (
          <div style={{padding: '60px 0', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase'}}>
            // CERTIFICATS — voir aperçu ci-dessous
          </div>
        )}

        <CertificatePreview />
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <Profile />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

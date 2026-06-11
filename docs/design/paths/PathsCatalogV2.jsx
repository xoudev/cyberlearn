// PathsCatalogV2.jsx — Cyber Learn · Paths catalog, redesigned with hierarchy

const PATHS = [
  {
    id: 'CL-PATH-001-V01', kind: 'cyber', cat: 'CYBERSEC', diff: 3, diffLabel: 'Intermédiaire',
    title: 'Pentester Web — de zéro à <em>CTF</em>',
    desc: "Mappe, fuzz, exploite. Du premier scan aux exfiltrations finales — 24 missions guidées dans un sandbox isolé.",
    missions: 24, hours: '~18H', xp: '1 800', cert: true,
    state: 'inprog', done: 8, total: 24,
    next: { n: '09', title: 'Auth JWT — les pièges courants', xp: 220, dur: '26 MIN' },
  },
  {
    id: 'CL-PATH-002-V01', kind: 'dev', cat: 'DEV', diff: 2, diffLabel: 'Intermédiaire',
    title: 'Sécurité applicative — OWASP Top 10',
    desc: "Auth, sessions, JWT, injections. Écris du code qui ne se fait pas pwn par un junior avec curl.",
    missions: 18, hours: '~14H', xp: '1 400', cert: true,
    state: 'done', done: 18, total: 18,
    certName: 'Sécurité Applicative — Niveau Intermédiaire',
  },
  {
    id: 'CL-PATH-003-V01', kind: 'net', cat: 'RÉSEAU', diff: 1, diffLabel: 'Débutant',
    title: 'Réseaux & TLS — comprendre le câble',
    desc: "OSI, TCP/IP, captures Wireshark, handshake TLS 1.3.",
    missions: 16, hours: '~12H', xp: '1 200', cert: true,
    state: 'inprog', done: 4, total: 16,
  },
  {
    id: 'CL-PATH-004-V01', kind: 'cyber', cat: 'CYBERSEC', diff: 1, diffLabel: 'Débutant',
    title: 'Fondamentaux Cybersécurité',
    desc: "Modèle de menace, cryptographie de base, hygiène numérique. Le socle commun avant de spécialiser.",
    missions: 14, hours: '~10H', xp: '1 000', cert: true,
    state: 'idle', done: 0, total: 14,
  },
  {
    id: 'CL-PATH-005-V01', kind: 'dev', cat: 'DEV', diff: 3, diffLabel: 'Avancé',
    title: 'Reverse Engineering — Binaires Linux',
    desc: "Désassemble, comprends et exploite. Du buffer overflow x86 au ROP, dans une VM safe.",
    missions: 20, hours: '~22H', xp: '2 400', cert: true,
    state: 'idle', done: 0, total: 20,
  },
  {
    id: 'CL-PATH-006-V01', kind: 'net', cat: 'RÉSEAU', diff: 2, diffLabel: 'Intermédiaire',
    title: 'Sécurité réseau & pare-feux',
    desc: "Segmentation, ACL, IDS/IPS, VPN. Construis et défends une infra réaliste de PME.",
    missions: 16, hours: '~14H', xp: '1 600', cert: false,
    state: 'idle', done: 0, total: 16,
  },
];

const ARROW = (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 H13 M9 4 L13 8 L9 12"/></svg>
);

function Brackets() {
  return (<><span className="bk tl" /><span className="bk tr" /><span className="bk bl" /><span className="bk br" /></>);
}

function DiffBars({ level }) {
  return <span className={`diff-bars lv${level === 1 ? 1 : level === 2 ? 2 : 3}`}><span /><span /><span /></span>;
}

function KindGlyph({ kind, size }) {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (kind === 'cyber') return (<svg className="kind-ico" viewBox="0 0 64 64" {...s}><path d="M32 5 L53 13 V31 C53 44 43 53 32 59 C21 53 11 44 11 31 V13 Z"/><path d="M23 32 L29 38 L42 23"/></svg>);
  if (kind === 'dev')   return (<svg className="kind-ico" viewBox="0 0 64 64" {...s}><path d="M22 19 L7 32 L22 45"/><path d="M42 19 L57 32 L42 45"/><path d="M37 12 L27 52"/></svg>);
  return (<svg className="kind-ico" viewBox="0 0 64 64" {...s}><circle cx="32" cy="12" r="4.5"/><circle cx="12" cy="48" r="4.5"/><circle cx="52" cy="48" r="4.5"/><path d="M32 16.5 L13 43 M32 16.5 L51 43 M16 48 L48 48"/><circle cx="32" cy="32" r="2.2" fill="currentColor" stroke="none"/></svg>);
}

const kindClass = (k) => k === 'net' ? 'net' : k === 'dev' ? 'dev' : 'cyber';

/* -------------------------------------------------------------------------- */
function Breadcrumb() {
  return (
    <div className="pc2-crumb">
      <span className="p">$</span><span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span className="current">parcours</span>
      <span className="caret" />
    </div>
  );
}

function Header() {
  return (
    <header className="pc2-head">
      <div>
        <h1 className="pc2-title"><em>12</em> parcours<br/>disponibles</h1>
        <p className="pc2-sub">Chaque parcours mène d'une compétence brute à un certificat vérifiable. Tu progresses mission par mission.</p>
      </div>
      <div className="pc2-telemetry">
        <div className="pc2-telemetry__row">
          <span><b className="ip">2</b> en cours</span><span className="pc2-telemetry__sep" />
          <span><b className="cp">1</b> certifié</span><span className="pc2-telemetry__sep" />
          <span><b>9</b> à découvrir</span>
        </div>
        <div className="pc2-telemetry__rule" />
        <div className="pc2-telemetry__row">
          <span><b>248</b> H de contenu</span><span className="pc2-telemetry__sep" />
          <span><b>14 800</b> XP total</span>
        </div>
      </div>
    </header>
  );
}

function Filters({ category, setCategory }) {
  const pills = [
    { id: 'all', label: 'Tous', cls: 'all' },
    { id: 'cyber', label: 'Cybersec', cls: 'cyber' },
    { id: 'dev', label: 'Dev', cls: 'dev' },
    { id: 'net', label: 'Réseau', cls: 'net' },
  ];
  return (
    <div className="pc2-filters">
      <span className="pc2-filters__label">› DOMAINE</span>
      <div className="pc2-filters__group">
        {pills.map(p => (
          <button key={p.id} className={`pc2-pill pc2-pill--${p.cls} ${category === p.id ? 'is-active' : ''}`} onClick={() => setCategory(p.id)}>
            <span className="pc2-pill__dot" /><span>{p.label}</span>
          </button>
        ))}
      </div>
      <span className="pc2-filters__sep" />
      <label className="pc2-search">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input type="text" placeholder="/ chercher un parcours..." />
      </label>
    </div>
  );
}

function SectionLabel({ tag, count }) {
  return (
    <div className="pc2-section">
      <span className="pc2-section__tag">{tag}</span>
      {count && <span className="pc2-section__count">{count}</span>}
      <span className="pc2-section__rule" />
    </div>
  );
}

/* -------------------------------------------------------------------------- HERO */
function HeroPath({ p }) {
  const pct = Math.round((p.done / p.total) * 100);
  return (
    <article className={`hero-path hero-path--${kindClass(p.kind)}`}>
      <Brackets />
      <div className="hero-path__main">
        <div className="hero-path__topline">
          <span className="state-chip"><span className="state-chip__dot" />En cours</span>
          <span className="dom-tag"><span className="dom-tag__dot" />{p.cat}</span>
          <span className="diff-tag"><DiffBars level={p.diff} />{p.diffLabel}</span>
          <span className="refcode">// <b>{p.id}</b></span>
        </div>
        <h2 className="hero-path__title" dangerouslySetInnerHTML={{ __html: p.title }} />
        <p className="hero-path__desc">{p.desc}</p>
        <div className="hero-path__stats">
          <span><b>{p.missions}</b> missions</span><span className="sep">·</span>
          <span><b>{p.hours}</b></span><span className="sep">·</span>
          <span className="xp">+{p.xp} XP</span><span className="sep">·</span>
          <span className="cert">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="6" r="3"/><path d="M5.5 8.5 L4.5 14 L8 12 L11.5 14 L10.5 8.5"/></svg>
            Certificat
          </span>
        </div>
        <div className="hero-path__foot">
          <div className="hero-prog">
            <span><b>{p.done}</b> / {p.total} missions complétées</span>
            <span className="pct">{pct}%</span>
          </div>
          <div className="bar-thick"><div className="bar-thick__fill" style={{ width: `${pct}%` }} /></div>
          <div className="hero-path__cta-row">
            <a href="Path Detail v2.html" className="btn-primary">Continuer le parcours {ARROW}</a>
            <a href="#" className="btn-ghost">Aperçu</a>
          </div>
        </div>
      </div>
      <div className="hero-path__console">
        <div className="hero-glyph">
          <span className="hero-glyph__halo" />
          <KindGlyph kind={p.kind} size={132} />
        </div>
        {p.next && (
          <div className="hero-next">
            <div className="hero-next__lbl">Prochaine mission · {p.next.n}</div>
            <h3 className="hero-next__title">{p.next.title}</h3>
            <div className="hero-next__meta">
              <span>+{p.next.xp} XP · {p.next.dur}</span>
              <span className="go">Accéder →</span>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- ACTIVE (secondary) */
function ActiveCard({ p }) {
  const pct = Math.round((p.done / p.total) * 100);
  return (
    <article className={`active-card active-card--${kindClass(p.kind)}`}>
      <Brackets />
      <div className="active-card__glyph"><KindGlyph kind={p.kind} size={56} /></div>
      <div className="active-card__body">
        <div className="active-card__top">
          <span className="state-chip"><span className="state-chip__dot" />En cours</span>
          <span className="active-card__refcode">// <b>{p.id}</b></span>
        </div>
        <h3 className="active-card__title">{p.title}</h3>
        <div className="active-card__stats">
          <span><b>{p.missions}</b> missions</span><span className="sep">·</span>
          <span><b>{p.hours}</b></span><span className="sep">·</span>
          <span className="xp">+{p.xp} XP</span>
        </div>
        <div className="active-card__progline">
          <span><b>{p.done}</b> / {p.total} missions</span>
          <span className="pct">{pct}%</span>
        </div>
        <div className="bar-mid"><div className="bar-mid__fill" style={{ width: `${pct}%` }} /></div>
        <a href="Path Detail v2.html" className="active-card__cta">Continuer {ARROW}</a>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- TROPHY */
function TrophyCard({ p }) {
  return (
    <article className="trophy-card">
      <Brackets />
      <span className="trophy-card__seal">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="4.5"/><path d="M8 12.5 L6.5 21 L12 18 L17.5 21 L16 12.5"/></svg>
      </span>
      <div className="trophy-card__body">
        <div className="trophy-card__eyebrow">Certifié</div>
        <div className="trophy-card__refcode">// <b>{p.id}</b></div>
        <h3 className="trophy-card__title">{p.title}</h3>
        <div className="trophy-card__done">
          <span className="ck"><svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8 L7 12 L13 4"/></svg></span>
          Parcours complété · 100%
        </div>
        <div className="trophy-card__stats">
          <span><b>{p.missions}</b> missions</span><span className="sep">·</span>
          <span><b>{p.hours}</b></span><span className="sep">·</span>
          <span className="xp">+{p.xp} XP gagnés</span>
        </div>
      </div>
      <div className="trophy-card__foot">
        <a href="Certificate Template.html" className="btn-trophy">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="8"/><path d="M5 14 L6.5 12.5 M11 14 L9.5 12.5"/><circle cx="8" cy="8" r="1.6"/></svg>
          Voir le certificat
        </a>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- DISCOVER game card */
function GameCard({ p, hover }) {
  return (
    <article className={`game-card game-card--${kindClass(p.kind)} ${hover ? 'is-hover' : ''}`}>
      <Brackets />
      {hover && <span className="hover-tag">// État : survol</span>}
      <div className="game-card__cover">
        <span className="game-card__cat">{p.cat}</span>
        <span className="game-card__diff"><DiffBars level={p.diff} />{p.diffLabel}</span>
        <span className="game-card__glyph"><KindGlyph kind={p.kind} size={64} /></span>
        <span className="game-card__id">// <b>{p.id}</b></span>
      </div>
      <div className="game-card__body">
        <h3 className="game-card__title">{p.title}</h3>
        <p className="game-card__desc">{p.desc}</p>
        <div className="game-card__stats">
          <span><b>{p.missions}</b> miss.</span><span className="sep">·</span>
          <span><b>{p.hours}</b></span><span className="sep">·</span>
          <span className="xp">+{p.xp} XP</span>
        </div>
      </div>
      <div className="game-card__foot">
        <a href="Path Detail v2.html" className="btn-start">Commencer {ARROW}</a>
      </div>
    </article>
  );
}

function EmptyState({ category }) {
  return (
    <div className="pc2-empty">
      <div className="pc2-empty__glyph">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="12" width="32" height="26"/><path d="M8 18 H40 M14 25 H22 M14 30 H30"/><path d="M30 28 L40 38" stroke="currentColor" strokeWidth="1.4"/></svg>
      </div>
      <h3 className="pc2-empty__title">Aucun parcours dans ce domaine</h3>
      <p className="pc2-empty__sub">// 0 résultat pour le filtre « {category} »</p>
      <span className="pc2-empty__cmd"><span className="p">$</span> reset --filter=all</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
function Catalog() {
  const [category, setCategory] = React.useState('all');
  const filtered = category === 'all' ? PATHS : PATHS.filter(p => p.kind === category);

  const inprog = filtered.filter(p => p.state === 'inprog');
  const done = filtered.filter(p => p.state === 'done');
  const idle = filtered.filter(p => p.state === 'idle');

  const hero = inprog[0];
  const secondary = [...inprog.slice(1).map(p => ({ p, type: 'active' })), ...done.map(p => ({ p, type: 'trophy' }))];

  return (
    <main className="main">
      <div className="pc2">
        <Breadcrumb />
        <Header />
        <Filters category={category} setCategory={setCategory} />

        {filtered.length === 0 && <EmptyState category={category} />}

        {hero && (<>
          <SectionLabel tag="Reprendre" count={`// ${inprog.length} parcours actif${inprog.length > 1 ? 's' : ''}`} />
          <HeroPath p={hero} />
        </>)}

        {secondary.length > 0 && (<>
          <SectionLabel tag="Progression" count="// secondaires · certifiés" />
          <div className="pc2-duo">
            {secondary.map(({ p, type }) => type === 'active'
              ? <ActiveCard key={p.id} p={p} />
              : <TrophyCard key={p.id} p={p} />)}
          </div>
        </>)}

        {idle.length > 0 && (<>
          <SectionLabel tag="À découvrir" count={`// ${idle.length} parcours`} />
          <div className="pc2-discover">
            {idle.map((p, i) => <GameCard key={p.id} p={p} hover={i === 0} />)}
          </div>
        </>)}
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <V2Navbar />
      <V2Sidebar />
      <Catalog />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

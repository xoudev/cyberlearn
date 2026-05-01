// AdminDashboard.jsx — admin overview page

const STATS = [
  { lbl: 'Utilisateurs',      val: '1 247', delta: '+12 cette semaine', arrow: '↑' },
  { lbl: 'Leçons publiées',   val: '98',    delta: '+3 ce mois-ci',     arrow: '↑' },
  { lbl: 'Certificats émis',  val: '43',    delta: '+8 cette semaine',  arrow: '↑' },
  { lbl: 'Tickets ouverts',   val: '7',     delta: '2 critiques',       arrow: '!', danger: true },
];

function StatCard({ s }) {
  return (
    <div className={`adm-stat ${s.danger ? 'adm-stat--danger' : ''}`}>
      <span className="adm-stat__corner tl" />
      <span className="adm-stat__corner tr" />
      <span className="adm-stat__corner bl" />
      <span className="adm-stat__corner br" />
      <div className="adm-stat__lbl">// {s.lbl}</div>
      <div className="adm-stat__val">{s.val}</div>
      <div className="adm-stat__delta">
        <span className="arr">{s.arrow}</span>
        <span><b>{s.delta.split(' ')[0]}</b> {s.delta.split(' ').slice(1).join(' ')}</span>
      </div>
    </div>
  );
}

const ACTIVITY = [
  { type: 'create',  typeLabel: 'lesson.create',     actor: 'mlachance',    av: 'turq', avInit: 'ML', target: 'lesson · ',                  targetEm: 'CRY-018 · Hash & sel',                  ts: '14:28', dt: 'aujourd\'hui' },
  { type: 'update',  typeLabel: 'user.role.update',  actor: 'xoudark',      av: 'admin', avInit: 'XD', target: 'user · ',                   targetEm: '@nbouchard → MENTOR',                   ts: '13:51', dt: 'aujourd\'hui' },
  { type: 'publish', typeLabel: 'path.publish',      actor: 'xoudark',      av: 'admin', avInit: 'XD', target: 'path · ',                   targetEm: 'Pentester Web — v2.4',                  ts: '11:42', dt: 'aujourd\'hui' },
  { type: 'login',   typeLabel: 'admin.login',       actor: 'xoudark',      av: 'admin', avInit: 'XD', target: 'session · ',                targetEm: 'IP 192.168.4.27 · Paris',               ts: '09:08', dt: 'aujourd\'hui' },
  { type: 'delete',  typeLabel: 'lesson.delete',     actor: 'mlachance',    av: 'turq', avInit: 'ML', target: 'lesson · ',                  targetEm: 'DEV-013 · jQuery legacy (deprecated)',  ts: '18:33', dt: 'hier' },
  { type: 'create',  typeLabel: 'badge.create',      actor: 'pdupont',      av: 'gold', avInit: 'PD', target: 'badge · ',                   targetEm: 'EPI-005 · TLS Whisperer',               ts: '16:14', dt: 'hier' },
  { type: 'update',  typeLabel: 'ticket.assign',     actor: 'system',       av: 'blue', avInit: 'SY', target: 'ticket · ',                  targetEm: 'TKT-0119 → @mlachance',                 ts: '15:47', dt: 'hier' },
];

function ActivityRow({ a }) {
  return (
    <tr>
      <td>
        <span className={`act-tag act-tag--${a.type}`}>{a.typeLabel}</span>
      </td>
      <td>
        <span className="actor">
          <span className={`actor__avatar actor__avatar--${a.av}`}>{a.avInit}</span>
          @{a.actor}
        </span>
      </td>
      <td className="target">
        {a.target}<span className="target__path">{a.targetEm}</span>
      </td>
      <td>
        <span className="ts"><b>{a.ts}</b> · {a.dt}</span>
      </td>
    </tr>
  );
}

const USERS = [
  { user: '@xoudark',   email: 'xavier@cyberlearn.app',  role: 'admin',   roleLabel: 'ADMIN',   lvl: 22, since: '02 avr 2024', av: 'admin', avInit: 'XD' },
  { user: '@mlachance', email: 'marie@cyberlearn.app',   role: 'mentor',  roleLabel: 'MENTOR',  lvl: 18, since: '14 jun 2024', av: 'gold',  avInit: 'ML' },
  { user: '@nbouchard', email: 'noemie.b@gmail.com',     role: 'student', roleLabel: 'STUDENT', lvl: 14, since: '21 sep 2024', av: 'blue',  avInit: 'NB' },
  { user: '@pdupont',   email: 'p.dupont@outlook.fr',    role: 'student', roleLabel: 'STUDENT', lvl: 11, since: '03 nov 2024', av: 'turq',  avInit: 'PD' },
  { user: '@kazima',    email: 'kazima@protonmail.com',  role: 'student', roleLabel: 'STUDENT', lvl:  8, since: '18 fév 2026', av: 'blue',  avInit: 'KA' },
  { user: '@yoann_h',   email: 'y.huet@laposte.net',     role: 'student', roleLabel: 'STUDENT', lvl:  5, since: '24 avr 2026', av: 'turq',  avInit: 'YH' },
];

function UserRow({ u }) {
  return (
    <tr>
      <td>
        <span className="actor">
          <span className={`actor__avatar actor__avatar--${u.av}`}>{u.avInit}</span>
          {u.user}
        </span>
      </td>
      <td><span className="email">{u.email}</span></td>
      <td><span className={`role role--${u.role}`}>{u.roleLabel}</span></td>
      <td><span className="lvl">{u.lvl.toString().padStart(2, '0')}</span></td>
      <td><span className="ts">{u.since}</span></td>
    </tr>
  );
}

function Apercu() {
  return (
    <main className="main">
      <div className="adm">
        <div className="adm-crumb">
          <span className="p">$</span>
          <span>~/</span><b>cyberlearn</b>
          <span className="slash">/</span><b>admin</b>
          <span className="slash">/</span><span className="current">aperçu</span>
          <span className="caret" />
        </div>

        <header className="adm-head">
          <div>
            <h1 className="adm-title">Aperçu <em>// admin</em></h1>
            <div className="adm-sub">
              <span className="live">SYSTÈME OPÉRATIONNEL</span>
              {'  '}·{'  '}dernière synchro <b>il y a 12s</b>
              {'  '}·{'  '}<b>3</b> admins en ligne
            </div>
          </div>
        </header>

        <div className="adm-stats">
          {STATS.map((s, i) => <StatCard key={i} s={s} />)}
        </div>

        <div className="adm-alert">
          <span className="adm-alert__icon">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2 L14 13 H2 Z"/><path d="M8 6 V9"/><circle cx="8" cy="11.5" r="0.6" fill="currentColor"/></svg>
          </span>
          <div className="adm-alert__body">
            <div className="adm-alert__title">⚠ 7 tickets en attente</div>
            <div className="adm-alert__desc">2 critiques (sandbox CTF down · paiement échoué) — premier ticket ouvert il y a 4h17.</div>
          </div>
          <a href="#" className="adm-alert__cta">Voir les tickets →</a>
        </div>

        <div className="adm-actions">
          <a href="#" className="qa-btn qa-btn--primary">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 V13 M3 8 H13"/></svg>
            Nouvelle leçon →
          </a>
          <a href="#" className="qa-btn">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 V13 H13 V11"/><path d="M5 8 L8 11 L11 8"/><path d="M8 11 V3"/></svg>
            Importer MDX →
          </a>
          <a href="#" className="qa-btn">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5 V7 C2.8 7 3.5 7.7 3.5 8.5 C3.5 9.3 2.8 10 2 10 V12 H14 V10 C13.2 10 12.5 9.3 12.5 8.5 C12.5 7.7 13.2 7 14 7 V5 Z"/></svg>
            Voir les tickets →
          </a>
        </div>

        <div className="adm-grid">
          <section className="adm-panel">
            <div className="adm-panel__head">
              <h2 className="adm-panel__title">// activité <b>récente</b></h2>
              <a href="#" className="adm-panel__more">Voir audit log →</a>
            </div>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Action</th><th>Acteur</th><th>Cible</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {ACTIVITY.map((a, i) => <ActivityRow key={i} a={a} />)}
              </tbody>
            </table>
          </section>

          <section className="adm-panel">
            <div className="adm-panel__head">
              <h2 className="adm-panel__title">// <b>nouveaux</b> utilisateurs</h2>
              <a href="#" className="adm-panel__more">Tous →</a>
            </div>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Username</th><th>Email</th><th>Rôle</th><th>Lvl</th><th>Inscrit</th>
                </tr>
              </thead>
              <tbody>
                {USERS.map((u) => <UserRow key={u.user} u={u} />)}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <AdminNavbar />
      <AdminSidebar />
      <Apercu />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

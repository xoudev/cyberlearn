// ProfileEdit.jsx — Cyber Learn profile edit page

const MAX_BIO = 280;

const AvatarGlyph = ({ name }) => {
  const s = { width: 26, height: 26, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'skull':  return (<svg viewBox="0 0 24 24" {...s}><path d="M5 11 C5 6.6 8 4 12 4 C16 4 19 6.6 19 11 V14 L17 16 V19 H14 V17 H10 V19 H7 V16 L5 14 Z"/><circle cx="9" cy="11" r="1.4" fill="currentColor"/><circle cx="15" cy="11" r="1.4" fill="currentColor"/><path d="M11 14 L12 16 L13 14"/></svg>);
    case 'ghost':  return (<svg viewBox="0 0 24 24" {...s}><path d="M5 11 C5 6.6 8 4 12 4 C16 4 19 6.6 19 11 V20 L17 18 L15 20 L13 18 L11 20 L9 18 L7 20 L5 18 Z"/><circle cx="9.5" cy="11" r="1" fill="currentColor"/><circle cx="14.5" cy="11" r="1" fill="currentColor"/></svg>);
    case 'matrix': return (<svg viewBox="0 0 24 24" {...s}><path d="M5 4 V20 M9 4 V20 M13 4 V20 M17 4 V20 M19 4 V20"/><path d="M5 8 H7 M9 12 H11 M13 6 H15 M17 14 H19 M5 16 H7 M13 18 H15"/></svg>);
    case 'circuit':return (<svg viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="2.5"/><path d="M12 4 V9.5 M12 14.5 V20 M4 12 H9.5 M14.5 12 H20"/><circle cx="12" cy="4" r="1.2" fill="currentColor"/><circle cx="20" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="20" r="1.2" fill="currentColor"/><circle cx="4" cy="12" r="1.2" fill="currentColor"/></svg>);
    case 'bug':    return (<svg viewBox="0 0 24 24" {...s}><rect x="8" y="9" width="8" height="10" rx="3"/><path d="M9 13 H5 M15 13 H19 M9 9 L6 6 M15 9 L18 6 M9 18 L6 21 M15 18 L18 21"/><path d="M10 6 C10 4.5 11 3.5 12 3.5 C13 3.5 14 4.5 14 6"/></svg>);
    case 'key':    return (<svg viewBox="0 0 24 24" {...s}><circle cx="8" cy="12" r="4"/><path d="M12 12 H21 M18 12 V15 M15 12 V14"/></svg>);
    case 'shield': return (<svg viewBox="0 0 24 24" {...s}><path d="M12 3 L20 6 V12 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 12 V6 Z"/><path d="M9 12 L11 14 L15 10"/></svg>);
    case 'wire':   return (<svg viewBox="0 0 24 24" {...s}><path d="M4 12 C4 8 6 6 9 6 C12 6 13 9 13 12 C13 15 14 18 17 18 C19 18 20 16 20 14"/><circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="20" cy="14" r="1.2" fill="currentColor"/></svg>);
    default: return null;
  }
};

const AVATARS = ['skull','ghost','matrix','circuit','bug','key','shield','wire'];

function Breadcrumb() {
  return (
    <div className="pe-breadcrumb">
      <span className="p">$</span>
      <span>~/</span><b>cyberlearn</b>
      <span className="slash">/</span><span>profil</span>
      <span className="slash">/</span><span className="current">éditer</span>
      <span className="caret" />
    </div>
  );
}

function CardCorners() {
  return (
    <React.Fragment>
      <span className="pe-card__corner tl" />
      <span className="pe-card__corner tr" />
      <span className="pe-card__corner bl" />
      <span className="pe-card__corner br" />
    </React.Fragment>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div className="pe-label">
      <span><span className="chev">›</span><span className="name">{children}</span></span>
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function HexAvatar({ initials = 'XD' }) {
  return (
    <div className="pe-hex">
      <div className="pe-hex__inner">
        <span className="pe-hex__mono">{initials}</span>
      </div>
      <span className="pe-hex__caption">// actuel</span>
    </div>
  );
}

function AvatarPicker({ value, onChange }) {
  return (
    <div className="pe-avatar-row">
      <HexAvatar initials="XD" />
      <div className="pe-avatar-grid">
        {AVATARS.map(a => (
          <button
            key={a}
            type="button"
            className={`pe-avopt ${value === a ? 'is-selected' : ''}`}
            onClick={() => onChange(a)}
            aria-label={`Avatar ${a}`}
          >
            <AvatarGlyph name={a} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ImportRow() {
  return (
    <button type="button" className="pe-btn-ghost" style={{padding: '10px 18px', fontSize: 11}}>
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2 V10 M5 5 L8 2 L11 5 M2 12 V14 H14 V12"/>
      </svg>
      Importer
    </button>
  );
}

function VisibilityToggle({ value, onChange }) {
  return (
    <div className="pe-toggle" role="tablist">
      <button type="button" className={value === 'public' ? 'is-on' : ''} onClick={() => onChange('public')}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6"/><path d="M2 8 H14 M8 2 C10 4 10 12 8 14 C6 12 6 4 8 2"/>
        </svg>
        Profil public
      </button>
      <button type="button" className={value === 'private' ? 'is-on' : ''} onClick={() => onChange('private')}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7 V5 C5 3.3 6.3 2 8 2 C9.7 2 11 3.3 11 5 V7"/>
        </svg>
        Profil privé
      </button>
    </div>
  );
}

function ThemeToggle({ value, onChange }) {
  return (
    <div className="pe-toggle" role="tablist">
      <button type="button" className={value === 'dark' ? 'is-on' : ''} onClick={() => onChange('dark')}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 9.5 C12 11.5 9.8 13 7.5 13 C4.5 13 2.5 10.7 2.5 8 C2.5 5.7 4 3.7 6 2.7 C5.6 4 5.7 5.5 6.5 6.7 C8 9 11 9.7 13 9.5 Z"/>
        </svg>
        Sombre
      </button>
      <button type="button" className={value === 'light' ? 'is-on' : ''} onClick={() => onChange('light')}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="3"/>
          <path d="M8 2 V3.5 M8 12.5 V14 M2 8 H3.5 M12.5 8 H14 M3.8 3.8 L4.8 4.8 M11.2 11.2 L12.2 12.2 M3.8 12.2 L4.8 11.2 M11.2 4.8 L12.2 3.8"/>
        </svg>
        Clair
      </button>
    </div>
  );
}

function ProfileEdit() {
  const [name, setName] = React.useState('Xavier Doudou');
  const [handle, setHandle] = React.useState('xoudark');
  const [bio, setBio] = React.useState(
    "Apprenti red team, je touche un peu à tout — du nmap aux buffer overflows. Ici pour grinder les CTF et me certifier avant la fin de l'année."
  );
  const [avatar, setAvatar] = React.useState('skull');
  const [visibility, setVisibility] = React.useState('public');
  const [theme, setTheme] = React.useState('dark');

  const counterClass =
    bio.length > MAX_BIO ? 'is-over' :
    bio.length > MAX_BIO - 40 ? 'is-warn' : '';

  return (
    <main className="main">
      <div className="pe-wrap">
        <Breadcrumb />

        <h1 className="pe-title">
          <span className="chev">&gt;</span>
          <span className="typed">MODIFIER TON IDENTITÉ</span>
        </h1>
        <p className="pe-sub">Session · @xoudark · session sécurisée</p>

        <div className="pe-card">
          <CardCorners />
          <span className="pe-card__eyebrow">// IDENTITY.CONFIG · <b>EDIT</b></span>

          {/* NOM AFFICHÉ */}
          <div className="pe-field">
            <FieldLabel hint="visible publiquement">NOM AFFICHÉ</FieldLabel>
            <input
              className="pe-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton nom"
            />
          </div>

          {/* IDENTIFIANT */}
          <div className="pe-field">
            <FieldLabel hint="3–20 caractères · lettres, chiffres, _">IDENTIFIANT</FieldLabel>
            <div className="pe-id-row">
              <div className="pe-id">
                <span className="pe-id__at">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="identifiant"
                  spellCheck={false}
                  autoCapitalize="off"
                />
              </div>
              <div className="pe-status">Disponible</div>
            </div>
          </div>

          {/* BIO */}
          <div className="pe-field">
            <FieldLabel hint="markdown léger autorisé">BIO</FieldLabel>
            <div className="pe-textarea-wrap">
              <textarea
                className="pe-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={MAX_BIO + 50}
                placeholder="Parle de toi en quelques lignes…"
              />
              <span className={`pe-counter ${counterClass}`}>
                <b>{bio.length}</b> / {MAX_BIO}
              </span>
            </div>
          </div>

          {/* AVATAR */}
          <div className="pe-field">
            <FieldLabel hint="hex · 8 presets ou import">AVATAR</FieldLabel>
            <AvatarPicker value={avatar} onChange={setAvatar} />
            <div style={{marginTop: 14}}>
              <ImportRow />
            </div>
          </div>

          {/* VISIBILITÉ */}
          <div className="pe-field">
            <FieldLabel hint="qui peut voir ton parcours">VISIBILITÉ DU PROFIL</FieldLabel>
            <VisibilityToggle value={visibility} onChange={setVisibility} />
          </div>

          {/* THÈME */}
          <div className="pe-field">
            <FieldLabel hint="préférence d'affichage">THÈME</FieldLabel>
            <ThemeToggle value={theme} onChange={setTheme} />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="pe-actions">
          <span className="pe-actions__hint">Modifications non sauvegardées</span>
          <button type="button" className="pe-btn-ghost">Annuler</button>
          <button type="button" className="pe-btn-primary">
            Sauvegarder <span className="arrow">→</span>
          </button>
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
      <ProfileEdit />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

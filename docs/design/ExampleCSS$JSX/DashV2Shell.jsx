// DashV2Shell.jsx — Navbar + Sidebar (editorial variant)
function V2Navbar() {
  return (
    <header className="navbar">
      <a href="#" className="navbar__brand">
        <div className="navbar__logo-mark">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" fill="#0AFFD4"/>
          </svg>
        </div>
        <div className="navbar__brand-name">cyber<span>learn</span></div>
        <div className="navbar__status">
          <span className="navbar__status-dot" />
          OPS · FR
        </div>
      </a>

      <div className="navbar__search">
        <svg className="navbar__search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input type="text" placeholder="/ search lessons, paths, badges" />
        <span className="navbar__search-kbd">⌘K</span>
      </div>

      <div className="navbar__actions">
        <button className="icon-btn" aria-label="Notifications">
          <svg width="15" height="15" viewBox="0 0 17 17" fill="none">
            <path d="M8.5 2 C6 2 4.5 3.8 4.5 6.2 V8.5 L3 10.5 V11.5 H14 V10.5 L12.5 8.5 V6.2 C12.5 3.8 11 2 8.5 2 Z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 13 C7 14 7.7 14.5 8.5 14.5 C9.3 14.5 10 14 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span className="icon-btn__dot" />
        </button>
        <div className="level-pill">
          <div className="level-pill__avatar">JD</div>
          <span className="level-pill__level">LVL·14</span>
        </div>
      </div>
    </header>
  );
}

function V2Sidebar() {
  const items = [
    { label: 'Dashboard', icon: 'dashboard', active: false, count: null },
    { label: 'Leçons', icon: 'book', active: false, count: 142 },
    { label: 'Parcours', icon: 'route', active: true, count: 12 },
    { label: 'Badges', icon: 'badge', active: false, count: 27 },
    { label: 'Certificats', icon: 'cert', active: false, count: null },
  ];
  const Icon = ({ name }) => {
    const s = { width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch (name) {
      case 'dashboard': return (<svg viewBox="0 0 16 16" {...s}><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>);
      case 'book': return (<svg viewBox="0 0 16 16" {...s}><path d="M2.5 3 H8 V13 H3.5 C3 13 2.5 13.5 2.5 14 V3 Z"/><path d="M13.5 3 H8 V13 H12.5 C13 13 13.5 13.5 13.5 14 V3 Z"/></svg>);
      case 'route': return (<svg viewBox="0 0 16 16" {...s}><circle cx="4" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="M4 4.5 V8 C4 10 6 10 8 10 C10 10 12 10 12 11.5"/></svg>);
      case 'badge': return (<svg viewBox="0 0 16 16" {...s}><path d="M8 1.5 L10 3 L12.5 2.7 L13 5.2 L14.5 7 L13 8.8 L12.5 11.3 L10 11 L8 12.5 L6 11 L3.5 11.3 L3 8.8 L1.5 7 L3 5.2 L3.5 2.7 L6 3 Z"/><circle cx="8" cy="7" r="2"/></svg>);
      case 'cert': return (<svg viewBox="0 0 16 16" {...s}><rect x="2" y="3" width="12" height="8"/><path d="M5 13.5 L6.5 11.5"/><path d="M11 13.5 L9.5 11.5"/><circle cx="8" cy="7" r="1.5"/></svg>);
      default: return null;
    }
  };
  return (
    <aside className="sidebar">
      <div className="sidebar__section-label">Apprendre</div>
      <nav className="sidebar__nav">
        {items.map((it) => (
          <a key={it.label} href="#" className={`nav-link ${it.active ? 'is-active' : ''}`}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.count != null && <span className="nav-link__count">{it.count}</span>}
          </a>
        ))}
      </nav>
      <div className="sidebar__section-label">Activité</div>
      <nav className="sidebar__nav">
        <a href="#" className="nav-link"><Icon name="cert" /><span>Classement</span></a>
        <a href="#" className="nav-link"><Icon name="badge" /><span>Défis</span><span className="nav-link__count">3</span></a>
      </nav>
      <div className="sidebar__footer">
        <div className="xp-mini__header">
          <span className="xp-mini__level">LVL · 14</span>
          <span className="xp-mini__value">2840/3500</span>
        </div>
        <div className="xp-bar"><div className="xp-bar__fill" style={{ width: '81%' }} /></div>
        <div className="xp-mini__next"><b>+660 XP</b> → LVL·15</div>
      </div>
    </aside>
  );
}

window.V2Navbar = V2Navbar;
window.V2Sidebar = V2Sidebar;

// AdminShell.jsx — distinct admin navbar + sidebar

function AdminNavbar() {
  return (
    <header className="navbar admin-navbar">
      <a href="#" className="navbar__brand">
        <div className="navbar__logo-mark admin-navbar__logo">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" fill="#FF4D6D"/>
          </svg>
        </div>
        <div className="navbar__brand-name">cyber<span>learn</span></div>
        <div className="admin-navbar__tag">// ADMIN PANEL</div>
        <div className="navbar__status admin-navbar__status">
          <span className="navbar__status-dot" />
          admin.cyberlearn.fr
        </div>
      </a>

      <div className="navbar__search admin-navbar__search">
        <svg className="navbar__search-icon" width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input type="text" placeholder="/ search users, lessons, audit log..." />
        <span className="navbar__search-kbd">⌘K</span>
      </div>

      <div className="navbar__actions">
        <button className="icon-btn" aria-label="Notifications">
          <svg width="15" height="15" viewBox="0 0 17 17" fill="none">
            <path d="M8.5 2 C6 2 4.5 3.8 4.5 6.2 V8.5 L3 10.5 V11.5 H14 V10.5 L12.5 8.5 V6.2 C12.5 3.8 11 2 8.5 2 Z" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 13 C7 14 7.7 14.5 8.5 14.5 C9.3 14.5 10 14 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span className="icon-btn__dot icon-btn__dot--danger" />
        </button>
        <div className="admin-pill">
          <div className="admin-pill__avatar">XD</div>
          <span className="admin-pill__name">@xoudark</span>
          <span className="admin-pill__role">ADMIN</span>
        </div>
      </div>
    </header>
  );
}

function AdminSidebar() {
  const items = [
    { label: 'Aperçu',      icon: 'dash',    active: true,  count: null },
    { label: 'Leçons',      icon: 'book',    active: false, count: 98 },
    { label: 'Parcours',    icon: 'route',   active: false, count: 12 },
    { label: 'Badges',      icon: 'badge',   active: false, count: 47 },
    { label: 'Utilisateurs',icon: 'users',   active: false, count: 1247 },
    { label: 'Tickets',     icon: 'ticket',  active: false, count: 7, danger: true },
    { label: 'Audit Log',   icon: 'log',     active: false, count: null },
    { label: 'Paramètres',  icon: 'cog',     active: false, count: null },
  ];
  const Icon = ({ name }) => {
    const s = { width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch (name) {
      case 'dash':   return (<svg viewBox="0 0 16 16" {...s}><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>);
      case 'book':   return (<svg viewBox="0 0 16 16" {...s}><path d="M2.5 3 H8 V13 H3.5 C3 13 2.5 13.5 2.5 14 V3 Z"/><path d="M13.5 3 H8 V13 H12.5 C13 13 13.5 13.5 13.5 14 V3 Z"/></svg>);
      case 'route':  return (<svg viewBox="0 0 16 16" {...s}><circle cx="4" cy="3" r="1.5"/><circle cx="12" cy="13" r="1.5"/><path d="M4 4.5 V8 C4 10 6 10 8 10 C10 10 12 10 12 11.5"/></svg>);
      case 'badge':  return (<svg viewBox="0 0 16 16" {...s}><path d="M8 1.5 L10 3 L12.5 2.7 L13 5.2 L14.5 7 L13 8.8 L12.5 11.3 L10 11 L8 12.5 L6 11 L3.5 11.3 L3 8.8 L1.5 7 L3 5.2 L3.5 2.7 L6 3 Z"/><circle cx="8" cy="7" r="2"/></svg>);
      case 'users':  return (<svg viewBox="0 0 16 16" {...s}><circle cx="6" cy="6" r="2.5"/><path d="M2 14 C2 11.5 4 10 6 10 C8 10 10 11.5 10 14"/><circle cx="11.5" cy="6.5" r="2"/><path d="M14.5 13 C14.5 11 12.5 10.5 11.5 10.5"/></svg>);
      case 'ticket': return (<svg viewBox="0 0 16 16" {...s}><path d="M2 5 V7 C2.8 7 3.5 7.7 3.5 8.5 C3.5 9.3 2.8 10 2 10 V12 H14 V10 C13.2 10 12.5 9.3 12.5 8.5 C12.5 7.7 13.2 7 14 7 V5 Z"/><path d="M6 5 V12 M10 5 V12" strokeDasharray="1.5 1.5"/></svg>);
      case 'log':    return (<svg viewBox="0 0 16 16" {...s}><rect x="2.5" y="2" width="11" height="12"/><path d="M5 5 H11 M5 8 H11 M5 11 H8.5"/></svg>);
      case 'cog':    return (<svg viewBox="0 0 16 16" {...s}><circle cx="8" cy="8" r="2"/><path d="M8 1.5 V3 M8 13 V14.5 M14.5 8 H13 M3 8 H1.5 M12.6 3.4 L11.5 4.5 M4.5 11.5 L3.4 12.6 M12.6 12.6 L11.5 11.5 M4.5 4.5 L3.4 3.4"/></svg>);
      default: return null;
    }
  };
  return (
    <aside className="sidebar admin-sidebar">
      <div className="sidebar__section-label admin-sidebar__label">// ADMIN</div>
      <nav className="sidebar__nav">
        {items.slice(0, 6).map((it) => (
          <a key={it.label} href="#" className={`nav-link admin-nav-link ${it.active ? 'is-active' : ''} ${it.danger ? 'is-danger' : ''}`}>
            <Icon name={it.icon} />
            <span>{it.label}</span>
            {it.count != null && (
              <span className={`nav-link__count ${it.danger ? 'is-danger' : ''}`}>{it.count}</span>
            )}
          </a>
        ))}
      </nav>
      <div className="sidebar__section-label admin-sidebar__label">// SYSTÈME</div>
      <nav className="sidebar__nav">
        {items.slice(6).map((it) => (
          <a key={it.label} href="#" className="nav-link admin-nav-link">
            <Icon name={it.icon} />
            <span>{it.label}</span>
          </a>
        ))}
      </nav>
      <div className="sidebar__footer admin-sidebar__footer">
        <div className="admin-foot">
          <div className="admin-foot__avatar">XD</div>
          <div className="admin-foot__meta">
            <div className="admin-foot__name">@xoudark</div>
            <div className="admin-foot__email">xavier@cyberlearn.fr</div>
          </div>
          <span className="admin-foot__role">ADMIN</span>
        </div>
        <button className="admin-foot__logout">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3 H4 V13 H9"/><path d="M11 5 L14 8 L11 11 M14 8 H7"/></svg>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

window.AdminNavbar = AdminNavbar;
window.AdminSidebar = AdminSidebar;

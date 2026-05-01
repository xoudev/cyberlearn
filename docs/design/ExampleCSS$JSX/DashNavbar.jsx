// DashNavbar.jsx — Top navigation bar (shared shell)
function DashNavbar() {
  return (
    <header className="navbar">
      <a href="#" className="navbar__brand">
        <div className="navbar__logo-mark">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 4 L7 1 L12 4 L12 10 L7 13 L2 10 Z" stroke="url(#lg)" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="1.8" fill="#0AFFD4"/>
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="14" y2="14">
                <stop offset="0" stopColor="#0024FF"/>
                <stop offset="1" stopColor="#0AFFD4"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="navbar__brand-name">cyber<span>learn</span></div>
      </a>

      <div className="navbar__search">
        <svg className="navbar__search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input type="text" placeholder="Rechercher une leçon, un parcours, un badge…" />
        <span className="navbar__search-kbd">⌘ K</span>
      </div>

      <div className="navbar__actions">
        <button className="icon-btn" aria-label="Notifications">
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <path d="M8.5 2 C6 2 4.5 3.8 4.5 6.2 V8.5 L3 10.5 V11.5 H14 V10.5 L12.5 8.5 V6.2 C12.5 3.8 11 2 8.5 2 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <path d="M7 13 C7 14 7.7 14.5 8.5 14.5 C9.3 14.5 10 14 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <span className="icon-btn__dot" />
        </button>
        <div className="level-pill">
          <div className="level-pill__avatar">JD</div>
          <span className="level-pill__level">Niv. 14</span>
        </div>
      </div>
    </header>
  );
}

window.DashNavbar = DashNavbar;

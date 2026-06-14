// CertVerify.jsx — Public certificate verification page

function CertNav() {
  return (
    <nav className="cert-nav">
      <a href="#" className="cert-nav__brand">
        <div className="cert-nav__mark">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" fill="#0AFFD4"/>
          </svg>
        </div>
        <span className="cert-nav__name">cyber<span>learn</span></span>
      </a>
      <span className="cert-nav__pub">Vérification publique</span>
    </nav>
  );
}

function MetaBar({ id }) {
  return (
    <div className="cert-meta">
      <span className="p">$</span>
      <span>~/</span><span className="seg">cyberlearn</span>
      <span className="slash">/</span><span className="seg">verify</span>
      <span className="slash">/</span><span className="id">{id}</span>
      <span className="cert-meta__right">v1 · API public</span>
    </div>
  );
}

function StatusBanner({ revoked }) {
  if (revoked) {
    return (
      <div className="status-banner status-banner--revoked">
        <div className="status-banner__left">
          <div className="status-banner__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>
          </div>
          <div>
            <h2 className="status-banner__title">✗ Certificat révoqué</h2>
            <div className="status-banner__sub">Ce certificat n'est plus valide</div>
          </div>
        </div>
        <div className="status-banner__right">
          <b>Révoqué le 22/04/2026</b>
          <div>14:08 UTC</div>
        </div>
      </div>
    );
  }
  return (
    <div className="status-banner">
      <div className="status-banner__left">
        <div className="status-banner__icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12 L10 17 L19 7"/></svg>
        </div>
        <div>
          <h2 className="status-banner__title">✓ Certificat valide</h2>
          <div className="status-banner__sub">Authenticité confirmée par signature SHA-256</div>
        </div>
      </div>
      <div className="status-banner__right">
        <b>Vérifié le 29/04/2026</b>
        <div>14:32 UTC</div>
      </div>
    </div>
  );
}

function QR() {
  // deterministic finder-pattern style QR
  const cells = Array.from({ length: 100 }, (_, i) => {
    const x = i % 10, y = Math.floor(i / 10);
    const inFinder = (cx, cy) => x >= cx && x < cx + 3 && y >= cy && y < cy + 3;
    const isFinder = inFinder(0,0) || inFinder(7,0) || inFinder(0,7);
    if (isFinder) {
      const lx = x % 7, ly = y % 7;
      const fx = lx >= 7 ? lx - 7 : lx;
      const fy = ly >= 7 ? ly - 7 : ly;
      return (fx === 0 || fx === 2 || fy === 0 || fy === 2 || (fx === 1 && fy === 1));
    }
    return ((x * 7 + y * 11 + x*y*3) % 5 < 2);
  });
  return (
    <div className="cert-doc__qr">
      {cells.map((on, i) => <span key={i} className={on ? 'on' : ''} />)}
    </div>
  );
}

function CertDoc({ revoked }) {
  return (
    <div className={`cert-doc ${revoked ? 'cert-doc--revoked' : ''}`}>
      <span className="cert-doc__corner tl" />
      <span className="cert-doc__corner tr" />
      <span className="cert-doc__corner bl" />
      <span className="cert-doc__corner br" />

      <div className="cert-doc__head">
        <div className="cert-doc__brand">
          <div className="cert-doc__mark">
            <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.5" fill="#030219"/>
            </svg>
          </div>
          <div className="cert-doc__brand-text">
            <span className="cert-doc__brand-name">cyber<span>learn</span></span>
            <span className="cert-doc__kind">Certificat de complétion</span>
          </div>
        </div>
        <div className="cert-doc__id">
          <span className="cert-doc__id-label">Certificat N°</span>
          <span className="cert-doc__id-value">CYL-2026-03-0184</span>
        </div>
      </div>

      <div className="cert-doc__body">
        <div className="cert-doc__intro">// Décerné à</div>
        <h1 className="cert-doc__name">Xavier Doudou</h1>
        <div className="cert-doc__handle">@xoudark</div>

        <div className="cert-doc__path-label">Pour avoir complété le parcours</div>
        <h2 className="cert-doc__path">Pentester Web — de zéro à CTF</h2>

        <div className="cert-doc__meta-row">
          <div className="cert-doc__meta-cell">
            <div className="lbl">Délivré le</div>
            <div className="val">14 Mars 2026</div>
          </div>
          <div className="cert-doc__meta-cell cert-doc__meta-cell--score">
            <div className="lbl">Score final</div>
            <div className="val">92<span className="denom"> / 100</span></div>
          </div>
          <div className="cert-doc__meta-cell">
            <div className="lbl">Missions</div>
            <div className="val">24 / 24</div>
          </div>
        </div>
      </div>

      <div className="cert-doc__foot">
        <div>
          <div className="cert-doc__hash-label">Empreinte cryptographique</div>
          <div className="cert-doc__hash">
            <b>SHA-256</b><br/>
            7f3a9e2c4b1d8f6a · 5e2b0c9d3a4f1e8b<br/>
            6c5d2a9f0e3b7c4d · 8a1b3f5c7e9d2406
          </div>
        </div>
        <div className="cert-doc__qr-block">
          <QR />
          <span className="cert-doc__qr-cap">Scanner pour vérifier</span>
        </div>
      </div>
    </div>
  );
}

function Actions({ revoked }) {
  return (
    <div className="cert-actions">
      <a href="#" className="cert-btn cert-btn--primary">
        Télécharger le PDF
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2 V11 M4 7 L8 11 L12 7 M3 14 H13"/></svg>
      </a>
      <a href="#" className="cert-btn cert-btn--ghost">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="4" cy="8" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><path d="M5.7 7 L10.3 4.6 M5.7 9 L10.3 11.4"/></svg>
        Partager
      </a>
    </div>
  );
}

function MetadataGrid() {
  const cells = [
    { lbl: 'Plateforme', val: 'Cyber Learn' },
    { lbl: 'Émetteur', val: 'cyberlearn.fr' },
    { lbl: 'Algorithme', val: 'SHA-256' },
    { lbl: 'Expiration', val: 'Aucune' },
  ];
  return (
    <div className="cert-meta-grid">
      {cells.map(c => (
        <div key={c.lbl} className="cert-meta-cell">
          <div className="lbl">{c.lbl}</div>
          <div className="val">{c.val}</div>
        </div>
      ))}
    </div>
  );
}

function RevokedReason() {
  return (
    <div className="cert-revoked-reason">
      <div className="cert-revoked-reason__icon">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 4 V9 M8 11.5 V12"/></svg>
      </div>
      <div className="cert-revoked-reason__body">
        <b>// REVOKE.LOG</b>
        Révoqué le 22/04/2026 — Raison : <span style={{color: '#fff'}}>violation des conditions d'utilisation</span>.<br/>
        Ce certificat a été retiré du registre public et ne peut plus être utilisé comme preuve de complétion.
      </div>
    </div>
  );
}

function App() {
  const [revoked, setRevoked] = React.useState(false);
  return (
    <div className="cert-page">
      <CertNav />
      <MetaBar id="CYL-2026-03-0184" />
      <StatusBanner revoked={revoked} />
      <div className="cert-wrap">
        <CertDoc revoked={revoked} />
        {!revoked && <Actions />}
        {revoked && <RevokedReason />}
        <MetadataGrid />
      </div>
      <div className="cert-toggle" role="tablist" aria-label="Demo state">
        <button className={`cert-toggle__btn ${!revoked ? 'is-active' : ''}`} onClick={() => setRevoked(false)}>Valide</button>
        <button className={`cert-toggle__btn ${revoked ? 'is-active' : ''}`} onClick={() => setRevoked(true)}>Révoqué</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

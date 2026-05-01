// DashV2Paths.jsx — Featured path + secondary path
function NetworkGraph() {
  // SVG network graph — depth/visual interest
  const nodes = [
    { id: 'c', x: 420, y: 220, r: 28, kind: 'core' },
    { id: 'n1', x: 240, y: 110, r: 14, kind: 'done' },
    { id: 'n2', x: 320, y: 80, r: 12, kind: 'done' },
    { id: 'n3', x: 560, y: 90, r: 14, kind: 'open' },
    { id: 'n4', x: 680, y: 150, r: 12, kind: 'open' },
    { id: 'n5', x: 200, y: 250, r: 12, kind: 'done' },
    { id: 'n6', x: 150, y: 350, r: 14, kind: 'open' },
    { id: 'n7', x: 290, y: 400, r: 12, kind: 'open' },
    { id: 'n8', x: 540, y: 380, r: 14, kind: 'open' },
    { id: 'n9', x: 700, y: 320, r: 12, kind: 'open' },
    { id: 'n10', x: 440, y: 60, r: 10, kind: 'done' },
    { id: 'n11', x: 640, y: 250, r: 10, kind: 'open' },
  ];
  const edges = [
    ['c','n1'], ['c','n2'], ['c','n3'], ['c','n4'], ['c','n5'],
    ['c','n6'], ['c','n7'], ['c','n8'], ['c','n9'], ['c','n10'], ['c','n11'],
    ['n1','n2'], ['n1','n5'], ['n5','n6'], ['n6','n7'], ['n3','n10'],
    ['n3','n4'], ['n4','n11'], ['n11','n9'], ['n8','n9'], ['n7','n8'],
  ];
  const find = (id) => nodes.find((n) => n.id === id);
  return (
    <svg className="path-feature__graph" viewBox="0 0 800 460" fill="none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0AFFD4" stopOpacity="0.9"/>
          <stop offset="60%" stopColor="#0024FF" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#0024FF" stopOpacity="0"/>
        </radialGradient>
        <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3"/>
        </filter>
      </defs>

      {edges.map(([a, b], i) => {
        const A = find(a), B = find(b);
        const isDone = A.kind === 'done' || B.kind === 'done';
        return (
          <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
            stroke={isDone ? 'rgba(10,255,212,0.35)' : 'rgba(42,37,96,0.5)'}
            strokeWidth={isDone ? 1 : 0.6}
            strokeDasharray={isDone ? '0' : '2 3'} />
        );
      })}

      {/* core glow */}
      <circle cx={find('c').x} cy={find('c').y} r="80" fill="url(#coreGlow)"/>

      {nodes.map((n) => {
        const fill = n.kind === 'core' ? '#0AFFD4' : n.kind === 'done' ? '#0AFFD4' : '#0A0826';
        const stroke = n.kind === 'done' ? '#0AFFD4' : n.kind === 'core' ? '#0AFFD4' : 'rgba(110,139,255,0.5)';
        const glow = n.kind !== 'open';
        return (
          <g key={n.id}>
            {glow && <circle cx={n.x} cy={n.y} r={n.r * 2} fill={fill} opacity="0.15" filter="url(#nodeGlow)"/>}
            <circle cx={n.x} cy={n.y} r={n.r} fill={fill} stroke={stroke} strokeWidth="1.5" opacity={n.kind === 'core' ? 1 : 0.85}/>
            {n.kind === 'core' && (
              <circle cx={n.x} cy={n.y} r={n.r - 8} fill="#0A0826"/>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function V2Paths() {
  return (
    <section className="path-section">
      <div className="path-feature">
        <NetworkGraph />
        <div className="path-feature__content">
          <div className="path-feature__eyebrow">Recommandé pour toi</div>
          <h3 className="path-feature__title">Pentester Web — <br/>de zéro à CTF.</h3>
          <p className="path-feature__sub">
            OWASP Top 10, Burp Suite, réutilisation de session, escalade de privilèges.
            Un parcours dense, orienté pratique, qui finit par un vrai CTF.
          </p>
          <div className="path-feature__stats">
            <div>
              <div className="path-feature__stat-n">24</div>
              <span className="path-feature__stat-l">Leçons</span>
            </div>
            <div>
              <div className="path-feature__stat-n">~18h</div>
              <span className="path-feature__stat-l">Durée</span>
            </div>
            <div>
              <div className="path-feature__stat-n">1 800</div>
              <span className="path-feature__stat-l">XP total</span>
            </div>
            <div>
              <div className="path-feature__stat-n">2.4k</div>
              <span className="path-feature__stat-l">Complété par</span>
            </div>
          </div>
        </div>
        <div className="path-feature__ctas">
          <button className="btn-brutal btn-brutal--primary" type="button">Commencer le parcours</button>
          <button className="btn-brutal btn-brutal--ghost" type="button">Aperçu</button>
        </div>
      </div>

      <aside className="path-side">
        <div className="path-side__eyebrow">Alternative</div>
        <h3 className="path-side__title">Fullstack JavaScript moderne.</h3>
        <p className="path-side__sub">
          Node, React, TypeScript, Postgres. Déploie une vraie app en 4 semaines.
        </p>
        <div className="path-side__tags">
          <span className="t-tag" style={{color:'#6E8BFF', background:'rgba(0,36,255,0.1)', borderColor:'rgba(0,36,255,0.4)'}}>Dev</span>
          <span className="t-tag" style={{color:'#0AFFD4', background:'rgba(10,255,212,0.08)', borderColor:'rgba(10,255,212,0.4)'}}>Débutant</span>
        </div>
        <div className="path-side__stats">
          <span><b>32</b> leçons</span>
          <span><b>~22h</b></span>
          <span><b>2 400</b> XP</span>
        </div>
        <button className="btn-brutal btn-brutal--ghost path-side__cta" type="button">Explorer →</button>
      </aside>
    </section>
  );
}

window.V2Paths = V2Paths;

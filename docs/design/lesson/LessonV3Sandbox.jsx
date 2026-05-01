// LessonV3Sandbox.jsx — Interactive Python sandbox (Pyodide-style mock)
function LV3Sandbox() {
  const initialCode = [
    { ln: 1, html: <><span className="c"># Repare le bug : utilise des paramètres liés.</span></> },
    { ln: 2, html: <><span className="k">import</span> <span className="v">sqlite3</span></> },
    { ln: 3, html: <></> },
    { ln: 4, html: <><span className="k">def</span> <span className="fn">login</span><span className="p">(</span><span className="v">user</span><span className="p">,</span> <span className="v">pwd</span><span className="p">):</span></> },
    { ln: 5, html: <>{'    '}<span className="v">cur</span> <span className="p">=</span> <span className="v">db</span><span className="p">.</span><span className="fn">cursor</span><span className="p">()</span></> },
    { ln: 6, html: <>{'    '}<span className="v">cur</span><span className="p">.</span><span className="fn">execute</span><span className="p">(</span></> },
    { ln: 7, html: <>{'        '}<span className="s">"SELECT * FROM users WHERE name=? AND pwd=?"</span><span className="p">,</span></> },
    { ln: 8, html: <>{'        '}<span className="p">(</span><span className="v">user</span><span className="p">,</span> <span className="v">pwd</span><span className="p">)</span></> },
    { ln: 9, html: <>{'    '}<span className="p">)</span></> },
    { ln:10, html: <>{'    '}<span className="k">return</span> <span className="v">cur</span><span className="p">.</span><span className="fn">fetchone</span><span className="p">()</span></> },
    { ln:11, html: <></> },
    { ln:12, html: <><span className="fn">print</span><span className="p">(</span><span className="fn">login</span><span className="p">(</span><span className="s">"admin'--"</span><span className="p">,</span> <span className="s">""</span><span className="p">))</span></> },
  ];

  const [state, setState] = React.useState('ready'); // ready | loading | success | error
  const [output, setOutput] = React.useState([
    { kind: 'ok', text: 'sqlite3 v3.42 · pyodide ready · 4ms' },
    { kind: 'ok', text: 'None  # ✓ requête préparée — paiload neutralisé' },
  ]);

  const run = () => {
    if (state === 'loading') return;
    setState('loading');
    setOutput([{ kind: 'load', text: 'Compilation et exécution dans le worker WASM...' }]);
    setTimeout(() => {
      setState('success');
      setOutput([
        { kind: 'ok', text: 'sqlite3 v3.42 · pyodide ready · 4ms' },
        { kind: 'ok', text: 'None  # ✓ requête préparée — payload neutralisé' },
      ]);
    }, 900);
  };

  const statusLabel = {
    ready: 'Prêt',
    loading: 'Compilation...',
    success: 'OK · 0.9s',
    error: 'Erreur runtime',
  }[state];

  return (
    <div className="sandbox">
      <div className="sandbox__head">
        <span className="sandbox__title">Python Sandbox</span>
        <span className="sandbox__badge">Pyodide · WASM</span>
      </div>

      <div className="sandbox__editor">
        <div className="sandbox__gutter">
          {initialCode.map(l => (
            <div key={l.ln} className={l.ln === 7 ? 'is-active' : ''}>{String(l.ln).padStart(2,'0')}</div>
          ))}
        </div>
        <div className="sandbox__code">
          {initialCode.map(l => (
            <div key={l.ln}>{l.html}{'\n'}</div>
          ))}
        </div>
      </div>

      <div className="sandbox__bar">
        <button
          type="button"
          onClick={run}
          className={`sandbox__run ${state === 'loading' ? 'is-loading' : ''}`}
        >
          {state === 'loading' ? 'Exécution...' : 'Exécuter'}
        </button>
        <div className={`sandbox__status ${state === 'loading' ? 'is-loading' : ''} ${state === 'error' ? 'is-error' : ''}`}>
          <span>{statusLabel}</span>
          <span className="sandbox__status-meta">main.py · 12 lignes · python 3.11</span>
        </div>
      </div>

      <div className="sandbox__output">
        {output.map((l, i) => (
          <div
            key={i}
            className={`sandbox__output-line ${l.kind === 'err' ? 'is-error' : ''} ${l.kind === 'load' ? 'is-loading' : ''}`}
          >
            <span>{l.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.LV3Sandbox = LV3Sandbox;

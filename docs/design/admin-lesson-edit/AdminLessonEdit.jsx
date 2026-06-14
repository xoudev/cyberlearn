// AdminLessonEdit.jsx — admin lesson creation form

const MDX_LINES = [
  { n: 1,  html: '<span class="tk-frt">---</span>' },
  { n: 2,  html: '<span class="tk-key">title:</span> <span class="tk-str">"Introduction au scan de ports avec Nmap"</span>' },
  { n: 3,  html: '<span class="tk-key">author:</span> <span class="tk-str">"@xoudark"</span>' },
  { n: 4,  html: '<span class="tk-key">tags:</span> <span class="tk-str">[reseau, recon, nmap]</span>' },
  { n: 5,  html: '<span class="tk-key">difficulty:</span> <span class="tk-num">2</span>' },
  { n: 6,  html: '<span class="tk-frt">---</span>' },
  { n: 7,  html: '' },
  { n: 8,  html: '<span class="tk-tag">import</span> <span class="tk-tagn">{ Callout, Quiz, CodeBlock }</span> <span class="tk-tag">from</span> <span class="tk-str">"@/components"</span>' },
  { n: 9,  html: '' },
  { n: 10, html: '<span class="tk-h"># Introduction au scan de ports</span>', active: true },
  { n: 11, html: '' },
  { n: 12, html: 'Le scan de ports est la <span class="tk-em">première étape</span> de toute reconnaissance' },
  { n: 13, html: 'réseau. Il permet d\'identifier les services exposés sur une cible.' },
  { n: 14, html: '' },
  { n: 15, html: '<span class="tk-tag">&lt;<span class="tk-tagn">Callout</span> <span class="tk-attr">type</span>=<span class="tk-str">"warning"</span>&gt;</span>' },
  { n: 16, html: '  Ne scanne <span class="tk-em">jamais</span> une cible sans autorisation écrite.' },
  { n: 17, html: '<span class="tk-tag">&lt;/<span class="tk-tagn">Callout</span>&gt;</span>' },
  { n: 18, html: '' },
  { n: 19, html: '<span class="tk-h2">## 1. Premier contact avec Nmap</span>' },
  { n: 20, html: '' },
  { n: 21, html: 'Lance ton <span class="tk-code">terminal</span> et exécute la commande suivante :' },
  { n: 22, html: '' },
  { n: 23, html: '<span class="tk-tag">&lt;<span class="tk-tagn">CodeBlock</span> <span class="tk-attr">lang</span>=<span class="tk-str">"bash"</span>&gt;</span>' },
  { n: 24, html: '  <span class="tk-com"># scan TCP des 1000 ports les plus fréquents</span>' },
  { n: 25, html: '  nmap -sS -T<span class="tk-num">4</span> <span class="tk-num">10.10</span>.<span class="tk-num">10.5</span>' },
  { n: 26, html: '<span class="tk-tag">&lt;/<span class="tk-tagn">CodeBlock</span>&gt;</span>' },
  { n: 27, html: '' },
  { n: 28, html: '<span class="tk-h2">## 2. Comprendre les drapeaux TCP</span>' },
  { n: 29, html: '' },
  { n: 30, html: '<span class="tk-bullet">-</span> <span class="tk-em">SYN</span> : tentative d\'ouverture de connexion' },
  { n: 31, html: '<span class="tk-bullet">-</span> <span class="tk-em">ACK</span> : accusé de réception' },
  { n: 32, html: '<span class="tk-bullet">-</span> <span class="tk-em">RST</span> : réinitialisation forcée' },
  { n: 33, html: '<span class="tk-bullet">-</span> <span class="tk-em">FIN</span> : fin de connexion propre' },
  { n: 34, html: '' },
  { n: 35, html: '<span class="tk-tag">&lt;<span class="tk-tagn">Quiz</span> <span class="tk-attr">id</span>=<span class="tk-str">"q-syn-stealth"</span>&gt;</span>' },
  { n: 36, html: '  <span class="tk-attr">question</span>=<span class="tk-str">"Pourquoi un scan SYN est-il dit furtif ?"</span>' },
  { n: 37, html: '<span class="tk-tag">&lt;/<span class="tk-tagn">Quiz</span>&gt;</span>' },
];

function AdminLessonEdit() {
  return (
    <main className="main">
      <div className="adm le-wrap">
        <div className="adm-crumb">
          <span className="p">$</span>
          <b>~/admin</b>
          <span className="slash">/</span>
          <span>leçons</span>
          <span className="slash">/</span>
          <span className="new">nouvelle</span>
          <span className="caret" />
        </div>

        <div className="adm-head">
          <div>
            <h1 className="adm-title">Créer une <em>leçon</em></h1>
            <div className="adm-sub">
              <span className="live">Brouillon · non publié</span>
              <span>·</span>
              <span>Auto-save toutes les <b>10 s</b></span>
              <span>·</span>
              <span>Dernière sauvegarde <b>il y a 2 min</b></span>
            </div>
          </div>
        </div>

        <form className="le-form" onSubmit={(e) => e.preventDefault()}>
          {/* row 1 — ref + slug */}
          <div className="le-row">
            <div className="le-field">
              <label className="le-label" htmlFor="ref">
                Ref code <span className="req">*</span>
                <span className="hint">// auto-généré, modifiable</span>
              </label>
              <input
                id="ref"
                className="le-input"
                defaultValue="LSN-RES-042"
                placeholder="LSN-CAT-NNN"
              />
              <span className="le-help">Format : <b>LSN-{`{CAT}`}-{`{NNN}`}</b> · doit être unique</span>
            </div>
            <div className="le-field">
              <label className="le-label" htmlFor="slug">
                Slug <span className="req">*</span>
                <span className="hint">// utilisé dans l'URL</span>
              </label>
              <div className="le-prefix">
                <span className="le-prefix__sym">/</span>
                <input
                  id="slug"
                  className="le-input"
                  defaultValue="introduction-scan-ports-nmap"
                />
              </div>
              <span className="le-help">cyberlearn.fr/lecons/<b>introduction-scan-ports-nmap</b></span>
            </div>
          </div>

          {/* row 2 — title */}
          <div className="le-field">
            <label className="le-label" htmlFor="title">
              Titre <span className="req">*</span>
              <span className="hint">// 10–80 caractères</span>
            </label>
            <input
              id="title"
              className="le-input"
              defaultValue="Introduction au scan de ports avec Nmap"
              style={{ fontSize: '15px', padding: '14px 16px' }}
            />
          </div>

          {/* row 3 — description */}
          <div className="le-field">
            <label className="le-label" htmlFor="desc">
              Description <span className="req">*</span>
              <span className="hint">// 80–200 caractères</span>
            </label>
            <textarea
              id="desc"
              className="le-textarea"
              defaultValue="Apprends à cartographier un réseau et identifier les services exposés à l'aide de Nmap. Tu découvriras les drapeaux TCP, les techniques de scan furtif et l'interprétation des résultats."
            />
          </div>

          {/* row 4 — category + difficulty */}
          <div className="le-row">
            <div className="le-field">
              <label className="le-label" htmlFor="cat">
                Catégorie <span className="req">*</span>
              </label>
              <div className="le-select-wrap">
                <select id="cat" className="le-select" defaultValue="reseau">
                  <option value="cybersec">Cybersécurité</option>
                  <option value="reseau">Réseau</option>
                  <option value="dev">Développement</option>
                  <option value="crypto">Cryptographie</option>
                  <option value="forensic">Forensic</option>
                  <option value="osint">OSINT</option>
                </select>
              </div>
            </div>
            <div className="le-field">
              <label className="le-label" htmlFor="diff">
                Difficulté <span className="req">*</span>
              </label>
              <div className="le-select-wrap">
                <select id="diff" className="le-select" defaultValue="2">
                  <option value="1">◆ ◇ ◇ ◇  Découverte</option>
                  <option value="2">◆ ◆ ◇ ◇  Initié</option>
                  <option value="3">◆ ◆ ◆ ◇  Confirmé</option>
                  <option value="4">◆ ◆ ◆ ◆  Expert</option>
                </select>
              </div>
            </div>
          </div>

          {/* row 5 — duration + xp */}
          <div className="le-row">
            <div className="le-field">
              <label className="le-label" htmlFor="dur">
                Durée estimée (minutes) <span className="req">*</span>
              </label>
              <div className="le-num">
                <input id="dur" className="le-input" type="number" defaultValue="18" min="1" />
                <span className="le-num__suffix">MIN</span>
              </div>
              <span className="le-help">Médiane des leçons réseau · <b>15 min</b></span>
            </div>
            <div className="le-field">
              <label className="le-label" htmlFor="xp">
                Récompense XP <span className="req">*</span>
              </label>
              <div className="le-num">
                <input id="xp" className="le-input" type="number" defaultValue="120" min="0" step="10" />
                <span className="le-num__suffix">XP</span>
              </div>
              <span className="le-help">Recommandé pour difficulté <b>Initié</b> · 100–150 XP</span>
            </div>
          </div>

          {/* row 6 — cover image */}
          <div className="le-field">
            <label className="le-label" htmlFor="cover">
              URL image de couverture
              <span className="hint">// 1280×720 recommandé</span>
            </label>
            <div className="le-prefix">
              <span className="le-prefix__sym">↗</span>
              <input
                id="cover"
                className="le-input"
                defaultValue="https://cdn.cyberlearn.fr/covers/nmap-intro.webp"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* row 7 — MDX editor */}
          <div className="le-field">
            <label className="le-label">
              Contenu MDX <span className="req">*</span>
              <span className="hint">// markdown + composants React</span>
            </label>
            <div className="le-editor">
              <div className="le-editor__tabs">
                <span className="le-editor__tab is-active">
                  <span className="dot" />
                  lesson.mdx
                  <span className="x">×</span>
                </span>
                <span className="le-editor__tab" style={{ color: 'var(--fg-disabled)' }}>
                  meta.json
                  <span className="x">×</span>
                </span>
                <span className="le-editor__breadcrumb">
                  <b>~/content/lecons/</b>introduction-scan-ports-nmap<b> ›</b> lesson.mdx
                </span>
              </div>

              <div className="le-editor__body">
                <div className="le-editor__gutter">
                  {MDX_LINES.map((l) => (
                    <span key={l.n} className={l.active ? 'is-active' : ''}>{l.n}</span>
                  ))}
                </div>
                <div
                  className="le-editor__code"
                  contentEditable
                  suppressContentEditableWarning
                  spellCheck={false}
                >
                  {MDX_LINES.map((l) => (
                    <div
                      key={l.n}
                      className={l.active ? 'ln-active' : ''}
                      dangerouslySetInnerHTML={{ __html: l.html || '&#8203;' }}
                    />
                  ))}
                </div>
              </div>

              <div className="le-editor__status">
                <span><b>MDX</b></span>
                <span>UTF-8</span>
                <span>LF</span>
                <span>Ln <b>10</b>, Col <b>1</b></span>
                <span className="right">
                  <span className="ok">Compile OK</span>
                  <span><b>1 247</b> caractères</span>
                  <span><b>37</b> lignes</span>
                </span>
              </div>
            </div>
          </div>

          {/* actions */}
          <div className="le-actions">
            <span className="le-actions__hint">
              <kbd>⌘</kbd><kbd>S</kbd> sauvegarder · <kbd>esc</kbd> annuler
            </span>
            <button type="button" className="btn-ghost">Annuler</button>
            <button type="submit" className="btn-primary">
              <span className="btn-primary__corner tl" />
              Créer la leçon
              <span className="arrow">→</span>
              <span className="btn-primary__corner br" />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="app">
      <AdminNavbar />
      <AdminSidebar />
      <AdminLessonEdit />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// AdminPathEdit.jsx — admin path creation form with drag-and-drop lesson list

const INITIAL_LESSONS = [
  { id: 'l1', ref: 'LSN-RES-040', title: 'Fondamentaux du modèle OSI',         cat: 'reseau',   diff: 1, dur: 12, xp: 80  },
  { id: 'l2', ref: 'LSN-RES-041', title: 'Adressage IP et sous-réseaux',        cat: 'reseau',   diff: 2, dur: 22, xp: 140 },
  { id: 'l3', ref: 'LSN-RES-042', title: 'Introduction au scan de ports avec Nmap', cat: 'reseau', diff: 2, dur: 18, xp: 120 },
  { id: 'l4', ref: 'LSN-CYB-018', title: 'Détecter les services vulnérables',   cat: 'cybersec', diff: 3, dur: 25, xp: 180 },
  { id: 'l5', ref: 'LSN-CYB-019', title: 'Énumération SMB et partages exposés', cat: 'cybersec', diff: 3, dur: 30, xp: 200 },
  { id: 'l6', ref: 'LSN-CYB-020', title: 'Synthèse · scénario de reconnaissance complète', cat: 'cybersec', diff: 4, dur: 40, xp: 260 },
];

const DragHandleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="6" cy="3" r="1.4" /><circle cx="10" cy="3" r="1.4" />
    <circle cx="6" cy="8" r="1.4" /><circle cx="10" cy="8" r="1.4" />
    <circle cx="6" cy="13" r="1.4" /><circle cx="10" cy="13" r="1.4" />
  </svg>
);

const RemoveIcon = () => (
  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M3 3 L11 11 M11 3 L3 11" />
  </svg>
);

const PlusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M7 2 V12 M2 7 H12" />
  </svg>
);

const diamonds = (n) => {
  const total = 4;
  return [...Array(total)].map((_, i) => i < n ? '◆' : '◇').join('');
};

function LessonRow({ lesson, idx, dragState, onDragStart, onDragOver, onDragEnd, onDrop, onRemove }) {
  const isDragging = dragState.dragId === lesson.id;
  const isDropTarget = dragState.overId === lesson.id && dragState.dragId && dragState.dragId !== lesson.id;
  return (
    <li
      className={`pe-row ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, lesson.id)}
      onDragOver={(e) => onDragOver(e, lesson.id)}
      onDrop={(e) => onDrop(e, lesson.id)}
      onDragEnd={onDragEnd}
    >
      <span className="pe-row__handle" aria-label="Glisser pour réordonner">
        <DragHandleIcon />
      </span>
      <span className={`pe-row__pos ${idx === 0 ? 'is-first' : ''}`}>
        {String(idx + 1).padStart(2, '0')}
      </span>
      <div className="pe-row__main">
        <p className="pe-row__title">{lesson.title}</p>
        <span className="pe-row__sub">
          <span className="ref">{lesson.ref}</span>
          <span className="sep">·</span>
          <span className="diamonds"><b>{diamonds(lesson.diff).slice(0, lesson.diff)}</b>{diamonds(lesson.diff).slice(lesson.diff)}</span>
          <span className="sep">·</span>
          <span><b>{lesson.dur}</b> min</span>
        </span>
      </div>
      <div className="pe-row__chips">
        <span className={`pe-chip pe-chip--${lesson.cat}`}>
          {lesson.cat === 'cybersec' ? 'Cybersec' : lesson.cat === 'reseau' ? 'Réseau' : lesson.cat}
        </span>
        <span className="pe-chip pe-chip--xp">+{lesson.xp} XP</span>
      </div>
      <button
        type="button"
        className="pe-row__remove"
        aria-label="Retirer la leçon"
        onClick={() => onRemove(lesson.id)}
      >
        <RemoveIcon />
      </button>
    </li>
  );
}

function AdminPathEdit() {
  const [lessons, setLessons] = React.useState(INITIAL_LESSONS);
  const [dragState, setDragState] = React.useState({ dragId: null, overId: null });

  const onDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ dragId: id, overId: id });
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragState.overId !== id) setDragState((s) => ({ ...s, overId: id }));
  };
  const onDrop = (e, dropId) => {
    e.preventDefault();
    const { dragId } = dragState;
    if (!dragId || dragId === dropId) {
      setDragState({ dragId: null, overId: null });
      return;
    }
    setLessons((arr) => {
      const next = [...arr];
      const fromIdx = next.findIndex((l) => l.id === dragId);
      const toIdx = next.findIndex((l) => l.id === dropId);
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragState({ dragId: null, overId: null });
  };
  const onDragEnd = () => setDragState({ dragId: null, overId: null });
  const onRemove = (id) => setLessons((arr) => arr.filter((l) => l.id !== id));

  const totals = lessons.reduce(
    (acc, l) => ({ count: acc.count + 1, dur: acc.dur + l.dur, xp: acc.xp + l.xp }),
    { count: 0, dur: 0, xp: 0 }
  );
  const avgDiff = lessons.length
    ? (lessons.reduce((s, l) => s + l.diff, 0) / lessons.length).toFixed(1)
    : '–';

  return (
    <main className="main">
      <div className="adm pe-wrap">
        <div className="adm-crumb">
          <span className="p">$</span>
          <b>~/admin</b>
          <span className="slash">/</span>
          <span>parcours</span>
          <span className="slash">/</span>
          <span className="new">nouveau</span>
          <span className="caret" />
        </div>

        <div className="adm-head">
          <div>
            <h1 className="adm-title">Créer un <em>parcours</em></h1>
            <div className="adm-sub">
              <span className="live">Brouillon · non publié</span>
              <span>·</span>
              <span><b>{totals.count}</b> leçons agrégées</span>
              <span>·</span>
              <span>Auto-save activé</span>
            </div>
          </div>
        </div>

        <form className="le-form" onSubmit={(e) => e.preventDefault()}>
          {/* row 1 — ref + slug */}
          <div className="le-row">
            <div className="le-field">
              <label className="le-label" htmlFor="ref">
                Ref code <span className="req">*</span>
                <span className="hint">// auto-généré</span>
              </label>
              <input id="ref" className="le-input" defaultValue="PRC-RECON-002" />
              <span className="le-help">Format : <b>PRC-{`{THÈME}`}-{`{NNN}`}</b> · doit être unique</span>
            </div>
            <div className="le-field">
              <label className="le-label" htmlFor="slug">
                Slug <span className="req">*</span>
                <span className="hint">// utilisé dans l'URL</span>
              </label>
              <div className="le-prefix">
                <span className="le-prefix__sym">/</span>
                <input id="slug" className="le-input" defaultValue="reconnaissance-reseau" />
              </div>
              <span className="le-help">cyberlearn.app/parcours/<b>reconnaissance-reseau</b></span>
            </div>
          </div>

          {/* title */}
          <div className="le-field">
            <label className="le-label" htmlFor="title">
              Titre <span className="req">*</span>
              <span className="hint">// 10–80 caractères</span>
            </label>
            <input
              id="title"
              className="le-input"
              defaultValue="Reconnaissance réseau · de l'OSI au scan furtif"
              style={{ fontSize: '15px', padding: '14px 16px' }}
            />
          </div>

          {/* description (larger) */}
          <div className="le-field">
            <label className="le-label" htmlFor="desc">
              Description <span className="req">*</span>
              <span className="hint">// 150–400 caractères · sera affichée sur la page parcours</span>
            </label>
            <textarea
              id="desc"
              className="le-textarea"
              style={{ minHeight: 180 }}
              defaultValue={`Maîtrise la cartographie d'un réseau adverse, des fondamentaux du modèle OSI jusqu'aux techniques de scan furtif avec Nmap.

À la fin du parcours, tu sauras identifier les services exposés, comprendre les drapeaux TCP, énumérer un partage SMB et synthétiser un rapport de reconnaissance complet — le tout dans un environnement de lab légal.`}
            />
          </div>

          {/* category + difficulty */}
          <div className="le-row">
            <div className="le-field">
              <label className="le-label" htmlFor="cat">
                Catégorie <span className="req">*</span>
              </label>
              <div className="le-select-wrap">
                <select id="cat" className="le-select" defaultValue="cybersec">
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
                <select id="diff" className="le-select" defaultValue="3">
                  <option value="1">◆ ◇ ◇ ◇  Découverte</option>
                  <option value="2">◆ ◆ ◇ ◇  Initié</option>
                  <option value="3">◆ ◆ ◆ ◇  Confirmé</option>
                  <option value="4">◆ ◆ ◆ ◆  Expert</option>
                </select>
              </div>
            </div>
          </div>

          {/* duration */}
          <div className="le-field" style={{ maxWidth: 480 }}>
            <label className="le-label" htmlFor="dur">
              Durée estimée (heures) <span className="req">*</span>
            </label>
            <div className="le-num">
              <input id="dur" className="le-input" type="number" defaultValue="2.5" min="0.5" step="0.5" />
              <span className="le-num__suffix">H</span>
            </div>
            <span className="le-help">Calculée auto depuis les leçons : <b>{(totals.dur / 60).toFixed(1)} h</b> · ajuste pour pauses + exercices libres</span>
          </div>

          {/* cover image */}
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
                defaultValue="https://cdn.cyberlearn.app/parcours/reconnaissance-reseau.webp"
              />
            </div>
          </div>

          {/* publish checkbox */}
          <label className="pe-check" htmlFor="publish">
            <input id="publish" type="checkbox" />
            <span className="pe-check__box" />
            <span className="pe-check__body">
              <span className="pe-check__title">
                Publier immédiatement
                <span className="live">live</span>
              </span>
              <span className="pe-check__desc">
                Le parcours sera visible par tous les apprenants dès sa création. Sinon il reste en brouillon, accessible uniquement aux admins.
              </span>
            </span>
          </label>

          {/* lessons section */}
          <div className="le-field">
            <label className="le-label">
              Leçons du parcours <span className="req">*</span>
              <span className="hint">// glisse pour réordonner</span>
            </label>

            <div className="pe-section">
              <div className="pe-section__head">
                <h3 className="pe-section__title">
                  // <b>{lessons.length}</b> leçons · ordre actuel
                </h3>
                <span className="pe-section__meta">
                  <b>{(totals.dur / 60).toFixed(1)} h</b> total · <b>{totals.xp}</b> XP cumulés
                </span>
              </div>

              <ul className="pe-list">
                {lessons.map((l, i) => (
                  <LessonRow
                    key={l.id}
                    lesson={l}
                    idx={i}
                    dragState={dragState}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onDragEnd={onDragEnd}
                    onRemove={onRemove}
                  />
                ))}
              </ul>

              <button type="button" className="pe-add">
                <span className="pe-add__plus"><PlusIcon /></span>
                Ajouter une leçon
              </button>

              <div className="pe-totals">
                <div className="pe-totals__cell">
                  <span className="pe-totals__lbl">Leçons</span>
                  <span className="pe-totals__val brand">{String(totals.count).padStart(2, '0')}</span>
                </div>
                <div className="pe-totals__cell">
                  <span className="pe-totals__lbl">Durée totale</span>
                  <span className="pe-totals__val">{(totals.dur / 60).toFixed(1)} h</span>
                </div>
                <div className="pe-totals__cell">
                  <span className="pe-totals__lbl">XP cumulés</span>
                  <span className="pe-totals__val brand">+{totals.xp}</span>
                </div>
                <div className="pe-totals__cell">
                  <span className="pe-totals__lbl">Difficulté moy.</span>
                  <span className="pe-totals__val">{avgDiff} / 4</span>
                </div>
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
              Créer le parcours
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
      <AdminPathEdit />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

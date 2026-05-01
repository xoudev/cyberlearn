// LessonV3Terminal.jsx — Simulated Linux terminal
function LV3Terminal() {
  const initial = [
    { kind: 'cmd', text: 'whoami' },
    { kind: 'out', tone: 'good', text: 'root' },
    { kind: 'cmd', text: 'cat /etc/sqli-target.txt' },
    { kind: 'out', tone: 'info', text: 'host: 192.168.1.1\nservice: postgres@5432\nflag-format: CL{...}' },
    { kind: 'hint', text: 'Essaie : nmap -sV 192.168.1.1' },
  ];
  const [history, setHistory] = React.useState(initial);
  const [value, setValue] = React.useState('');
  const inputRef = React.useRef(null);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [history]);

  const responses = {
    'nmap -sv 192.168.1.1': [
      { kind: 'out', tone: 'info', text: 'Starting Nmap 7.94 ( https://nmap.org )' },
      { kind: 'out', text: 'PORT     STATE SERVICE   VERSION' },
      { kind: 'out', tone: 'good', text: '22/tcp   open  ssh       OpenSSH 8.9p1' },
      { kind: 'out', tone: 'good', text: '80/tcp   open  http      nginx 1.24.0' },
      { kind: 'out', tone: 'good', text: '5432/tcp open  postgres  PostgreSQL 14.5  ← cible' },
      { kind: 'hint', text: 'Maintenant : sqlmap -u http://192.168.1.1/login --batch' },
    ],
    'ls': [
      { kind: 'out', tone: 'info', text: 'login.py  payloads/  notes.md  flag.txt' },
    ],
    'cat flag.txt': [
      { kind: 'err', text: 'cat: flag.txt: Permission denied' },
      { kind: 'hint', text: 'Tu dois d\'abord élever tes privilèges via la base.' },
    ],
    'help': [
      { kind: 'out', text: 'commandes : whoami, ls, nmap, sqlmap, cat <file>, clear' },
    ],
    'clear': 'CLEAR',
  };

  const submit = (e) => {
    e.preventDefault();
    const cmd = value.trim();
    if (!cmd) return;
    const key = cmd.toLowerCase();
    const next = [...history, { kind: 'cmd', text: cmd }];
    const r = responses[key];
    if (r === 'CLEAR') { setHistory([]); setValue(''); return; }
    if (r) next.push(...r);
    else next.push({ kind: 'err', text: `bash: ${cmd.split(' ')[0]}: command not found` });
    setHistory(next);
    setValue('');
  };

  return (
    <div className="term" onClick={() => inputRef.current && inputRef.current.focus()}>
      <div className="term__head">
        <div className="term__dots">
          <span className="term__dot term__dot--r" />
          <span className="term__dot term__dot--y" />
          <span className="term__dot term__dot--g" />
        </div>
        <span className="term__path">root@cyberlearn:~#</span>
        <span className="term__hint">tape une commande</span>
      </div>
      <div className="term__body" ref={bodyRef}>
        {history.map((l, i) => {
          if (l.kind === 'cmd') return (
            <div key={i} className="term__line term__line--cmd">
              <span className="term__prompt">root@cyberlearn:~#</span>
              <span>{l.text}</span>
            </div>
          );
          if (l.kind === 'hint') return (
            <div key={i} className="term__hint-line">{l.text}</div>
          );
          if (l.kind === 'err') return (
            <div key={i} className="term__line term__line--err">{l.text}</div>
          );
          const tone = l.tone === 'good' ? 'is-good' : l.tone === 'info' ? 'is-info' : '';
          return (
            <div key={i} className={`term__line term__line--out ${tone}`}>{l.text}</div>
          );
        })}
      </div>
      <form className="term__input-line" onSubmit={submit}>
        <span className="term__prompt">root@cyberlearn:~#</span>
        <input
          ref={inputRef}
          className="term__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="nmap -sV 192.168.1.1"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

window.LV3Terminal = LV3Terminal;

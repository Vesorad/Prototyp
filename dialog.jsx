// dialog.jsx — character dialog component
function Dialog({ character, lines, onDone, side = 'left' }) {
  const [idx, setIdx] = React.useState(0);
  const cur = lines[idx];
  const [text, done, skipToEnd] = useTypewriter(cur, 22);

  const next = () => {
    if (!done) { skipToEnd(); return; }
    if (idx < lines.length - 1) setIdx(idx + 1);
    else onDone && onDone();
  };

  // space/enter to advance
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, idx]);

  const c = CHARACTERS[character];

  return (
    <div className="dialog-overlay" onClick={next}>
      <Portrait character={character} side={side} />
      <div
        className={`dialog-box ${side === 'right' ? 'right' : ''}`}
        onClick={e => { e.stopPropagation(); next(); }}
      >
        <div className="dialog-name" style={{ color: c.accent }}>{c.name}</div>
        <div className="dialog-text">
          {text}
          {!done && <span className="cursor"></span>}
        </div>
        <div className="dialog-actions">
          <div className="dialog-hint">[ click / space ]</div>
          <button className="btn primary" onClick={(e) => { e.stopPropagation(); next(); }}>
            {idx < lines.length - 1 ? 'Next →' : (done ? '✓  OK' : '— —')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Quick toast (auto-dismiss)
function Toast({ children, onDone, duration = 2400 }) {
  React.useEffect(() => {
    const id = setTimeout(() => onDone && onDone(), duration);
    return () => clearTimeout(id);
  }, []);
  return <div className="popup-toast">{children}</div>;
}

window.Dialog = Dialog;
window.Toast = Toast;

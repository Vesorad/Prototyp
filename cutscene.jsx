// cutscene.jsx — fullscreen video cutscene with Continue / Reset
function Cutscene({ src, onContinue }) {
  const videoRef = React.useRef(null);
  const [ended, setEnded] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const handleEnded = () => setEnded(true);

  const handleReset = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setEnded(false);
    v.play().catch(() => {});
  };

  // try to autoplay; if blocked, show a tap-to-start affordance
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play();
    if (p && p.catch) p.catch(() => { /* will need user gesture */ });
  }, []);

  // skip key (S) → jump to end-state
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && ended) { onContinue && onContinue(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ended]);

  return (
    <div className="cutscene-overlay">
      <div className="cutscene-frame">
        <video
          ref={videoRef}
          className="cutscene-video"
          src={src}
          playsInline
          muted={false}
          onEnded={handleEnded}
          onCanPlay={() => setReady(true)}
        />
        {!ready && <div className="cutscene-loading">loading scene…</div>}

        {!ended && ready && (
          <button
            className="cutscene-skip"
            onClick={() => onContinue && onContinue()}
            title="Skip scene"
          >Skip →</button>
        )}

        {ended && (
          <div className="cutscene-end">
            <button className="btn ghost" onClick={handleReset}>
              <span className="cs-icon">↺</span> Reset
            </button>
            <button className="btn primary" onClick={() => onContinue && onContinue()}>
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

window.Cutscene = Cutscene;

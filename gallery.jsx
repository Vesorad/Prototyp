// gallery.jsx — Scene gallery modal with 4 cutscene thumbnails
// Each thumbnail plays its mapped mp4 via the shared <Cutscene> component.

const GALLERY_SCENES = [
  { id: 's_1', label: 'Scene 1', icon: 'assets/scenes/s_1_icon.png', src: 'assets/scenes/s_1.mp4' },
  { id: 's_2', label: 'Scene 2', icon: 'assets/scenes/s_2_icon.png', src: 'assets/scenes/s_2.mp4' },
  { id: 's_3', label: 'Scene 3', icon: 'assets/scenes/s_3_icon.png', src: 'assets/scenes/s_3.mp4' },
  { id: 's_4', label: 'Scene 4', icon: 'assets/scenes/s_4_icon.png', src: 'assets/scenes/s_4.mp4' },
];

function Gallery({ onClose }) {
  const [playing, setPlaying] = React.useState(null);

  // Esc closes the gallery (or the cutscene first)
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (playing) setPlaying(null);
        else onClose && onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing, onClose]);

  return (
    <div className="gal-overlay" onClick={onClose}>
      <div className="gal-window" onClick={(e) => e.stopPropagation()}>
        <div className="gal-header">
          <div>
            <div className="gal-title">Gallery</div>
            <div className="gal-sub">// scenes you've unlocked — click to replay</div>
          </div>
          <button className="gal-close" onClick={onClose} title="Close gallery">×</button>
        </div>

        <div className="gal-grid">
          {GALLERY_SCENES.map((s, i) => (
            <button
              key={s.id}
              className="gal-card"
              onClick={() => setPlaying(s)}
              title={`Play ${s.label}`}
            >
              <div className="gal-thumb">
                <img src={s.icon} alt={s.label} draggable={false}/>
                <div className="gal-play">▶</div>
              </div>
              <div className="gal-meta">
                <span className="gal-idx">#{i + 1}</span>
                <span className="gal-name">{s.label}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="gal-footer">
          <div className="gal-hint">ESC to close · click a card to play</div>
        </div>
      </div>

      {playing && (
        <Cutscene
          src={playing.src}
          onContinue={() => setPlaying(null)}
        />
      )}
    </div>
  );
}

window.Gallery = Gallery;

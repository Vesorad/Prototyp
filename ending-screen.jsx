// ending-screen.jsx
function EndingScreen({ onRestart }) {
  return (
    <div className="scene ending-stage" data-screen-label="06 Ending">
      {/* Decorative silhouettes */}
      <div style={{
        position:'absolute', left:0, right:0, bottom:'18%', height:'12%',
        background:'linear-gradient(180deg, transparent, rgba(0,0,0,.4))',
      }}></div>
      <div style={{
        position:'absolute', left:0, right:0, bottom:0, height:'18%',
        background:'#0a1d33',
        clipPath:'polygon(0 60%, 14% 30%, 22% 55%, 36% 20%, 50% 50%, 64% 25%, 78% 55%, 92% 30%, 100% 60%, 100% 100%, 0 100%)',
      }}></div>

      <div style={{
        position:'absolute', left:'50%', top:'12%', transform:'translateX(-50%)',
        fontFamily:'Caveat, cursive', fontSize: 28, color:'rgba(255,255,255,.85)',
        letterSpacing:'.02em',
      }}>~ end of prototype ~</div>

      <div style={{
        position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
        textAlign:'center', color:'#fff5dd',
        maxWidth: 700,
      }}>
        <div style={{fontFamily:'JetBrains Mono, monospace', fontSize:11, letterSpacing:'.3em', textTransform:'uppercase', opacity:.7}}>// scene end</div>
        <h1 style={{fontSize: 52, fontWeight: 800, lineHeight:1.05, margin: '14px 0'}}>
          Marina hands you an old medallion.
        </h1>
        <p style={{fontSize: 19, opacity: .85, lineHeight:1.5}}>
          “Those three dangerous perch once belonged to my father. No one’s caught them in twenty years.
          Take the medallion — the next fishing ground is open to you now.”
        </p>
        <div style={{display:'flex', gap:12, justifyContent:'center', marginTop: 28}}>
          <button className="btn primary" onClick={onRestart}>↺ Play again</button>
        </div>
      </div>

      {/* Floating particles */}
      {Array.from({length: 18}).map((_, i) => (
        <div key={i} style={{
          position:'absolute',
          left: `${(i * 53) % 100}%`,
          top: `${20 + (i * 23) % 60}%`,
          width: 3, height: 3, borderRadius: '50%',
          background:'rgba(255,245,221,.6)',
          boxShadow: '0 0 8px rgba(255,245,221,.8)',
          animation: `floatUp ${8 + (i % 5)}s linear infinite`,
          animationDelay: `-${i * 0.6}s`,
        }}></div>
      ))}
      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0); opacity:.6;} 100%{transform:translateY(-100vh); opacity:0;} }
      `}</style>
    </div>
  );
}

window.EndingScreen = EndingScreen;

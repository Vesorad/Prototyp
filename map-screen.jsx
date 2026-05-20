// map-screen.jsx
function MapScreen({ onPick }) {
  // Pin coordinates are in % relative to the .map-paper square (the island image).
  // All pins sit on WATER around the island silhouette.
  const spots = [
    { id: 'sunrise', x: 12, y: 32, name: 'Sunrise Bay',  active: false, reason: 'Closed until dawn' },
    { id: 'bones',   x: 88, y: 18, name: 'Whale Bones',  active: false, reason: 'Storm' },
    { id: 'reef',    x: 48, y: 52, name: 'Quiet Reef',   active: true,  reason: '' },
    { id: 'caves',   x: 10, y: 72, name: 'Echo Caves',   active: false, reason: 'No license' },
    { id: 'deep',    x: 60, y: 82, name: 'The Abyss',    active: false, reason: 'Requires lvl 12' },
  ];

  return (
    <div className="scene map-screen" data-screen-label="01 Map">
      <div className="map-bg"></div>

      <div className="map-title-floating">Fisher's Bay</div>
      <div className="map-sub-floating">// choose your fishing spot</div>

      <div className="map-paper">
        <img className="map-art-img" src="assets/map/island.png" alt="" />

        {spots.map(spot => (
          <div
            key={spot.id}
            className={`map-pin ${spot.active ? 'active' : ''}`}
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            onClick={() => spot.active && onPick(spot.id)}
            title={spot.active ? 'Click to set sail' : spot.reason}
          >
            <div className="dot"></div>
            <div className="lbl">{spot.name}</div>
            {!spot.active && <div className="ban">// {spot.reason}</div>}
          </div>
        ))}
      </div>

      {/* compass rose, floating bottom-right */}
      <div className="map-compass">
        <svg viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="26" fill="rgba(20,12,8,.55)" stroke="rgba(255,245,221,.3)" strokeWidth="1.2"/>
          <path d="M 30 8 L 33 30 L 30 52 L 27 30 Z" fill="#e8b647"/>
          <path d="M 8 30 L 30 27 L 52 30 L 30 33 Z" fill="rgba(255,245,221,.6)"/>
          <text x="30" y="14" textAnchor="middle" fontSize="6" fill="#fff5dd" fontFamily="monospace" fontWeight="700">N</text>
        </svg>
      </div>
    </div>
  );
}

window.MapScreen = MapScreen;

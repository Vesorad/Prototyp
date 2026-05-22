// boat-screen.jsx — boat + idle fishing
function BoatSvg() {
  return (
    <img
      className="boat-img"
      src="assets/boat.png"
      alt="boat"
      draggable={false}
    />
  );
}

function FishCaught({ fish }) {
  return (
    <div
      className="fish-caught"
      style={{
        left: fish.x + '%',
        top: fish.y + '%',
      }}
    >
      {fish.img
        ? <img className="ic-img" src={fish.img} alt={fish.name} />
        : <div className="ic" style={{'--fish-color': fish.color}}></div>}
      <div className="lbl">
        {fish.name} <span className="mono" style={{opacity:.7}}>{(fish.weight/1000).toFixed(2)}kg</span>
        {fish.value > 0 && <> <span className="val">+${fish.value}</span></>}
      </div>
    </div>
  );
}

function CloudLayer() {
  const CLOUD_SRCS = [
    'assets/clouds/cloud-1.png',
    'assets/clouds/cloud-2.png',
    'assets/clouds/cloud-3.png',
    'assets/clouds/cloud-4.png',
  ];
  // memoize randomized cloud lineup so they don't reshuffle on every render
  const clouds = React.useMemo(() => {
    return Array.from({length: 5}).map((_, i) => ({
      src: CLOUD_SRCS[randInt(0, 3)],
      width: randInt(140, 260),
      top: randInt(2, 28),
      delay: randInt(0, 80),
      duration: randInt(70, 140),
      opacity: rand(.55, .9),
      flip: Math.random() > 0.5,
    }));
  }, []);
  return (
    <div className="cloud-layer">
      {clouds.map((c, i) => (
        <img
          key={i}
          className="cloud"
          src={c.src}
          alt=""
          draggable={false}
          style={{
            width: c.width,
            top: c.top + '%',
            left: '110%',
            opacity: c.opacity,
            transform: c.flip ? 'scaleX(-1)' : 'none',
            animationDuration: c.duration + 's',
            animationDelay: -c.delay + 's',
          }}
        />
      ))}
    </div>
  );
}

function BoatScreen({ state, setState, onGoActive, onReturnToBay, gameSpeed,
                    boatX = 0, boatY = 0, boatScale = 1, onBoatPos,
                    skyX = 0, skyY = 0, skyScale = 1, skyAnim = false, onSkyPos,
                    bgX = 0, bgY = 0, bgScale = 1, bgAnim = false, onBgPos,
                    waterX = 0, waterY = 0, waterScale = 1, waterAnim = true, onWaterPos }) {
  const [caughtPopups, setCaughtPopups] = React.useState([]);
  const [showCapFull, setShowCapFull] = React.useState(false);
  const [sailing, setSailing] = React.useState(null); // 'in' | 'out' | null
  const [posTool, setPosTool] = React.useState(false);
  const idleTimerRef = React.useRef(null);

  const atCapacity = state.catches.length >= state.capacity;

  // Idle fishing: every 5-10s catch a random common fish
  React.useEffect(() => {
    if (atCapacity || sailing) return;
    const interval = randInt(5000, 10000) / Math.max(0.1, gameSpeed);
    idleTimerRef.current = setTimeout(() => {
      // catch a common fish
      const species = pickWeighted(COMMON_FISH);
      const weight = Math.round(rand(species.weight[0], species.weight[1]));
      const value = randInt(species.value[0], species.value[1]);
      const fish = {
        id: Date.now() + Math.random(),
        species: species.id,
        name: species.name,
        color: species.color,
        img: species.img,
        weight, value,
        x: randInt(35, 65),
        y: randInt(55, 70),
        quest: false,
      };
      setCaughtPopups(p => [...p, fish]);
      setState(s => ({ ...s, catches: [...s.catches, fish] }));
      setTimeout(() => {
        setCaughtPopups(p => p.filter(f => f.id !== fish.id));
      }, 2400);
    }, interval);
    return () => clearTimeout(idleTimerRef.current);
  }, [state.catches.length, atCapacity, sailing, gameSpeed]);

  // Show capacity full toast when reached
  React.useEffect(() => {
    if (atCapacity) {
      setShowCapFull(true);
      const id = setTimeout(() => setShowCapFull(false), 3000);
      return () => clearTimeout(id);
    }
  }, [atCapacity]);

  const handleReturn = () => {
    setSailing('out');
    setTimeout(() => {
      onReturnToBay();
    }, 2200);
  };

  // Capacity shadow dots
  const capDots = [];
  for (let i = 0; i < state.capacity; i++) {
    capDots.push(<div key={i} className={`fs ${i < state.catches.length ? 'full' : ''}`}></div>);
  }

  const sceneDusk = state.questFishCaught >= 2; // ramp up tension visually

  return (
    <div className={`scene boat-screen ${sceneDusk ? 'dusk' : ''}`} data-screen-label="03 Boat (idle)">
      <TopHud state={state} />

      {/* sky layer — back, static by default */}
      <div className={`sky-layer ${skyAnim ? 'animated' : ''}`}>
        <img
          className="sky-img"
          src="assets/sky.png"
          alt=""
          draggable={false}
          style={{
            transform: `translate(${skyX}px, ${skyY}px) scale(${skyScale})`,
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* background layer — mountains/lake, in front of sky, behind water */}
      <div className={`bg-layer ${bgAnim ? 'animated' : ''}`}>
        <img
          className="bg-img"
          src="assets/background.png"
          alt=""
          draggable={false}
          style={{
            transform: `translate(${bgX}px, ${bgY}px) scale(${bgScale})`,
            transformOrigin: 'center center',
          }}
        />
      </div>

      {/* water layer — front, animated */}
      <div
        className={`water-layer ${waterAnim ? '' : 'no-anim'}`}
        style={{
          '--water-x': waterX + 'px',
          '--water-y': waterY + 'px',
          '--water-scale': waterScale,
        }}
      >
        <div className="water-tile front"></div>
      </div>

      <CloudLayer />

      <div className="sea-layer">
        <div className="wave w1"></div>
        <div className="wave w2"></div>
        <div className="wave w3"></div>
      </div>

      <div className={`boat-wrap ${sailing === 'out' ? 'sailing-out' : sailing === 'in' ? 'sailing-in' : ''}`}
        style={{
          transform: sailing
            ? undefined
            : `translate(calc(-50% + ${boatX}px), ${boatY}px) scale(${boatScale})`,
        }}
      >
        <div className="cap-shadow">
          <div className="bubble">
            {atCapacity ? '✗ CRATE FULL' : `${state.catches.length} / ${state.capacity}`}
          </div>
          <div className="fish-shadows">{capDots}</div>
        </div>
        <BoatSvg />
        <div className="fishing-line"></div>
      </div>

      {caughtPopups.map(f => <FishCaught key={f.id} fish={f} />)}

      {showCapFull && (
        <div className="cap-full-toast">
          ⚠ Boat is full — return to bay, sell your catch
        </div>
      )}

      {/* bait indicator — removed; bait is picked inside Active Fishing */}

      {/* Action buttons */}
      <div className="fab-stack">
        <button
          className="btn primary"
          disabled={atCapacity || sailing}
          onClick={onGoActive}
        >
          🎣 ACTIVE FISHING
        </button>
        <button
          className="btn ghost"
          onClick={handleReturn}
          disabled={sailing}
        >
          ⛵ RETURN TO BAY
        </button>
      </div>

    </div>
  );
}

window.BoatScreen = BoatScreen;

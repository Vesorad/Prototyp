// active-fishing.jsx — phased Active State
// Phases: bait → charge → cast → guide → fight → result

// ============== TUNING ==============
const CAST_DURATION_MS = 1200;     // time to fill power bar
const CAST_EASE = 1.8;             // pow(t, ease) — accelerates near top
const CAST_MAX_ZONE = [0.88, 1.0]; // sweet-spot range
const LURE_SINK = 14;              // %/s downward when idle
const REEL_BACK_RATE = 22;         // %/s leftward toward boat when reeling
const REEL_LIFT = 18;              // %/s upward when reeling (lure lifts)
const SHADOW_COUNT = 9;
// Bite mechanics: any lure ↔ shadow overlap = instant hookup, no rolls.
const TENSION_MAX = 100;
const TENSION_TUG = 65;            // tension /s when fish tugs AND player reels
const TENSION_REEL_REST = 6;       // tension /s when reeling during rest
const TENSION_DECAY = 28;          // tension /s when player releases
const REEL_DISTANCE_RATE = 18;     // %/s closing distance when reeling
const FLEE_DISTANCE_RATE = 9;      // %/s fish flees when tugging + not reeling
const CATCH_DISTANCE = 6;          // % from boat = catch
const REST_DURATION = [1.6, 3.0];  // seconds
const TUG_DURATION  = [0.8, 1.6];
const HOOK_TIMEOUT_S = 1.2;        // bite reaction window after first hookup signal

// ============== MAIN COMPONENT ==============
function ActiveFishing({ state, setState, gameSpeed, onClose, onCatch, onQuestFail,
                       afShadowRadius = 1, afBoatX = 0, afBoatY = 0, afBoatAnim = true,
                       onAfTweak }) {
  const ownsBlood = state.hasQuestBait && state.questBaits > 0;
  const availableBaits = React.useMemo(() => {
    return BAITS.filter(b => !b.isQuestBait || ownsBlood);
  }, [ownsBlood]);

  const [phase, setPhase] = React.useState('bait');
  const [selectedBait, setSelectedBait] = React.useState(null);
  const [castPower, setCastPower] = React.useState(0);
  const [castMaxBonus, setCastMaxBonus] = React.useState(false);
  const [lure, setLure] = React.useState({ x: 60, y: 30 }); // % of scene
  const [shadows, setShadows] = React.useState([]);
  const [hookedShadow, setHookedShadow] = React.useState(null);
  const [fightDist, setFightDist] = React.useState(60);
  const [fightTension, setFightTension] = React.useState(0);
  const [fishTugging, setFishTugging] = React.useState(false);
  const [result, setResult] = React.useState(null);

  // Tools panel (visible always while in active fishing if onAfTweak prop is supplied)
  const [toolsShow, setToolsShow] = React.useState(false);

  // Debug tools (visible in fight phase)
  const [debugFreezeTension, setDebugFreezeTension] = React.useState(false);
  const [debugFreezeDist, setDebugFreezeDist] = React.useState(false);
  const [debugShow, setDebugShow] = React.useState(false);

  // ===== Phase A: Bait =====
  const onPickBait = (bait) => {
    setSelectedBait(bait);
    setPhase('charge');
  };

  // ===== Phase B: Charge =====
  const chargeStartRef = React.useRef(null);
  const chargeRafRef = React.useRef(null);
  const startCharge = () => {
    if (chargeStartRef.current) return;
    chargeStartRef.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - chargeStartRef.current;
      const t = Math.min(elapsed / CAST_DURATION_MS, 1);
      const p = Math.pow(t, CAST_EASE);
      setCastPower(p);
      if (t >= 1) {
        // overshot — auto fail
        chargeStartRef.current = null;
        setResult({ kind: 'lost_overshoot' });
        setPhase('result');
        return;
      }
      chargeRafRef.current = requestAnimationFrame(tick);
    };
    chargeRafRef.current = requestAnimationFrame(tick);
  };
  const releaseCharge = () => {
    if (!chargeStartRef.current) return;
    cancelAnimationFrame(chargeRafRef.current);
    const finalPower = castPower;
    chargeStartRef.current = null;
    if (finalPower < 0.05) return; // ignored tap
    const isMax = finalPower >= CAST_MAX_ZONE[0] && finalPower < 1;
    setCastMaxBonus(isMax);
    setPhase('cast');
  };

  // ===== Phase C: Cast animation =====
  React.useEffect(() => {
    if (phase !== 'cast') return;
    // animate bobber from boat to splash, then go to guide
    const id = setTimeout(() => {
      // landing position: depends on cast power (longer cast = further right)
      const landX = 30 + castPower * 55;
      setLure({ x: landX, y: 32 });
      setShadows(spawnShadows());
      setPhase('guide');
    }, 1100);
    return () => clearTimeout(id);
  }, [phase, castPower]);

  // ===== Phase D: Guide =====
  const guideRafRef = React.useRef(null);
  const reelingRef = React.useRef(false);
  const phaseRef = React.useRef(phase);
  React.useEffect(() => { phaseRef.current = phase; }, [phase]);

  // CRITICAL: reset reeling state whenever phase changes so a lingering
  // mouseup from a previous phase can't bleed into the next.
  React.useEffect(() => {
    reelingRef.current = false;
    fightRefs.current.reeling = false;
  }, [phase]);

  React.useEffect(() => {
    if (phase !== 'guide') return;
    let last = performance.now();
    const tick = (now) => {
      if (phaseRef.current !== 'guide') return;
      const dt = Math.min(0.05, (now - last) / 1000) * gameSpeed;
      last = now;

      // update lure
      setLure(lr => {
        let { x, y } = lr;
        const reeling = reelingRef.current;
        if (reeling) {
          x -= REEL_BACK_RATE * dt;
          y -= REEL_LIFT * dt;
        } else {
          y += (selectedBait?.sinkSpeed || LURE_SINK) * 0.014 * 100 * dt;
        }
        y = Math.max(24, Math.min(92, y));
        x = Math.max(20, Math.min(96, x));
        return { x, y };
      });

      // update shadows
      setShadows(sh => sh.map(s => {
        let { x, y, vx, vy } = s;
        x += vx * dt;
        y += vy * dt;
        if (x < 4) { x = 4; vx = Math.abs(vx); }
        if (x > 96) { x = 96; vx = -Math.abs(vx); }
        if (y < 28) { y = 28; vy = Math.abs(vy); }
        if (y > 90) { y = 90; vy = -Math.abs(vy); }
        return { ...s, x, y, vx, vy };
      }));

      guideRafRef.current = requestAnimationFrame(tick);
    };
    guideRafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(guideRafRef.current);
    };
  }, [phase, gameSpeed, selectedBait]);

  // bite detection — any lure↔shadow overlap = instant hookup
  React.useEffect(() => {
    if (phase !== 'guide') return;
    if (hookedShadow != null) return; // already hooked something

    for (const s of shadows) {
      const dx = s.x - lure.x, dy = s.y - lure.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist <= s.detect) {
        // instant hookup
        setHookedShadow(s.id);
        setShadows(prev => prev.map(p => p.id === s.id ? { ...p, interested: true } : p));
        setFightDist(Math.max(15, lure.x - 20));
        setFightTension(0);
        setFishTugging(false);
        setPhase('fight');
        return;
      }
    }

    // check fail: lure pulled all the way back without bite
    if (lure.x <= 22) {
      setResult({ kind: 'lost_empty' });
      setPhase('result');
    }
  }, [shadows, lure, phase, hookedShadow]);

  // ===== Phase E: Fight =====
  const fightRefs = React.useRef({ reeling: false, tugStateUntil: 0, isTugNow: false });
  React.useEffect(() => {
    if (phase !== 'fight') return;
    // tug cycle
    let cycleTimeoutId;
    const scheduleNext = () => {
      const isTug = !fightRefs.current.isTugNow;
      fightRefs.current.isTugNow = isTug;
      setFishTugging(isTug);
      const range = isTug ? TUG_DURATION : REST_DURATION;
      const dur = (rand(range[0], range[1]) * 1000) / gameSpeed;
      cycleTimeoutId = setTimeout(scheduleNext, dur);
    };
    cycleTimeoutId = setTimeout(scheduleNext, 600);

    let last = performance.now();
    let rafId;
    const tick = (now) => {
      if (phaseRef.current !== 'fight') return;
      const dt = Math.min(0.05, (now - last) / 1000) * gameSpeed;
      last = now;
      const reeling = fightRefs.current.reeling;
      const tugging = fightRefs.current.isTugNow;

      setFightDist(d => {
        if (debugFreezeDist) return d;
        let next = d;
        if (reeling && !tugging) next -= REEL_DISTANCE_RATE * dt;
        if (!reeling && tugging) next += FLEE_DISTANCE_RATE * dt;
        return Math.max(0, Math.min(80, next));
      });
      setFightTension(t => {
        if (debugFreezeTension) return t;
        let next = t;
        if (reeling && tugging) next += TENSION_TUG * dt;
        else if (reeling) next += TENSION_REEL_REST * dt;
        else next -= TENSION_DECAY * dt;
        return Math.max(0, Math.min(TENSION_MAX, next));
      });

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(cycleTimeoutId);
    };
  }, [phase, gameSpeed, debugFreezeTension, debugFreezeDist]);

  // fight resolution
  React.useEffect(() => {
    if (phase !== 'fight') return;
    if (fightTension >= TENSION_MAX) {
      const lineCap = state.hasBetterLine ? TENSION_MAX * 1.3 : TENSION_MAX;
      if (fightTension >= lineCap) {
        setResult({ kind: 'lost_break' });
        setPhase('result');
      }
    }
    if (fightDist <= CATCH_DISTANCE) {
      // roll fish identity from bait pool
      const fish = rollFish(selectedBait, castMaxBonus, state);
      setResult({ kind: 'caught', fish });
      setPhase('result');
    }
  }, [fightDist, fightTension, phase, selectedBait, castMaxBonus, state]);

  // ===== Phase F: Result handler =====
  const handleResultDismiss = (action) => {
    // consume blood lure on every cast attempt (worm is unlimited)
    if (selectedBait?.isQuestBait) {
      setState(s => ({ ...s, questBaits: Math.max(0, s.questBaits - 1) }));
    }

    if (result?.kind === 'caught' && action !== 'release') {
      const f = result.fish;
      setState(s => ({
        ...s,
        catches: [...s.catches, f],
        questFishCaught: f.quest ? s.questFishCaught + 1 : s.questFishCaught,
      }));
      onCatch?.(f);
    } else if (result?.kind === 'lost_break' && selectedBait?.isQuestBait) {
      onQuestFail?.({ forceLoss: true });
    }

    // back to boat (or back to bait for another try)
    if (action === 'again' && !selectedBait?.isQuestBait) {
      resetForRetry();
      return;
    }
    onClose();
  };

  const resetForRetry = () => {
    setPhase('bait');
    setSelectedBait(null);
    setCastPower(0);
    setCastMaxBonus(false);
    setLure({ x: 60, y: 30 });
    setShadows([]);
    setHookedShadow(null);
    setFightDist(60);
    setFightTension(0);
    setFishTugging(false);
    setResult(null);
  };

  // ===== Helpers =====
  function spawnShadows() {
    return Array.from({ length: SHADOW_COUNT }).map((_, i) => {
      const size = ['s','s','s','m','m','l'][randInt(0,5)];
      const sizePx = size === 'l' ? 60 : size === 'm' ? 42 : 28;
      const baseDetect = size === 'l' ? 2.5 : size === 'm' ? 1.8 : 1.2;
      return {
        id: i,
        x: randInt(30, 95),
        y: randInt(35, 85),
        vx: rand(-8, 8) || 4,
        vy: rand(-3, 3),
        size, sizePx,
        detect: baseDetect * afShadowRadius,
        interested: false,
      };
    });
  }

  function rollFish(bait, maxBonus, st) {
    if (bait?.isQuestBait) {
      // 70% chance for quest fish, 30% for pike (close substitute)
      if (Math.random() < 0.75) {
        const f = QUEST_FISH;
        return {
          id: Date.now() + Math.random(),
          species: f.id, name: f.name, color: f.color, img: f.img,
          weight: randInt(f.weight[0], f.weight[1]),
          value: 0, quest: true, tier: f.tier,
        };
      }
      // fallback to pike
      const pike = COMMON_FISH.find(c => c.id === 'pike');
      return {
        id: Date.now() + Math.random(),
        species: pike.id, name: pike.name, color: pike.color, img: pike.img,
        weight: Math.round(rand(pike.weight[0], pike.weight[1])),
        value: randInt(pike.value[0], pike.value[1]),
        quest: false, tier: pike.tier,
      };
    }
    // common bait — roll from common pool, weighted by rarity
    // max bonus = bias toward rarer fish
    let pool = COMMON_FISH.slice();
    if (maxBonus) {
      pool = pool.map(p => ({ ...p, rarity: p.rarity * 0.6 + 0.4 }));
    }
    const species = pickWeighted(pool);
    const weight = Math.round(rand(species.weight[0], species.weight[1]));
    const value = randInt(species.value[0], species.value[1]) * (maxBonus ? 1.2 : 1);
    return {
      id: Date.now() + Math.random(),
      species: species.id, name: species.name, color: species.color, img: species.img,
      weight, value: Math.round(value),
      quest: false, tier: species.tier,
    };
  }

  // ===== Render =====
  return (
    <div className="af-scene" data-screen-label="04 Active Fishing">
      <AfBackdrop phase={phase} />
      <AfBoat phase={phase} castPower={castPower} lure={lure}
              fightDist={fightDist} fishTugging={fishTugging}
              boatX={afBoatX} boatY={afBoatY} boatAnim={afBoatAnim}/>

      {/* Shadows visible from guide onward */}
      {(phase === 'guide' || phase === 'fight') && (
        <AfShadows shadows={shadows} hookedId={hookedShadow}
                   lure={lure} fightDist={fightDist}
                   phase={phase} fishTugging={fishTugging} />
      )}

      {/* Lure visible in guide only — during fight it's "inside" the fish */}
      {phase === 'guide' && (
        <AfLure x={lure.x}
                y={lure.y}
                bait={selectedBait} />
      )}

      {/* Phase-specific UI */}
      {/* Click catcher — only active during guide/fight, gated on pointer events */}
      {(phase === 'guide' || phase === 'fight') && (
        <div
          className="af-click-catcher"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            if (phase === 'guide') reelingRef.current = true;
            if (phase === 'fight') fightRefs.current.reeling = true;
          }}
          onPointerUp={() => {
            reelingRef.current = false;
            fightRefs.current.reeling = false;
          }}
          onPointerLeave={() => {
            reelingRef.current = false;
            fightRefs.current.reeling = false;
          }}
          onPointerCancel={() => {
            reelingRef.current = false;
            fightRefs.current.reeling = false;
          }}
        ></div>
      )}

      {phase === 'bait' && (
        <BaitPicker baits={availableBaits} onPick={onPickBait} onCancel={onClose} />
      )}

      {phase === 'charge' && (
        <CastMeter castPower={castPower}
                   onPressStart={startCharge} onPressEnd={releaseCharge}
                   onCancel={onClose} />
      )}

      {phase === 'guide' && (
        <GuideHud bait={selectedBait}
                  reelingHint="Hold mouse to reel · release to let it sink"
                  lure={lure}
                  onCancel={() => { setResult({ kind: 'lost_empty' }); setPhase('result'); }} />
      )}

      {phase === 'fight' && (
        <FightHud tension={fightTension}
                  distance={fightDist}
                  fishTugging={fishTugging}
                  hasBetterLine={state.hasBetterLine}/>
      )}

      {/* Debug controls — only in fight phase */}
      {phase === 'fight' && debugShow && (
        <div className="af-debug-panel">
          <div className="af-debug-head">
            <span>DEBUG · fight</span>
            <button onClick={() => setDebugShow(false)}>×</button>
          </div>
          <div className="af-debug-row">
            <label>Tension</label>
            <input type="range" min="0" max="100" step="1"
                   value={Math.round(fightTension)}
                   onChange={(e) => setFightTension(parseFloat(e.target.value))}/>
            <input type="number" min="0" max="100" step="1"
                   value={Math.round(fightTension)}
                   onChange={(e) => setFightTension(parseFloat(e.target.value) || 0)}/>
          </div>
          <div className="af-debug-row">
            <label>Freeze tension</label>
            <button className={debugFreezeTension ? 'on' : ''} onClick={() => setDebugFreezeTension(v => !v)}>
              {debugFreezeTension ? '● FROZEN' : '○ live'}
            </button>
          </div>
          <div className="af-debug-row">
            <label>Distance</label>
            <input type="range" min="0" max="80" step="1"
                   value={Math.round(fightDist)}
                   onChange={(e) => setFightDist(parseFloat(e.target.value))}/>
            <input type="number" min="0" max="80" step="1"
                   value={Math.round(fightDist)}
                   onChange={(e) => setFightDist(parseFloat(e.target.value) || 0)}/>
          </div>
          <div className="af-debug-row">
            <label>Freeze dist</label>
            <button className={debugFreezeDist ? 'on' : ''} onClick={() => setDebugFreezeDist(v => !v)}>
              {debugFreezeDist ? '● FROZEN' : '○ live'}
            </button>
          </div>
          <div className="af-debug-actions">
            <button onClick={() => setFightTension(0)}>tension = 0</button>
            <button onClick={() => setFightTension(50)}>= 50</button>
            <button onClick={() => setFightTension(100)}>= 100</button>
          </div>
        </div>
      )}
      {phase === 'fight' && !debugShow && (
        <button className="af-debug-reopen" onClick={() => setDebugShow(true)} style={{display:'none'}}>⇲ debug</button>
      )}

      {/* Tools panel — radius, boat position, boat animation */}
      {toolsShow && onAfTweak && (
        <div className="af-tools-panel">
          <div className="af-tools-head">
            <span>AF TOOLS</span>
            <button onClick={() => setToolsShow(false)}>×</button>
          </div>
          <div className="af-tools-row">
            <label>Shadow radius</label>
            <input type="range" min="0.3" max="4" step="0.1"
                   value={afShadowRadius}
                   onChange={(e) => onAfTweak({ shadowRadius: parseFloat(e.target.value) })}/>
            <input type="number" min="0.3" max="4" step="0.1"
                   value={afShadowRadius}
                   onChange={(e) => onAfTweak({ shadowRadius: parseFloat(e.target.value) || 1 })}/>
          </div>
          <div className="af-tools-row">
            <label>Boat X</label>
            <input type="range" min="-400" max="400" step="1"
                   value={afBoatX}
                   onChange={(e) => onAfTweak({ boatX: parseInt(e.target.value) })}/>
            <input type="number" min="-400" max="400" step="1"
                   value={afBoatX}
                   onChange={(e) => onAfTweak({ boatX: parseInt(e.target.value) || 0 })}/>
          </div>
          <div className="af-tools-row">
            <label>Boat Y</label>
            <input type="range" min="-300" max="300" step="1"
                   value={afBoatY}
                   onChange={(e) => onAfTweak({ boatY: parseInt(e.target.value) })}/>
            <input type="number" min="-300" max="300" step="1"
                   value={afBoatY}
                   onChange={(e) => onAfTweak({ boatY: parseInt(e.target.value) || 0 })}/>
          </div>
          <div className="af-tools-row">
            <label>Boat bob</label>
            <button className={afBoatAnim ? 'on' : ''}
                    onClick={() => onAfTweak({ boatAnim: !afBoatAnim })}>
              {afBoatAnim ? '● ON' : '○ OFF (static)'}
            </button>
          </div>
          <div className="af-tools-actions">
            <button onClick={() => onAfTweak({ shadowRadius: 1, boatX: 0, boatY: 0, boatAnim: true })}>↻ Reset all</button>
          </div>
        </div>
      )}
      {!toolsShow && onAfTweak && (
        <button className="af-tools-reopen" onClick={() => setToolsShow(true)} style={{display:'none'}}>⇲ tools</button>
      )}

      {phase === 'result' && result && (
        <ResultPanel result={result} bait={selectedBait}
                     state={state}
                     onAction={handleResultDismiss}/>
      )}
    </div>
  );
}

// ============== BACKDROP ==============
function AfBackdrop({ phase }) {
  return (
    <>
      <div className="af-sky"></div>
      <div className="af-water"></div>
      <div className="af-waterline"></div>
      <div className="af-underwater"></div>
    </>
  );
}

// ============== BOAT (small in upper-left) ==============
function AfBoat({ phase, castPower, lure, fightDist, fishTugging, boatX = 0, boatY = 0, boatAnim = true }) {
  // rod tip in % coords: ~25% x, ~14% y
  // line goes from rod tip to bobber landing / lure / hooked fish position
  const rodTip = { x: 25, y: 14 };
  let lineEnd = null;
  if (phase === 'cast') {
    lineEnd = { x: 25 + (castPower * 55) * 0.5, y: 18 };
  } else if (phase === 'guide') {
    lineEnd = lure;
  } else if (phase === 'fight') {
    lineEnd = { x: Math.max(20, fightDist + 20), y: 60 };
  }

  // animate bobber for cast
  const [bobAnim, setBobAnim] = React.useState({ x: rodTip.x, y: rodTip.y });
  React.useEffect(() => {
    if (phase !== 'cast') return;
    const start = performance.now();
    const dur = 1000;
    const targetX = 30 + castPower * 55;
    const targetY = 22;
    let rafId;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 2);
      const x = rodTip.x + (targetX - rodTip.x) * ease;
      const arc = Math.sin(t * Math.PI) * 14;
      const y = rodTip.y + (targetY - rodTip.y) * ease - arc;
      setBobAnim({ x, y });
      if (t < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [phase, castPower]);

  return (
    <>
      <div className="af-boat-wrap"
           style={{ transform: `translate(${boatX}px, ${boatY}px)` }}>
        <div className={`af-boat-inner ${boatAnim ? 'animated' : ''}`}>
          <img src="assets/boat.png" alt="" className="af-boat-img" draggable={false}
               style={{ transform: `${fishTugging ? 'rotate(-3deg)' : 'rotate(0)'}` }}/>
        </div>
      </div>

      {lineEnd && (
        <svg className="af-line-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <line x1={rodTip.x} y1={rodTip.y} x2={lineEnd.x} y2={lineEnd.y}
                stroke="rgba(255,255,255,.55)" strokeWidth=".18"
                strokeDasharray=".6 .4" vectorEffect="non-scaling-stroke"/>
        </svg>
      )}

      {phase === 'cast' && (
        <div className="af-bobber-fly"
             style={{ left: bobAnim.x + '%', top: bobAnim.y + '%' }}>
          <div className="af-bobber-shape"></div>
        </div>
      )}

      {phase === 'cast' && (
        <div className="af-splash"
             style={{ left: (30 + castPower * 55) + '%', top: '24%' }}/>
      )}
    </>
  );
}

// ============== SHADOWS ==============
function AfShadows({ shadows, hookedId, lure, fightDist, phase, fishTugging }) {
  return (
    <div className="af-shadow-zone">
      {shadows.map(s => {
        // hide other shadows during fight (focus on hooked one)
        if (phase === 'fight' && s.id !== hookedId) return null;
        const isHooked = s.id === hookedId;
        const x = phase === 'fight' && isHooked ? Math.max(20, fightDist + 20) : s.x;
        const y = phase === 'fight' && isHooked ? 60 : s.y;
        // Just flip horizontally — no angle tilt.
        // During fight, flip the hooked shadow to the opposite side.
        const baseFlip = s.vx > 0 ? -1 : 1;
        const flip = (phase === 'fight' && isHooked) ? -baseFlip : baseFlip;
        return (
          <div
            key={s.id}
            className={`af-shadow size-${s.size} ${s.interested ? 'interested' : ''} ${isHooked && fishTugging ? 'tugging' : ''}`}
            style={{
              left: x + '%',
              top: y + '%',
              width: s.sizePx + 'px',
              height: (s.sizePx * 0.4) + 'px',
              transform: `translate(-50%, -50%) scaleX(${flip})`,
            }}
          />
        );
      })}
    </div>
  );
}

// ============== LURE ==============
function AfLure({ x, y, bait }) {
  return (
    <div className="af-lure" style={{ left: x + '%', top: y + '%' }}>
      <div className="af-lure-dot" style={{ background: bait?.iconBg || '#c45a3a' }}></div>
    </div>
  );
}

// ============== PHASE A: BAIT PICKER ==============
function BaitPicker({ baits, onPick, onCancel }) {
  const [idx, setIdx] = React.useState(0);
  const bait = baits[idx];
  const next = () => setIdx(i => (i + 1) % baits.length);
  const prev = () => setIdx(i => (i - 1 + baits.length) % baits.length);

  return (
    <div className="af-modal-overlay">
      <button className="af-close-x" onClick={onCancel}>×</button>
      <div className="af-modal">
        <div className="af-modal-tab">ROD ▾</div>
        <div className="af-modal-title">{bait.name}</div>
        <div className="af-bait-card">
          <div className="af-bait-icon" style={{ background: bait.iconBg }}>
            <img src={bait.icon} alt="" draggable={false}/>
          </div>
          <div className="af-bait-info">
            <div className="af-bait-row">
              <span className="af-bait-lbl">Best for</span>
              <span className="af-bait-val">{bait.bestFor.join(', ')}</span>
            </div>
            <div className="af-bait-row">
              <span className="af-bait-lbl">Method</span>
              <span className="af-bait-val">{bait.method}</span>
            </div>
            <div className="af-bait-tags">
              {bait.sizes.map(s => (
                <span key={s} className={`af-bait-tag size-${s.toLowerCase()}`}>{s}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="af-bait-desc">{bait.desc}</div>
        <div className="af-bait-carousel">
          <button className="af-arrow" onClick={prev} disabled={baits.length < 2}>‹</button>
          <div className="af-bait-dots">
            {baits.map((b, i) => (
              <button key={b.id}
                      className={`af-bait-mini ${i === idx ? 'active' : ''}`}
                      onClick={() => setIdx(i)}
                      style={{ background: b.iconBg }}>
                <img src={b.icon} alt="" draggable={false}/>
              </button>
            ))}
          </div>
          <button className="af-arrow" onClick={next} disabled={baits.length < 2}>›</button>
        </div>
        <button className="af-modal-cta" onClick={() => onPick(bait)}>
          Cast with {bait.name}
        </button>
      </div>
    </div>
  );
}

// ============== PHASE B: CAST METER ==============
function CastMeter({ castPower, onPressStart, onPressEnd, onCancel }) {
  // power 0-1 → arc fills, bars fill
  const arcSweep = castPower * 180; // degrees
  const inMaxZone = castPower >= CAST_MAX_ZONE[0] && castPower < 1;
  const bars = 8;
  const filled = Math.round(castPower * bars);

  return (
    <>
      <button className="af-close-x" onClick={onCancel}>×</button>

      {/* The diegetic glowing arc emerging from rod */}
      <svg className="af-arc-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="arcGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%"  stopColor="#fff5dd" stopOpacity="0"/>
            <stop offset="40%" stopColor="#fff5dd" stopOpacity=".4"/>
            <stop offset="100%" stopColor={inMaxZone ? "#ffe680" : "#fff5dd"} stopOpacity=".9"/>
          </linearGradient>
        </defs>
        {/* arc from rod tip (25,14) sweeping up-right based on power */}
        <path
          d={`M 25 14 Q 50 ${14 - 6 - castPower * 8} ${25 + castPower * 60} ${14 + castPower * 6}`}
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth={.4 + castPower * .4}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          opacity={.4 + castPower * .6}
        />
      </svg>

      {/* signal bars near rod tip */}
      <div className="af-power-bars">
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i}
               className={`af-pbar ${i < filled ? 'on' : ''} ${i >= bars * CAST_MAX_ZONE[0] ? 'max-zone' : ''}`}
               style={{ height: 6 + i * 4 }}/>
        ))}
      </div>

      {/* charge instruction + click area */}
      <div className="af-charge-overlay"
           onMouseDown={onPressStart}
           onMouseUp={onPressEnd}
           onMouseLeave={onPressEnd}
           onTouchStart={(e) => { e.preventDefault(); onPressStart(); }}
           onTouchEnd={onPressEnd}>
        <div className="af-charge-hint">
          {castPower === 0
            ? 'Hold to charge cast'
            : inMaxZone
              ? '★ SWEET SPOT — release now!'
              : `Power: ${Math.round(castPower * 100)}%`}
        </div>
      </div>
    </>
  );
}

// ============== PHASE D: GUIDE HUD ==============
function GuideHud({ bait, lure, onCancel }) {
  return (
    <>
      <button className="af-close-x" onClick={onCancel}>×</button>
      <div className="af-stage-label">
        <span className="dim">// Bait:</span> <b>{bait?.name}</b> &nbsp;·&nbsp; reel it in — let the shadows come close
      </div>
      <div className="af-guide-help">
        <span className="pulse-mouse"></span>
        <span>Hold mouse to reel · release to let lure drift</span>
      </div>
    </>
  );
}

// ============== PHASE E: FIGHT HUD ==============
function FightHud({ tension, distance, fishTugging, hasBetterLine }) {
  const lineCap = hasBetterLine ? TENSION_MAX * 1.3 : TENSION_MAX;
  const tensionPct = Math.min(100, (tension / lineCap) * 100);
  const distPct = Math.max(0, Math.min(100, (distance / 60) * 100));
  return (
    <div className="af-fight-hud">
      <div className="af-fight-status">
        {fishTugging
          ? <div className="af-status tug">⚡ FISH IS TUGGING — release!</div>
          : <div className="af-status rest">— resting — keep reeling —</div>}
      </div>

      <div className="af-meter dist">
        <div className="af-meter-lbl">
          <span>Distance to boat</span>
          <span className="af-meter-val">{Math.round(distance)}m</span>
        </div>
        <div className="af-meter-bar">
          <div className="fill" style={{ transform: `scaleX(${(100 - distPct) / 100})` }}></div>
          <div className="catch-zone" style={{ width: `${(CATCH_DISTANCE / 60) * 100}%` }}></div>
        </div>
      </div>

      <div className={`af-meter tension ${tensionPct > 75 ? 'warn' : ''} ${tensionPct > 90 ? 'critical' : ''}`}>
        <div className="af-meter-lbl">
          <span>Line tension {hasBetterLine && <span className="upg">· REINFORCED</span>}</span>
          <span className="af-meter-val">{Math.round(tension)} / {Math.round(lineCap)}</span>
        </div>
        <div className="af-meter-bar">
          <div className="fill" style={{ transform: `scaleX(${tensionPct / 100})` }}></div>
          <div className="danger-mark"></div>
        </div>
      </div>

      <div className="af-fight-hint">
        Hold mouse <b>only when fish rests</b> · let go during tugs
      </div>
    </div>
  );
}

// ============== PHASE F: RESULT ==============
function ResultPanel({ result, bait, state, onAction }) {
  const { kind, fish } = result;
  const tier = fish?.tier && TIER_LABELS[fish.tier];
  const atCap = state.catches.length >= state.capacity;
  const canRetry = !bait?.isQuestBait; // worm only

  if (kind === 'caught') {
    return (
      <div className="af-result">
        <div className="af-result-card success">
          <div className="af-result-rarity" style={{ background: tier?.color }}>{tier?.label}</div>
          <h2>You caught a {fish.name}!</h2>
          {fish.img && (
            <img src={fish.img} alt="" className="af-result-fish-img"/>
          )}
          <div className="af-result-stats">
            <div><span>Weight</span><b>{(fish.weight/1000).toFixed(2)} kg</b></div>
            {fish.value > 0 && <div><span>Value</span><b>${fish.value}</b></div>}
            {fish.quest && <div className="quest-row"><span>Quest progress</span><b>+1 Dangerous Perch</b></div>}
          </div>
          <div className="af-result-buttons">
            <button className="btn ghost" onClick={() => onAction('release')}>Release back</button>
            <button className="btn primary" disabled={atCap} onClick={() => onAction('keep')}>
              {atCap ? 'Crate full' : 'Keep & return'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fails = {
    lost_break: {
      title: '💥 Line snapped',
      msg: bait?.isQuestBait
        ? 'The fish was too strong. It got away with your bait — you need a stronger line.'
        : 'The line couldn\'t hold the tension. Fish got away.',
    },
    lost_empty: {
      title: '🎣 Nothing bit',
      msg: 'You reeled all the way back without a single nibble. Try a different cast or bait.',
    },
    lost_overshoot: {
      title: '✗ You held too long',
      msg: 'Power maxed out and the cast fizzled. Try releasing earlier.',
    },
  };
  const f = fails[kind] || fails.lost_empty;

  return (
    <div className="af-result">
      <div className="af-result-card fail">
        <h2>{f.title}</h2>
        <p>{f.msg}</p>
        <div className="af-result-buttons">
          <button className="btn ghost" onClick={() => onAction('close')}>Back to boat</button>
          {canRetry && (
            <button className="btn primary" onClick={() => onAction('again')}>Try again</button>
          )}
        </div>
      </div>
    </div>
  );
}

window.ActiveFishing = ActiveFishing;

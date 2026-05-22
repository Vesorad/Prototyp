// app.jsx — main orchestrator
const INITIAL_STATE = {
  money: 0,
  catches: [],            // array of fish objects
  capacity: 5,
  upgrades: [],           // ids of purchased upgrades
  hasBetterLine: false,
  hasRodUpgrade: false,
  hasQuestBait: false,
  questBaits: 0,
  baitEquipped: false,
  questFishCaught: 0,
  // narrative flags
  introSeen: false,
  firstQuestCelebrated: false,
  secondQuestFailSeen: false,
};

const INTRO_LINES = [
  "Hey there, kid! Name's Marina, harbor captain of this bay.",
  "Finally, someone showed up. The rest of my boys... well, long story.",
  "I've got a job for you. Three DANGEROUS PERCH lurk under our reef. Each weighs around two kilos and has teeth like razors.",
  "Catch me three of them — you'll get something that belonged to my father. Marina's word.",
  "Go warm up first. The waters are calm and the spot is quiet. Good luck, fisher."
];

const FIRST_QUEST_LINES = [
  "Damn, you actually did it! First perch, already in the crate.",
  "Two more to go. Those beasts can pull hard — watch that line.",
];

const SECOND_FAIL_LINES = [
  "I heard that line snap all the way from the harbor. Your old line won't hold up.",
  "Get back to Helga — sell your fish, buy a stronger line. Otherwise every one of them slips away.",
];

const ENDING_DIALOG_LINES = [
  "Three perch. Three, just like I promised. Nobody's done this in a quarter century.",
  "My father used to fish these beasts, before... never mind.",
  "This is for you. The old family medallion. And the keys to the next fishing ground.",
  "Come back when you're ready for something bigger, fisher."
];

function App() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  const [state, setState] = React.useState(INITIAL_STATE);
  const [screen, setScreen] = React.useState('map');
  const [dialog, setDialog] = React.useState(null);   // { character, lines, onDone, cutscene }
  const [cutscene, setCutscene] = React.useState(null); // { src, onContinue }
  const [toast, setToast] = React.useState(null);
  const [blackout, setBlackout] = React.useState(false);

  // Helper — runs a dialog, then (optionally) its cutscene, then onDone.
  // Pass `cutscene: 'assets/scenes/x.mp4'` on a dialog config to chain.
  const openDialog = (cfg) => {
    const { cutscene: csSrc, onDone, ...rest } = cfg;
    setDialog({
      ...rest,
      onDone: () => {
        setDialog(null);
        if (csSrc) {
          setCutscene({
            src: csSrc,
            onContinue: () => {
              setCutscene(null);
              onDone && onDone();
            },
          });
        } else {
          onDone && onDone();
        }
      },
    });
  };

  // Apply tweak: jump to a specific screen at startup
  const firstRunRef = React.useRef(true);
  React.useEffect(() => {
    if (!firstRunRef.current) return;
    firstRunRef.current = false;
    if (t.startScreen && t.startScreen !== 'map') {
      // Setup synthetic state for shortcut screens
      if (t.startScreen === 'intro') setScreen('map'); // intro is triggered from map pick
      if (t.startScreen === 'boat') {
        setState(s => ({ ...s, introSeen: true }));
        setScreen('boat');
      }
      if (t.startScreen === 'store') {
        setState(s => ({
          ...s, introSeen: true,
          catches: [
            { id:1, species:'sardine', name:'Sardine', color:'#8db4d4', weight:70, value:8 },
            { id:2, species:'roach', name:'Roach', color:'#9bbf94', weight:180, value:12 },
            { id:3, species:'perch', name:'Perch', color:'#5a8a4a', weight:320, value:16 },
            { id:4, species:'crucian', name:'Crucian', color:'#c4a45e', weight:240, value:14 },
          ],
          money: 40,
        }));
        setScreen('store');
      }
      if (t.startScreen === 'active') {
        setState(s => ({ ...s, introSeen: true }));
        setScreen('active');
      }
      if (t.startScreen === 'ending') {
        setState(s => ({ ...s, introSeen: true, questFishCaught: 3 }));
        setScreen('ending');
      }
    }
  }, [t.startScreen]);

  // Animated black flash helper
  const fadeTo = (nextScreen, mid) => {
    setBlackout(true);
    setTimeout(() => {
      mid && mid();
      setScreen(nextScreen);
      setTimeout(() => setBlackout(false), 100);
    }, 700);
  };

  // ============== EVENT HANDLERS ==============
  const handleMapPick = (spotId) => {
    if (state.introSeen) {
      fadeTo('boat');
    } else {
      // open intro dialog over the map → then play the scene
      openDialog({
        character: 'marina',
        side: 'left',
        lines: INTRO_LINES,
        cutscene: 'assets/scenes/s_4.mp4',
        onDone: () => {
          setState(s => ({ ...s, introSeen: true }));
          fadeTo('boat');
        },
      });
    }
  };

  const handleGoActive = () => setScreen('active');
  const handleCloseActive = () => setScreen('boat');

  const handleCatch = (fish) => {
    // First quest fish — show celebration dialog
    if (fish.quest && !state.firstQuestCelebrated) {
      // schedule dialog after returning to boat
      setTimeout(() => {
        openDialog({
          character: 'marina',
          lines: FIRST_QUEST_LINES,
          cutscene: 'assets/scenes/s_4.mp4',
          onDone: () => {
            setState(s => ({ ...s, firstQuestCelebrated: true }));
          },
        });
      }, 200);
    }
  };

  const handleQuestFail = (cfg) => {
    if (cfg.forceLoss && !state.secondQuestFailSeen) {
      setTimeout(() => {
        openDialog({
          character: 'marina',
          lines: SECOND_FAIL_LINES,
          cutscene: 'assets/scenes/s_4.mp4',
          onDone: () => {
            setState(s => ({ ...s, secondQuestFailSeen: true }));
          },
        });
      }, 300);
    }
  };

  const handleReturnToBay = () => {
    // After third quest fish + return → ending
    if (state.questFishCaught >= 3) {
      fadeTo('store', () => {
        // small delay then trigger ending dialog
      });
      setTimeout(() => {
        openDialog({
          character: 'marina',
          lines: ENDING_DIALOG_LINES,
          cutscene: 'assets/scenes/s_4.mp4',
          onDone: () => {
            fadeTo('ending');
          },
        });
      }, 1400);
      return;
    }
    fadeTo('store');
  };

  const handleLeaveStore = () => {
    fadeTo('boat');
  };

  const handleRestart = () => {
    setState(INITIAL_STATE);
    fadeTo('map');
  };

  // ============== RENDER ==============
  let sceneEl = null;
  if (screen === 'map') sceneEl = <MapScreen onPick={handleMapPick} />;
  if (screen === 'boat') sceneEl = <BoatScreen
      state={state} setState={setState}
      gameSpeed={t.gameSpeed || 1}
      onGoActive={handleGoActive}
      onReturnToBay={handleReturnToBay}
      boatX={t.boatX || 0}
      boatY={t.boatY || 0}
      boatScale={t.boatScale || 1}
      onBoatPos={(p) => {
        if (p.x !== undefined) setTweak('boatX', p.x);
        if (p.y !== undefined) setTweak('boatY', p.y);
        if (p.scale !== undefined) setTweak('boatScale', p.scale);
      }}
      skyX={t.skyX || 0}
      skyY={t.skyY || 0}
      skyScale={t.skyScale || 1}
      skyAnim={t.skyAnim === true}
      onSkyPos={(p) => {
        if (p.x !== undefined) setTweak('skyX', p.x);
        if (p.y !== undefined) setTweak('skyY', p.y);
        if (p.scale !== undefined) setTweak('skyScale', p.scale);
        if (p.anim !== undefined) setTweak('skyAnim', p.anim);
      }}
      bgX={t.bgX || 0}
      bgY={t.bgY || 0}
      bgScale={t.bgScale || 1}
      bgAnim={t.bgAnim === true}
      onBgPos={(p) => {
        if (p.x !== undefined) setTweak('bgX', p.x);
        if (p.y !== undefined) setTweak('bgY', p.y);
        if (p.scale !== undefined) setTweak('bgScale', p.scale);
        if (p.anim !== undefined) setTweak('bgAnim', p.anim);
      }}
      waterX={t.waterX || 0}
      waterY={t.waterY || 0}
      waterScale={t.waterScale || 1}
      waterAnim={t.waterAnim !== false}
      onWaterPos={(p) => {
        if (p.x !== undefined) setTweak('waterX', p.x);
        if (p.y !== undefined) setTweak('waterY', p.y);
        if (p.scale !== undefined) setTweak('waterScale', p.scale);
        if (p.anim !== undefined) setTweak('waterAnim', p.anim);
      }}
    />;
  if (screen === 'active') sceneEl = <ActiveFishing
      state={state} setState={setState}
      gameSpeed={t.gameSpeed || 1}
      onClose={handleCloseActive}
      onCatch={handleCatch}
      onQuestFail={handleQuestFail}
      afShadowRadius={t.afShadowRadius ?? 1}
      afBoatX={t.afBoatX ?? 0}
      afBoatY={t.afBoatY ?? 0}
      afBoatAnim={t.afBoatAnim !== false}
      afRodX={t.afRodX ?? 25}
      afRodY={t.afRodY ?? 14}
      afBgImage={t.afBgImage || 'sky'}
      afBgX={t.afBgX || 0}
      afBgY={t.afBgY || 0}
      afBgScale={t.afBgScale || 1}
      afLureSink={t.afLureSink ?? 14}
      afReelGuide={t.afReelGuide ?? 22}
      afReelFight={t.afReelFight ?? 18}
      onAfTweak={(p) => {
        if (p.shadowRadius !== undefined) setTweak('afShadowRadius', p.shadowRadius);
        if (p.boatX !== undefined) setTweak('afBoatX', p.boatX);
        if (p.boatY !== undefined) setTweak('afBoatY', p.boatY);
        if (p.boatAnim !== undefined) setTweak('afBoatAnim', p.boatAnim);
        if (p.rodX !== undefined) setTweak('afRodX', p.rodX);
        if (p.rodY !== undefined) setTweak('afRodY', p.rodY);
        if (p.bgImage !== undefined) setTweak('afBgImage', p.bgImage);
        if (p.bgX !== undefined) setTweak('afBgX', p.bgX);
        if (p.bgY !== undefined) setTweak('afBgY', p.bgY);
        if (p.bgScale !== undefined) setTweak('afBgScale', p.bgScale);
        if (p.lureSink !== undefined) setTweak('afLureSink', p.lureSink);
        if (p.reelGuide !== undefined) setTweak('afReelGuide', p.reelGuide);
        if (p.reelFight !== undefined) setTweak('afReelFight', p.reelFight);
      }}
    />;
  if (screen === 'store') sceneEl = <StoreScreen
      state={state} setState={setState}
      onLeave={handleLeaveStore}
      helgaSkin={t.helgaSkin || 'helga'}
      onHelgaSkin={(v) => setTweak('helgaSkin', v)}
      helgaX={t.helgaX || 0}
      helgaY={t.helgaY || 0}
      helgaScale={t.helgaScale || 1}
      onHelgaPos={(p) => {
        if (p.x !== undefined) setTweak('helgaX', p.x);
        if (p.y !== undefined) setTweak('helgaY', p.y);
        if (p.scale !== undefined) setTweak('helgaScale', p.scale);
      }}
    />;
  if (screen === 'ending') sceneEl = <EndingScreen onRestart={handleRestart} />;

  return (
    <div className="stage">
      {sceneEl}
      {dialog && <Dialog
        character={dialog.character}
        side={dialog.side || 'left'}
        lines={dialog.lines}
        onDone={dialog.onDone}
      />}
      {cutscene && <Cutscene
        src={cutscene.src}
        onContinue={cutscene.onContinue}
      />}
      {toast && <Toast onDone={() => setToast(null)}>{toast}</Toast>}
      <div className={`blackout ${blackout ? 'on' : ''}`}></div>

      <TweaksPanel>
        <TweakSection label="Dev shortcuts" />
        <TweakSelect
          label="Jump to screen"
          value={t.startScreen}
          options={['map','boat','active','store','ending']}
          onChange={(v) => setTweak('startScreen', v)}
        />
        <TweakSlider
          label="Game speed"
          value={t.gameSpeed}
          min={0.5} max={4} step={0.5}
          onChange={(v) => setTweak('gameSpeed', v)}
        />
        <TweakSection label="Game state (live)" />
        <div style={{fontSize:11, color:'rgba(41,38,27,.65)', fontFamily:'JetBrains Mono, monospace', lineHeight:1.7}}>
          $: <b>{state.money}</b><br/>
          fish in crate: <b>{state.catches.length}/{state.capacity}</b><br/>
          quest fish: <b>{state.questFishCaught}/3</b><br/>
          quest baits: <b>{state.questBaits}</b><br/>
          line+: <b>{state.hasBetterLine ? 'YES' : 'no'}</b>
        </div>
        <TweakSection label="Cheats (test)" />
        <TweakButton
          label="+ $100"
          onClick={() => setState(s => ({...s, money: s.money + 100}))}
        />
        <TweakButton
          label="+ quest bait"
          onClick={() => setState(s => ({...s, hasQuestBait: true, questBaits: s.questBaits + 1}))}
        />
        <TweakButton
          label="+ better line"
          onClick={() => setState(s => ({...s, hasBetterLine: true, upgrades: [...new Set([...s.upgrades, 'line1'])]}))}
        />
        <TweakButton
          label="Reset game"
          onClick={() => { setState(INITIAL_STATE); fadeTo('map'); }}
        />
      </TweaksPanel>

      {/* Faint dev hint bottom-left */}
      <div className="tweak-hint">// Toggle Tweaks (top bar) to jump between screens</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// shared.jsx — data, helpers, shared widgets

// ============== FISH DATA ==============
// ============== BAITS ==============
const BAITS = [
  {
    id: 'worm',
    name: 'Common Worm',
    desc: 'A wriggly classic. Small and medium fish bite freely.',
    method: 'Suspended Bait',
    bestFor: ['Sardine', 'Roach', 'Crucian'],
    sizes: ['S', 'M'],
    sinkSpeed: 18,         // px/s downward when idle
    surfaceLevel: 0.55,    // 0 = surface, 1 = bottom — preferred depth
    quality: 1.0,          // bite chance multiplier
    icon: 'assets/upgrades/blood-lure.png', // placeholder fallback
    iconBg: '#7a4a2a',
    isQuestBait: false,
    pool: 'common',        // which fish pool
  },
  {
    id: 'bloodLure',
    name: 'Blood Lure',
    desc: 'A crimson rig that draws dangerous perch from the depths.',
    method: 'Jig or Retrieve',
    bestFor: ['Dangerous Perch'],
    sizes: ['L'],
    sinkSpeed: 28,
    surfaceLevel: 0.75,
    quality: 1.6,
    icon: 'assets/upgrades/blood-lure.png',
    iconBg: '#3a1818',
    isQuestBait: true,
    pool: 'quest',
  },
];

const COMMON_FISH = [
  { id: 'sardine', name: 'Sardine', weight: [40, 90],   value: [6, 10],  color: '#c45a3a', rarity: 1.0, img: 'assets/fish/sardine.png', tier: 'common' },
  { id: 'roach',   name: 'Roach',   weight: [120, 220], value: [9, 14],  color: '#5a8a4a', rarity: 0.9, img: 'assets/fish/roach.png', tier: 'common' },
  { id: 'crucian', name: 'Crucian', weight: [180, 320], value: [11, 16], color: '#d97757', rarity: 0.7, img: 'assets/fish/crucian.png', tier: 'uncommon' },
  { id: 'perch',   name: 'Perch',   weight: [220, 400], value: [14, 20], color: '#b8412a', rarity: 0.55, img: 'assets/fish/perch.png', tier: 'uncommon' },
  { id: 'pike',    name: 'Pike',    weight: [600, 1100],value: [20, 28], color: '#3a6c87', rarity: 0.25, img: 'assets/fish/pike.png', tier: 'rare' },
];

const TIER_LABELS = {
  common:   { label: 'Common',    color: '#7a8a6a' },
  uncommon: { label: 'Uncommon',  color: '#3a82a0' },
  rare:     { label: 'Rare',      color: '#7a5aa0' },
  epic:     { label: 'Epic',      color: '#c45a3a' },
  legendary:{ label: 'Legendary', color: '#e8b647' },
};

const QUEST_FISH = {
  id: 'danger_perch', name: 'Dangerous Perch', shortName: 'D. Perch',
  weight: [1200, 1800], value: [0, 0], color: '#7a2a2a',
  img: 'assets/fish/pike.png',
  tier: 'epic',
};

const SHOP_BAITS = [
  { id: 'dread_lure', name: 'Blood Lure', desc: 'Attracts dangerous perch. 1 use.', price: 80, badge: 'QUEST', img: 'assets/upgrades/blood-lure.png' },
];

const SHOP_UPGRADES = [
  { id: 'cap1', name: 'Bigger Crate', desc: 'Capacity 5 → 8 fish',  price: 60, kind: 'capacity', value: 8, img: 'assets/upgrades/bigger-crate.png' },
  { id: 'cap2', name: 'Second Crate', desc: 'Capacity 8 → 12 fish', price: 140, kind: 'capacity', value: 12, requires:'cap1', img: 'assets/upgrades/second-crate.png' },
  { id: 'line1', name: 'Reinforced Line', desc: 'Withstands greater tension.', price: 120, kind: 'line', value: 1, img: 'assets/upgrades/reinforced-line.png' },
  { id: 'rod1',  name: 'Longer Rod', desc: 'Faster line reeling.', price: 90, kind: 'rod', value: 1, img: 'assets/upgrades/longer-rod.png' },
];

// ============== HELPERS ==============
function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pickWeighted(arr, key='rarity') {
  const total = arr.reduce((s, x) => s + x[key], 0);
  let r = Math.random() * total;
  for (const x of arr) { r -= x[key]; if (r <= 0) return x; }
  return arr[arr.length - 1];
}
function fmtMoney(v) { return '$' + v.toLocaleString('pl-PL'); }

// ============== CHARACTERS ==============
const CHARACTERS = {
  marina: {
    name: 'Marina',
    tag: 'Harbor Captain',
    portraitA: '#f7c98a',
    portraitB: '#c45a3a',
    accent: '#c45a3a',
    img: 'assets/characters/marina-portrait.png',
  },
  helga: {
    name: 'Helga',
    tag: 'Merchant / Shop',
    portraitA: '#c39a6a',
    portraitB: '#5a2d2d',
    accent: '#5a8a4a',
    img: 'assets/characters/helga-portrait.png',
    chatAvatar: 'assets/characters/helga-avatar.png',
  },
};

// ============== PORTRAIT COMPONENT ==============
function Portrait({ character, side = 'left' }) {
  const c = CHARACTERS[character];
  if (!c) return null;
  return (
    <div className={`dialog-portrait ${side === 'right' ? 'right' : ''}`}>
      <div className="portrait-frame">
        <div className="char-placeholder">
          {c.img ? (
            <img
              className="char-img dialog-char-img"
              src={c.img}
              alt={c.name}
            />
          ) : (
            <div
              className="char-blob"
              style={{
                background: `radial-gradient(ellipse at 50% 30%, rgba(255,255,255,.35) 0%, transparent 60%), linear-gradient(160deg, ${c.portraitA} 0%, ${c.portraitB} 100%)`,
              }}
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============== TYPEWRITER HOOK ==============
function useTypewriter(text, speed = 24) {
  const [out, setOut] = React.useState('');
  const [done, setDone] = React.useState(false);
  React.useEffect(() => {
    setOut(''); setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return [out, done, () => { setOut(text); setDone(true); }];
}

// ============== TOP HUD ==============
function TopHud({ state }) {
  const { money, catches, capacity, questFishCaught, hasQuestBait, questBaits } = state;
  const totalFish = catches.length;
  return (
    <div className="hud">
      <div className="hud-pill">
        <div><span className="lbl">$</span><span className="val">{money}</span></div>
        <div className="sep"></div>
        <div><span className="lbl">Crate</span><span className="val">{totalFish}/{capacity}</span></div>
        {hasQuestBait && questBaits > 0 && (
          <>
            <div className="sep"></div>
            <div><span className="lbl">Bait</span><span className="val" style={{color:'#e87b5a'}}>×{questBaits}</span></div>
          </>
        )}
      </div>
      <div className="quest-card">
        <div className="qtitle">Marina's Request</div>
        <div className="qbody">Catch 3 Dangerous Perch</div>
        <div className="qprog">
          {[0,1,2].map(i => (
            <div key={i} className={`qdot ${i < questFishCaught ? 'filled' : ''}`}></div>
          ))}
          <div className="qhint">{questFishCaught}/3</div>
        </div>
      </div>
    </div>
  );
}

// ============== BLACKOUT TRANSITION ==============
function useBlackout() {
  const [on, setOn] = React.useState(false);
  const flash = React.useCallback((midpoint, duration = 700) => {
    return new Promise(resolve => {
      setOn(true);
      setTimeout(() => {
        midpoint && midpoint();
        setTimeout(() => {
          setOn(false);
          resolve();
        }, duration);
      }, duration);
    });
  }, []);
  return [on, flash];
}

// Expose globals so other Babel files can use them
Object.assign(window, {
  BAITS, COMMON_FISH, QUEST_FISH, SHOP_BAITS, SHOP_UPGRADES,
  TIER_LABELS,
  CHARACTERS,
  rand, randInt, pickWeighted, fmtMoney,
  Portrait, useTypewriter, TopHud, useBlackout,
});

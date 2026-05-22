// store-screen.jsx — Rusty's bait & tackle redesign
// Right-side tabbed panel modeled after the reference image.
// The shop bg (assets/store/bg.png) carries the shopkeeper artwork.

function StoreScreen({ state, setState, onLeave, helgaX = 0, helgaY = 0, helgaScale = 1, onHelgaPos,
                       helgaSkin = 'helga', onHelgaSkin }) {
  const skin = HELGA_SKINS[helgaSkin] || HELGA_SKINS.helga;
  const [tab, setTab] = React.useState('sell'); // sell | bait | upgrades | flirt
  const [selBaitId, setSelBaitId] = React.useState(SHOP_BAITS[0]?.id || null);
  const [selUpgradeId, setSelUpgradeId] = React.useState(SHOP_UPGRADES[0]?.id || null);
  const [selSpecies, setSelSpecies] = React.useState(null);
  const [flirting, setFlirting] = React.useState(false);
  const [flirtCutscene, setFlirtCutscene] = React.useState(null);
  const [galleryOpen, setGalleryOpen] = React.useState(false);

  // ---------- derived data ----------
  const grouped = React.useMemo(() => {
    const map = {};
    state.catches.forEach(f => {
      if (!map[f.species]) map[f.species] = {
        species: f.species, name: f.name, color: f.color, img: f.img,
        count: 0, total: 0, weight: 0,
      };
      map[f.species].count++;
      map[f.species].total += f.value;
      map[f.species].weight += f.weight;
    });
    return Object.values(map);
  }, [state.catches]);

  const totalSale = state.catches.reduce((s, f) => s + (f.value || 0), 0);

  // ---------- actions ----------
  const handleSellAll = () => {
    if (totalSale <= 0) return;
    setState(s => ({
      ...s,
      money: s.money + totalSale,
      catches: [],
    }));
    setSelSpecies(null);
  };

  const handleSellOne = (sp) => {
    const target = state.catches.find(f => f.species === sp);
    if (!target) return;
    setState(s => ({
      ...s,
      money: s.money + (target.value || 0),
      catches: s.catches.filter(f => f.id !== target.id),
    }));
  };

  const canBuyUpgrade = (u) => {
    if (!u) return false;
    if (state.upgrades.includes(u.id)) return false;
    if (u.requires && !state.upgrades.includes(u.requires)) return false;
    if (state.money < u.price) return false;
    return true;
  };

  const buyUpgrade = (u) => {
    if (!canBuyUpgrade(u)) return;
    setState(s => {
      const next = { ...s, money: s.money - u.price, upgrades: [...s.upgrades, u.id] };
      if (u.kind === 'capacity') next.capacity = u.value;
      if (u.kind === 'line') next.hasBetterLine = true;
      if (u.kind === 'rod') next.hasRodUpgrade = true;
      return next;
    });
  };

  const buyBait = (b) => {
    if (!b || state.money < b.price) return;
    setState(s => ({
      ...s,
      money: s.money - b.price,
      hasQuestBait: true,
      questBaits: s.questBaits + 1,
    }));
  };

  // Sync default selections
  React.useEffect(() => {
    if (tab === 'sell' && !selSpecies && grouped[0]) setSelSpecies(grouped[0].species);
  }, [tab, grouped, selSpecies]);

  // ---------- per-tab content ----------
  const TAB_META = {
    sell:     { title: 'Your Catch',  count: state.catches.length },
    bait:     { title: 'Hooks & Lures', count: SHOP_BAITS.length },
    upgrades: { title: 'Rods & Gear', count: SHOP_UPGRADES.length },
    flirt:    { title: 'Chat with Helga', count: 0 },
  };

  // featured + grid items per tab
  let featured = null;
  let grid = [];
  let primaryAction = null;

  if (tab === 'sell') {
    const sel = grouped.find(g => g.species === selSpecies) || grouped[0];
    featured = sel ? {
      img: sel.img, name: sel.name,
      lines: [
        ['Caught', `× ${sel.count}`],
        ['Weight', `${(sel.weight / 1000).toFixed(2)} kg`],
        ['Value', `$${sel.total}`],
      ],
      tags: [],
    } : null;
    grid = grouped.map(g => ({
      id: g.species,
      img: g.img,
      label: g.name,
      tag: g.count,
      selected: g.species === selSpecies,
      onClick: () => setSelSpecies(g.species),
    }));
    primaryAction = totalSale > 0
      ? { label: `Sell everything — $${totalSale}`, onClick: handleSellAll, disabled: false }
      : { label: 'Nothing to sell', onClick: () => {}, disabled: true };
  }

  if (tab === 'bait') {
    const sel = SHOP_BAITS.find(b => b.id === selBaitId);
    featured = sel ? {
      img: sel.img, name: sel.name.toUpperCase(),
      lines: [
        ['Best for', 'Dangerous Perch'],
        ['Use', '1 cast'],
        ['Owned', `× ${state.questBaits || 0}`],
      ],
      tags: sel.badge ? [sel.badge] : [],
    } : null;
    grid = SHOP_BAITS.map(b => ({
      id: b.id,
      img: b.img,
      label: b.name,
      selected: b.id === selBaitId,
      onClick: () => setSelBaitId(b.id),
    }));
    primaryAction = sel
      ? { label: `Buy — $${sel.price}`, onClick: () => buyBait(sel), disabled: state.money < sel.price }
      : null;
  }

  if (tab === 'upgrades') {
    const sel = SHOP_UPGRADES.find(u => u.id === selUpgradeId);
    const owned = sel && state.upgrades.includes(sel.id);
    const locked = sel && sel.requires && !state.upgrades.includes(sel.requires);
    featured = sel ? {
      img: sel.img, name: sel.name.toUpperCase(),
      lines: [
        ['Effect', sel.desc],
        ['Type', sel.kind],
        locked ? ['Locked', `needs ${sel.requires}`] : owned ? ['Status', 'owned'] : ['Price', `$${sel.price}`],
      ].filter(Boolean),
      tags: owned ? ['OWNED'] : locked ? ['LOCKED'] : [],
    } : null;
    grid = SHOP_UPGRADES.map(u => ({
      id: u.id,
      img: u.img,
      label: u.name,
      selected: u.id === selUpgradeId,
      owned: state.upgrades.includes(u.id),
      locked: u.requires && !state.upgrades.includes(u.requires),
      onClick: () => setSelUpgradeId(u.id),
    }));
    primaryAction = sel
      ? owned
        ? { label: '✓ Owned', onClick: () => {}, disabled: true }
        : locked
          ? { label: `Locked · needs ${sel.requires}`, onClick: () => {}, disabled: true }
          : { label: `Buy — $${sel.price}`, onClick: () => buyUpgrade(sel), disabled: !canBuyUpgrade(sel) }
      : null;
  }

  if (tab === 'flirt') {
    featured = {
      img: skin.avatar,
      name: skin.name.toUpperCase(),
      lines: [
        ['Mood', 'Friendly, sharp tongue'],
        ['Shift', 'Behind the counter'],
        ['Status', 'Online'],
      ],
      tags: ['CHAT'],
    };
    grid = [];
    primaryAction = { label: 'Open chat 💬', onClick: () => setFlirting(true), disabled: false };
  }

  // ---------- render ----------
  return (
    <div className="scene store-screen" data-screen-label="05 Store">
      <div className="store-bg"></div>
      {/* TopHud intentionally omitted in store — quest card and money
          counter would overlap the panel (the panel shows money itself). */}

      {flirting && <FlirtChat
        skin={skin}
        onClose={(result) => {
        setFlirting(false);
        if (result && result.cutscene) setFlirtCutscene(result.cutscene);
      }} />}
      {flirtCutscene && <Cutscene src={flirtCutscene} onContinue={() => setFlirtCutscene(null)} />}
      {galleryOpen && <Gallery onClose={() => setGalleryOpen(false)} />}

      {/* Gallery hub-button — sits in the top-left of the store, away from the right panel */}
      <button
        className="store-gallery-btn"
        onClick={() => setGalleryOpen(true)}
        title="Open scene gallery"
      >
        <span className="store-gallery-icon" aria-hidden="true">🖼</span>
        <span className="store-gallery-label">Gallery</span>
      </button>

      {/* Helga — standalone portrait on the left side (decorative, in front of the bg) */}
      <div className="store-helga">
        <img
          className="store-helga-img"
          src={skin.img}
          alt={skin.name}
          draggable={false}
          style={{
            transform: `translate(${helgaX}px, ${helgaY}px) scale(${helgaScale})`,
            transformOrigin: 'center bottom',
          }}
        />
      </div>

      {/* Right-side panel (Rusty's tablet) */}
      <div className="rs-panel">
        {/* Top tabs (hang off the top edge) */}
        <div className="rs-tabs">
          <RsTab on={tab === 'bait'}     onClick={() => setTab('bait')}     icon="hook"  title="Hooks & Lures"/>
          <RsTab on={tab === 'upgrades'} onClick={() => setTab('upgrades')} icon="rod"   title="Rods & Gear"/>
          <RsTab on={tab === 'flirt'}    onClick={() => setTab('flirt')}    icon="chat"  title="Chat"/>
          <RsTab on={tab === 'sell'}     onClick={() => setTab('sell')}     icon="fish"  title="Your Catch"/>
        </div>

        {/* Header: section title + coin counter */}
        <div className="rs-header">
          <div className="rs-title">{TAB_META[tab].title.toUpperCase()}</div>
          <div className="rs-coins">
            <span className="rs-coins-val">{state.money}</span>
            <span className="rs-coins-icon" aria-hidden="true">⊙</span>
          </div>
        </div>

        {/* Featured item card */}
        {featured && (
          <div className="rs-feat">
            <div className="rs-feat-icon">
              {featured.img
                ? <img src={featured.img} alt={featured.name} draggable={false}/>
                : <div className="rs-feat-icon-empty">—</div>}
            </div>
            <div className="rs-feat-info">
              <div className="rs-feat-name">{featured.name || '—'}</div>
              {featured.lines && (
                <div className="rs-feat-lines">
                  {featured.lines.map(([k, v], i) => (
                    <div key={i} className="rs-feat-line">
                      <span className="rs-feat-k">{k}</span>
                      <span className="rs-feat-v">{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {featured.tags && featured.tags.length > 0 && (
                <div className="rs-feat-tags">
                  {featured.tags.map((t, i) => <span key={i} className="rs-feat-tag">{t}</span>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Item grid */}
        {grid.length > 0 && (
          <div className="rs-grid">
            {grid.map(g => (
              <button
                key={g.id}
                className={`rs-cell ${g.selected ? 'on' : ''} ${g.owned ? 'owned' : ''} ${g.locked ? 'locked' : ''}`}
                onClick={g.onClick}
                title={g.label}
              >
                {g.img
                  ? <img src={g.img} alt={g.label} draggable={false}/>
                  : <span className="rs-cell-placeholder">·</span>}
                {g.tag != null && <span className="rs-cell-tag">×{g.tag}</span>}
                {g.owned && <span className="rs-cell-check">✓</span>}
                {g.locked && <span className="rs-cell-lock">🔒</span>}
              </button>
            ))}
            {/* fill remaining cells in row up to 20 for layout symmetry */}
            {Array.from({ length: Math.max(0, 20 - grid.length) }).map((_, i) => (
              <div key={'e' + i} className="rs-cell empty" aria-hidden="true"/>
            ))}
          </div>
        )}

        {/* Skin picker for flirt tab — pick which girl appears as the shopkeeper */}
        {grid.length === 0 && tab === 'flirt' && (
          <div className="rs-skin-picker">
            <div className="rs-skin-label">PICK YOUR GIRL</div>
            <div className="rs-skin-row">
              {Object.values(HELGA_SKINS).map(s => (
                <button
                  key={s.id}
                  className={`rs-skin ${helgaSkin === s.id ? 'on' : ''}`}
                  onClick={() => onHelgaSkin && onHelgaSkin(s.id)}
                  title={s.name}
                >
                  <img src={s.avatar} alt={s.name} draggable={false}/>
                  <span className="rs-skin-name">{s.name}</span>
                </button>
              ))}
            </div>
            <div className="rs-skin-hint">She'll greet you in the chat.</div>
          </div>
        )}
        {grid.length === 0 && tab === 'sell' && (
          <div className="rs-empty">The crate is empty.<br/>Sail out to catch something first.</div>
        )}

        {/* Footer: back arrow + primary action */}
        <div className="rs-footer">
          <button className="rs-back" onClick={onLeave} title="Set sail again">
            <span className="rs-back-arrow">←</span>
          </button>
          {primaryAction && (
            <button
              className="rs-cta"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Tab button (icon-only, wooden) ----------
function RsTab({ on, onClick, icon, title }) {
  return (
    <button className={`rs-tab ${on ? 'on' : ''}`} onClick={onClick} title={title} aria-label={title}>
      <RsIcon name={icon}/>
    </button>
  );
}

// ---------- Inline SVG icons ----------
function RsIcon({ name }) {
  const common = { width: 28, height: 28, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'hook':
      return (
        <svg {...common}>
          <path d="M16 4 L16 20"/>
          <path d="M16 20 C 16 26, 11 26, 11 20"/>
          <circle cx="16" cy="4" r="1.2" fill="currentColor"/>
        </svg>
      );
    case 'rod':
      return (
        <svg {...common}>
          <path d="M6 26 L26 6"/>
          <path d="M6 26 L9 23"/>
          <path d="M22 10 L26 6"/>
          <circle cx="6" cy="26" r="1.4" fill="currentColor"/>
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path d="M5 9 a4 4 0 0 1 4 -4 h14 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-9 l-5 4 v-4 h-0 a4 4 0 0 1 -4 -4 z"/>
          <circle cx="12" cy="13" r="1" fill="currentColor"/>
          <circle cx="16" cy="13" r="1" fill="currentColor"/>
          <circle cx="20" cy="13" r="1" fill="currentColor"/>
        </svg>
      );
    case 'fish':
      return (
        <svg {...common}>
          <path d="M5 16 C 9 9, 18 9, 23 16 C 18 23, 9 23, 5 16 Z"/>
          <path d="M23 16 L29 11 L29 21 Z"/>
          <circle cx="9" cy="15" r="1" fill="currentColor"/>
        </svg>
      );
    default: return null;
  }
}

window.StoreScreen = StoreScreen;

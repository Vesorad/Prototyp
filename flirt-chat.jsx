// flirt-chat.jsx — messenger-style flirt dialog with Helga

// Test dialog tree. Each node:
//   { from: 'helga' | 'player', text: '...', responses?: ['nodeId', ...], next?: 'nodeId' }
// - 'helga' nodes show a message bubble then either branch to `responses` (player picks one)
//   or auto-advance to `next` after a beat.
// - 'player' nodes show what the player said and then auto-advance to `next`.
// End the tree by omitting both responses and next.
const FLIRT_TREE = /*FLIRTMODE-BEGIN*/{
  start: 'h_open',
  nodes: {
    h_open: {
      from: 'helga',
      text: "Oh, look who showed up at the counter again. Out of bait already? 🪱",
      responses: ['p_open_a', 'p_open_b', 'p_open_c'],
    },

    // ─── Branch A: confident ──────────────────────────────────────
    p_open_a: { from: 'player', text: "Maybe I just like the view in here.", next: 'h_a1' },
    h_a1: {
      from: 'helga',
      text: "The fish-gut barrels? Charming taste, sailor.",
      next: 'h_a2',
    },
    h_a2: {
      from: 'helga',
      text: "But keep it up and I might leave the lamp on after closing.",
      responses: ['p_a_yes', 'p_a_no'],
    },
    p_a_yes: { from: 'player', text: "I'll knock twice.", next: 'h_end_warm' },
    p_a_no:  { from: 'player', text: "Easy now, I just sell fish.", next: 'h_end_cold' },

    // ─── Branch B: shy ────────────────────────────────────────────
    p_open_b: { from: 'player', text: "Uh... no. Just saying hi.", next: 'h_b1' },
    h_b1: {
      from: 'helga',
      text: "Hi. That's it? You row all the way back for one syllable?",
      responses: ['p_b_funny', 'p_b_truthful'],
    },
    p_b_funny:    { from: 'player', text: "Two if you count the 'uh'.", next: 'h_end_warm' },
    p_b_truthful: { from: 'player', text: "Honestly... yeah, kinda.", next: 'h_b_truth' },
    h_b_truth: {
      from: 'helga',
      text: "...Cute. Bring me a pike sometime and we'll talk longer.",
      // only one response — minimal branch demo
      responses: ['p_b_ok'],
    },
    p_b_ok: { from: 'player', text: "Deal.", next: 'h_end_warm' },

    // ─── Branch C: business ───────────────────────────────────────
    p_open_c: { from: 'player', text: "Strictly business, Helga. Show me the stock.", next: 'h_c1' },
    h_c1: {
      from: 'helga',
      text: "Ha. That's what they all say. Door's behind you, then.",
      // dead-end response
    },

    // ─── Endings ─────────────────────────────────────────────────
    h_end_warm: {
      from: 'helga',
      text: "Now stop wasting daylight. The perch are waiting. 💋",
    },
    h_end_cold: {
      from: 'helga',
      text: "Mhm. Right. Bait's $2 a pack, by the way.",
    },
  },
}/*FLIRTMODE-END*/;

// Map of which starting response triggers which cutscene
const FLIRT_CUTSCENES = {
  p_open_a: 'assets/scenes/s_1.mp4',
  p_open_b: 'assets/scenes/s_2.mp4',
  p_open_c: 'assets/scenes/s_3.mp4',
};

function FlirtChat({ onClose, skin }) {
  const skinAvatar = skin?.avatar || 'assets/characters/helga-avatar.png';
  const skinName = skin?.name || 'Helga';
  const [history, setHistory] = React.useState([]);  // [{from, text}, ...]
  const [currentId, setCurrentId] = React.useState(FLIRT_TREE.start);
  const [waiting, setWaiting] = React.useState(true); // typing indicator
  const [showResponses, setShowResponses] = React.useState(false);
  const [pickedBranch, setPickedBranch] = React.useState(null); // 'p_open_a' | 'p_open_b' | 'p_open_c'
  const scrollRef = React.useRef(null);

  // Advance through the tree — drop the current node into history,
  // then either show responses or auto-advance via `next`.
  React.useEffect(() => {
    if (!currentId) return;
    const node = FLIRT_TREE.nodes[currentId];
    if (!node) return;

    setShowResponses(false);
    setWaiting(true);

    // typing delay scales with text length, capped
    const delay = node.from === 'helga'
      ? Math.min(2200, 500 + node.text.length * 22)
      : 350;

    const id = setTimeout(() => {
      setHistory(h => [...h, { from: node.from, text: node.text, id: currentId + '_' + h.length }]);
      setWaiting(false);

      if (node.responses && node.responses.length > 0) {
        setShowResponses(true);
      } else if (node.next) {
        // continue chain
        setTimeout(() => setCurrentId(node.next), 700);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [currentId]);

  // auto-scroll to bottom on new content
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history, waiting, showResponses]);

  const node = FLIRT_TREE.nodes[currentId];
  const isEnd = node && !node.responses && !node.next && !waiting;

  const pickResponse = (id) => {
    // Remember which of the 3 starting responses the player picked,
    // so the right post-flirt cutscene plays on close.
    if (FLIRT_CUTSCENES[id] && pickedBranch == null) {
      setPickedBranch(id);
    }
    setCurrentId(id);
  };

  // Hand the picked branch up to the parent on close, so it can play the
  // matching cutscene. If the player didn't pick any of the 3 starters,
  // close cleanly with no scene.
  const handleClose = () => {
    const cutscene = pickedBranch ? FLIRT_CUTSCENES[pickedBranch] : null;
    onClose && onClose({ branch: pickedBranch, cutscene });
  };

  const restart = () => {
    setHistory([]);
    setPickedBranch(null);
    setCurrentId(FLIRT_TREE.start);
  };

  return (
    <div className="flirt-overlay" onClick={handleClose}>
      <div className="flirt-window" onClick={e => e.stopPropagation()}>
        {/* header */}
        <div className="flirt-header">
          <div className="flirt-avatar">
            <img className="flirt-avatar-img" src={skinAvatar} alt={skinName} />
          </div>
          <div className="flirt-header-meta">
            <div className="flirt-header-name">{skinName}</div>
            <div className="flirt-header-status">
              <span className="dot"></span>
              {waiting ? 'typing…' : 'online · at the counter'}
            </div>
          </div>
          <button className="flirt-close" onClick={handleClose}>×</button>
        </div>

        {/* messages */}
        <div className="flirt-body" ref={scrollRef}>
          <div className="flirt-day">— today —</div>

          {history.map((m) => (
            <div key={m.id} className={`msg ${m.from}`}>
              {m.from === 'helga' && (
                <div className="msg-avatar">
                  <img className="flirt-avatar-img" src={skinAvatar} alt="" />
                </div>
              )}
              <div className="msg-bubble">{m.text}</div>
            </div>
          ))}

          {waiting && (
            <div className="msg helga">
              <div className="msg-avatar">
                <img className="flirt-avatar-img" src={skinAvatar} alt="" />
              </div>
              <div className="msg-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        {/* response area */}
        <div className="flirt-actions">
          {isEnd && (
            <div className="flirt-end">
              <div className="flirt-end-text">— end of chat —</div>
              <div style={{display:'flex', gap: 8}}>
                <button className="btn ghost" onClick={restart} style={{fontSize:12, padding:'8px 14px'}}>↻ Restart</button>
                <button className="btn primary" onClick={handleClose} style={{fontSize:12, padding:'8px 14px'}}>Close</button>
              </div>
            </div>
          )}

          {showResponses && node?.responses?.length > 0 && (
            <div className="flirt-responses">
              <div className="flirt-responses-hint">Pick a reply…</div>
              <div className="flirt-responses-list">
                {node.responses.map(rid => {
                  const r = FLIRT_TREE.nodes[rid];
                  if (!r) return null;
                  return (
                    <button
                      key={rid}
                      className="flirt-response"
                      onClick={() => pickResponse(rid)}
                    >
                      {r.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.FlirtChat = FlirtChat;

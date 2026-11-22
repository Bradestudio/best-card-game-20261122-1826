// The cinematic canvas renderer: a green felt table with a gold rail, big parchment cards
// whose cost, suit and value read at thumbnail size, life bars and mana pips up top, and
// the played cards on the table between the two hands. Everything is drawn from the world
// state, so a screenshot is exactly what a player sees.
import { CARD, FIELD, FOE_CARD, FONT, PALETTE, START_LIFE } from './config.js';
import { SUITS, valueLabel } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = w;
    canvas.height = h;
    const scale = Math.min(w / FIELD.width, h / FIELD.height);
    const ox = (w - FIELD.width * scale) / 2;
    const oy = (h - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    return { scale, ox, oy };
  }

  function drawFelt() {
    const grad = ctx.createRadialGradient(640, 220, 60, 640, 240, 760);
    grad.addColorStop(0, PALETTE.feltLight);
    grad.addColorStop(1, PALETTE.feltDark);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Gold rail around the table.
    ctx.strokeStyle = PALETTE.goldDim;
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, FIELD.width - 12, FIELD.height - 12);
    ctx.strokeStyle = 'rgba(242,201,76,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, FIELD.width - 28, FIELD.height - 28);
    // Faint suit watermark in the middle of the table.
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#ffffff';
    ctx.font = '240px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♠ ♥ ♦ ♣', 640, 205);
    ctx.restore();
  }

  function drawLifeBar(x, y, w, life, shield, name, alignRight) {
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = PALETTE.text;
    const labelX = alignRight ? x + w : x;
    ctx.fillText(name, labelX, y - 6);
    // Bar frame.
    ctx.fillStyle = '#08130c';
    roundRect(ctx, x, y, w, 20, 10);
    ctx.fill();
    const frac = Math.max(0, life / START_LIFE);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#ff7a5c');
    grad.addColorStop(1, '#e6392b');
    ctx.fillStyle = grad;
    if (frac > 0) {
      roundRect(ctx, x + 2, y + 2, (w - 4) * frac, 16, 8);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${life} ♥`, x + w / 2, y + 11);
    if (shield > 0) {
      // A drawn shield (never an emoji: headless browsers without an emoji font show tofu).
      // The player's shield sits right of her bar; Cinder's sits left of hers, clear of the edge.
      const sx = alignRight ? x - 12 : x + w + 12;
      const sy = y + 10;
      ctx.fillStyle = PALETTE.shield;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx + 7, sy - 5);
      ctx.lineTo(sx + 7, sy + 2);
      ctx.quadraticCurveTo(sx + 7, sy + 7, sx, sy + 10);
      ctx.quadraticCurveTo(sx - 7, sy + 7, sx - 7, sy + 2);
      ctx.lineTo(sx - 7, sy - 5);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 14px ' + FONT;
      ctx.textAlign = alignRight ? 'right' : 'left';
      ctx.fillText(String(shield), alignRight ? sx - 11 : sx + 11, y + 11);
    }
  }

  function drawManaPips(x, y, mana, manaMax) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MANA', x, y);
    for (let i = 0; i < manaMax; i += 1) {
      const cx = x + 52 + i * 20;
      ctx.beginPath();
      ctx.arc(cx, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = i < mana ? '#4aa8ff' : '#22303f';
      ctx.fill();
      ctx.strokeStyle = '#9ecfff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.fillText(`${mana}/${manaMax}`, x + 52 + manaMax * 20 + 6, y);
  }

  /** One face-up card, big enough to read at a glance: cost gem, suit, name, value, rule. */
  function drawCard(card, x, y, w, h, opts = {}) {
    const suit = SUITS[card.suit];
    const scale = w / 150;
    ctx.save();
    if (opts.raised) ctx.translate(0, -22);
    if (opts.glow) {
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = 22;
    }
    // Parchment face.
    ctx.fillStyle = PALETTE.parchment;
    roundRect(ctx, x, y, w, h, 10 * scale);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = opts.selected ? PALETTE.gold : PALETTE.parchmentDark;
    ctx.lineWidth = opts.selected ? 4 : 2;
    ctx.stroke();
    // Inner frame.
    ctx.strokeStyle = suit.colour;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 6 * scale, y + 6 * scale, w - 12 * scale, h - 12 * scale, 7 * scale);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Cost gem, top left.
    ctx.fillStyle = '#1f6fb2';
    ctx.beginPath();
    ctx.arc(x + 22 * scale, y + 22 * scale, 15 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bcd9ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${20 * scale}px ` + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(card.cost), x + 22 * scale, y + 23 * scale);
    // Big suit glyph in the middle.
    ctx.fillStyle = suit.colour;
    ctx.font = `${64 * scale}px ` + FONT;
    ctx.fillText(suit.glyph, x + w / 2, y + h * 0.44);
    // Name under the suit.
    ctx.font = `bold ${15 * scale}px ` + FONT;
    ctx.fillText(card.name, x + w / 2, y + h * 0.62);
    // Key hint, top right of the card face.
    if (opts.key) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `bold ${13 * scale}px ` + FONT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`[${opts.key}]`, x + w - 10 * scale, y + 14 * scale);
    }
    // Big value + label at the bottom (re-centred: the key hint above right-aligns,
    // and re-coloured: the key hint leaves the muted fill behind).
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = suit.colour;
    ctx.font = `bold ${34 * scale}px ` + FONT;
    ctx.fillText(String(card.value), x + w / 2, y + h * 0.82);
    ctx.font = `bold ${11 * scale}px ` + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(valueLabel(card), x + w / 2, y + h * 0.93);
    ctx.restore();
    return { x, y: opts.raised ? y - 22 : y, w, h };
  }

  /** A face-down card back: ember red with a gold court sigil. */
  function drawCardBack(x, y, w, h) {
    ctx.fillStyle = '#7a1f1a';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242,201,76,0.6)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 5);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `${Math.round(w * 0.4)}px ` + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♠', x + w / 2, y + h / 2);
  }

  function drawEndTurnButton(x, y, w, h, enabled, hover) {
    ctx.fillStyle = enabled ? (hover ? PALETTE.buttonHover : PALETTE.button) : '#3a3a3a';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = enabled ? 2 : 1;
    ctx.globalAlpha = enabled ? 1 : 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('END TURN  ⏎', x + w / 2, y + h / 2 - 7);
    ctx.font = '11px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('press E', x + w / 2, y + h / 2 + 12);
  }

  function drawPlayed(state) {
    const midY = 168;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (!state.player.played && !state.foe.played) {
      ctx.fillText('— the table awaits your card —', 640, midY + 40);
      return;
    }
    if (state.player.played) {
      ctx.fillText('YOU PLAYED', 520, midY - 6);
      drawCard(state.player.played, 487, midY, 66, 88, {});
    }
    if (state.foe.played) {
      ctx.fillText('CINDER PLAYED', 760, midY - 6);
      drawCard(state.foe.played, 727, midY, 66, 88, {});
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText('⚔', 640, midY + 55);
  }

  function drawTable(state, hover) {
    drawFelt();
    // HUD: life bars and turn.
    drawLifeBar(24, 30, 320, state.player.life, state.player.shield, 'YOU — EMBER KNIGHT', false);
    drawLifeBar(936, 30, 320, state.foe.life, state.foe.shield, 'LADY CINDER — AI', true);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 16px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const phaseText = state.phase === 'player' ? 'YOUR MOVE' : state.phase === 'ai' ? 'CINDER IS THINKING…' : '';
    ctx.fillText(`TURN ${state.turn}`, 640, 28);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 12px ' + FONT;
    ctx.fillText(phaseText, 640, 48);

    // The foe's hand: face-down backs, count shown.
    const foeCount = state.foe.hand.length;
    const foeW = foeCount * FOE_CARD.width + (foeCount - 1) * 8;
    const foeX0 = (FIELD.width - foeW) / 2;
    for (let i = 0; i < foeCount; i += 1) {
      drawCardBack(foeX0 + i * (FOE_CARD.width + 8), 52, FOE_CARD.width, FOE_CARD.height);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(`Cinder's hand: ${foeCount}  ·  deck ${state.foe.deck.length}`, 1256, 66);

    drawPlayed(state);

    // The player's hand, fanned across the bottom; it shrinks a little at 7 cards so the
    // End Turn button keeps its own corner.
    const hand = state.player.hand;
    const handArea = { x: 24, w: 1036 };
    const cardW = Math.min(CARD.width, (handArea.w - (hand.length - 1) * CARD.gap) / hand.length);
    const cardH = (cardW * 4) / 3;
    const totalW = hand.length * cardW + (hand.length - 1) * CARD.gap;
    let hx = handArea.x + (handArea.w - totalW) / 2;
    const hy = 258;
    for (let i = 0; i < hand.length; i += 1) {
      const card = hand[i];
      const affordable = card.cost <= state.player.mana && state.phase === 'player';
      drawCard(card, hx, hy, cardW, cardH, {
        selected: state.selected === i,
        raised: state.selected === i,
        glow: hover === i,
        key: i + 1,
      });
      if (!affordable) {
        ctx.fillStyle = 'rgba(10,20,12,0.45)';
        roundRect(ctx, hx, hy - (state.selected === i ? 22 : 0), cardW, cardH, 10);
        ctx.fill();
      }
      hx += cardW + CARD.gap;
    }

    // Mana pips under the player's life bar, deck count beneath them.
    drawManaPips(24, 66, state.player.mana, state.player.manaMax);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(`Your deck: ${state.player.deck.length} cards`, 24, 88);
    drawEndTurnButton(1096, 396, 160, 52, state.phase === 'player', hover === 'end');

    // The duel log, one line, bottom centre.
    ctx.fillStyle = PALETTE.text;
    ctx.font = '13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(state.log[0] ?? '', 640, 470);

    // Damage flash.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,40,30,${(state.flash / 14) * 0.3})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawTitle(best) {
    drawFelt();
    // Three fanned decorative cards behind the title, kept small and high so no card
    // name ever collides with the text below them.
    const deco = [
      { id: 'inferno', name: 'Inferno', suit: 'spade', cost: 4, value: 9, effect: 'damage', text: '' },
      { id: 'feast', name: 'Phoenix Feast', suit: 'heart', cost: 3, value: 8, effect: 'healDraw', text: '' },
      { id: 'bulwark', name: 'Iron Bulwark', suit: 'diamond', cost: 2, value: 8, effect: 'shield', text: '' },
    ];
    ctx.save();
    ctx.translate(640, 268);
    ctx.rotate(-0.22);
    drawCard(deco[0], -268, -80, 128, 170);
    ctx.rotate(0.22);
    drawCard(deco[1], -64, -92, 128, 170);
    ctx.rotate(0.22);
    drawCard(deco[2], 140, -80, 128, 170);
    ctx.restore();
    ctx.fillStyle = 'rgba(8,16,10,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 74px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EMBER COURT', 640, 100);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px ' + FONT;
    ctx.fillText('A duel of ember and ash — you against Lady Cinder', 640, 148);
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Press ENTER or click to begin', 640, 398);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px ' + FONT;
    ctx.fillText('1–5 select a card · Enter/Space play it · E end turn · Esc pause', 640, 428);
    ctx.fillText('30 life each · mana grows every turn · first to 0 life loses', 640, 452);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'right';
      ctx.fillText(`Court wins so far: ${best}`, 1256, 28);
    }
  }

  function drawOver(state, best) {
    drawTable(state, -1);
    ctx.fillStyle = 'rgba(8,16,10,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const won = state.winner === 'player';
    ctx.fillStyle = won ? PALETTE.gold : PALETTE.damage;
    ctx.font = 'bold 64px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(won ? 'VICTORY' : 'DEFEAT', 640, 180);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '21px ' + FONT;
    ctx.fillText(
      won ? 'Lady Cinder falls — the Court is yours!' : 'Your embers fade. Lady Cinder takes the Court.',
      640, 232,
    );
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText(`The duel lasted ${state.turn} turn${state.turn === 1 ? '' : 's'} · final life ${state.player.life} — ${state.foe.life}`, 640, 268);
    if (won && best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillText(`Court wins so far: ${best}`, 640, 298);
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText('Press ENTER to duel again', 640, 340);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8,16,10,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 48px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', 640, 220);
    ctx.font = '18px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Esc or Enter to resume', 640, 262);
  }

  function draw(state, screen, best, hover) {
    const { scale, ox, oy } = fit();
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) drawTitle(best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else {
      drawTable(state, hover);
      if (screen === SCREEN_PAUSED) drawPaused();
    }
    return { scale, ox, oy };
  }

  /**
   * Hit-test a point in logical coordinates against the player's hand and the End Turn
   * button. Returns a hand index, 'end', or -1. Mirrors the layout in drawTable.
   */
  function hitTest(state, lx, ly) {
    if (lx >= 1096 && lx <= 1256 && ly >= 396 && ly <= 448) return 'end';
    const hand = state.player.hand;
    const handAreaW = 1036;
    const cardW = Math.min(CARD.width, (handAreaW - (hand.length - 1) * CARD.gap) / hand.length);
    const cardH = (cardW * 4) / 3;
    const totalW = hand.length * cardW + (hand.length - 1) * CARD.gap;
    let hx = 24 + (handAreaW - totalW) / 2;
    for (let i = 0; i < hand.length; i += 1) {
      const top = state.selected === i ? 258 - 22 : 258;
      if (lx >= hx && lx <= hx + cardW && ly >= top && ly <= top + cardH) return i;
      hx += cardW + CARD.gap;
    }
    return -1;
  }

  return { draw, fit, hitTest };
}

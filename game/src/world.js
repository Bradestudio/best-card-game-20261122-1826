// The duel itself: two 30-life duellists, mana that grows each turn, a 30-card deck each,
// and a hand of cards with cost and value. The player plays cards, ends the turn, and the
// AI answers with its own greedy turn. No real time here: every rule is a pure function of
// the state and the seeded random, so the same seed replays the same duel.
import { CARD_DEFS, buildDeck, defById } from './cards.js';
import { HAND_LIMIT, MAX_MANA, START_HAND, START_LIFE, START_MANA } from './config.js';
import { shuffle } from './random.js';

export const PHASE_PLAYER = 'player';
export const PHASE_AI = 'ai';
export const PHASE_OVER = 'over';

export const EVENT_WIN = 1;
export const EVENT_LOSS = 2;
export const EVENT_PLAYED = 4;

/** One duellist's side of the table. */
function makeSide(deck) {
  return {
    life: START_LIFE,
    shield: 0,
    mana: 0,
    manaMax: START_MANA,
    deck,
    hand: [],
    discard: [],
    played: null, // the last card this side put on the table, for the renderer
  };
}

export function createWorld(random) {
  const state = {
    player: null,
    foe: null,
    turn: 1,
    phase: PHASE_PLAYER,
    winner: null, // 'player' | 'foe' | null
    log: [],
    flash: 0, // frames left of the damage flash on the side that was just hit
    flashSide: null,
    selected: -1,
    aiQueue: [], // cards the AI still has to play this turn (animated one by one)
  };

  function drawCards(side, count) {
    for (let i = 0; i < count; i += 1) {
      if (side.hand.length >= HAND_LIMIT) return;
      if (side.deck.length === 0) {
        // Out of cards: reshuffle the discard pile, the court never runs dry.
        if (side.discard.length === 0) return;
        side.deck = shuffle(side.discard.splice(0), random);
      }
      side.hand.push(side.deck.pop());
    }
  }

  function damage(target, amount) {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    target.life = Math.max(0, target.life - (amount - absorbed));
    state.flash = 14;
    state.flashSide = target === state.player ? 'player' : 'foe';
  }

  function applyCard(card, caster, target) {
    caster.played = card;
    switch (card.effect) {
      case 'damage':
        damage(target, card.value);
        break;
      case 'damageDraw':
        damage(target, card.value);
        drawCards(caster, 1);
        break;
      case 'drain':
        damage(target, card.value);
        caster.life = Math.min(START_LIFE, caster.life + card.value);
        break;
      case 'heal':
        caster.life = Math.min(START_LIFE, caster.life + card.value);
        break;
      case 'healDraw':
        caster.life = Math.min(START_LIFE, caster.life + card.value);
        drawCards(caster, 1);
        break;
      case 'shield':
        caster.shield += card.value;
        break;
      case 'draw':
        drawCards(caster, card.value);
        break;
      case 'mana':
        caster.mana += card.value;
        break;
      default:
        break;
    }
  }

  function log(message) {
    state.log.unshift(message);
    if (state.log.length > 4) state.log.length = 4;
  }

  function checkEnd() {
    if (state.foe.life <= 0) {
      state.winner = 'player';
      state.phase = PHASE_OVER;
      log('Lady Cinder falls — the Court is yours!');
      return EVENT_WIN;
    }
    if (state.player.life <= 0) {
      state.winner = 'foe';
      state.phase = PHASE_OVER;
      log('Your embers fade. Lady Cinder takes the Court.');
      return EVENT_LOSS;
    }
    return 0;
  }

  /** Play the card at `handIndex` for `caster` against `target`. Returns true when played. */
  function playCardAt(caster, target, handIndex) {
    const card = caster.hand[handIndex];
    if (!card || caster.mana < card.cost) return false;
    caster.mana -= card.cost;
    caster.hand.splice(handIndex, 1);
    caster.discard.push(card);
    applyCard(card, caster, target);
    const who = caster === state.player ? 'You play' : 'Cinder plays';
    log(`${who} ${card.name} (${card.cost} mana).`);
    return checkEnd();
  }

  /**
   * The AI's greedy brain, readable and counterable: take the killing blow when it has one,
   * mend when hurt, guard when you threaten lethal, then spend the rest on the biggest
   * damage it can afford, drawing when it has nothing better to do.
   */
  function aiChoose() {
    const foe = state.foe;
    const player = state.player;
    const affordable = foe.hand
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.cost <= foe.mana);
    if (affordable.length === 0) return -1;
    const lethal = affordable.find(
      ({ card }) => (card.effect === 'damage' || card.effect === 'damageDraw' || card.effect === 'drain')
        && card.value >= player.life + player.shield,
    );
    if (lethal) return lethal.index;
    if (foe.life <= 12) {
      const heal = affordable.find(({ card }) => card.effect === 'heal' || card.effect === 'healDraw' || card.effect === 'drain');
      if (heal) return heal.index;
    }
    if (player.life + player.shield <= 10 && foe.shield === 0) {
      const guard = affordable.find(({ card }) => card.effect === 'shield');
      if (guard) return guard.index;
    }
    // Biggest damage first, then the best value-per-mana of anything else.
    let best = null;
    let bestScore = -1;
    for (const { card, index } of affordable) {
      let score = 0;
      if (card.effect === 'damage' || card.effect === 'damageDraw' || card.effect === 'drain') score = card.value * 3;
      else if (card.effect === 'shield') score = card.value;
      else if (card.effect === 'draw' || card.effect === 'mana') score = 4;
      else if (card.effect === 'heal' || card.effect === 'healDraw') score = foe.life < 20 ? card.value : 1;
      score -= card.cost;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    }
    return best ?? -1;
  }

  /** Queue the AI's whole turn: it draws, then plays greedily until it cannot or will not. */
  function startAiTurn() {
    const foe = state.foe;
    foe.manaMax = Math.min(MAX_MANA, START_MANA + state.turn - 1);
    foe.mana = foe.manaMax;
    drawCards(foe, 1);
    state.aiQueue = [];
    // Simulate the greedy picks up front so the animated turn and the instant one agree.
    const simHand = foe.hand.slice();
    let simMana = foe.mana;
    for (;;) {
      const savedHand = foe.hand;
      const savedMana = foe.mana;
      foe.hand = simHand;
      foe.mana = simMana;
      const pick = aiChoose();
      foe.hand = savedHand;
      foe.mana = savedMana;
      if (pick < 0) break;
      const card = simHand[pick];
      state.aiQueue.push(card.uid);
      simHand.splice(pick, 1);
      simMana -= card.cost;
    }
    state.phase = PHASE_AI;
  }

  /** Play the next queued AI card (one per call, so the table animates). Returns an event. */
  function stepAi() {
    if (state.aiQueue.length === 0) {
      // AI done: back to the player, a new turn, fresh mana, one more card.
      state.turn += 1;
      const player = state.player;
      player.manaMax = Math.min(MAX_MANA, START_MANA + state.turn - 1);
      player.mana = player.manaMax;
      drawCards(player, 1);
      state.selected = -1;
      state.phase = PHASE_PLAYER;
      log(`Turn ${state.turn} — your move, ${player.mana} mana.`);
      return 0;
    }
    const uid = state.aiQueue.shift();
    const index = state.foe.hand.findIndex((card) => card.uid === uid);
    if (index < 0) return stepAi();
    return playCardAt(state.foe, state.player, index);
  }

  /** The whole AI turn at once, for the deterministic screenshot scenes. */
  function resolveAiInstant() {
    let event = 0;
    while (state.phase === PHASE_AI && state.aiQueue.length > 0 && !event) {
      event = stepAi();
    }
    if (!event && state.phase === PHASE_AI) event = stepAi();
    return event;
  }

  function reset() {
    const playerDeck = shuffle(buildDeck(), random);
    const foeDeck = shuffle(buildDeck(), random);
    state.player = makeSide(playerDeck);
    state.foe = makeSide(foeDeck);
    state.turn = 1;
    state.phase = PHASE_PLAYER;
    state.winner = null;
    state.log = ['The duel begins. Turn 1 — your move.'];
    state.flash = 0;
    state.flashSide = null;
    state.selected = -1;
    state.aiQueue = [];
    state.player.mana = START_MANA;
    state.foe.mana = 0;
    drawCards(state.player, START_HAND);
    drawCards(state.foe, START_HAND);
  }

  /** The player plays the card at `handIndex` of their own hand. Returns an event bit. */
  function playPlayerCard(handIndex) {
    if (state.phase !== PHASE_PLAYER) return 0;
    const event = playCardAt(state.player, state.foe, handIndex);
    state.selected = -1;
    return event | EVENT_PLAYED;
  }

  /** End the player's turn; the AI answers. Returns an event bit (0 while the AI is thinking). */
  function endPlayerTurn() {
    if (state.phase !== PHASE_PLAYER) return 0;
    state.selected = -1;
    startAiTurn();
    return 0;
  }

  /** Advance one fixed step: fade the damage flash and let the AI play its queued cards. */
  function step(dt, aiTick) {
    if (state.flash > 0) state.flash -= 1;
    if (state.phase === PHASE_AI && aiTick) return stepAi();
    return 0;
  }

  reset();

  return {
    state,
    reset,
    playPlayerCard,
    endPlayerTurn,
    step,
    stepAi,
    resolveAiInstant,
    aiChoose,
    defById,
    cardDefs: CARD_DEFS,
  };
}

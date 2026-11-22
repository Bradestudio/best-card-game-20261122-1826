// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the real rules
// forward from a fresh duel for a fixed number of turns, steered by a simple autopilot, so
// the frame is what a real game looks like and the same seed always gives the same frame:
// the play scene stops mid-duel with both hands full, the win scene plays until Lady
// Cinder falls, and the loss scene lets the player idle while she wins.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** How many turns the play scene runs before the screenshot is taken: three turns leaves
 * both hands full, both life bars dented and cards on the table; five left the hands
 * nearly empty. */
const PLAY_TURNS = 3;
/** The longest a staged duel may run before the scene gives up. */
const TURN_LIMIT = 60;

/**
 * Score one affordable card for the autopilot: lethal first, then the biggest damage,
 * mending when hurt, guarding when threatened, and digging for more cards last.
 * One policy for every scene: mending starts while there is still life to save
 * (below 18), because waiting until 12 let the AI finish duels the autopilot
 * should have won — the win scene at the screenshot seed proves it.
 */
function scoreCard(state, card) {
  const player = state.player;
  const foe = state.foe;
  let score = 0;
  if (card.effect === 'damage' || card.effect === 'damageDraw' || card.effect === 'drain') {
    score = card.value * 3;
    if (card.value >= foe.life + foe.shield) score += 1000;
    if (card.effect === 'drain' && player.life <= 20) score += card.value;
    if (card.effect === 'damageDraw') score += 4;
  } else if (card.effect === 'heal' || card.effect === 'healDraw') {
    score = player.life < 18 ? card.value * 2 : 1;
    if (card.effect === 'healDraw') score += 4;
  } else if (card.effect === 'shield') {
    score = foe.life >= 0 && player.life + player.shield <= 12 ? card.value * 2 : card.value / 2;
  } else if (card.effect === 'draw') score = 4;
  else if (card.effect === 'mana') score = 3;
  return score - card.cost;
}

/** The best affordable card index for the autopilot, or -1 when it should end the turn. */
function autopilotPick(state) {
  const player = state.player;
  let best = -1;
  // A card must earn its mana: damage always does, a mend only when hurt, a scheme
  // only when it digs for something better. The autopilot never empties its hand
  // on plays that gain nothing, which is what used to lose it duels it should win.
  let bestScore = 0;
  for (let i = 0; i < player.hand.length; i += 1) {
    const card = player.hand[i];
    if (card.cost > player.mana) continue;
    const score = scoreCard(state, card);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

/** Play the player's whole turn with the autopilot, then resolve the AI's answer. */
function playTurn(world) {
  const state = world.state;
  for (;;) {
    const pick = autopilotPick(state);
    if (pick < 0) break;
    // playPlayerCard always sets EVENT_PLAYED; only the win/loss bits mean the duel ended.
    if (world.playPlayerCard(pick) & 3) return true;
  }
  world.endPlayerTurn();
  return !!world.resolveAiInstant();
}

/** The idle player: end the turn at once, never playing a card. */
function idleTurn(world) {
  world.endPlayerTurn();
  return !!world.resolveAiInstant();
}

/**
 * Set `world` to the named scene (start, play, win or loss; any other name is start) and
 * return the screen to draw over it. The damage flash is a transient animation, so it is
 * cleared before the frame is taken: a staged screenshot shows the settled table, not
 * the red blink of the last hit.
 */
export function stageShot(name, world) {
  world.reset();
  world.state.flash = 0;
  if (name !== 'play' && name !== 'win' && name !== 'loss') {
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    for (let turn = 0; turn < PLAY_TURNS; turn += 1) {
      if (playTurn(world)) break;
      if (world.state.phase === 'over') break;
    }
    world.state.flash = 0;
    return { screen: world.state.phase === 'over' ? SCREEN_OVER : SCREEN_PLAY };
  }
  if (name === 'win') {
    for (let turn = 0; turn < TURN_LIMIT; turn += 1) {
      if (playTurn(world)) break;
      if (world.state.phase === 'over') break;
    }
    world.state.flash = 0;
    return { screen: SCREEN_OVER };
  }
  // loss
  for (let turn = 0; turn < TURN_LIMIT; turn += 1) {
    if (idleTurn(world)) break;
    if (world.state.phase === 'over') break;
  }
  world.state.flash = 0;
  return { screen: SCREEN_OVER };
}

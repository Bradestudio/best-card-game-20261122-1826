// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, the AI plays one queued card about every 0.7 s so its turn reads on the table,
// and the renderer paints what is there. The game moves between four screens: title,
// play, paused and game over.
//
// ?seed=N fixes the shuffle and the AI draws. ?shot=start|play|win|loss (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_LOSS, EVENT_PLAYED, EVENT_WIN, PHASE_AI, PHASE_OVER, PHASE_PLAYER } from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_END_TURN,
  ACTION_PAUSE,
  ACTION_SELECT_BASE,
  createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;
/** Seconds between one AI card and the next, so its turn animates instead of flashing by. */
const AI_TICK_SECONDS = 0.7;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the win count then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, 0, -1);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let aiTimer = 0;
  let last = performance.now();
  let view = { scale: 1, ox: 0, oy: 0 };

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    aiTimer = 0;
    screen = SCREEN_PLAY;
    announce('Duel started. 30 life each. Your move.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.winner === 'player') {
      best += 1;
      saveBest(best);
      announce(`Victory! Lady Cinder falls. Court wins: ${best}.`);
    } else {
      announce('Defeat. Your embers fade.');
    }
  }

  /** Convert a pointer position in pixels to logical table coordinates. */
  function toLogical(px, py) {
    return { x: (px - view.ox) / view.scale, y: (py - view.oy) / view.scale };
  }

  function hover() {
    if (screen !== SCREEN_PLAY) return -1;
    const mouse = input.mouse();
    if (mouse.x < 0) return -1;
    const point = toLogical(mouse.x, mouse.y);
    return renderer.hitTest(world.state, point.x, point.y);
  }

  function handleClick() {
    if (!input.takeClick()) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const mouse = input.mouse();
    const point = toLogical(mouse.x, mouse.y);
    const hit = renderer.hitTest(world.state, point.x, point.y);
    if (hit === 'end') {
      world.endPlayerTurn();
      aiTimer = 0;
      announce('Turn ended. Cinder is thinking.');
    } else if (typeof hit === 'number' && hit >= 0) {
      // Click a card to select it; click it again (or press Enter) to play it.
      if (world.state.selected === hit) {
        const event = world.playPlayerCard(hit);
        if (event & EVENT_WIN || event & EVENT_LOSS) endGame();
        else if (event & EVENT_PLAYED) announce(`You play ${world.state.player.played.name}.`);
      } else {
        world.state.selected = hit;
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_END_TURN) {
      world.endPlayerTurn();
      aiTimer = 0;
      announce('Turn ended. Cinder is thinking.');
      return;
    }
    // Number keys 1-7 select a card; Enter/Space plays the selected one.
    for (let i = 0; i < 7; i += 1) {
      if (actions & (ACTION_SELECT_BASE << i)) {
        if (i < world.state.player.hand.length) world.state.selected = i;
      }
    }
    if (actions & ACTION_CONFIRM && world.state.selected >= 0) {
      const event = world.playPlayerCard(world.state.selected);
      if (event & EVENT_WIN || event & EVENT_LOSS) endGame();
      else if (event & EVENT_PLAYED) announce(`You play ${world.state.player.played.name}.`);
    }
  }

  function step(dt) {
    // Let the AI play its queued cards one at a time.
    if (world.state.phase === PHASE_AI) {
      aiTimer += dt;
      if (aiTimer >= AI_TICK_SECONDS) {
        aiTimer = 0;
        const before = world.state.foe.played;
        const event = world.stepAi();
        if (world.state.foe.played && world.state.foe.played !== before) {
          announce(`Cinder plays ${world.state.foe.played.name}. Your life ${world.state.player.life}.`);
        }
        if (event & EVENT_WIN || event & EVENT_LOSS) endGame();
      }
    }
    world.step(dt, false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    view = renderer.draw(world.state, screen, best, hover());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Court. Press Enter or click to begin the duel.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

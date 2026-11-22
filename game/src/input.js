// Keyboard and pointer input. One-shot presses (select, play, end turn, pause) are queued
// as bit flags and taken once by the loop, so a press between two frames is never lost and
// never counted twice. Pointer position is tracked for hover and for clicking cards.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_END_TURN = 4;
export const ACTION_SELECT_BASE = 16; // select card 0 is 16, card 1 is 32, ...

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const END_TURN = new Set(['KeyE']);
const SELECT = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7']);

export function createInput(canvas) {
  let actions = 0;
  let mouseX = -1;
  let mouseY = -1;
  let clicked = false;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (END_TURN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (SELECT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SELECT_BASE << (Number(event.code.slice(5)) - 1);
    } else return;
    event.preventDefault();
  });
  window.addEventListener('blur', () => {
    mouseX = -1;
    mouseY = -1;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    clicked = true;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Whether the pointer was pressed since the last call. */
    takeClick() {
      const was = clicked;
      clicked = false;
      return was;
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
  };
}

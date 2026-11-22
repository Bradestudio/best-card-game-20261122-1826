// Every tuning number and colour in one place. The table is a fixed 1280x480 logical area
// (the screenshot frame); the renderer scales it to the window, so no rule below depends on
// the screen size.
export const FIELD = { width: 1280, height: 480 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Starting life for each duellist, and the most mana a turn can ever hold. */
export const START_LIFE = 30;
export const MAX_MANA = 10;
export const START_MANA = 3;
export const HAND_LIMIT = 7;
export const START_HAND = 5;

/** Player card geometry on the table (logical pixels). */
export const CARD = { width: 150, height: 200, gap: 14 };
export const FOE_CARD = { width: 84, height: 96 };

export const PALETTE = {
  felt: '#14532d',
  feltDark: '#0b3d20',
  feltLight: '#1c6b3a',
  rail: '#3a2a17',
  gold: '#f2c94c',
  goldDim: '#b98a1e',
  parchment: '#f5eeda',
  parchmentDark: '#e6d9b8',
  ink: '#1a1a2e',
  red: '#c0392b',
  blue: '#1f6fb2',
  green: '#1e7a34',
  text: '#f4efe0',
  muted: '#b9c4a8',
  panel: '#101d14',
  damage: '#ff5a4e',
  heal: '#7be495',
  shield: '#7cc7ff',
  button: '#8a5a1d',
  buttonHover: '#a8742a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result (wins) is kept between visits (this browser only). */
export const BEST_KEY = 'ember-court.wins';

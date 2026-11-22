// The Ember Court deck: twelve original cards in four suits. Every card has a mana cost, a
// big readable value, and one effect. Suits are told apart by colour AND shape, never by
// text alone: spades strike, hearts mend, diamonds guard, clubs scheme.
//
// Effects:
//   damage  — attack value hits the enemy life (through shield first)
//   heal    — restore your own life
//   shield  — gain armour that absorbs the next damage
//   draw    — draw cards from your deck
//   mana    — gain extra mana this turn
//   drain   — damage the enemy and heal yourself by the same amount
export const SUITS = {
  spade: { glyph: '♠', colour: '#1a1a2e', name: 'Spade' },
  heart: { glyph: '♥', colour: '#c0392b', name: 'Heart' },
  diamond: { glyph: '♦', colour: '#1f6fb2', name: 'Diamond' },
  club: { glyph: '♣', colour: '#1e7a34', name: 'Club' },
};

/**
 * Card definitions: id, name, suit, cost, value (attack / heal / shield / draw count) and
 * the effect the value feeds. `text` is the one-line rule printed on the card.
 */
export const CARD_DEFS = [
  { id: 'slash', name: 'Ember Slash', suit: 'spade', cost: 1, value: 3, effect: 'damage', text: 'Deal 3 damage.' },
  { id: 'lance', name: 'Flame Lance', suit: 'spade', cost: 2, value: 5, effect: 'damage', text: 'Deal 5 damage.' },
  { id: 'fang', name: 'Cinder Fang', suit: 'spade', cost: 3, value: 6, effect: 'damageDraw', text: 'Deal 6 damage. Draw 1.' },
  { id: 'inferno', name: 'Inferno', suit: 'spade', cost: 4, value: 9, effect: 'damage', text: 'Deal 9 damage.' },
  { id: 'decree', name: 'Royal Decree', suit: 'spade', cost: 5, value: 12, effect: 'damage', text: 'Deal 12 damage.' },
  { id: 'drain', name: 'Ashen Tithe', suit: 'spade', cost: 3, value: 5, effect: 'drain', text: 'Deal 5 damage. Heal 5.' },
  { id: 'mending', name: 'Heart Ember', suit: 'heart', cost: 2, value: 6, effect: 'heal', text: 'Restore 6 life.' },
  { id: 'feast', name: 'Phoenix Feast', suit: 'heart', cost: 3, value: 8, effect: 'healDraw', text: 'Restore 8 life. Draw 1.' },
  { id: 'aegis', name: 'Court Aegis', suit: 'diamond', cost: 1, value: 5, effect: 'shield', text: 'Gain 5 shield.' },
  { id: 'bulwark', name: 'Iron Bulwark', suit: 'diamond', cost: 2, value: 8, effect: 'shield', text: 'Gain 8 shield.' },
  { id: 'spark', name: 'Spark Scheme', suit: 'club', cost: 1, value: 2, effect: 'draw', text: 'Draw 2 cards.' },
  { id: 'bloom', name: 'Mana Bloom', suit: 'club', cost: 2, value: 2, effect: 'mana', text: 'Gain 2 mana now.' },
];

/** How many copies of each card a 30-card deck holds. */
const DECK_COUNTS = {
  slash: 4, lance: 3, fang: 2, inferno: 2, decree: 1, drain: 2,
  mending: 3, feast: 2, aegis: 3, bulwark: 2, spark: 3, bloom: 3,
};

export function defById(id) {
  return CARD_DEFS.find((def) => def.id === id);
}

/** A fresh 30-card deck (new card objects, so a game never mutates the definitions). */
export function buildDeck() {
  const deck = [];
  for (const def of CARD_DEFS) {
    for (let i = 0; i < (DECK_COUNTS[def.id] ?? 0); i += 1) {
      deck.push({ ...def, uid: `${def.id}-${i}` });
    }
  }
  return deck;
}

/** The short label drawn under a card's big value: ATK, HEAL, SHIELD, DRAW or MANA. */
export function valueLabel(card) {
  if (card.effect === 'heal' || card.effect === 'healDraw') return 'HEAL';
  if (card.effect === 'shield') return 'SHIELD';
  if (card.effect === 'draw') return 'DRAW';
  if (card.effect === 'mana') return 'MANA';
  return 'ATK';
}

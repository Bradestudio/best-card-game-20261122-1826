# EMBER COURT — A Duel of Ember and Ash

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Bradestudio/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Bradestudio/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

A cinematic tactical card duel on a green felt table, built for the [make.fun best card game bounty](https://make.fun/bounty/best-card-game-20261122-1826). You are the Ember Knight, duelling Lady Cinder, an AI rival with a readable brain: she takes the killing blow when she has one, mends when hurt, guards when you threaten lethal, and spends the rest on the biggest damage she can afford. Both duelists have 30 life, a 30-card deck, and mana that grows every turn.

Twelve original cards in four suits — spades strike, hearts mend, diamonds guard, clubs scheme — each with a cost, a big readable value, and one rule: Ember Slash, Flame Lance, Cinder Fang, Inferno, Royal Decree, Ashen Tithe, Heart Ember, Phoenix Feast, Court Aegis, Iron Bulwark, Spark Scheme, Mana Bloom. Cards combine: draw to dig for the Decree, bloom mana to play two cards a turn, drain to stay alive while you burn her down.

## Play

Open `game/index.html` in a desktop browser (or `node serve.ts` and visit http://localhost:8080). No network, no build step, no files outside `game/`.

- **1–7** — select a card in your hand (click a card to select it, click again to play it)
- **Enter / Space** — play the selected card
- **E** — end your turn (or click END TURN) · **Esc / P** — pause

Win by bringing Lady Cinder's life to 0; lose if yours reaches 0. Shield absorbs damage first, and an empty deck reshuffles your discard pile — the court never runs dry.

## Shots

`?shot=start|play|win|loss` stages a deterministic scene (fixed seed) for screenshots — see `shots.json`. The autopilot plays the real rules forward, so every screenshot is a genuine render of the game.

## Files

- `game/` — the playable game (static files only)
  - `game/src/config.js` — tuning constants and the table palette
  - `game/src/cards.js` — the twelve original cards and the 30-card deck
  - `game/src/world.js` — the duel: turns, mana, damage, shield, the AI brain
  - `game/src/render.js` — cinematic canvas renderer (felt table, parchment cards, HUD)
  - `game/src/input.js` — keyboard + mouse
  - `game/src/shots.js` — deterministic autopilot screenshot scenes
  - `game/src/random.js` — seeded RNG
  - `game/src/main.js` — boot and game loop
- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — tiny local static server for play-testing

## License

MIT — see [LICENSE](LICENSE).

---

Built for the make.fun bounty — https://make.fun/bounty/best-card-game-20261122-1826?ref=qjs4e9sj

# Realmline

**CID:** 02601389

Realmline is a two-player, turn-based territory board game. Players place their remaining pieces, move one piece up to two orthogonal squares, then build a permanent wall beside the piece they moved. Walls divide the board into territories, and a territory scores only when it contains pieces from one player.

I designed the game around a simple idea: the board should start open and slowly become more strategic as players add walls. The main tension is deciding whether to claim territory immediately or block the other player from making a larger region later.

## Project Structure

- `web-app/Module.js` defines the game module API and implementation. Its exported functions are documented with JSDoc and operate on game state objects.
- `web-app/tests/wall-go.test.js` contains the unit tests for the game module.
- `web-app/index.html` provides the web page structure.
- `web-app/default.css` provides the styling.
- `web-app/main.js` connects the browser interface to the game module.
- `docs/` contains the generated JSDoc documentation.

The game rules are kept in `Module.js` so they can be tested separately from the browser interface. The web app calls this module rather than re-implementing the rules in the UI code.

## Testing Focus

The tests concentrate on the original two-player rules: piece placement order, legal movement, wall placement, territory scoring, draw handling, and game-ending conditions. These are the behaviours most likely to break if the rules change, so they are the ones I wanted the test file to describe clearly.

## Install

Install the project dependencies with:

```powershell
npm install
```

The `node_modules` directory is ignored by Git and should not be uploaded to the repository.

## Run Checks

Run the unit tests:

```powershell
npm test
```

Run the linter:

```powershell
npm run lint
```

Regenerate the JSDoc documentation:

```powershell
npm run docs
```

## Play

Open `web-app/index.html` in a browser to play the game.

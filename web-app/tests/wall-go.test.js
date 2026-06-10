import assert from "node:assert/strict";
import {
  canPlaceWall,
  createInitialState,
  getLargestTerritory,
  getLegalMoves,
  getPendingPlacement,
  getPieceAt,
  getScore,
  getWinner,
  isGameOver,
  movePiece,
  placePiece,
  placeWall
} from "../Module.js";

function completePlacement(state) {
  return [
    { row: 0, col: 0 },
    { row: 0, col: 6 },
    { row: 6, col: 0 },
    { row: 6, col: 6 }
  ].reduce((nextState, position) => placePiece(nextState, position), state);
}

function createEmptyWalls(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: false, right: false, bottom: false, left: false }))
  );
}

function createSplitState() {
  const size = 7;
  const walls = createEmptyWalls(size);

  for (let row = 0; row < size; row += 1) {
    walls[row][2].right = true;
    walls[row][3].left = true;
  }

  return {
    size,
    currentPlayer: "Red",
    phase: "move",
    pieces: [
      { id: "R1", player: "Red", row: 0, col: 0 },
      { id: "R2", player: "Red", row: 1, col: 1 },
      { id: "R3", player: "Red", row: 2, col: 2 },
      { id: "R4", player: "Red", row: 3, col: 0 },
      { id: "B1", player: "Blue", row: 0, col: 3 },
      { id: "B2", player: "Blue", row: 1, col: 4 },
      { id: "B3", player: "Blue", row: 2, col: 5 },
      { id: "B4", player: "Blue", row: 3, col: 6 }
    ],
    placementQueue: [],
    lastMovedPieceId: undefined,
    walls
  };
}

function createDrawState() {
  return {
    size: 2,
    currentPlayer: "Red",
    phase: "move",
    pieces: [
      { id: "R1", player: "Red", row: 0, col: 0 },
      { id: "B1", player: "Blue", row: 0, col: 1 }
    ],
    placementQueue: [],
    lastMovedPieceId: undefined,
    walls: [
      [
        { top: false, right: true, bottom: false, left: false },
        { top: false, right: false, bottom: false, left: true }
      ],
      [
        { top: false, right: true, bottom: false, left: false },
        { top: false, right: false, bottom: false, left: true }
      ]
    ]
  };
}

function createUncatchableLeadState() {
  const size = 4;
  const walls = createEmptyWalls(size);

  for (let row = 0; row < size; row += 1) {
    walls[row][2].right = true;
    walls[row][3].left = true;
  }

  return {
    size,
    currentPlayer: "Red",
    phase: "move",
    pieces: [
      { id: "B1", player: "Blue", row: 0, col: 0 },
      { id: "B2", player: "Blue", row: 1, col: 1 },
      { id: "R1", player: "Red", row: 0, col: 3 },
      { id: "B3", player: "Blue", row: 1, col: 3 }
    ],
    placementQueue: [],
    lastMovedPieceId: undefined,
    walls,
    wallOwners: createEmptyWalls(size)
  };
}

function createTrappedCurrentPlayerState() {
  const size = 5;
  const walls = createEmptyWalls(size);

  [
    { row: 1, col: 1 },
    { row: 3, col: 3 }
  ].forEach((position) => {
    walls[position.row][position.col].top = true;
    walls[position.row - 1][position.col].bottom = true;
    walls[position.row][position.col].right = true;
    walls[position.row][position.col + 1].left = true;
    walls[position.row][position.col].bottom = true;
    walls[position.row + 1][position.col].top = true;
    walls[position.row][position.col].left = true;
    walls[position.row][position.col - 1].right = true;
  });

  return {
    size,
    currentPlayer: "Red",
    phase: "move",
    pieces: [
      { id: "R1", player: "Red", row: 1, col: 1 },
      { id: "R2", player: "Red", row: 3, col: 3 },
      { id: "B1", player: "Blue", row: 0, col: 0 },
      { id: "B2", player: "Blue", row: 4, col: 4 }
    ],
    placementQueue: [],
    lastMovedPieceId: undefined,
    walls,
    wallOwners: createEmptyWalls(size)
  };
}

describe("Wall-Go original two-player rules", () => {
  it("starts on a 7 by 7 board with two fixed pieces for each player", () => {
    const state = createInitialState();

    assert.equal(state.size, 7);
    assert.equal(state.phase, "placement");
    assert.equal(state.currentPlayer, "Red");
    assert.deepEqual(getPieceAt(state, { row: 1, col: 1 }), {
      id: "R1",
      player: "Red",
      row: 1,
      col: 1
    });
    assert.deepEqual(getPieceAt(state, { row: 5, col: 5 }), {
      id: "R2",
      player: "Red",
      row: 5,
      col: 5
    });
    assert.deepEqual(getPieceAt(state, { row: 1, col: 5 }), {
      id: "B1",
      player: "Blue",
      row: 1,
      col: 5
    });
    assert.deepEqual(getPieceAt(state, { row: 5, col: 1 }), {
      id: "B2",
      player: "Blue",
      row: 5,
      col: 1
    });
  });

  it("places the remaining pieces in Red, Blue, Blue, Red order", () => {
    const start = createInitialState();
    const afterRed = placePiece(start, { row: 0, col: 0 });
    const afterBlueOne = placePiece(afterRed, { row: 0, col: 6 });
    const afterBlueTwo = placePiece(afterBlueOne, { row: 6, col: 0 });
    const afterFinalRed = placePiece(afterBlueTwo, { row: 6, col: 6 });

    assert.equal(getPendingPlacement(start).id, "R3");
    assert.equal(afterRed.currentPlayer, "Blue");
    assert.equal(getPendingPlacement(afterRed).id, "B3");
    assert.equal(getPendingPlacement(afterBlueOne).id, "B4");
    assert.equal(afterBlueTwo.currentPlayer, "Red");
    assert.equal(getPendingPlacement(afterBlueTwo).id, "R4");
    assert.equal(afterFinalRed.phase, "move");
    assert.equal(afterFinalRed.currentPlayer, "Red");
    assert.equal(afterFinalRed.pieces.length, 8);
  });

  it("rejects placement on occupied cells", () => {
    const state = createInitialState();

    assert.throws(() => placePiece(state, { row: 1, col: 1 }), /empty board cell/);
  });

  it("allows the current player to move zero, one, or two orthogonal steps", () => {
    const state = completePlacement(createInitialState());
    const moves = getLegalMoves(state, "R1");

    assert(moves.some((move) => move.row === 1 && move.col === 1), "R1 can stay still");
    assert(moves.some((move) => move.row === 0 && move.col === 1), "R1 can move one step");
    assert(moves.some((move) => move.row === 3 && move.col === 1), "R1 can move two steps");
    assert(!moves.some((move) => move.row === 4 && move.col === 1), "R1 cannot move three steps");
    assert(!moves.some((move) => move.row === 2 && move.col === 2), "R1 cannot move diagonally");
  });

  it("does not allow movement through another piece", () => {
    const state = [
      { row: 2, col: 1 },
      { row: 0, col: 6 },
      { row: 6, col: 0 },
      { row: 6, col: 6 }
    ].reduce((nextState, position) => placePiece(nextState, position), createInitialState());
    const moves = getLegalMoves(state, "R1");

    assert(!moves.some((move) => move.row === 3 && move.col === 1), "R1 cannot pass through R3");
  });

  it("moves without mutating the previous state and then requires a wall", () => {
    const before = completePlacement(createInitialState());
    const after = movePiece(before, "R1", { row: 0, col: 1 });

    assert.equal(getPieceAt(before, { row: 1, col: 1 }).id, "R1");
    assert.equal(getPieceAt(after, { row: 0, col: 1 }).id, "R1");
    assert.equal(after.phase, "wall");
    assert.equal(after.lastMovedPieceId, "R1");
  });

  it("only allows a wall beside the piece moved this turn", () => {
    const moved = movePiece(completePlacement(createInitialState()), "R1", { row: 0, col: 1 });

    assert.equal(canPlaceWall(moved, { row: 0, col: 1 }, "right"), true);
    assert.equal(canPlaceWall(moved, { row: 0, col: 0 }, "right"), false);
    assert.equal(canPlaceWall(moved, { row: 0, col: 1 }, "top"), false);
    assert.equal(canPlaceWall(moved, { row: 0, col: 1 }, "middle"), false);
  });

  it("places a permanent wall on both sides of a shared edge and advances the turn", () => {
    const moved = movePiece(completePlacement(createInitialState()), "R1", { row: 0, col: 1 });
    const afterWall = placeWall(moved, { row: 0, col: 1 }, "right");

    assert.equal(afterWall.walls[0][1].right, true);
    assert.equal(afterWall.walls[0][2].left, true);
    assert.equal(afterWall.wallOwners[0][1].right, "Red");
    assert.equal(afterWall.wallOwners[0][2].left, "Red");
    assert.equal(afterWall.phase, "move");
    assert.equal(afterWall.currentPlayer, "Blue");
    assert.equal(canPlaceWall(afterWall, { row: 0, col: 1 }, "right"), false);
  });

  it("records Blue as the owner when Blue builds a wall", () => {
    const redMoved = movePiece(completePlacement(createInitialState()), "R1", { row: 0, col: 1 });
    const blueTurn = placeWall(redMoved, { row: 0, col: 1 }, "right");
    const blueMoved = movePiece(blueTurn, "B1", { row: 0, col: 5 });
    const afterBlueWall = placeWall(blueMoved, { row: 0, col: 5 }, "bottom");

    assert.equal(afterBlueWall.wallOwners[0][5].bottom, "Blue");
    assert.equal(afterBlueWall.wallOwners[1][5].top, "Blue");
  });

  it("scores only territories occupied by one player", () => {
    const state = completePlacement(createInitialState());

    assert.deepEqual(getScore(state), { Red: 0, Blue: 0 });
    assert.equal(isGameOver(state), false);
  });

  it("rejects movement that is diagonal or too far away", () => {
    const state = completePlacement(createInitialState());

    assert.throws(() => movePiece(state, "R1", { row: 2, col: 2 }), /cannot move/);
    assert.throws(() => movePiece(state, "R1", { row: 4, col: 1 }), /cannot move/);
  });

  it("does not list destinations beyond a wall", () => {
    const moved = movePiece(completePlacement(createInitialState()), "R1", { row: 0, col: 1 });
    const afterWall = placeWall(moved, { row: 0, col: 1 }, "right");
    const redTurn = { ...afterWall, currentPlayer: "Red" };
    const moves = getLegalMoves(redTurn, "R1");

    assert(!moves.some((move) => move.row === 0 && move.col === 2), "R1 cannot cross the wall to its right");
  });

  it("does not allow moving to a square with no wall edge left to build", () => {
    const state = completePlacement(createInitialState());
    const blocked = {
      ...state,
      walls: state.walls.map((row) => row.map((cell) => ({ ...cell })))
    };
    blocked.walls[0][1].top = true;
    blocked.walls[0][1].right = true;
    blocked.walls[0][1].bottom = true;
    blocked.walls[0][1].left = true;
    const moves = getLegalMoves(blocked, "R1");

    assert(!moves.some((move) => move.row === 0 && move.col === 1), "R1 cannot move where no wall can be built");
  });

  it("scores separated territories and chooses the player with more territory", () => {
    const state = createSplitState();

    assert.equal(isGameOver(state), true);
    assert.deepEqual(getScore(state), { Red: 21, Blue: 28 });
    assert.equal(getLargestTerritory(state, "Red"), 21);
    assert.equal(getLargestTerritory(state, "Blue"), 28);
    assert.equal(getWinner(state), "Blue");
  });

  it("declares a draw when both players have equal total and largest territory", () => {
    const state = createDrawState();

    assert.equal(isGameOver(state), true);
    assert.deepEqual(getScore(state), { Red: 2, Blue: 2 });
    assert.equal(getLargestTerritory(state, "Red"), 2);
    assert.equal(getLargestTerritory(state, "Blue"), 2);
    assert.equal(getWinner(state), "Draw");
  });

  it("returns no winner while both players still share one region", () => {
    const state = completePlacement(createInitialState());

    assert.equal(isGameOver(state), false);
    assert.equal(getWinner(state), undefined);
  });

  it("ends when the trailing player cannot catch the lead with remaining territory", () => {
    const state = createUncatchableLeadState();

    assert.deepEqual(getScore(state), { Red: 0, Blue: 12 });
    assert.equal(isGameOver(state), true);
    assert.equal(getWinner(state), "Blue");
  });

  it("ends when the current player has no legal moves left", () => {
    const state = createTrappedCurrentPlayerState();

    assert.equal(getLegalMoves(state, "R1").length, 0);
    assert.equal(getLegalMoves(state, "R2").length, 0);
    assert.equal(isGameOver(state), true);
    assert.equal(getWinner(state), "Blue");
  });

  it("finishes the game when the final wall separates all opposing pieces", () => {
    const size = 7;
    const walls = createEmptyWalls(size);

    for (let row = 1; row < size; row += 1) {
      walls[row][2].right = true;
      walls[row][3].left = true;
    }

    const almostFinished = {
      ...createSplitState(),
      phase: "wall",
      lastMovedPieceId: "R1",
      pieces: [
        { id: "R1", player: "Red", row: 0, col: 2 },
        { id: "R2", player: "Red", row: 1, col: 1 },
        { id: "R3", player: "Red", row: 2, col: 2 },
        { id: "R4", player: "Red", row: 3, col: 0 },
        { id: "B1", player: "Blue", row: 0, col: 3 },
        { id: "B2", player: "Blue", row: 1, col: 4 },
        { id: "B3", player: "Blue", row: 2, col: 5 },
        { id: "B4", player: "Blue", row: 3, col: 6 }
      ],
      walls
    };
    const finished = placeWall(almostFinished, { row: 0, col: 2 }, "right");

    assert.equal(finished.phase, "finished");
    assert.equal(getWinner(finished), "Blue");
  });
});

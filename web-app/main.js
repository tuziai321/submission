import {
  DIRECTIONS,
  canPlaceWall,
  createInitialState,
  getGameSummary,
  getLegalMoves,
  getPendingPlacement,
  getPieceAt,
  movePiece,
  placePiece,
  placeWall
} from "./Module.js";

const boardEl = document.querySelector("#board");
const startScreen = document.querySelector("#startScreen");
const gameScreen = document.querySelector("#gameScreen");
const startButton = document.querySelector("#startButton");
const turnLabel = document.querySelector("#turnLabel");
const phaseLabel = document.querySelector("#phaseLabel");
const scoreLabel = document.querySelector("#scoreLabel");
const messageEl = document.querySelector("#message");
const feedbackPanel = document.querySelector("#feedbackPanel");
const feedbackLead = document.querySelector("#feedbackLead");
const feedbackHint = document.querySelector("#feedbackHint");
const liveScorePanel = document.querySelector("#liveScorePanel");
const liveRedScore = document.querySelector("#liveRedScore");
const liveBlueScore = document.querySelector("#liveBlueScore");
const liveRedBar = document.querySelector("#liveRedBar");
const liveBlueBar = document.querySelector("#liveBlueBar");
const resultPanel = document.querySelector("#resultPanel");
const resultBadge = document.querySelector("#resultBadge");
const resultTitle = document.querySelector("#resultTitle");
const resultScore = document.querySelector("#resultScore");
const resultRedScore = document.querySelector("#resultRedScore");
const resultBlueScore = document.querySelector("#resultBlueScore");
const resultRedBar = document.querySelector("#resultRedBar");
const resultBlueBar = document.querySelector("#resultBlueBar");
const resultDetail = document.querySelector("#resultDetail");
const guidePanel = document.querySelector("#guidePanel");
const wallControlsEl = document.querySelector("#wallControls");
const resetButton = document.querySelector("#resetButton");
const playAgainButton = document.querySelector("#playAgainButton");
const undoButton = document.querySelector("#undoButton");
const soundButton = document.querySelector("#soundButton");
const COLUMN_LABELS = ["A", "B", "C", "D", "E", "F", "G"];

let state = createInitialState();
let selectedPieceId;
let moveTargets = [];
let previousScore = getGameSummary(state).score;
let lastAnimatedPieceId;
let lastAnimatedWallKey;
let soundEnabled = false;
let audioContext;
let history = [];

function restartGame() {
  state = createInitialState();
  selectedPieceId = undefined;
  moveTargets = [];
  history = [];
  previousScore = getGameSummary(state).score;
  lastAnimatedPieceId = undefined;
  lastAnimatedWallKey = undefined;
  document.body.classList.remove("game-over");
  resultPanel.hidden = true;
  feedbackPanel.classList.remove("red-leading", "blue-leading", "score-changed");
  setMessage("Red places the third piece on any empty square.");
  render();
}

function render() {
  boardEl.innerHTML = "";

  COLUMN_LABELS.forEach((label) => boardEl.append(createCoordinate("column-label", label)));

  for (let row = 0; row < state.size; row += 1) {
    boardEl.append(createCoordinate("row-label", String(state.size - row)));
    for (let col = 0; col < state.size; col += 1) {
      boardEl.append(createCell(row, col));
    }
  }

  renderStatus();
  renderGuide();
  renderWallControls();
  renderUndoButton();
  lastAnimatedPieceId = undefined;
  lastAnimatedWallKey = undefined;
}

function createCoordinate(className, label) {
  const coordinate = document.createElement("span");
  coordinate.className = `coordinate ${className}`;
  coordinate.textContent = label;
  coordinate.setAttribute("aria-hidden", "true");
  return coordinate;
}

function createCell(row, col) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.setAttribute("role", "button");
  cell.tabIndex = 0;
  cell.dataset.row = row;
  cell.dataset.col = col;
  cell.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);
  cell.addEventListener("click", () => handleCellClick(row, col));
  cell.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCellClick(row, col);
    }
  });

  const piece = getPieceAt(state, { row, col });
  if (state.phase === "placement" && !piece) cell.classList.add("placement-target");
  if (piece?.id === selectedPieceId) cell.classList.add("selected");
  if (isWallSource(row, col)) cell.classList.add("wall-source");
  if (moveTargets.some((target) => target.row === row && target.col === col)) cell.classList.add("move-target");
  if (piece) cell.append(createPieceMarker(piece));

  DIRECTIONS.forEach((direction) => cell.append(createWallButton(row, col, direction.name)));
  return cell;
}

function createPieceMarker(piece) {
  const marker = document.createElement("span");
  marker.className = `piece ${piece.player.toLowerCase()}`;
  if (piece.id === lastAnimatedPieceId) marker.classList.add("piece-pop");
  marker.title = `${piece.player} piece`;
  return marker;
}

function createWallButton(row, col, side) {
  const wall = document.createElement("button");
  wall.type = "button";
  wall.className = `wall-button ${side}`;
  wall.tabIndex = -1;
  wall.title = `Place ${side} wall`;
  wall.setAttribute("aria-label", `Place ${side} wall at row ${row + 1}, column ${col + 1}`);
  wall.addEventListener("click", (event) => {
    event.stopPropagation();
    handleWallClick(row, col, side);
  });

  if (state.walls[row][col][side]) wall.classList.add("built");
  if (lastAnimatedWallKey === getVisibleWallKey(row, col, side)) wall.classList.add("wall-pop");
  const wallOwner = getWallOwner(row, col, side);
  if (wallOwner) wall.classList.add(`${wallOwner.toLowerCase()}-wall`);
  if (isDuplicateBuiltWall(row, col, side)) wall.classList.add("duplicate-built");
  if (canPlaceWall(state, { row, col }, side)) wall.classList.add("available");
  return wall;
}

function renderStatus() {
  const summary = getGameSummary(state);
  const scoreChanged = summary.score.Red !== previousScore.Red || summary.score.Blue !== previousScore.Blue;

  turnLabel.textContent = summary.phase === "finished" ? "Finished" : summary.turn;
  phaseLabel.textContent = getPhaseLabel(summary);
  scoreLabel.textContent = `Red ${summary.score.Red} | Blue ${summary.score.Blue}`;
  scoreLabel.classList.toggle("score-pulse", scoreChanged);
  renderFeedback(summary, scoreChanged);
  renderLiveScore(summary, scoreChanged);
  renderResult(summary);
  previousScore = summary.score;
}

function renderFeedback(summary, scoreChanged) {
  const redScore = summary.score.Red;
  const blueScore = summary.score.Blue;
  const leader = getLeader(summary.score);
  const gap = Math.abs(redScore - blueScore);

  feedbackPanel.classList.remove("red-leading", "blue-leading", "score-changed");
  if (leader === "Red") feedbackPanel.classList.add("red-leading");
  if (leader === "Blue") feedbackPanel.classList.add("blue-leading");
  if (scoreChanged) {
    feedbackPanel.classList.add("score-changed");
    feedbackPanel.addEventListener("animationend", () => feedbackPanel.classList.remove("score-changed"), { once: true });
  }

  if (!leader) {
    feedbackLead.textContent = "Territory is level.";
    feedbackHint.textContent = "One clean wall can still change the shape of the board.";
    return;
  }

  feedbackLead.textContent = `${leader} leads by ${gap} territory ${gap === 1 ? "point" : "points"}.`;
  feedbackHint.textContent = `${leader === "Red" ? "Blue" : "Red"} can chase by cutting off a single-colour region.`;
}

function renderLiveScore(summary, scoreChanged) {
  const leader = getLeader(summary.score);

  liveRedScore.textContent = summary.score.Red;
  liveBlueScore.textContent = summary.score.Blue;
  liveScorePanel.classList.remove("red-leading", "blue-leading", "score-changed");
  if (leader === "Red") liveScorePanel.classList.add("red-leading");
  if (leader === "Blue") liveScorePanel.classList.add("blue-leading");
  if (scoreChanged) {
    liveScorePanel.classList.add("score-changed");
    liveScorePanel.addEventListener("animationend", () => liveScorePanel.classList.remove("score-changed"), {
      once: true
    });
  }
  setScoreBars(summary.score, liveRedBar, liveBlueBar);
}

function renderResult(summary) {
  if (summary.phase !== "finished") {
    resultPanel.hidden = true;
    return;
  }

  resultPanel.hidden = false;
  resultPanel.classList.remove("red-result", "blue-result", "draw-result");
  resultBadge.textContent = "Final territory";
  resultScore.textContent = `Red ${summary.score.Red} | Blue ${summary.score.Blue}`;
  resultRedScore.textContent = summary.score.Red;
  resultBlueScore.textContent = summary.score.Blue;
  setScoreBars(summary.score, resultRedBar, resultBlueBar);

  if (summary.winner === "Draw") {
    resultPanel.classList.add("draw-result");
    resultTitle.textContent = "Draw";
    resultDetail.textContent = "Both players finished level after the largest-territory tie-break.";
    return;
  }

  resultPanel.classList.add(`${summary.winner.toLowerCase()}-result`);
  resultTitle.textContent = `${summary.winner} wins`;
  resultDetail.textContent = getResultDetail(summary);
}

function renderGuide() {
  const activeStep = state.phase === "placement" ? "placement" : state.phase === "wall" ? "wall" : state.phase;
  guidePanel.querySelectorAll("li").forEach((item) => {
    const isActive = item.dataset.step === activeStep;
    const isDone = isGuideStepDone(item.dataset.step);

    item.classList.toggle("active", isActive);
    item.classList.toggle("done", isDone);
  });
}

function handleCellClick(row, col) {
  if (state.phase === "placement") {
    handlePlacementClick(row, col);
    return;
  }

  if (state.phase !== "move") return;

  const piece = getPieceAt(state, { row, col });
  if (selectedPieceId && isMoveTarget(row, col)) {
    finishMove(row, col);
    return;
  }

  if (piece?.player === state.currentPlayer) {
    selectedPieceId = piece.id;
    moveTargets = getLegalMoves(state, piece.id);
    setMessage(`${state.currentPlayer} may move this piece 0, 1, or 2 orthogonal steps.`);
    render();
    return;
  }

  if (selectedPieceId) {
    setMessage("Choose a highlighted square, including the selected piece's current square to stay still.");
  }
}

function handlePlacementClick(row, col) {
  const pending = getPendingPlacement(state);
  if (!pending || getPieceAt(state, { row, col })) return;

  saveHistory();
  state = placePiece(state, { row, col });
  lastAnimatedPieceId = pending.id;
  playSound("piece");
  const nextPending = getPendingPlacement(state);
  if (nextPending) {
    setMessage(`${nextPending.player} places ${nextPending.id} on any empty square.`);
  } else {
    setMessage("Placement complete. Red selects a piece to move.");
  }
  render();
}

function finishMove(row, col) {
  saveHistory();
  state = movePiece(state, selectedPieceId, { row, col });
  lastAnimatedPieceId = selectedPieceId;
  selectedPieceId = undefined;
  moveTargets = [];
  playSound("piece");
  setMessage(`${state.currentPlayer} builds one wall beside the moved piece.`);
  render();
}

function handleWallClick(row, col, side) {
  if (!canPlaceWall(state, { row, col }, side)) {
    if (state.phase === "wall") {
      setMessage("Build the wall on one open edge beside the piece you just moved.");
    }
    return;
  }

  saveHistory();
  state = placeWall(state, { row, col }, side);
  lastAnimatedWallKey = getVisibleWallKey(row, col, side);
  playSound(state.phase === "finished" ? "finish" : "wall");
  if (state.phase === "finished") {
    document.body.classList.add("game-over");
    setMessage(getFinishedMessage());
  } else {
    setMessage(`${state.currentPlayer} selects a piece to move.`);
  }
  render();
}

function renderWallControls() {
  wallControlsEl.innerHTML = "";
  wallControlsEl.hidden = state.phase !== "wall";
  if (state.phase !== "wall") return;

  const movedPiece = getMovedPiece();
  if (!movedPiece) return;

  DIRECTIONS.forEach((direction) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wall-control";
    button.textContent = getDirectionLabel(direction.name);
    button.disabled = !canPlaceWall(state, movedPiece, direction.name);
    button.addEventListener("click", () => handleWallClick(movedPiece.row, movedPiece.col, direction.name));
    wallControlsEl.append(button);
  });
}

function getFinishedMessage() {
  const summary = getGameSummary(state);
  const largestText = summary.score.Red === summary.score.Blue
    ? " Tie-break uses the largest single territory."
    : "";

  if (summary.winner === "Draw") {
    return `Game over: draw. Red ${summary.score.Red}, Blue ${summary.score.Blue}.${largestText}`;
  }
  return `Game over: ${summary.winner} wins. Red ${summary.score.Red}, Blue ${summary.score.Blue}.${largestText}`;
}

function getResultDetail(summary) {
  const margin = Math.abs(summary.score.Red - summary.score.Blue);
  if (margin > summary.unclaimedTerritory) {
    return `${summary.winner} leads by ${margin}, with only ${summary.unclaimedTerritory} unclaimed territory left. The lead cannot be caught.`;
  }
  return `${summary.winner} controlled more separated territory.`;
}

function getPhaseLabel(summary) {
  if (summary.phase === "placement") return `Place ${summary.pendingPlacement.id}`;
  if (summary.phase === "move") return "Move piece";
  if (summary.phase === "wall") return "Build wall";
  return "Game over";
}

function isMoveTarget(row, col) {
  return moveTargets.some((target) => target.row === row && target.col === col);
}

function isWallSource(row, col) {
  const movedPiece = getMovedPiece();
  return Boolean(movedPiece && movedPiece.row === row && movedPiece.col === col);
}

function getMovedPiece() {
  if (state.phase !== "wall" || !state.lastMovedPieceId) return undefined;
  return state.pieces.find((piece) => piece.id === state.lastMovedPieceId);
}

function isDuplicateBuiltWall(row, col, side) {
  return state.walls[row][col][side] && (side === "top" || side === "left");
}

function getWallOwner(row, col, side) {
  return state.wallOwners?.[row]?.[col]?.[side];
}

function getWallKey(row, col, side) {
  return `${row},${col},${side}`;
}

function getVisibleWallKey(row, col, side) {
  if (side === "top" && row > 0) return getWallKey(row - 1, col, "bottom");
  if (side === "left" && col > 0) return getWallKey(row, col - 1, "right");
  return getWallKey(row, col, side);
}

function getDirectionLabel(side) {
  if (side === "top") return "Top";
  if (side === "right") return "Right";
  if (side === "bottom") return "Bottom";
  return "Left";
}

function setMessage(text) {
  messageEl.textContent = text;
}

function saveHistory() {
  history = [...history, cloneState(state)];
}

function undoMove() {
  if (history.length === 0) return;

  state = history[history.length - 1];
  history = history.slice(0, -1);
  selectedPieceId = undefined;
  moveTargets = [];
  lastAnimatedPieceId = undefined;
  lastAnimatedWallKey = undefined;
  previousScore = getGameSummary(state).score;
  document.body.classList.toggle("game-over", state.phase === "finished");
  resultPanel.hidden = true;
  setMessage("Undid the last action.");
  render();
}

function cloneState(value) {
  return globalThis.structuredClone(value);
}

function renderUndoButton() {
  undoButton.disabled = history.length === 0;
}

function getLeader(score) {
  if (score.Red > score.Blue) return "Red";
  if (score.Blue > score.Red) return "Blue";
  return undefined;
}

function isGuideStepDone(step) {
  if (step === "placement") return state.phase !== "placement";
  if (step === "move") return state.phase === "wall" || state.phase === "finished";
  if (step === "wall") return state.phase === "finished";
  return false;
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundButton.textContent = soundEnabled ? "Sound On" : "Sound Off";
  soundButton.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled) playSound("piece");
}

function playSound(type) {
  if (!soundEnabled) return;

  audioContext ??= new globalThis.AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const settings = getSoundSettings(type);

  oscillator.type = settings.wave;
  oscillator.frequency.setValueAtTime(settings.frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(settings.volume, audioContext.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + settings.duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + settings.duration);
}

function getSoundSettings(type) {
  if (type === "wall") return { frequency: 170, duration: 0.08, volume: 0.08, wave: "square" };
  if (type === "finish") return { frequency: 520, duration: 0.28, volume: 0.08, wave: "triangle" };
  return { frequency: 360, duration: 0.1, volume: 0.06, wave: "sine" };
}

function setScoreBars(score, redBar, blueBar) {
  const total = Math.max(score.Red + score.Blue, 1);
  redBar.style.width = `${(score.Red / total) * 100}%`;
  blueBar.style.width = `${(score.Blue / total) * 100}%`;
}

resetButton.addEventListener("click", restartGame);
playAgainButton.addEventListener("click", restartGame);
undoButton.addEventListener("click", undoMove);
soundButton.addEventListener("click", toggleSound);
startButton.addEventListener("click", () => {
  startScreen.hidden = true;
  gameScreen.hidden = false;
  restartGame();
  boardEl.focus();
});

restartGame();

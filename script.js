/*********************************
 * Rage House Scoring (Local-only)
 * - Staff lock with PIN
 * - Unlimited players
 * - Custom rounds + throws
 * - Customers can ALWAYS score
 * - Start New Game is staff-only (on Games page)
 * - Start New Game removes empty names (fixes empty slots)
 * - Target BIG underneath scoreboard
 * - PERFECT overlay alignment with object-fit: contain
 *********************************/

const STAFF_PIN = "1234"; // change this

// FINAL POSITIONS
const GAMES = [
  {
    id: "ducks",
    name: "Ducks",
    image: "images/ducks.png",
    baseW: 1024,
    baseH: 1024,
    buttons: [
      { score: 1,  x: 370, y: 403 },
      { score: 2,  x: 462, y: 485 },
      { score: 6,  x: 598, y: 397 },
      { score: 7,  x: 384, y: 553 },
      { score: 3,  x: 473, y: 606 },
      { score: 5,  x: 615, y: 569 },
      { score: 10, x: 665, y: 635 },
      { score: 4,  x: 571, y: 680 },
      { score: 8,  x: 396, y: 701 },
      { score: 9,  x: 336, y: 633 }
    ]
  },
  {
    id: "axe-classic",
    name: "Axe Classic",
    image: "images/axe-classic.png",
    baseW: 1024,
    baseH: 1024,
    buttons: [
      { score: 7, x: 327, y: 284 },
      { score: 7, x: 724, y: 282 },
      { score: 1, x: 359, y: 457 },
      { score: 3, x: 434, y: 487 },
      { score: 5, x: 514, y: 522 }
    ]
  },
  {
    id: "darts",
    name: "Darts",
    image: "images/darts.png",
    baseW: 1024,
    baseH: 1024,
    buttons: [
      { score: 20, x: 509, y: 324 },
      { score: 1,  x: 566, y: 334 },
      { score: 18, x: 617, y: 362 },
      { score: 4,  x: 649, y: 401 },
      { score: 13, x: 670, y: 451 },
      { score: 6,  x: 677, y: 497 },
      { score: 10, x: 678, y: 548 },
      { score: 15, x: 650, y: 598 },
      { score: 2,  x: 612, y: 642 },
      { score: 17, x: 565, y: 660 },
      { score: 3,  x: 510, y: 671 },
      { score: 19, x: 456, y: 666 },
      { score: 7,  x: 408, y: 642 },
      { score: 16, x: 367, y: 602 },
      { score: 8,  x: 384, y: 546 },
      { score: 11, x: 340, y: 498 },
      { score: 14, x: 341, y: 441 },
      { score: 9,  x: 369, y: 395 },
      { score: 12, x: 411, y: 357 },
      { score: 5,  x: 452, y: 333 }
    ]
  },
  {
    id: "zombie",
    name: "Zombie",
    image: "images/zombie.png",
    baseW: 1024,
    baseH: 1024,
    buttons: [
      { score: 10, x: 537, y: 316 },
      { score: 1,  x: 395, y: 328 },
      { score: 2,  x: 477, y: 435 },
      { score: 2,  x: 533, y: 437 },
      { score: 2,  x: 404, y: 458 },
      { score: 3,  x: 517, y: 515 },
      { score: 2,  x: 604, y: 487 },
      { score: 2,  x: 550, y: 563 },
      { score: 2,  x: 486, y: 570 },
      { score: 2,  x: 523, y: 627 },
      { score: 2,  x: 649, y: 630 },
      { score: 2,  x: 586, y: 690 },
      { score: 2,  x: 471, y: 702 },
      { score: 2,  x: 640, y: 720 }
    ]
  }
];

// DOM
const navScoreboard = document.getElementById("navScoreboard");
const navGames = document.getElementById("navGames");
const navAllGames = document.getElementById("navAllGames");

const pageScoreboard = document.getElementById("pageScoreboard");
const pageGames = document.getElementById("pageGames");
const pageAllGames = document.getElementById("pageAllGames");

const unlockBtn = document.getElementById("unlockBtn");
const kioskBtn = document.getElementById("kioskBtn");

const pinModal = document.getElementById("pinModal");
const pinInput = document.getElementById("pinInput");
const pinOkBtn = document.getElementById("pinOkBtn");
const pinCancelBtn = document.getElementById("pinCancelBtn");
const pinMsg = document.getElementById("pinMsg");

const laneSelect = document.getElementById("laneSelect");
const gameSelect = document.getElementById("gameSelect");
const roundsInput = document.getElementById("roundsInput");
const throwsInput = document.getElementById("throwsInput");

const playersList = document.getElementById("playersList");
const newPlayerName = document.getElementById("newPlayerName");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const applyGameBtn = document.getElementById("applyGameBtn");
const startNewGameBtn = document.getElementById("startNewGameBtn");

const undoBtn = document.getElementById("undoBtn");
const missBtn = document.getElementById("missBtn");
const missOnBoardBtn = document.getElementById("missOnBoardBtn");

const targetStage = document.getElementById("targetStage");
const gameImage = document.getElementById("gameImage");
const overlay = document.getElementById("overlay");

const scoreboardEl = document.getElementById("scoreboard");
const statusText = document.getElementById("statusText");

const laneLabel = document.getElementById("laneLabel");
const timerLabel = document.getElementById("timerLabel");

// Storage
const KEY_STATE = "rh_scoring_state_staffbutton_v1";

// State
let staffUnlocked = false;
let undoStack = [];

let state = loadState() ?? {
  lane: "Lane 1",
  gameId: GAMES[0].id,
  rounds: 3,
  throwsPerRound: 7,
  players: ["Player 1", "Player 2"],
  throws: []
};

init();

function init() {
  gameSelect.innerHTML = GAMES.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
  gameSelect.value = state.gameId;

  laneSelect.value = state.lane;
  roundsInput.value = state.rounds;
  throwsInput.value = state.throwsPerRound;

  laneLabel.textContent = state.lane;
  timerLabel.textContent = "Timer: --:--";

  if (!Array.isArray(state.throws) || state.throws.length === 0) resetScoreboard();

  renderPlayersEditor();
  renderTarget();
  renderScoreboard();

  showPage("scoreboard");
  setStaffUnlocked(false);

  navScoreboard.addEventListener("click", () => showPage("scoreboard"));
  navGames.addEventListener("click", () => showPage("games"));
  navAllGames.addEventListener("click", () => showPage("allgames"));

  unlockBtn.addEventListener("click", openPinModal);
  pinCancelBtn.addEventListener("click", closePinModal);
  pinOkBtn.addEventListener("click", tryUnlock);
  pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });

  addPlayerBtn.addEventListener("click", addPlayer);
  applyGameBtn.addEventListener("click", applyGameSettings);

  // Staff-only new game + removes empty slots
  startNewGameBtn.addEventListener("click", startNewGame);

  // Customers can still score
  undoBtn.addEventListener("click", undo);
  missBtn.addEventListener("click", () => addScore(0));
  missOnBoardBtn.addEventListener("click", () => addScore(0));

  overlay.addEventListener("click", (e) => {
    const btn = e.target.closest(".scoreBtn");
    if (!btn) return;
    const score = Number(btn.dataset.score);
    if (!Number.isFinite(score)) return;
    addScore(score);
  });

  kioskBtn.addEventListener("click", enterFullscreen);

  window.addEventListener("resize", () => {
    const g = currentGame();
    fitOverlayToContainedImage(g.baseW || 1024, g.baseH || 1024);
  });
}

function showPage(which) {
  pageScoreboard.style.display = which === "scoreboard" ? "" : "none";
  pageGames.style.display = which === "games" ? "" : "none";
  pageAllGames.style.display = which === "allgames" ? "" : "none";

  navScoreboard.classList.toggle("active", which === "scoreboard");
  navGames.classList.toggle("active", which === "games");
  navAllGames.classList.toggle("active", which === "allgames");
}

function openPinModal() {
  pinMsg.textContent = "";
  pinInput.value = "";
  pinModal.style.display = "";
  setTimeout(() => pinInput.focus(), 50);
}
function closePinModal() {
  pinModal.style.display = "none";
}
function tryUnlock() {
  if (pinInput.value === STAFF_PIN) {
    setStaffUnlocked(true);
    closePinModal();
  } else {
    pinMsg.textContent = "Incorrect PIN";
  }
}

function setStaffUnlocked(unlocked) {
  staffUnlocked = unlocked;
  unlockBtn.textContent = unlocked ? "🔓 Staff Unlocked" : "🔒 Staff Locked";

  const disabled = !unlocked;

  laneSelect.disabled = disabled;
  gameSelect.disabled = disabled;
  roundsInput.disabled = disabled;
  throwsInput.disabled = disabled;

  newPlayerName.disabled = disabled;
  addPlayerBtn.disabled = disabled;
  applyGameBtn.disabled = disabled;
  startNewGameBtn.disabled = disabled;

  navGames.style.display = unlocked ? "" : "none";
  navAllGames.style.display = unlocked ? "" : "none";
  if (!unlocked) showPage("scoreboard");

  renderPlayersEditor();
}

function renderPlayersEditor() {
  playersList.innerHTML = "";
  state.players.forEach((name, idx) => {
    const row = document.createElement("div");
    row.className = "playerRow";

    const input = document.createElement("input");
    input.value = name;
    input.disabled = !staffUnlocked;

    input.addEventListener("input", () => {
      state.players[idx] = input.value;
      saveState();
      renderScoreboard();
    });

    row.appendChild(input);
    playersList.appendChild(row);
  });
}

function addPlayer() {
  if (!staffUnlocked) return;
  const name = (newPlayerName.value || "").trim();
  if (!name) return;

  state.players.push(name);
  newPlayerName.value = "";
  saveState();

  resetScoreboard();
  renderPlayersEditor();
  renderScoreboard();
}

function applyGameSettings() {
  if (!staffUnlocked) return;

  state.lane = laneSelect.value;
  state.gameId = gameSelect.value;
  state.rounds = clampInt(roundsInput.value, 1, 20, 3);
  state.throwsPerRound = clampInt(throwsInput.value, 1, 30, 7);

  laneLabel.textContent = state.lane;

  saveState();
  resetScoreboard();
  renderTarget();
  renderScoreboard();
  showPage("scoreboard");
}

// ✅ FIX: removes empty slots then starts new game
function startNewGame() {
  if (!staffUnlocked) return;

  state.players = state.players
    .map(n => (n || "").trim())
    .filter(n => n.length > 0);

  if (state.players.length === 0) {
    state.players = ["Player 1"];
  }

  saveState();
  resetScoreboard();
  renderPlayersEditor();
  renderScoreboard();
  showPage("scoreboard");
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
function currentGame() {
  return GAMES.find(g => g.id === state.gameId) ?? GAMES[0];
}

function resetScoreboard() {
  const pCount = state.players.length;
  const rounds = state.rounds;
  const throwsN = state.throwsPerRound;

  state.throws = Array.from({ length: pCount }, () =>
    Array.from({ length: rounds }, () =>
      Array.from({ length: throwsN }, () => null)
    )
  );

  undoStack = [];
  saveState();
}

function findNextEmpty() {
  for (let r = 0; r < state.rounds; r++) {
    for (let p = 0; p < state.players.length; p++) {
      for (let t = 0; t < state.throwsPerRound; t++) {
        if (state.throws[p][r][t] == null) return { p, r, t };
      }
    }
  }
  return null;
}

function roundTotal(p, r) {
  return state.throws[p][r].reduce((a, b) => a + (b ?? 0), 0);
}
function gameTotal(p) {
  return state.throws[p].reduce((sum, roundArr) => sum + roundArr.reduce((a, b) => a + (b ?? 0), 0), 0);
}

function addScore(score) {
  const next = findNextEmpty();
  if (!next) return;

  const prev = state.throws[next.p][next.r][next.t];
  undoStack.push({ ...next, prev });

  state.throws[next.p][next.r][next.t] = score;
  saveState();
  renderScoreboard();
}

function undo() {
  const last = undoStack.pop();
  if (!last) return;
  state.throws[last.p][last.r][last.t] = last.prev;
  saveState();
  renderScoreboard();
}

// TARGET render + alignment
function renderTarget() {
  const g = currentGame();
  const baseW = g.baseW || 1024;
  const baseH = g.baseH || 1024;

  gameImage.onload = () => {
    drawOverlayButtons(g, baseW, baseH);
    fitOverlayToContainedImage(baseW, baseH);
  };

  gameImage.src = g.image;

  setTimeout(() => {
    drawOverlayButtons(g, baseW, baseH);
    fitOverlayToContainedImage(baseW, baseH);
  }, 0);
}

function drawOverlayButtons(g, baseW, baseH) {
  overlay.setAttribute("viewBox", `0 0 ${baseW} ${baseH}`);
  overlay.setAttribute("preserveAspectRatio", "xMidYMid meet");

  overlay.innerHTML = "";
  for (const b of g.buttons) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("scoreBtn");
    group.dataset.score = String(b.score);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(b.x));
    c.setAttribute("cy", String(b.y));
    c.setAttribute("r", "44");

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(b.x));
    t.setAttribute("y", String(b.y));
    t.textContent = String(b.score);

    group.appendChild(c);
    group.appendChild(t);
    overlay.appendChild(group);
  }
}

function fitOverlayToContainedImage(baseW, baseH) {
  const stageW = targetStage.clientWidth;
  const stageH = targetStage.clientHeight;

  const scale = Math.min(stageW / baseW, stageH / baseH);
  const drawW = baseW * scale;
  const drawH = baseH * scale;

  const offsetX = (stageW - drawW) / 2;
  const offsetY = (stageH - drawH) / 2;

  overlay.style.width = `${drawW}px`;
  overlay.style.height = `${drawH}px`;
  overlay.style.left = `${offsetX}px`;
  overlay.style.top = `${offsetY}px`;
}

// Scoreboard render
function renderScoreboard() {
  const rounds = state.rounds;
  const throwsN = state.throwsPerRound;
  const pCount = state.players.length;

  const next = findNextEmpty();
  statusText.textContent = next
    ? `Round ${next.r + 1}, Throw ${next.t + 1} — ${state.players[next.p]}`
    : `Game finished`;

  let html = `<table><thead>`;
  html += `<tr><th class="stickyLeft" rowspan="2">Player</th>`;
  for (let r = 0; r < rounds; r++) html += `<th colspan="${throwsN + 1}">Round ${r + 1}</th>`;
  html += `<th class="totalCell" rowspan="2">Total</th></tr>`;

  html += `<tr>`;
  for (let r = 0; r < rounds; r++) {
    for (let t = 0; t < throwsN; t++) html += `<th>${t + 1}</th>`;
    html += `<th class="totalCell">T</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let p = 0; p < pCount; p++) {
    html += `<tr><td class="stickyLeft">${state.players[p]}</td>`;
    for (let r = 0; r < rounds; r++) {
      for (let t = 0; t < throwsN; t++) html += `<td>${state.throws[p][r][t] ?? ""}</td>`;
      html += `<td class="totalCell">${roundTotal(p, r)}</td>`;
    }
    html += `<td class="totalCell">${gameTotal(p)}</td></tr>`;
  }

  html += `</tbody></table>`;
  scoreboardEl.innerHTML = html;
}

// Fullscreen
async function enterFullscreen() {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {}
}

// Storage
function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY_STATE) || "null"); }
  catch { return null; }
}
function saveState() {
  localStorage.setItem(KEY_STATE, JSON.stringify(state));
}

/*********************************
 * Rage House Scoring (Local-only)
 * - Staff lock with PIN
 * - Unlimited players
 * - Custom rounds + throws
 * - Customers can ALWAYS score
 * - Target BIG underneath scoreboard
 * - PERFECT overlay alignment with object-fit: contain
 *********************************/

// ====== CHANGE THIS PIN ======
const STAFF_PIN = "1234"; // change this

// ====== GAMES ======
// baseW/baseH MUST match the coordinate system you used when setting x/y.
// If all your images are 1024x1024, keep this.
const GAMES = [
  {
    id: "ducks",
    name: "Ducks",
    image: "images/ducks.png",
    baseW: 1024,
    baseH: 1024,
    buttons: [
      { score: 1, x: 354, y: 293 },
      { score: 6, x: 587, y: 293 },
      { score: 2, x: 449, y: 432 },
      { score: 7, x: 365, y: 555 },
      { score: 5, x: 601, y: 606 },
      { score: 3, x: 461, y: 653 },
      { score: 9, x: 329, y: 701 },
      { score: 10, x: 646, y: 702 },
      { score: 4, x: 558, y: 782 },
      { score: 8, x: 393, y: 818 }
    ]
  },
  {
    id: "axe-classic",
    name: "Axe Classic",
    image: "images/axe-classic.png",
    baseW: 1024,
    baseH: 1024,
    buttons: [
      { score: 7, x: 315, y: 95 },
      { score: 7, x: 707, y: 95 },
      { score: 1, x: 352, y: 404 },
      { score: 3, x: 425, y: 449 },
      { score: 5, x: 500, y: 498 }
    ]
  },
  {
    id: "darts",
    name: "Darts",
    image: "images/darts.png",
    baseW: 1024,
    baseH: 1024,
    buttons: makeDartsButtons()
  },
  {
    id: "zombie",
    name: "Zombie",
    image: "images/zombie.png",
    baseW: 1024,
    baseH: 1024,
    buttons: [
      { score: 10, x: 526, y: 174 },
      { score: 1, x: 387, y: 181 },
      { score: 2, x: 462, y: 361 },
      { score: 2, x: 543, y: 366 },
      { score: 2, x: 389, y: 404 },
      { score: 2, x: 592, y: 449 },
      { score: 1, x: 376, y: 466 },
      { score: 3, x: 502, y: 498 },
      { score: 2, x: 538, y: 591 },
      { score: 2, x: 475, y: 601 },
      { score: 2, x: 511, y: 703 },
      { score: 2, x: 632, y: 704 },
      { score: 2, x: 572, y: 810 },
      { score: 2, x: 458, y: 830 },
      { score: 2, x: 622, y: 851 }
    ]
  }
];

function makeDartsButtons() {
  return [
    { score: 20, x: 498, y: 138 },
    { score: 1,  x: 557, y: 154 },
    { score: 18, x: 609, y: 202 },
    { score: 4,  x: 651, y: 276 },
    { score: 13, x: 678, y: 370 },
    { score: 6,  x: 687, y: 474 },
    { score: 10, x: 678, y: 579 },
    { score: 15, x: 651, y: 672 },
    { score: 2,  x: 609, y: 747 },
    { score: 17, x: 557, y: 795 },
    { score: 3,  x: 498, y: 811 },
    { score: 19, x: 440, y: 795 },
    { score: 7,  x: 387, y: 747 },
    { score: 16, x: 345, y: 672 },
    { score: 8,  x: 318, y: 579 },
    { score: 11, x: 309, y: 474 },
    { score: 14, x: 318, y: 370 },
    { score: 9,  x: 345, y: 276 },
    { score: 12, x: 387, y: 202 },
    { score: 5,  x: 440, y: 154 }
  ];
}

// ====== DOM ======
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

// ====== STORAGE ======
const KEY_STATE = "rh_scoring_state_final_v1";

// ====== STATE ======
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

// ---------- INIT ----------
function init() {
  // Populate game dropdown
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

  // Nav
  navScoreboard.addEventListener("click", () => showPage("scoreboard"));
  navGames.addEventListener("click", () => showPage("games"));
  navAllGames.addEventListener("click", () => showPage("allgames"));

  // Staff PIN
  unlockBtn.addEventListener("click", openPinModal);
  pinCancelBtn.addEventListener("click", closePinModal);
  pinOkBtn.addEventListener("click", tryUnlock);
  pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });

  // Staff actions
  addPlayerBtn.addEventListener("click", addPlayer);
  applyGameBtn.addEventListener("click", applyGameSettings);
  startNewGameBtn.addEventListener("click", startNewGame);

  // Scoring (CUSTOMERS ALWAYS CAN CLICK)
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

  // Fullscreen
  kioskBtn.addEventListener("click", enterFullscreen);

  // Keep overlay aligned on resize
  window.addEventListener("resize", () => {
    const g = currentGame();
    fitOverlayToContainedImage(g.baseW || 1024, g.baseH || 1024);
  });
}

// ---------- NAV ----------
function showPage(which) {
  pageScoreboard.style.display = which === "scoreboard" ? "" : "none";
  pageGames.style.display = which === "games" ? "" : "none";
  pageAllGames.style.display = which === "allgames" ? "" : "none";

  navScoreboard.classList.toggle("active", which === "scoreboard");
  navGames.classList.toggle("active", which === "games");
  navAllGames.classList.toggle("active", which === "allgames");
}

// ---------- STAFF LOCK ----------
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

  // Staff-only controls
  laneSelect.disabled = disabled;
  gameSelect.disabled = disabled;
  roundsInput.disabled = disabled;
  throwsInput.disabled = disabled;
  newPlayerName.disabled = disabled;
  addPlayerBtn.disabled = disabled;
  applyGameBtn.disabled = disabled;
  startNewGameBtn.disabled = disabled;

  // Hide staff pages when locked (customers use scoreboard only)
  navGames.style.display = unlocked ? "" : "none";
  navAllGames.style.display = unlocked ? "" : "none";
  if (!unlocked) showPage("scoreboard");

  renderPlayersEditor();
}

// ---------- PLAYERS ----------
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

// ---------- APPLY GAME ----------
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

function startNewGame() {
  if (!staffUnlocked) return;
  resetScoreboard();
  renderScoreboard();
}

// ---------- HELPERS ----------
function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
function currentGame() {
  return GAMES.find(g => g.id === state.gameId) ?? GAMES[0];
}

// ---------- SCORE DATA ----------
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

// ---------- TARGET RENDER (PERFECT ALIGNMENT) ----------
function renderTarget() {
  const g = currentGame();
  const baseW = g.baseW || 1024;
  const baseH = g.baseH || 1024;

  gameImage.onload = () => {
    drawOverlayButtons(g, baseW, baseH);
    fitOverlayToContainedImage(baseW, baseH);
  };

  gameImage.src = g.image;

  // In case image is cached
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
    c.setAttribute("r", "44"); // BIG tap area

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(b.x));
    t.setAttribute("y", String(b.y));
    t.textContent = String(b.score);

    group.appendChild(c);
    group.appendChild(t);
    overlay.appendChild(group);
  }
}

// This is the key: match overlay size/position to the actual displayed (contained) image
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

// ---------- SCOREBOARD TABLE ----------
function renderScoreboard() {
  const rounds = state.rounds;
  const throwsN = state.throwsPerRound;
  const pCount = state.players.length;

  const next = findNextEmpty();
  statusText.textContent = next
    ? `Round ${next.r + 1}, Throw ${next.t + 1} — ${state.players[next.p]}`
    : `Game finished`;

  let html = `<table><thead>`;

  html += `<tr>
    <th class="stickyLeft" rowspan="2">Player</th>`;

  for (let r = 0; r < rounds; r++) {
    html += `<th colspan="${throwsN + 1}">Round ${r + 1}</th>`;
  }
  html += `<th class="totalCell" rowspan="2">Total</th>`;
  html += `</tr>`;

  html += `<tr>`;
  for (let r = 0; r < rounds; r++) {
    for (let t = 0; t < throwsN; t++) html += `<th>${t + 1}</th>`;
    html += `<th class="totalCell">T</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let p = 0; p < pCount; p++) {
    html += `<tr>`;
    html += `<td class="stickyLeft">${state.players[p]}</td>`;

    for (let r = 0; r < rounds; r++) {
      for (let t = 0; t < throwsN; t++) {
        const v = state.throws[p][r][t];
        html += `<td>${v ?? ""}</td>`;
      }
      html += `<td class="totalCell">${roundTotal(p, r)}</td>`;
    }

    html += `<td class="totalCell">${gameTotal(p)}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  scoreboardEl.innerHTML = html;
}

// ---------- FULLSCREEN ----------
async function enterFullscreen() {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch {}
}

// ---------- STORAGE ----------
function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY_STATE) || "null"); }
  catch { return null; }
}
function saveState() {
  localStorage.setItem(KEY_STATE, JSON.stringify(state));
}


/*********************************
 * Rage House Scoring (Local-only)
 * - Staff lock with PIN
 * - Up to 10 players
 * - Custom rounds + throws
 * - Click numbers on image to fill table cells
 * - Local history (per device)
 *********************************/

// ====== CHANGE THIS PIN ======
const STAFF_PIN = "1234"; // <-- change this

// ====== GAMES ======
// Put your target images in an /images folder alongside index.html
// Example: images/dartboard.png
// Then set image: "images/dartboard.png"
const GAMES = [
  {
    id: "darts",
    name: "Darts",
    image: "images/dartboard.png",
    buttons: makeDartboardButtons()
  }
];

// Auto places 20 buttons in a circle (dartboard-style).
// For axe targets, we’ll replace this with your real button coordinates.
function makeDartboardButtons() {
  const centerX = 500, centerY = 500;
  const radius = 360;
  const scores = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const startAngleDeg = -90;

  return scores.map((score, i) => {
    const angle = (startAngleDeg + (i * (360 / scores.length))) * (Math.PI / 180);
    return { score, x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  });
}

// ====== DOM ======
const navScoreboard = document.getElementById("navScoreboard");
const navGames = document.getElementById("navGames");
const navAllGames = document.getElementById("navAllGames");

const pageTitle = document.getElementById("pageTitle");
const pageH1 = document.getElementById("pageH1");

const pageScoreboard = document.getElementById("pageScoreboard");
const pageGames = document.getElementById("pageGames");
const pageAllGames = document.getElementById("pageAllGames");

const unlockBtn = document.getElementById("unlockBtn");

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

const statusText = document.getElementById("statusText");
const scoreboardEl = document.getElementById("scoreboard");

const undoBtn = document.getElementById("undoBtn");
const missBtn = document.getElementById("missBtn");
const missOnBoardBtn = document.getElementById("missOnBoardBtn");

const gameImage = document.getElementById("gameImage");
const overlay = document.getElementById("overlay");

const historyTable = document.getElementById("historyTable");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// ====== STORAGE KEYS ======
const KEY_STATE = "rh_scoring_state_v1";
const KEY_HISTORY = "rh_scoring_history_v1";

// ====== STATE ======
let staffUnlocked = false;

// loads existing state or uses default
let state = loadState() ?? {
  lane: "Lane 1",
  gameId: GAMES[0].id,
  rounds: 3,
  throwsPerRound: 7,
  players: ["Player 1", "Player 2"],
  throws: [] // created by resetScoreboard()
};

let undoStack = []; // {p,r,t,prev}

init();

// ---------- INIT ----------
function init() {
  // Populate game dropdown
  gameSelect.innerHTML = GAMES.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
  gameSelect.value = state.gameId;

  laneSelect.value = state.lane;
  roundsInput.value = state.rounds;
  throwsInput.value = state.throwsPerRound;

  renderPlayersEditor();
  if (!Array.isArray(state.throws) || state.throws.length === 0) resetScoreboard();

  renderTarget();
  renderScoreboard();
  renderHistory();

  showPage("scoreboard");
  setStaffUnlocked(false);

  // Nav
  navScoreboard.addEventListener("click", () => showPage("scoreboard"));
  navGames.addEventListener("click", () => showPage("games"));
  navAllGames.addEventListener("click", () => showPage("allgames"));

  // Staff lock
  unlockBtn.addEventListener("click", openPinModal);
  pinCancelBtn.addEventListener("click", closePinModal);
  pinOkBtn.addEventListener("click", tryUnlock);
  pinInput.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });

  // Staff controls
  addPlayerBtn.addEventListener("click", addPlayer);
  applyGameBtn.addEventListener("click", applyGameSettings);

  // Scoring
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

  clearHistoryBtn.addEventListener("click", () => {
    if (!confirm("Clear local history on this device?")) return;
    localStorage.removeItem(KEY_HISTORY);
    renderHistory();
  });
}

// ---------- UI / NAV ----------
function showPage(which) {
  pageScoreboard.style.display = which === "scoreboard" ? "" : "none";
  pageGames.style.display = which === "games" ? "" : "none";
  pageAllGames.style.display = which === "allgames" ? "" : "none";

  navScoreboard.classList.toggle("active", which === "scoreboard");
  navGames.classList.toggle("active", which === "games");
  navAllGames.classList.toggle("active", which === "allgames");

  if (which === "scoreboard") {
    pageTitle.textContent = "Scoreboard";
    pageH1.textContent = "Scoreboard";
  } else if (which === "games") {
    pageTitle.textContent = "Games";
    pageH1.textContent = "Games";
  } else {
    pageTitle.textContent = "All Games";
    pageH1.textContent = "All Games";
  }
}

// ---------- STAFF PIN ----------
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

    const btn = document.createElement("button");
    btn.className = "btnDanger";
    btn.textContent = "Remove Player";
    btn.disabled = !staffUnlocked;
    btn.addEventListener("click", () => {
      if (state.players.length <= 1) return;
      state.players.splice(idx, 1);
      saveState();
      resetScoreboard();
      renderPlayersEditor();
      renderScoreboard();
    });

    row.appendChild(input);
    row.appendChild(btn);
    playersList.appendChild(row);
  });
}

function addPlayer() {
  if (!staffUnlocked) return;
  const name = (newPlayerName.value || "").trim();
  if (!name) return;
  if (state.players.length >= 10) return;

  state.players.push(name);
  newPlayerName.value = "";
  saveState();

  resetScoreboard();
  renderPlayersEditor();
  renderScoreboard();
}

// ---------- GAME SETTINGS APPLY ----------
function applyGameSettings() {
  if (!staffUnlocked) return;

  state.lane = laneSelect.value;
  state.gameId = gameSelect.value;
  state.rounds = clampInt(roundsInput.value, 1, 10, 3);
  state.throwsPerRound = clampInt(throwsInput.value, 1, 20, 7);

  roundsInput.value = state.rounds;
  throwsInput.value = state.throwsPerRound;

  saveState();

  resetScoreboard();
  renderTarget();
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

// ---------- SCOREBOARD DATA ----------
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

function gameComplete() {
  return findNextEmpty() == null;
}

function addScore(score) {
  if (gameComplete()) return;

  const next = findNextEmpty();
  if (!next) return;

  const prev = state.throws[next.p][next.r][next.t];
  undoStack.push({ ...next, prev });

  state.throws[next.p][next.r][next.t] = score;
  saveState();

  renderScoreboard();

  if (gameComplete()) {
    statusText.textContent = "Game finished";
    saveGameToHistory();
    renderHistory();
  }
}

function undo() {
  const last = undoStack.pop();
  if (!last) return;

  state.throws[last.p][last.r][last.t] = last.prev;
  saveState();
  renderScoreboard();
}

// ---------- RENDER TARGET + CLICK NUMBERS ----------
function renderTarget() {
  const g = currentGame();
  gameImage.src = g.image;

  overlay.innerHTML = "";
  for (const b of g.buttons) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("scoreBtn");
    group.dataset.score = String(b.score);

    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", String(b.x));
    c.setAttribute("cy", String(b.y));
    c.setAttribute("r", "34");

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(b.x));
    t.setAttribute("y", String(b.y));
    t.textContent = String(b.score);

    group.appendChild(c);
    group.appendChild(t);
    overlay.appendChild(group);
  }
}

// ---------- RENDER SCOREBOARD TABLE ----------
function renderScoreboard() {
  const rounds = state.rounds;
  const throwsN = state.throwsPerRound;
  const pCount = state.players.length;

  const next = findNextEmpty();
  statusText.textContent = next
    ? `Round ${next.r + 1}, Throw ${next.t + 1} — ${state.players[next.p]}`
    : `Game finished`;

  let html = `<table><thead>`;

  // Row 1: Player Name | Round groups | Total
  html += `<tr>
    <th class="stickyLeft" rowspan="2">Player Name</th>`;

  for (let r = 0; r < rounds; r++) {
    html += `<th class="group" colspan="${throwsN + 1}">Round ${r + 1}</th>`;
  }
  html += `<th class="group totalCell" rowspan="2">Total</th>`;
  html += `</tr>`;

  // Row 2: throw numbers + T
  html += `<tr>`;
  for (let r = 0; r < rounds; r++) {
    for (let t = 0; t < throwsN; t++) html += `<th class="group">${t + 1}</th>`;
    html += `<th class="group totalCell">T</th>`;
  }
  html += `</tr></thead><tbody>`;

  // Player rows
  for (let p = 0; p < pCount; p++) {
    const activeRow = next && next.p === p ? ` class="activeRow"` : "";
    html += `<tr${activeRow}>`;
    html += `<td class="stickyLeft">${state.players[p]}</td>`;

    for (let r = 0; r < rounds; r++) {
      for (let t = 0; t < throwsN; t++) {
        const v = state.throws[p][r][t];
        const isActive = next && next.p === p && next.r === r && next.t === t;
        html += `<td class="${isActive ? "activeCell" : ""}">${v ?? ""}</td>`;
      }
      html += `<td class="totalCell">${roundTotal(p, r)}</td>`;
    }

    html += `<td class="totalCell">${gameTotal(p)}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table>`;
  scoreboardEl.innerHTML = html;
}

// ---------- HISTORY (LOCAL) ----------
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(KEY_HISTORY) || "[]"); }
  catch { return []; }
}

function saveHistory(list) {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(list));
}

function saveGameToHistory() {
  const list = loadHistory();
  const date = new Date().toLocaleString();

  const totals = state.players
    .map((name, idx) => ({ name, total: gameTotal(idx) }))
    .sort((a, b) => b.total - a.total);

  list.unshift({
    lane: state.lane,
    game: currentGame().name,
    rounds: state.rounds,
    throws: state.throwsPerRound,
    players: state.players.length,
    date,
    winner: totals[0]?.name || "",
    winnerScore: totals[0]?.total ?? 0,
    runnerUp: totals[1]?.name || "",
    runnerUpScore: totals[1]?.total ?? 0
  });

  saveHistory(list.slice(0, 200));
}

function renderHistory() {
  const list = loadHistory();
  if (list.length === 0) {
    historyTable.innerHTML = `<div class="muted">No games saved yet on this device.</div>`;
    return;
  }

  const rows = list.map(g => `
    <tr>
      <td>${g.lane}</td>
      <td>${g.game}</td>
      <td>${g.rounds}</td>
      <td>${g.throws}</td>
      <td>${g.players}</td>
      <td>${g.date}</td>
      <td>${g.winner}<br><span class="muted tiny">Score: ${g.winnerScore}</span></td>
      <td>${g.runnerUp}<br><span class="muted tiny">Score: ${g.runnerUpScore}</span></td>
    </tr>
  `).join("");

  historyTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Lane</th><th>Game Type</th><th>Rounds</th><th>Throws</th><th>Players</th>
          <th>Date Played</th><th>Winner</th><th>Runner-Up</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---------- LOCAL STATE STORAGE ----------
function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY_STATE) || "null"); }
  catch { return null; }
}
function saveState() {
  localStorage.setItem(KEY_STATE, JSON.stringify(state));
}

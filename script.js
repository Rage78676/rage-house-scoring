/*********************************
 * Rage House Scoring (Local-only)
 * FULL BUILD:
 * - Staff lock with PIN + auto-lock (30s)
 * - Customer-only scoreboard view
 * - Unlimited players
 * - Team mode + team colours + auto-balance
 * - Custom rounds + throws
 * - Click numbers on image to score
 * - Session timer + auto shutoff
 * - Start New Game button (clear scores, keep teams)
 * - Idle attract screen (lane + logo)
 * - Kiosk fullscreen
 * - Export results PNG (Instagram)
 * - Email results (mailto draft)
 *********************************/

// ====== CHANGE THIS PIN ======
const STAFF_PIN = "1234";

// ====== AUTO-LOCK ======
const AUTO_LOCK_MS = 30_000;
let autoLockTimer = null;

// ====== TEAM CONFIG ======
const TEAM_NAMES = ["Team A", "Team B", "Team C", "Team D"];
const TEAM_CLASS = {
  "Team A": "teamA",
  "Team B": "teamB",
  "Team C": "teamC",
  "Team D": "teamD"
};

// ====== HELPERS ======
const $ = (id) => document.getElementById(id);
const clampInt = (v, min, max, fallback) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
};
const fmt2 = (n) => String(n).padStart(2, "0");
function formatTimeLeft(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${fmt2(mm)}:${fmt2(ss)}`;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

// ====== DARTS BUTTONS ======
function makeDartsButtons() {
  return [
    { score: 20, x: 498, y: 138 }, { score: 1,  x: 557, y: 154 },
    { score: 18, x: 609, y: 202 }, { score: 4,  x: 651, y: 276 },
    { score: 13, x: 678, y: 370 }, { score: 6,  x: 687, y: 474 },
    { score: 10, x: 678, y: 579 }, { score: 15, x: 651, y: 672 },
    { score: 2,  x: 609, y: 747 }, { score: 17, x: 557, y: 795 },
    { score: 3,  x: 498, y: 811 }, { score: 19, x: 440, y: 795 },
    { score: 7,  x: 387, y: 747 }, { score: 16, x: 345, y: 672 },
    { score: 8,  x: 318, y: 579 }, { score: 11, x: 309, y: 474 },
    { score: 14, x: 318, y: 370 }, { score: 9,  x: 345, y: 276 },
    { score: 12, x: 387, y: 202 }, { score: 5,  x: 440, y: 154 }
  ];
}

// ====== GAMES ======
const GAMES = [
  {
    id: "ducks",
    name: "Ducks",
    image: "images/ducks.png",
    buttons: [
      { score: 1, x: 354, y: 293 }, { score: 6, x: 587, y: 293 },
      { score: 2, x: 449, y: 432 }, { score: 7, x: 365, y: 555 },
      { score: 5, x: 601, y: 606 }, { score: 3, x: 461, y: 653 },
      { score: 9, x: 329, y: 701 }, { score: 10, x: 646, y: 702 },
      { score: 4, x: 558, y: 782 }, { score: 8, x: 393, y: 818 }
    ]
  },
  {
    id: "axe-classic",
    name: "Axe Classic",
    image: "images/axe-classic.png",
    buttons: [
      { score: 7, x: 315, y: 95 }, { score: 7, x: 707, y: 95 },
      { score: 1, x: 352, y: 404 }, { score: 3, x: 425, y: 449 },
      { score: 5, x: 500, y: 498 }
    ]
  },
  {
    id: "darts",
    name: "Darts",
    image: "images/darts.png",
    buttons: makeDartsButtons()
  },
  {
    id: "zombie",
    name: "Zombie",
    image: "images/zombie.png",
    buttons: [
      { score: 10, x: 526, y: 174 },
      { score: 1, x: 387, y: 181 },
      { score: 2, x: 462, y: 361 }, { score: 2, x: 543, y: 366 },
      { score: 2, x: 389, y: 404 }, { score: 2, x: 592, y: 449 },
      { score: 1, x: 376, y: 466 },
      { score: 3, x: 502, y: 498 },
      { score: 2, x: 538, y: 591 }, { score: 2, x: 475, y: 601 },
      { score: 2, x: 511, y: 703 }, { score: 2, x: 632, y: 704 },
      { score: 2, x: 572, y: 810 }, { score: 2, x: 458, y: 830 },
      { score: 2, x: 622, y: 851 }
    ]
  }
];

// ====== STORAGE ======
const KEY_STATE = "rh_state_full_v1";

// ====== STATE ======
let staffUnlocked = false;
let sessionEnded = false;
let timerTick = null;
let undoStack = [];

let state = loadState() ?? {
  lane: "Lane 1",
  gameId: GAMES[0].id,
  rounds: 3,
  throwsPerRound: 7,
  players: ["Player 1", "Player 2"],
  playerTeams: {},
  teamMode: true,

  sessionMinutesDefault: 60,
  sessionEndsAt: null,
  sessionRunning: false,

  customerEmail: "",
  throws: []
};

// ====== DOM (must exist in your index.html) ======
const navScoreboard = $("navScoreboard");
const navGames = $("navGames");
const navAllGames = $("navAllGames");

const pageScoreboard = $("pageScoreboard");
const pageGames = $("pageGames");
const pageAllGames = $("pageAllGames");

const unlockBtn = $("unlockBtn");
const pinModal = $("pinModal");
const pinInput = $("pinInput");
const pinOkBtn = $("pinOkBtn");
const pinCancelBtn = $("pinCancelBtn");
const pinMsg = $("pinMsg");

const laneSelect = $("laneSelect");
const gameSelect = $("gameSelect");
const roundsInput = $("roundsInput");
const throwsInput = $("throwsInput");

const playersList = $("playersList");
const newPlayerName = $("newPlayerName");
const addPlayerBtn = $("addPlayerBtn");
const applyGameBtn = $("applyGameBtn");

const undoBtn = $("undoBtn");
const missBtn = $("missBtn");
const missOnBoardBtn = $("missOnBoardBtn");

const gameImage = $("gameImage");
const overlay = $("overlay");
const scoreboardEl = $("scoreboard");

// Extras
const teamModeBtn = $("teamModeBtn");
const kioskBtn = $("kioskBtn");

const sessionMinutes = $("sessionMinutes");
const startTimerBtn = $("startTimerBtn");
const stopTimerBtn = $("stopTimerBtn");
const timerLabel = $("timerLabel");
const laneLabel = $("laneLabel");
const sessionEndedOverlay = $("sessionEndedOverlay");
const newSessionBtn = $("newSessionBtn");

const exportPngBtn = $("exportPngBtn");
const emailResultsBtn = $("emailResultsBtn");
const customerEmailInput = $("customerEmail");

const startNewGameBtn = $("startNewGameBtn");

// Idle attract
const idleOverlay = $("idleOverlay");
const idleLane = $("idleLane");

// Optional elements (won’t break if missing)
const statusText = $("statusText");

// ====== INIT ======
init();

function init() {
  // Populate game dropdown
  gameSelect.innerHTML = GAMES.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
  gameSelect.value = state.gameId;

  laneSelect.value = state.lane;
  roundsInput.value = state.rounds;
  throwsInput.value = state.throwsPerRound;

  sessionMinutes.value = state.sessionMinutesDefault ?? 60;
  customerEmailInput.value = state.customerEmail ?? "";

  teamModeBtn.textContent = state.teamMode ? "Team Mode: ON" : "Team Mode: OFF";

  ensureTeams();
  if (state.teamMode) autoBalanceTeams();

  if (!Array.isArray(state.throws) || state.throws.length === 0) {
    resetScoreboard();
  }

  renderPlayersEditor();
  renderTarget();
  renderScoreboard();
  renderSessionBar();
  updateIdleOverlay();

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
  addPlayerBtn.addEventListener("click", () => { addPlayer(); armAutoLock(); });
  applyGameBtn.addEventListener("click", () => { applyGameSettings(); armAutoLock(); });
  teamModeBtn.addEventListener("click", () => { toggleTeamMode(); armAutoLock(); });

  // Start New Game (clear scores only)
  startNewGameBtn.addEventListener("click", () => {
    if (!staffUnlocked) return;
    sessionEnded = false;
    if (sessionEndedOverlay) sessionEndedOverlay.style.display = "none";
    resetScoreboard();
    renderTarget();
    renderScoreboard();
    updateIdleOverlay();
    saveState();
    showPage("scoreboard");
    armAutoLock();
  });

  // Scoring
  undoBtn.addEventListener("click", undo);
  missBtn.addEventListener("click", () => addScore(0));
  missOnBoardBtn.addEventListener("click", () => addScore(0));

  overlay.addEventListener("click", (e) => {
    if (sessionEnded) return;
    const btn = e.target.closest(".scoreBtn");
    if (!btn) return;
    const score = Number(btn.dataset.score);
    if (!Number.isFinite(score)) return;
    addScore(score);
  });

  // Kiosk
  kioskBtn.addEventListener("click", enterKioskFullscreen);

  // Timer controls
  startTimerBtn.addEventListener("click", () => { startSessionTimer(); armAutoLock(); });
  stopTimerBtn.addEventListener("click", () => { stopSessionTimer(); armAutoLock(); });

  // End overlay: new session
  newSessionBtn.addEventListener("click", () => {
    if (!staffUnlocked) return;
    sessionEnded = false;
    sessionEndedOverlay.style.display = "none";
    resetScoreboard();
    renderTarget();
    renderScoreboard();
    updateIdleOverlay();
    saveState();
    showPage("scoreboard");
    armAutoLock();
  });

  // Exports
  exportPngBtn.addEventListener("click", () => { exportResultsPng(); armAutoLock(); });
  emailResultsBtn.addEventListener("click", () => { emailResults(); armAutoLock(); });
  customerEmailInput.addEventListener("input", () => {
    state.customerEmail = customerEmailInput.value.trim();
    saveState();
  });

  // Resume timer if running
  resumeTimerIfNeeded();
}

// ====== NAV ======
function showPage(which) {
  pageScoreboard.style.display = which === "scoreboard" ? "" : "none";
  pageGames.style.display = which === "games" ? "" : "none";
  pageAllGames.style.display = which === "allgames" ? "" : "none";
}

// ====== STAFF LOCK ======
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
    armAutoLock();
    updateIdleOverlay();
  } else {
    pinMsg.textContent = "Incorrect PIN";
  }
}

function setStaffUnlocked(unlocked) {
  staffUnlocked = unlocked;
  unlockBtn.textContent = unlocked ? "🔓 Staff Unlocked" : "🔒 Staff Locked";

  const disabled = !unlocked;

  // Disable staff-only controls
  laneSelect.disabled = disabled;
  gameSelect.disabled = disabled;
  roundsInput.disabled = disabled;
  throwsInput.disabled = disabled;
  newPlayerName.disabled = disabled;
  addPlayerBtn.disabled = disabled;
  applyGameBtn.disabled = disabled;
  teamModeBtn.disabled = disabled;
  sessionMinutes.disabled = disabled;
  startTimerBtn.disabled = disabled;
  stopTimerBtn.disabled = disabled;
  exportPngBtn.disabled = disabled;
  emailResultsBtn.disabled = disabled;
  customerEmailInput.disabled = disabled;
  startNewGameBtn.disabled = disabled;

  // Hide staff pages from customers
  navGames.style.display = unlocked ? "" : "none";
  navAllGames.style.display = unlocked ? "" : "none";

  // Clear auto-lock timer when locking
  if (!unlocked && autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }

  // Force customers onto scoreboard
  if (!unlocked) showPage("scoreboard");

  renderPlayersEditor();
  updateIdleOverlay();

  if (unlocked) armAutoLock();
}

// Auto-lock after unlock
function armAutoLock() {
  if (!staffUnlocked) return;
  if (autoLockTimer) clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => {
    setStaffUnlocked(false);
    closePinModal();
  }, AUTO_LOCK_MS);
}

// ====== TEAM MODE ======
function ensureTeams() {
  for (const name of state.players) {
    if (!state.playerTeams[name]) state.playerTeams[name] = TEAM_NAMES[0];
  }
}
function autoBalanceTeams() {
  // round-robin assign across teams
  const names = [...state.players];
  names.forEach((name, i) => {
    state.playerTeams[name] = TEAM_NAMES[i % TEAM_NAMES.length];
  });
}

function toggleTeamMode() {
  if (!staffUnlocked) return;
  state.teamMode = !state.teamMode;
  teamModeBtn.textContent = state.teamMode ? "Team Mode: ON" : "Team Mode: OFF";
  ensureTeams();
  if (state.teamMode) autoBalanceTeams();
  saveState();
  renderPlayersEditor();
  renderScoreboard();
}

// ====== PLAYERS ======
function renderPlayersEditor() {
  playersList.innerHTML = "";
  ensureTeams();

  state.players.forEach((name, idx) => {
    const row = document.createElement("div");
    row.className = "playerRow";

    const input = document.createElement("input");
    input.value = name;
    input.disabled = !staffUnlocked;
    input.addEventListener("input", () => {
      const oldName = state.players[idx];
      const newName = input.value.trim() || oldName;

      state.players[idx] = newName;

      // preserve team on rename
      state.playerTeams[newName] = state.playerTeams[oldName] ?? TEAM_NAMES[0];
      if (newName !== oldName) delete state.playerTeams[oldName];

      saveState();
      renderScoreboard();
      updateIdleOverlay();
      armAutoLock();
    });

    const teamSelect = document.createElement("select");
    TEAM_NAMES.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      teamSelect.appendChild(opt);
    });

    teamSelect.value = state.playerTeams[name] || TEAM_NAMES[0];
    teamSelect.disabled = !staffUnlocked || !state.teamMode;

    teamSelect.addEventListener("change", () => {
      state.playerTeams[name] = teamSelect.value;
      saveState();
      renderScoreboard();
      armAutoLock();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "btnDanger";
    removeBtn.textContent = "Remove";
    removeBtn.disabled = !staffUnlocked;
    removeBtn.addEventListener("click", () => {
      state.players.splice(idx, 1);
      delete state.playerTeams[name];
      saveState();
      resetScoreboard();
      renderPlayersEditor();
      renderScoreboard();
      updateIdleOverlay();
      armAutoLock();
    });

    row.appendChild(input);
    row.appendChild(teamSelect);
    row.appendChild(removeBtn);
    playersList.appendChild(row);
  });
}

function addPlayer() {
  if (!staffUnlocked) return;
  const name = (newPlayerName.value || "").trim();
  if (!name) return;

  state.players.push(name);
  newPlayerName.value = "";

  ensureTeams();
  if (state.teamMode) autoBalanceTeams();

  saveState();
  resetScoreboard();
  renderPlayersEditor();
  renderScoreboard();
  updateIdleOverlay();
}

// ====== GAME SETTINGS ======
function applyGameSettings() {
  if (!staffUnlocked) return;

  state.lane = laneSelect.value;
  state.gameId = gameSelect.value;
  state.rounds = clampInt(roundsInput.value, 1, 20, 3);
  state.throwsPerRound = clampInt(throwsInput.value, 1, 30, 7);
  state.sessionMinutesDefault = clampInt(sessionMinutes.value, 1, 180, 60);

  ensureTeams();
  if (state.teamMode) autoBalanceTeams();

  saveState();

  sessionEnded = false;
  if (sessionEndedOverlay) sessionEndedOverlay.style.display = "none";

  resetScoreboard();
  renderTarget();
  renderScoreboard();
  renderSessionBar();
  updateIdleOverlay();
  showPage("scoreboard");
}

function currentGame() {
  return GAMES.find(g => g.id === state.gameId) ?? GAMES[0];
}

// ====== SCOREBOARD DATA ======
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

function anyScoresEntered() {
  for (let p = 0; p < state.throws.length; p++) {
    for (let r = 0; r < state.throws[p].length; r++) {
      for (let t = 0; t < state.throws[p][r].length; t++) {
        if (state.throws[p][r][t] != null) return true;
      }
    }
  }
  return false;
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
function teamTotals() {
  const totals = {};
  for (let i = 0; i < state.players.length; i++) {
    const name = state.players[i];
    const team = state.playerTeams[name] || TEAM_NAMES[0];
    totals[team] = (totals[team] || 0) + gameTotal(i);
  }
  return totals;
}

function addScore(score) {
  if (sessionEnded) return;

  const next = findNextEmpty();
  if (!next) return;

  const prev = state.throws[next.p][next.r][next.t];
  undoStack.push({ ...next, prev });

  state.throws[next.p][next.r][next.t] = score;
  saveState();

  renderScoreboard();
  updateIdleOverlay();

  // update status text if present
  const n = findNextEmpty();
  if (statusText) {
    statusText.textContent = n
      ? `Round ${n.r + 1}, Throw ${n.t + 1} — ${state.players[n.p]}`
      : `Game finished`;
  }
}

function undo() {
  const last = undoStack.pop();
  if (!last) return;
  state.throws[last.p][last.r][last.t] = last.prev;
  saveState();
  renderScoreboard();
  updateIdleOverlay();
}

// ====== RENDER TARGET ======
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
    c.setAttribute("r", "34"); // visual; tap size handled by CSS

    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(b.x));
    t.setAttribute("y", String(b.y));
    t.textContent = String(b.score);

    group.appendChild(c);
    group.appendChild(t);
    overlay.appendChild(group);
  }
}

// ====== RENDER SCOREBOARD ======
function renderScoreboard() {
  ensureTeams();

  const rounds = state.rounds;
  const throwsN = state.throwsPerRound;
  const pCount = state.players.length;

  const next = findNextEmpty();
  if (statusText) {
    statusText.textContent = next
      ? `Round ${next.r + 1}, Throw ${next.t + 1} — ${state.players[next.p]}`
      : `Game finished`;
  }

  let html = `<table><thead>`;

  // Header row 1
  html += `<tr>
    <th class="stickyLeft" rowspan="2">Player</th>`;

  for (let r = 0; r < rounds; r++) {
    html += `<th class="group" colspan="${throwsN + 1}">Round ${r + 1}</th>`;
  }
  html += `<th class="group totalCell" rowspan="2">Total</th>`;
  html += `</tr>`;

  // Header row 2
  html += `<tr>`;
  for (let r = 0; r < rounds; r++) {
    for (let t = 0; t < throwsN; t++) html += `<th class="group">${t + 1}</th>`;
    html += `<th class="group totalCell">T</th>`;
  }
  html += `</tr></thead><tbody>`;

  for (let p = 0; p < pCount; p++) {
    const name = state.players[p];
    const team = state.playerTeams[name] || TEAM_NAMES[0];
    const teamCls = TEAM_CLASS[team] || "teamA";

    html += `<tr>`;
    html += `<td class="stickyLeft">${escapeHtml(name)}${
      state.teamMode ? ` <span class="teamTag ${teamCls}">${escapeHtml(team)}</span>` : ""
    }</td>`;

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

  // Team totals
  if (state.teamMode) {
    const totals = teamTotals();
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    html += `
      <div style="margin-top:12px;"></div>
      <div class="card" style="padding:12px;border-radius:14px;background:rgba(0,0,0,0.04);">
        <div style="font-weight:900;margin-bottom:8px;">Team Totals</div>
        ${sorted.map(([team,total], i) => {
          const cls = TEAM_CLASS[team] || "teamA";
          const crown = i === 0 ? " 👑" : "";
          return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">
              <div><span class="teamTag ${cls}">${escapeHtml(team)}</span>${crown}</div>
              <div style="font-weight:900;">${total}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  scoreboardEl.innerHTML = html;
}

// ====== IDLE / ATTRACT SCREEN ======
function updateIdleOverlay() {
  if (!idleOverlay || !idleLane) return;

  const shouldShow =
    !staffUnlocked &&
    !state.sessionRunning &&
    !anyScoresEntered() &&
    !sessionEnded;

  idleLane.textContent = state.lane || "";
  idleOverlay.style.display = shouldShow ? "" : "none";
}

// ====== SESSION TIMER + AUTO SHUTOFF ======
function renderSessionBar() {
  if (laneLabel) laneLabel.textContent = state.lane || "";
  if (!timerLabel) return;

  timerLabel.textContent = state.sessionRunning && state.sessionEndsAt
    ? `Timer: ${formatTimeLeft(state.sessionEndsAt - Date.now())}`
    : `Timer: --:--`;
}

function startSessionTimer() {
  if (!staffUnlocked) return;

  const mins = clampInt(sessionMinutes.value, 1, 180, 60);
  state.sessionMinutesDefault = mins;

  state.sessionEndsAt = Date.now() + mins * 60 * 1000;
  state.sessionRunning = true;
  sessionEnded = false;
  if (sessionEndedOverlay) sessionEndedOverlay.style.display = "none";

  saveState();
  startTick();
  renderSessionBar();
  updateIdleOverlay();
}

function stopSessionTimer() {
  if (!staffUnlocked) return;
  state.sessionRunning = false;
  state.sessionEndsAt = null;
  saveState();
  stopTick();
  renderSessionBar();
  updateIdleOverlay();
}

function resumeTimerIfNeeded() {
  if (state.sessionRunning && state.sessionEndsAt) {
    if (Date.now() >= state.sessionEndsAt) {
      endSession();
    } else {
      startTick();
      renderSessionBar();
    }
  } else {
    renderSessionBar();
  }
}

function startTick() {
  stopTick();
  timerTick = setInterval(() => {
    if (!state.sessionRunning || !state.sessionEndsAt) return;
    const left = state.sessionEndsAt - Date.now();
    renderSessionBar();
    if (left <= 0) endSession();
  }, 250);
}

function stopTick() {
  if (timerTick) clearInterval(timerTick);
  timerTick = null;
}

function endSession() {
  state.sessionRunning = false;
  saveState();
  stopTick();

  sessionEnded = true;
  if (sessionEndedOverlay) sessionEndedOverlay.style.display = "";
  showPage("scoreboard");
  renderSessionBar();
  updateIdleOverlay();
}

// ====== KIOSK FULLSCREEN ======
async function enterKioskFullscreen() {
  try {
    document.body.classList.add("kioskMode");
    const el = document.documentElement;
    if (el.requestFullscreen) await el.requestFullscreen();
  } catch (e) {
    // ignore
  }
}

// ====== EXPORTS ======
function getWinnersSummary() {
  const playerTotals = state.players.map((name, i) => ({
    name,
    team: state.playerTeams[name] || TEAM_NAMES[0],
    total: gameTotal(i)
  })).sort((a, b) => b.total - a.total);

  const teamTot = state.teamMode ? teamTotals() : null;
  const teamSorted = teamTot ? Object.entries(teamTot).sort((a, b) => b[1] - a[1]) : [];
  return { playerTotals, teamSorted };
}

function buildResultsText() {
  const g = currentGame();
  const { playerTotals, teamSorted } = getWinnersSummary();

  let txt = `Rage House Results\n`;
  txt += `Lane: ${state.lane}\n`;
  txt += `Game: ${g.name}\n`;
  txt += `Rounds: ${state.rounds} | Throws per round: ${state.throwsPerRound}\n\n`;

  if (state.teamMode && teamSorted.length) {
    txt += `Team Totals:\n`;
    teamSorted.forEach(([team, total], i) => {
      txt += `${i + 1}. ${team}: ${total}\n`;
    });
    txt += `\n`;
  }

  txt += `Players:\n`;
  playerTotals.forEach((p, i) => {
    txt += `${i + 1}. ${p.name}${state.teamMode ? ` (${p.team})` : ""}: ${p.total}\n`;
  });

  return txt;
}

async function exportResultsPng() {
  if (!staffUnlocked) return;

  if (typeof window.html2canvas !== "function") {
    alert("Export not available: html2canvas not loaded. Add the CDN script in index.html.");
    return;
  }

  const g = currentGame();
  const { playerTotals, teamSorted } = getWinnersSummary();

  const card = document.createElement("div");
  card.id = "resultsCard";
  card.innerHTML = `
    <h1>Rage House Results</h1>
    <div class="sub">
      <span class="muted">Lane:</span> ${escapeHtml(state.lane)} ·
      <span class="muted">Game:</span> ${escapeHtml(g.name)} ·
      <span class="muted">Rounds:</span> ${state.rounds} ·
      <span class="muted">Throws:</span> ${state.throwsPerRound}
    </div>

    ${state.teamMode ? `
      <h2 style="margin: 18px 0 10px 0; font-size: 26px;">Team Totals</h2>
      <table>
        <thead><tr><th align="left">Team</th><th align="right">Total</th></tr></thead>
        <tbody>
          ${teamSorted.map(([team,total], i)=>`
            <tr>
              <td>${escapeHtml(team)}${i===0 ? " 👑" : ""}</td>
              <td align="right"><strong>${total}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : ""}

    <h2 style="margin: 22px 0 10px 0; font-size: 26px;">Players</h2>
    <table>
      <thead><tr><th align="left">Player</th><th align="left">Team</th><th align="right">Total</th></tr></thead>
      <tbody>
        ${playerTotals.map((p,i)=>`
          <tr>
            <td>${escapeHtml(p.name)}${i===0 ? " 👑" : ""}</td>
            <td>${state.teamMode ? escapeHtml(p.team) : "-"}</td>
            <td align="right"><strong>${p.total}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>

    <div class="sub" style="margin-top:18px;">
      Post it: <span class="muted">@theragehouse</span>
    </div>
  `;

  card.style.position = "fixed";
  card.style.left = "-99999px";
  card.style.top = "0";
  document.body.appendChild(card);

  try {
    const canvas = await window.html2canvas(card, { scale: 2, backgroundColor: null });
    const dataUrl = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `rage-house-results-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    card.remove();
  }
}

function emailResults() {
  if (!staffUnlocked) return;
  const to = (state.customerEmail || "").trim();
  const subject = encodeURIComponent(`Rage House Results - ${state.lane} - ${currentGame().name}`);
  const body = encodeURIComponent(buildResultsText());
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  window.location.href = mailto;
}

// ====== SAVE / LOAD ======
function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY_STATE) || "null"); }
  catch { return null; }
}
function saveState() {
  localStorage.setItem(KEY_STATE, JSON.stringify(state));
}

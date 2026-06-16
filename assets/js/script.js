const DIFFICULTIES = [4, 5, 6];
const RECORDS_KEY = "hanoiRecords";

// Pantallas principales que se alternan durante el flujo del juego.
const screens = {
  home: document.getElementById("homeScreen"),
  difficulty: document.getElementById("difficultyScreen"),
  howTo: document.getElementById("howToScreen"),
  scores: document.getElementById("scoresScreen"),
  game: document.getElementById("gameScreen")
};

// Elementos del DOM que la logica actualiza con frecuencia.
const ui = {
  towers: [...document.querySelectorAll(".tower")],
  moveCount: document.getElementById("moveCount"),
  timer: document.getElementById("timer"),
  message: document.getElementById("message"),
  difficultyLabel: document.getElementById("difficultyLabel"),
  pauseModal: document.getElementById("pauseModal"),
  victoryModal: document.getElementById("victoryModal"),
  recordNote: document.getElementById("recordNote"),
  victory: {
    difficulty: document.getElementById("victoryDifficulty"),
    moves: document.getElementById("victoryMoves"),
    time: document.getElementById("victoryTime"),
    stars: document.getElementById("victoryStars")
  },
  scores: Object.fromEntries(DIFFICULTIES.map((disks) => [disks, document.getElementById(`scoreList${disks}`)]))
};

// Estado unico de la partida actual.
const game = {
  towers: [],
  selectedTower: null,
  moves: 0,
  startedAt: null,
  elapsedSeconds: 0,
  timerId: null,
  locked: false,
  paused: false,
  diskCount: 4,
  difficultyName: "Facil",
  lastResult: null
};

/**
 * Inserta el credito desde una sola plantilla para evitar HTML repetido.
 */
function renderCredits() {
  const template = document.getElementById("creditTemplate");
  document.querySelectorAll("[data-credit]").forEach((target) => {
    target.innerHTML = template.innerHTML;
  });
}

/**
 * Cambia la pantalla activa y refresca datos que dependen de la vista.
 */
function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");

  if (name === "scores") {
    renderScoreboards();
  }
}

function formatTime(seconds) {
  const min = String(Math.floor(seconds / 60)).padStart(2, "0");
  const sec = String(seconds % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function setMessage(text, type = "") {
  const icon = type === "error" ? "bi-exclamation-triangle" : "bi-info-circle";
  ui.message.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i><span>${text}</span>`;
  ui.message.className = `message ${type}`.trim();
}

/**
 * Temporizador acumulativo: se detiene en pausa/victoria y conserva segundos exactos.
 */
function startTimer() {
  if (game.timerId) return;

  game.startedAt = Date.now() - game.elapsedSeconds * 1000;
  game.timerId = window.setInterval(() => {
    game.elapsedSeconds = Math.floor((Date.now() - game.startedAt) / 1000);
    ui.timer.textContent = formatTime(game.elapsedSeconds);
  }, 1000);
}

function syncElapsedTime() {
  if (!game.timerId || !game.startedAt) return;
  game.elapsedSeconds = Math.floor((Date.now() - game.startedAt) / 1000);
  ui.timer.textContent = formatTime(game.elapsedSeconds);
}

function stopTimer() {
  window.clearInterval(game.timerId);
  game.timerId = null;
}

/**
 * Este valor no se muestra al jugador; solo se usa para calcular estrellas.
 */
function getPerfectMoveCount() {
  return 2 ** game.diskCount - 1;
}

function calculateStars(moveCount) {
  const perfect = getPerfectMoveCount();
  if (moveCount === perfect) return 3;
  if (moveCount <= Math.ceil(perfect * 1.35)) return 2;
  return 1;
}

/**
 * Normaliza registros antiguos para que todos los niveles usen listas top 5.
 */
function normalizeRecords(records) {
  return Object.fromEntries(DIFFICULTIES.map((disks) => {
    const entry = records[disks];
    if (Array.isArray(entry)) return [disks, entry];
    if (entry && typeof entry === "object") return [disks, [entry]];
    return [disks, []];
  }));
}

function readRecords() {
  try {
    return normalizeRecords(JSON.parse(localStorage.getItem(RECORDS_KEY)) || {});
  } catch {
    return normalizeRecords({});
  }
}

function saveRecords(records) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    // La partida no debe fallar si el navegador bloquea localStorage.
  }
}

function sortScores(scores) {
  return scores.sort((a, b) => a.time - b.time || a.moves - b.moves);
}

function addScore(records, disks, score) {
  const currentScores = records[disks] || [];
  const previousBest = sortScores([...currentScores])[0];
  records[disks] = sortScores([...currentScores, score]).slice(0, 5);

  return !previousBest || score.time < previousBest.time || (score.time === previousBest.time && score.moves < previousBest.moves);
}

function renderScoreboards() {
  const records = readRecords();

  Object.entries(ui.scores).forEach(([disks, list]) => {
    const scores = sortScores([...(records[disks] || [])]).slice(0, 5);
    list.innerHTML = "";

    if (scores.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "empty-score";
      emptyItem.textContent = "Sin puntuaciones todavia.";
      list.appendChild(emptyItem);
      return;
    }

    scores.forEach((score) => {
      const item = document.createElement("li");
      item.innerHTML = `<strong>${formatTime(score.time)}</strong><small>${score.moves} movimientos - ${score.stars} estrellas</small>`;
      list.appendChild(item);
    });
  });
}

/**
 * Construye el tablero inicial con discos grandes abajo y pequenos arriba.
 */
function startGame(totalDisks, label) {
  game.diskCount = totalDisks;
  game.difficultyName = label;
  showScreen("game");
  resetGame();
}

function resetGame() {
  game.towers = [[], [], []];
  for (let size = game.diskCount; size >= 1; size -= 1) {
    game.towers[0].push(size);
  }

  Object.assign(game, {
    selectedTower: null,
    moves: 0,
    elapsedSeconds: 0,
    locked: false,
    paused: false
  });

  stopTimer();
  closePauseModal();
  closeVictoryModal();
  ui.timer.textContent = "00:00";
  ui.moveCount.textContent = "0";
  ui.difficultyLabel.textContent = game.difficultyName;
  setMessage("Selecciona una torre y mueve el disco superior a otra torre valida.");
  renderBoard();
}

function renderBoard() {
  ui.towers.forEach((tower, index) => {
    tower.classList.toggle("selected", game.selectedTower === index);
    tower.classList.remove("can-drop");
    tower.querySelectorAll(".disk").forEach((disk) => disk.remove());

    game.towers[index].forEach((size, diskIndex) => {
      const disk = document.createElement("div");
      disk.className = "disk";
      disk.dataset.size = size;
      disk.textContent = size;
      disk.classList.toggle("top", diskIndex === game.towers[index].length - 1);
      tower.appendChild(disk);
    });
  });

  if (game.selectedTower !== null) {
    ui.towers.forEach((tower, index) => {
      tower.classList.toggle("can-drop", index !== game.selectedTower && canMove(game.selectedTower, index));
    });
  }
}

/**
 * Regla central de Hanoi: un disco solo cae sobre una torre vacia o uno mayor.
 */
function canMove(from, to) {
  const disk = game.towers[from].at(-1);
  const target = game.towers[to].at(-1);
  return disk !== undefined && (target === undefined || disk < target);
}

function moveDisk(from, to) {
  if (!canMove(from, to)) return false;

  game.towers[to].push(game.towers[from].pop());
  game.moves += 1;
  ui.moveCount.textContent = String(game.moves);
  renderBoard();
  checkWin();
  return true;
}

function handleTowerClick(event) {
  if (game.locked || game.paused) return;
  const towerIndex = Number(event.currentTarget.dataset.tower);

  if (game.selectedTower === null) {
    if (game.towers[towerIndex].length === 0) {
      setMessage("Esa torre no tiene discos para mover.", "error");
      return;
    }

    game.selectedTower = towerIndex;
    setMessage(`Torre ${String.fromCharCode(65 + towerIndex)} seleccionada.`);
    renderBoard();
    return;
  }

  if (game.selectedTower === towerIndex) {
    game.selectedTower = null;
    setMessage("Seleccion cancelada.");
    renderBoard();
    return;
  }

  startTimer();
  const moved = moveDisk(game.selectedTower, towerIndex);
  setMessage(moved ? "Movimiento realizado." : "Movimiento invalido: no pongas un disco grande sobre uno pequeno.", moved ? "" : "error");
  game.selectedTower = null;
  renderBoard();
}

/**
 * La victoria se acepta en B o C; no se limita a la torre C.
 */
function checkWin() {
  const completedTower = game.towers.findIndex((tower, index) => index !== 0 && tower.length === game.diskCount);
  if (completedTower === -1) return;

  syncElapsedTime();
  stopTimer();
  game.locked = true;

  const stars = calculateStars(game.moves);
  const records = readRecords();
  const score = {
    moves: game.moves,
    time: game.elapsedSeconds,
    stars,
    date: new Date().toISOString()
  };

  game.lastResult = {
    difficulty: game.difficultyName,
    moves: game.moves,
    time: game.elapsedSeconds,
    stars
  };

  const isNewRecord = addScore(records, game.diskCount, score);
  saveRecords(records);
  showVictoryModal(records, isNewRecord);
}

function renderStars(count) {
  const full = '<i class="bi bi-star-fill" aria-hidden="true"></i>';
  const empty = '<i class="bi bi-star" aria-hidden="true"></i>';
  ui.victory.stars.innerHTML = full.repeat(count) + empty.repeat(3 - count);
  ui.victory.stars.setAttribute("aria-label", `${count} de 3 estrellas`);
}

function showVictoryModal(records, isNewRecord) {
  ui.victory.difficulty.textContent = game.difficultyName;
  ui.victory.moves.textContent = String(game.moves);
  ui.victory.time.textContent = formatTime(game.elapsedSeconds);
  renderStars(game.lastResult.stars);

  const bestScore = records[game.diskCount][0];
  ui.recordNote.classList.add("show");
  ui.recordNote.classList.toggle("new-record", isNewRecord);
  ui.recordNote.innerHTML = isNewRecord
    ? '<i class="bi bi-award-fill" aria-hidden="true"></i> Nuevo record local guardado.'
    : `<i class="bi bi-graph-up" aria-hidden="true"></i> Mejor tiempo local: ${formatTime(bestScore.time)} - ${bestScore.moves} mov.`;

  setModal(ui.victoryModal, true);
  document.getElementById("shareBtn").focus();
}

async function shareResult() {
  if (!game.lastResult) return;

  const text = `Resolvi Torres de Hanoi en dificultad ${game.lastResult.difficulty} con ${game.lastResult.moves} movimientos, ${formatTime(game.lastResult.time)} y ${game.lastResult.stars} estrellas.`;
  const shareData = { title: "Torres de Hanoi", text, url: window.location.href };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      setRecordNote('<i class="bi bi-clipboard-check" aria-hidden="true"></i> Resultado copiado al portapapeles.');
    } else {
      throw new Error("Share unavailable");
    }
  } catch {
    setRecordNote('<i class="bi bi-info-circle" aria-hidden="true"></i> No se pudo compartir el resultado.');
  }
}

function setRecordNote(content) {
  ui.recordNote.classList.remove("new-record");
  ui.recordNote.classList.add("show");
  ui.recordNote.innerHTML = content;
}

function setModal(modal, open) {
  modal.classList.toggle("open", open);
  modal.setAttribute("aria-hidden", String(!open));
}

function openPauseModal() {
  if (!screens.game.classList.contains("active") || game.locked) return;

  syncElapsedTime();
  stopTimer();
  game.paused = true;
  setModal(ui.pauseModal, true);
  document.getElementById("resumeBtn").focus();
}

function closePauseModal() {
  setModal(ui.pauseModal, false);
}

function closeVictoryModal() {
  setModal(ui.victoryModal, false);
}

function resumeGame() {
  closePauseModal();
  game.paused = false;
  if (game.moves > 0) startTimer();
}

function exitPausedGame() {
  closePauseModal();
  stopTimer();
  Object.assign(game, { paused: false, selectedTower: null });
  showScreen("home");
}

function bindNavigation() {
  document.getElementById("playBtn").addEventListener("click", () => showScreen("difficulty"));
  document.getElementById("howToBtn").addEventListener("click", () => showScreen("howTo"));
  document.getElementById("scoresBtn").addEventListener("click", () => showScreen("scores"));
  document.getElementById("howToPlayBtn").addEventListener("click", () => showScreen("difficulty"));
  document.getElementById("scoresPlayBtn").addEventListener("click", () => showScreen("difficulty"));

  document.querySelectorAll(".homeBtn").forEach((button) => {
    button.addEventListener("click", () => {
      stopTimer();
      showScreen("home");
    });
  });

  document.getElementById("victoryHomeBtn").addEventListener("click", () => {
    closeVictoryModal();
    stopTimer();
    showScreen("home");
  });

  document.getElementById("victoryAgainBtn").addEventListener("click", () => {
    closeVictoryModal();
    showScreen("difficulty");
  });
}

function bindGameEvents() {
  document.querySelectorAll(".difficulty-card").forEach((button) => {
    button.addEventListener("click", () => startGame(Number(button.dataset.disks), button.querySelector("strong").textContent));
  });

  ui.towers.forEach((tower) => {
    tower.addEventListener("click", handleTowerClick);
    tower.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleTowerClick(event);
      }
    });
  });

  document.getElementById("resetBtn").addEventListener("click", resetGame);
  document.getElementById("pauseBtn").addEventListener("click", openPauseModal);
  document.getElementById("resumeBtn").addEventListener("click", resumeGame);
  document.getElementById("exitGameBtn").addEventListener("click", exitPausedGame);
  document.getElementById("shareBtn").addEventListener("click", shareResult);

  ui.pauseModal.addEventListener("click", (event) => {
    if (event.target === ui.pauseModal) resumeGame();
  });
}

/**
 * Sombra interactiva global que sigue el puntero y no afecta el layout.
 */
function bindPointerShadow() {
  window.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
    document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
  });
}

renderCredits();
bindNavigation();
bindGameEvents();
bindPointerShadow();

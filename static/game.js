const ROWS = 6, COLS = 5;
let state = {
  solution: null,
  grid: Array.from({ length: ROWS }, () => Array(COLS).fill("")),
  feedbacks: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), // NEW
  row: 0, col: 0,
  statuses: {},   // letter → status
  gameOver: false
};
let todayWordObj = {};

const boardEl = document.getElementById("board");
const kbEl = document.getElementById("keyboard");
const toastEl = document.getElementById("toast");

// ===== Score storage =====
const SCORE_KEY = "wordle-alltime-score";
const LAST_PLAYED_KEY = "wordle-last-played";
const GAME_STATE_KEY = "wordle-game-state";  // NEW

let hintUsed = "";

let allTimeScore = parseFloat(localStorage.getItem(SCORE_KEY)) || 0;
let lastPlayedDay = localStorage.getItem(LAST_PLAYED_KEY) || null;

function todayKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`; // e.g., "2025-08-21"
}

async function initGame() {
  try {
    const res = await fetch("/api/word");
    todayWordObj = await res.json(); // now contains {solution, meaning, hint}
    // console.log("Today's word:", todayWordObj);
    state.solution = todayWordObj.solution.toLowerCase();

    // read score freshly
    allTimeScore = parseFloat(localStorage.getItem(SCORE_KEY)) || 0;
    paintScore();

    buildBoard();
    buildKeyboard();

    // 🔄 Restore saved game if already played today
    const saved = JSON.parse(localStorage.getItem(GAME_STATE_KEY));

    // 🧹 Migration: clean up old non-UTC saves
    if (saved && typeof saved.lastPlayedDay === "string") {
      // Only accept strict YYYY-MM-DD (UTC date format)
      const isUTCDate = /^\d{4}-\d{2}-\d{2}$/.test(saved.lastPlayedDay);

      if (!isUTCDate) {
        console.warn("⚠️ Removing old non-UTC saved game:", saved.lastPlayedDay);

        // Wipe both game state + last played key to avoid mismatch
        localStorage.removeItem(GAME_STATE_KEY);
        localStorage.removeItem(LAST_PLAYED_KEY);

        saved = null;
        lastPlayedDay = null;
      }
    }
    
    if (saved && saved.lastPlayedDay === todayKey() /*&& saved.solution === todayWordObj.solution*/) {
      state.grid = saved.grid;
      state.feedbacks = saved.feedbacks;
      state.row = saved.row;
      state.col = saved.col;
      state.statuses = saved.statuses;
      state.gameOver = saved.done; // lock input
      localStorage.setItem(LAST_PLAYED_KEY, todayKey());

      paint();
      restoreFeedback();
      if (state.gameOver) {
        endGame(); // lock keyboard if done 

        const modalEl = document.getElementById("comebackModal");
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      }    
    } else {
      localStorage.removeItem(GAME_STATE_KEY);
      hintUsed = "";
      
      // Reset state properly
      state = {
        solution: todayWordObj.solution.toLowerCase(),
        grid: Array.from({ length: ROWS }, () => Array(COLS).fill("")),
        feedbacks: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
        row: 0,
        col: 0,
        statuses: {},
        gameOver: false
      };

      buildBoard();      // make sure fresh board in DOM
      buildKeyboard();   // fresh keyboard
      paint();
    }
  } catch (err) {
    console.error("Game initialization failed:", err);
  }
}

function paintScore() {
  const scoreEl = document.getElementById("scoreValue");
  scoreEl.textContent = allTimeScore;
}

function restoreFeedback() {
  let maxRow = state.row;

  // If game ended (either win on current row OR loss on last row),
  // we need to include that last submitted row too
  if (state.gameOver) {
    if (state.row < ROWS) {
      maxRow = state.row + 1;  // include the winning row
    } else {
      maxRow = ROWS;  // include all rows for a loss
    }
  }

  for (let r = 0; r < maxRow; r++) {
    const feedback = state.feedbacks[r];
    if (!feedback) continue;
    for (let c = 0; c < COLS; c++) {
      const tile = boardEl.children[r].children[c];
      tile.classList.add(feedback[c]);
    }
  }

  // Reapply keyboard colors
  for (const [ch, status] of Object.entries(state.statuses)) {
    const btn = kbEl.querySelector(`[data-key="${ch}"]`);
    if (btn) btn.className = "key " + status;
  }
}

function buildBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement("div");
    row.className = "row";
    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      row.appendChild(tile);
    }
    boardEl.appendChild(row);
  }
}

function buildKeyboard() {
  const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
  kbEl.innerHTML = "";
  rows.forEach((row, i) => {
    const wrap = document.createElement("div");
    wrap.className = "kb-row";
    if (i === 2) addKey(wrap, "Enter", "wide");
    for (const ch of row) addKey(wrap, ch);
    if (i === 2) addKey(wrap, "⌫", "extra-wide");
    kbEl.appendChild(wrap);
  });
}

function addKey(rowEl, label, extraClass) {
  const btn = document.createElement("button");
  btn.className = "key" + (extraClass ? ` ${extraClass}` : "");
  btn.textContent = label.toUpperCase();
  btn.dataset.key = label;
  btn.addEventListener("click", () => onKey(label));
  rowEl.appendChild(btn);
}

// Input handling
function keyHandler(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  let k = e.key;

  // Only handle Enter if focus is not on inputs/buttons outside the board
  if (k === "Enter") {
    const tag = e.target.tagName.toLowerCase();

    // Ignore Enter inside textareas or inputs (so feedback/report still work)
    if (tag === "textarea" || tag === "input") return;

    // Ignore Enter on header buttons/links (anything with .header-btn or role=button)
    // ignore Enter when focus is inside any modal
    if (e.target.closest(".header-btn") || e.target.closest(".modal")) {
      e.preventDefault();
      return;
    }

    // ✅ Otherwise, allow Enter for the game
    k = "Enter";
  }

  if (k === "Backspace") k = "⌫";
  if (k === "Enter" || k === "⌫" || /^[a-zA-Z]$/.test(k)) onKey(k);
}

window.addEventListener("keydown", keyHandler);

function onKey(k) {
  if (state.gameOver) return;   // 🔒 prevent input when locked
  if (state.row >= ROWS) return; 
  if (state.col < COLS && /^[a-zA-Z]$/.test(k)) {
    state.grid[state.row][state.col] = k.toLowerCase();
    state.col++;
  } else if (k === "⌫") {
    if (state.col > 0) {
      state.col--;
      state.grid[state.row][state.col] = "";
    }
  } else if (k === "Enter") {
    submitRow();
  }
  paint();
}

async function submitRow() {

  if (state.col < COLS) {
    shakeRow(state.row);
    return toast(texts[localStorage.getItem("lang") || "en"].notEnoughLetters);
  }
  const guess = state.grid[state.row].join("");
  if (guess.length !== COLS) return;

  const feedback = getFeedback(guess, state.solution);
  animateReveal(state.row, feedback);

  // ✅ store feedback in memory
  state.feedbacks[state.row] = feedback;

  for (let i = 0; i < COLS; i++) {
    const ch = guess[i];
    const status = feedback[i];
    if (status === "correct" || (status === "present" && state.statuses[ch] !== "correct")) {
      state.statuses[ch] = status;
    } else if (!state.statuses[ch]) {
      state.statuses[ch] = status;
    }
  }

  paint();
  
  if (guess === state.solution) {
    // ✅ Correct guess
    if (lastPlayedDay !== todayKey()) {
      allTimeScore++;
      if (hintUsed == "Y") allTimeScore=allTimeScore - 0.5; //-0.5 taken from score when hint used
      localStorage.setItem(SCORE_KEY, allTimeScore);
      localStorage.setItem(LAST_PLAYED_KEY, todayKey());
      lastPlayedDay = todayKey();
    }
    paintScore();
    setTimeout(() => bounceRow(state.row), 1600);
    showFinalAnswer(true);
    endGame();   // 🔒 lock game after win
  } else {
    state.row++;
    state.col = 0;
    if (state.row >= ROWS) {
      // ❌ Failed all attempts
      if (lastPlayedDay !== todayKey()) {
        allTimeScore=0;
        if (hintUsed == "Y") allTimeScore=allTimeScore - 0.5; //-0.5 taken from score when hint used
        localStorage.setItem(SCORE_KEY, allTimeScore);
        localStorage.setItem(LAST_PLAYED_KEY, todayKey());
        lastPlayedDay = todayKey();
      }
      paintScore();
      showFinalAnswer(false);
      endGame();  // 🔒 lock game after fail
    }
  }

  // ✅ Persist the whole state
  const gameFinished = (guess === state.solution || state.row >= ROWS);
  const gameState = {
    grid: state.grid,
    feedbacks: state.feedbacks,
    row: state.row,
    col: state.col,
    statuses: state.statuses, // ✅ keyboard colors
    solution: state.solution,
    lastPlayedDay: todayKey(),
    done: gameFinished //state.gameOver || (guess === state.solution || state.row >= ROWS)
  };
  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
}

function showFinalAnswer(didWin) {
  const overlay = document.getElementById("resultAnimation");
  overlay.classList.add("showing"); // allow overlay to receive clicks
  overlay.style.zIndex = "1039"; // ensure below Bootstrap modal (modal is 1050, backdrop 1040)
  overlay.style.display = "flex";
  overlay.innerHTML = ""; // reset any old content
  
  document.getElementById("finalWord").innerText = todayWordObj.solution.toUpperCase();

  if (localStorage.getItem("lang") == "en") {
    document.getElementById("finalMeaning").innerText = texts[localStorage.getItem("lang") || "en"].meaningDesc + todayWordObj.meaning_en;
  }
  else if (localStorage.getItem("lang") == "so") {
    document.getElementById("finalMeaning").innerText = texts[localStorage.getItem("lang") || "en"].meaningDesc + todayWordObj.meaning_so;
  }

  if (didWin) {
    // Smiling nodding
    overlay.innerHTML = `<div class="happy-face">😊👍</div>`;
    // const emojiEl = overlay.querySelector(".happy-face");
    // emojiEl.style.fontSize = "5rem";
    // emojiEl.style.animation = "nod 1s ease-in-out 2";

    // 🎉 Confetti burst
    const duration = 2000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 8,       // more particles per burst
        spread: 120,            // wider spread
        startVelocity: 50,      // faster
        scalar: 1.2,            // bigger pieces
        ticks: 200,
        origin: { x: Math.random(), y: Math.random() * 0.6 } // random across top-half
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  } else {
    // 😢 Sad face with rain
    overlay.innerHTML = `
      <div class="sad-face">😢</div>
      <div class="rain"></div>
    `;

    // Create raindrops
    const rainContainer = overlay.querySelector(".rain");
    for (let i = 0; i < 30; i++) {
      const drop = document.createElement("div");
      drop.classList.add("drop");
      drop.style.left = Math.random() * 100 + "vw";
      drop.style.animationDuration = (0.5 + Math.random() * 1.5) + "s";
      drop.style.animationDelay = Math.random() * 1 + "s";
      rainContainer.appendChild(drop);
    }
  }

  // Delay modal to let animation show
  setTimeout(() => {
    console.log("Hiding overlay now");
    overlay.style.display = "none";
    overlay.classList.remove("showing"); // now clicks pass through to footer
    overlay.innerHTML = "";
    const modalEl = document.getElementById("answerModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }, 1800); // ≈ 1.8s delay
}

function endGame() {
  state.gameOver = true;

  // ✅ Re-read score
  allTimeScore = parseFloat(localStorage.getItem(SCORE_KEY)) || 0;
  paintScore();
  
  // Save today’s game state
  const gameState = {
    grid: state.grid,
    feedbacks: state.feedbacks,
    row: state.row,
    col: state.col,
    statuses: state.statuses,
    solution: state.solution,
    lastPlayedDay: todayKey(),
    done: true   // ✅ mark finished
  };

  localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));

  // Disable keyboard buttons
  for (const btn of kbEl.querySelectorAll(".key")) {
    btn.disabled = true;
  }
  window.removeEventListener("keydown", keyHandler);
}

function showHint() {
  hintUsed = "Y";
  const lang = localStorage.getItem("lang") || "en";
  if (lang === "en") {
    toast("💡 " + todayWordObj.hint_en, hintUsed);
  } else if (lang === "so") {
    toast("💡 " + todayWordObj.hint_so, hintUsed);
  }
}

document.getElementById("hintBtn").addEventListener("click", showHint);

// Call these function whenever the comeback/finalanswer modal is shown
document.getElementById("answerModal").addEventListener("show.bs.modal", () => {
  generateStreakDrops("answerModal");
});
document.getElementById("answerModal").addEventListener("hidden.bs.modal", () => {
  const modalEl = document.getElementById("comebackModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
});
document.getElementById("comebackModal").addEventListener("show.bs.modal", () => {
  generateStreakDrops("comebackModal");
});

document.querySelectorAll("#howToPlayModal, #aboutModal, #feedbackModal, #bugModal").forEach(modal => {
  modal.addEventListener("show.bs.modal", () => {
    console.log("Modal is now visible");

    // Close any toast
    toastEl.classList.remove("show");

    // Reset pagination when "How to Play" modal opens
    if (modal.id === "howToPlayModal") {
      currentPage = 1;
      showPage(currentPage);
    }

    // Disable keyboard only if it exists and game not over
    if (kbEl.querySelectorAll(".key").length && !state.gameOver) {
      for (const btn of kbEl.querySelectorAll(".key")) {
        btn.disabled = true;
      }
      window.removeEventListener("keydown", keyHandler);
    }
  });

  modal.addEventListener("hide.bs.modal", () => {
    console.log("Modal is now closed");
    
    // Re-enable keyboard if game not over
    if (!state.gameOver) {
      for (const btn of kbEl.querySelectorAll(".key")) {
        btn.disabled = false;
      }
      window.addEventListener("keydown", keyHandler);
    }
  });
});

function getFeedback(guess, solution) {
  const result = Array(COLS).fill("absent");
  const solArr = solution.split("");
  const used = Array(COLS).fill(false);

  for (let i = 0; i < COLS; i++) {
    if (guess[i] === solArr[i]) {
      result[i] = "correct";
      used[i] = true;
    }
  }
  for (let i = 0; i < COLS; i++) {
    if (result[i] === "correct") continue;
    const idx = solArr.findIndex((ch, j) => ch === guess[i] && !used[j]);
    if (idx !== -1) {
      result[i] = "present";
      used[idx] = true;
    }
  }
  return result;
}

function paint() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = boardEl.children[r].children[c];
      const ch = state.grid[r][c];
      tile.textContent = ch.toUpperCase();
      tile.className = "tile";
      if (ch) tile.classList.add("filled");

      // 🔑 Reapply stored feedback so colors stick
      const feedback = state.feedbacks[r];
      if (feedback && feedback[c]) {
        tile.classList.add(feedback[c]);
      }
    }
  }

  for (const btn of kbEl.querySelectorAll(".key")) {
    const k = btn.dataset.key.toLowerCase();
    if (state.statuses[k]) {
      btn.className = "key " + state.statuses[k];
    }
  }
}

// ===== Animations =====
function animateReveal(row, feedback) {
  for (let c = 0; c < COLS; c++) {
    const tile = boardEl.children[row].children[c];
    setTimeout(() => {
      tile.classList.add("flip");
      setTimeout(() => {
        tile.classList.add(feedback[c]);
        tile.classList.remove("flip");
      }, 250);
    }, c * 300);
  }
}

function shakeRow(row) {
  const rowEl = boardEl.children[row];
  rowEl.classList.add("shake");
  setTimeout(() => rowEl.classList.remove("shake"), 600);
}

function bounceRow(row) {
  const rowEl = boardEl.children[row];
  for (let c = 0; c < COLS; c++) {
    const tile = rowEl.children[c];
    setTimeout(() => tile.classList.add("bounce"), c * 100);
  }
}

// Function to generate streak drops in the comeback modal
function generateStreakDrops(modalId) {
  const rainContainer = document.querySelector(`#${modalId} .streak-rain`);
  if (!rainContainer) return;

  rainContainer.innerHTML = "";
  const emojis = ["🔥","⭐","⚡"];
  for (let i = 0; i < 25; i++) {
    const drop = document.createElement("div");
    drop.classList.add("drop");
    drop.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    drop.style.left = Math.random() * 100 + "vw";
    drop.style.animationDuration = (2 + Math.random() * 2) + "s";
    drop.style.animationDelay = Math.random() * 2 + "s";
    rainContainer.appendChild(drop);
  }
}

// ===== Toast =====
function toast(msg, hint) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");

  // Longer duration for #toast, default for others
  const duration = hint === "Y" ? 4000 : 1500;

  setTimeout(() => toastEl.classList.remove("show"), duration);
}

// ===== Feedback/Report =====
async function submitFeedback(type) {
  const btn = (type === "feedback") ? document.getElementById("feedbackBtn") : document.getElementById("bugBtn");
  const textarea = (type === "feedback") ? document.getElementById("feedbackText") : document.getElementById("bugText");

  let message = textarea.value;

  if (!message.trim()) {
    return toast(texts[localStorage.getItem("lang") || "en"].writeSomething);
  }

  // save original button text
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    ${texts[localStorage.getItem("lang") || "en"].sending}
  `;

  // Choose the right widget ID
  const widgetId = (type === 'feedback') ? hcaptchaFeedbackId : hcaptchaBugId;
  if (widgetId == null) {
    console.error('hCaptcha not initialized');
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    return toast("Captcha not ready. Please wait a moment and try again.");
  }

  let token = "";
  try {
    // Get token (Promise API requires {async:true})
    let tokenObj = await hcaptcha.execute(widgetId, { async: true });
    token = tokenObj.response;
    console.log("hCaptcha token received:", token); // 👀 DEBUG
  } catch (e) {
    console.error('hCaptcha error:', e);
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    return toast("Captcha error. Please try again.");
  } finally {
    // reset invisible widget so it can be used again
    hcaptcha.reset(widgetId);
  }

  try {
    const res = await fetch("/api/admin/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, hcaptcha_token: token })
    });

    const data = await res.json();
    if (data.success) {
      toast(texts[localStorage.getItem("lang") || "en"].feedbckOrreportSubmitted);
      textarea.value = ""; // clear textarea
      bootstrap.Modal.getInstance(document.getElementById(type === "feedback" ? "feedbackModal" : "bugModal")).hide();
    } else {
      toast("Error: " + (data.error || "Could not send"));
    }
  }catch (err) {
    console.error("Submit error:", err);
    toast("Error submitting feedback.");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

function autoGrow(textarea) {
  textarea.style.height = "auto"; // reset
  textarea.style.height = Math.min(textarea.scrollHeight, window.innerHeight * 0.6) + "px";
}

// === SHARE SITE LINK === //
function shareSite() {
  // Detect current language, fallback to 'en'
  const lang = document.documentElement.getAttribute('lang') || 'en';

  // Use your existing texts object
  const { webtitle, share: shareText } = texts[lang] || texts.en;

  const shareData = {
      title: webtitle,
      text: shareText,
      url: window.location.href
  };

  if (navigator.share) {
      navigator.share(shareData).catch(err => console.log('Error sharing:', err));
  } else {
      navigator.clipboard.writeText(shareData.url).then(() => {
          alert(lang === 'so' ? 'Link ayaa la koobiyey!' : 'Link copied to clipboard!');
      }).catch(() => {
          alert((lang === 'so' ? 'Ma la koobiyey link-ga. Fadlan koobiy manual: ' : 'Could not copy link. Please copy manually: ') + shareData.url);
      });
  }
}
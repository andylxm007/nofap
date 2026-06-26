/**
 * Ember Discipline - Core Timer Module
 * EN: This file currently handles only the Ember Counter and LocalStorage streak timestamp.
 * CN: 当前文件只处理“余烬计时器”和 LocalStorage 戒断开始时间。
 */

const STORAGE_KEYS = {
  // EN: Stored as a millisecond timestamp. CN: 以毫秒时间戳形式保存。
  streakStart: "emberDiscipline.streakStartAt",
  // EN: Stored as local date string YYYY-MM-DD. CN: 保存为本地日期字符串 YYYY-MM-DD。
  checkinDate: "emberDiscipline.lastCheckinDate",
  adsensePublisherId: "emberDiscipline.adsensePublisherId",
  oracleSeenCards: "emberDiscipline.oracleSeenCards",
  oracleDailyDate: "emberDiscipline.oracleDailyDate",
  oracleDailyCard: "emberDiscipline.oracleDailyCard",
  ownerArticles: "emberDiscipline.ownerArticles",
  journalEntries: "emberDiscipline.journalEntries",
  audioState: "emberDiscipline.audioState",
};

// EN: Set this in code when you are ready to show ad containers.
// CN: 准备显示广告时，在代码里填写你的 AdSense Publisher ID。
const ADSENSE_PUBLISHER_ID = "";

// EN: Set a private PIN here if you want to enable the local owner editor.
// CN: 如果要启用本地站长编辑入口，在这里设置你的私人 PIN。
const OWNER_EDITOR_PIN = "";

const DEFAULT_OWNER_ARTICLES = [
  {
    id: "build-discipline-without-motivation",
    title: "How to Build Discipline When Motivation Disappears",
    keywords: ["dopamine detox", "self discipline", "habit change", "NoFap recovery"],
    body:
      "Most people do not fail because they lack desire. They fail because they rely on desire after the hard moment has already arrived. A better system starts before the urge: plan the next action, remove the easiest trigger, and make the healthy choice visible. Discipline becomes easier when the environment stops arguing with your goals.",
    createdAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: "bad-habits-need-structure",
    title: "Why Breaking a Bad Habit Requires Structure, Not Shame",
    keywords: ["break bad habits", "self improvement", "urge control", "daily planning"],
    body:
      "Shame creates pressure, but structure creates direction. If you want to quit a habit that keeps pulling you back, start by tracking the pattern: time, mood, trigger, and escape route. The goal is not to hate yourself into change. The goal is to build a repeatable routine that carries you when willpower is low.",
    createdAt: "2026-06-25T00:00:00.000Z",
  },
];

const ORACLE_QUOTES = [
  "The index of your potential is your self-control.",
  "You do not defeat the urge by fighting it. You defeat it by outlasting it.",
  "A clear mind is built one refused impulse at a time.",
  "Discipline is remembering what you want when the body forgets.",
  "The craving is a wave. You are the shore.",
  "Every private victory becomes visible in your future.",
  "Attention is your life force. Spend it like it matters.",
  "The strongest version of you is waiting behind one more no.",
  "Peace begins when stimulation stops being your master.",
  "You are not your impulse. You are the witness who can choose.",
];

const RANKS = [
  {
    title: "The Initiate",
    minDays: 0,
    description: "The first quiet decision. You have entered the discipline.",
  },
  {
    title: "The Ember Keeper",
    minDays: 3,
    description: "Three days of preserved fire. You can feel the impulse without obeying it.",
  },
  {
    title: "The Mind Master",
    minDays: 7,
    description: "A week of clarity. Your attention is becoming yours again.",
  },
  {
    title: "The Awakened",
    minDays: 30,
    description: "Thirty days beyond the old loop. Control has become identity.",
  },
];

const timerEls = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds"),
  startButton: document.getElementById("start-button"),
  resetButton: document.getElementById("reset-button"),
  aura: document.getElementById("ember-aura"),
  rankTitle: document.getElementById("current-rank-title"),
  rankBadges: document.querySelectorAll(".rank-badge"),
};

const releaseEls = {
  stage: document.getElementById("release-stage"),
  input: document.getElementById("release-input"),
  ink: document.getElementById("release-ink"),
  message: document.getElementById("release-message"),
  releaseButton: document.getElementById("release-button"),
  writeAgainButton: document.getElementById("write-again-button"),
};

const checkinEls = {
  button: document.getElementById("breath-button"),
  status: document.getElementById("checkin-status"),
  breathingOverlay: document.getElementById("breathing-overlay"),
  breathingBubble: document.getElementById("breathing-bubble"),
  breathingPhase: document.getElementById("breathing-phase"),
  breathingProgress: document.getElementById("breathing-progress"),
  oracleOverlay: document.getElementById("oracle-overlay"),
  modalQuote: document.getElementById("modal-oracle-quote"),
  inlineQuote: document.getElementById("inline-oracle-quote"),
  modalCopyButton: document.getElementById("modal-copy-quote"),
  inlineCopyButton: document.getElementById("inline-copy-quote"),
  closeOracleButton: document.getElementById("close-oracle"),
};

const audioEls = {
  buttons: document.querySelectorAll("[data-audio-channel]"),
  volume: document.getElementById("sanctuary-volume"),
  htmlAudio: {
    rain: document.getElementById("audio-rain"),
    bell: document.getElementById("audio-bell"),
    paper: document.getElementById("audio-paper"),
    chant: document.getElementById("audio-chant"),
  },
};

const adsenseEls = {
  slots: document.querySelectorAll(".ad-slot"),
};

const journalEls = {
  title: document.getElementById("journal-title") || document.getElementById("journal-entry-title"),
  body: document.getElementById("journal-body") || document.getElementById("journal-entry-body"),
  submit: document.getElementById("journal-submit") || document.getElementById("journal-entry-submit"),
  status: document.getElementById("journal-status"),
  entries: document.getElementById("journal-entries"),
};

const articleEls = {
  pin: document.getElementById("owner-pin"),
  title: document.getElementById("article-title"),
  keywords: document.getElementById("article-keywords"),
  body: document.getElementById("article-body"),
  save: document.getElementById("article-save"),
  status: document.getElementById("article-editor-status"),
  list: document.getElementById("articles-list"),
};

let timerIntervalId = null;
let breathingIntervalId = null;
let sanctuaryAudioContext = null;
let masterGain = null;
const activeSynths = new Map();
const generatedAudioUrls = new Map();
const runtimeAudioElements = {};
let audioRestoreBlocked = false;
let audioPersistIntervalId = null;
let oracleCards = [];
let oracleCardsReady = Promise.resolve();

function readJsonStorage(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createLocalId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * EN: Safely read a numeric timestamp from LocalStorage.
 * CN: 安全读取 LocalStorage 中保存的数字时间戳。
 */
function getStoredStartTime() {
  const rawValue = localStorage.getItem(STORAGE_KEYS.streakStart);
  const parsedValue = Number(rawValue);

  if (!rawValue || Number.isNaN(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

/**
 * EN: Save the user's streak start time.
 * CN: 保存用户的戒断/重构开始时间。
 */
function saveStartTime(timestamp) {
  localStorage.setItem(STORAGE_KEYS.streakStart, String(timestamp));
}

/**
 * EN: Convert elapsed milliseconds into display units.
 * CN: 将经过的毫秒数转换为天、小时、分钟、秒。
 */
function getElapsedParts(startTimestamp) {
  const elapsedMs = Math.max(0, Date.now() - startTimestamp);
  const totalSeconds = Math.floor(elapsedMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

/**
 * EN: Keep timer digits stable with two-character padding.
 * CN: 保持计时器数字宽度稳定，低于 10 时补零。
 */
function formatUnit(value) {
  return String(value).padStart(2, "0");
}

/**
 * EN: Update the visual ember strength according to streak days.
 * CN: 根据坚持天数更新余烬光晕强度。
 */
function updateEmberAura(days) {
  if (!timerEls.aura) return;

  const clarity = Math.min(1, days / 30);
  const glowScale = 0.72 + clarity * 0.45;
  const glowOpacity = 0.35 + clarity * 0.55;

  timerEls.aura.style.setProperty("--ember-scale", glowScale.toFixed(2));
  timerEls.aura.style.setProperty("--ember-opacity", glowOpacity.toFixed(2));
}

/**
 * EN: Find the highest unlocked rank for the current streak.
 * CN: 根据当前坚持天数找出已解锁的最高等级。
 */
function getCurrentRank(days) {
  return RANKS.reduce((currentRank, rank) => {
    return days >= rank.minDays ? rank : currentRank;
  }, RANKS[0]);
}

/**
 * EN: Update badge lock/active states and the current title.
 * CN: 更新徽章锁定/点亮状态，并同步顶部当前头衔。
 */
function updateRankSystem(days) {
  const currentRank = getCurrentRank(days);

  if (timerEls.rankTitle) {
    timerEls.rankTitle.textContent = currentRank.title;
  }

  timerEls.rankBadges.forEach((badge, index) => {
    const rank = RANKS[index];
    if (!rank) return;

    const isUnlocked = days >= rank.minDays;
    const isCurrent = rank.title === currentRank.title;

    badge.classList.toggle("is-locked", !isUnlocked);
    badge.classList.toggle("is-achieved", isUnlocked && !isCurrent);
    badge.classList.toggle("is-active", isCurrent);
    badge.title = isUnlocked ? `${rank.title}: ${rank.description}` : `Locked until day ${rank.minDays}.`;
    badge.setAttribute("aria-pressed", String(isCurrent));
  });

  document.body.dataset.rank = currentRank.title.toLowerCase().replaceAll(" ", "-");
}

/**
 * EN: Render timer digits or reset them to zero.
 * CN: 渲染计时器数字；没有开始时间时显示 00。
 */
function renderTimer() {
  const startTimestamp = getStoredStartTime();

  if (!startTimestamp) {
    timerEls.days.textContent = "00";
    timerEls.hours.textContent = "00";
    timerEls.minutes.textContent = "00";
    timerEls.seconds.textContent = "00";
    timerEls.startButton.hidden = false;
    updateEmberAura(0);
    updateRankSystem(0);
    return;
  }

  const elapsed = getElapsedParts(startTimestamp);

  timerEls.days.textContent = formatUnit(elapsed.days);
  timerEls.hours.textContent = formatUnit(elapsed.hours);
  timerEls.minutes.textContent = formatUnit(elapsed.minutes);
  timerEls.seconds.textContent = formatUnit(elapsed.seconds);
  timerEls.startButton.hidden = true;
  updateEmberAura(elapsed.days);
  updateRankSystem(elapsed.days);
}

/**
 * EN: Accept a local date-time string accurate to seconds.
 * CN: 接受精确到秒的本地时间字符串。
 */
function parseManualStartTime(value) {
  const normalized = value.trim().replace(" ", "T");
  const timestamp = new Date(normalized).getTime();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return timestamp;
}

/**
 * EN: Create a readable default value for the prompt.
 * CN: 为输入弹窗生成易读的默认本地时间。
 */
function getCurrentLocalSecondString() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * EN: Let the user set a custom start time, defaulting to this second.
 * CN: 允许用户设置自定义开始时间，默认值为当前秒。
 */
function handleSetStartTime() {
  const defaultValue = getCurrentLocalSecondString();
  const answer = window.prompt(
    "Set your start time (local time, accurate to seconds):\nYYYY-MM-DD HH:mm:ss",
    defaultValue
  );

  if (answer === null) return;

  const timestamp = parseManualStartTime(answer);

  if (!timestamp) {
    window.alert("Invalid time format. Please use YYYY-MM-DD HH:mm:ss.");
    return;
  }

  if (timestamp > Date.now()) {
    window.alert("Start time cannot be in the future.");
    return;
  }

  saveStartTime(timestamp);
  renderTimer();
}

/**
 * EN: Reset represents relapse; confirm before overwriting the streak.
 * CN: 重置代表破戒，因此覆盖旧时间前必须二次确认。
 */
function handleResetStreak() {
  const hasStartTime = Boolean(getStoredStartTime());
  const message = hasStartTime
    ? "Are you sure? This will erase all achievements and restart from zero."
    : "Start a new streak from this exact second?";

  if (!window.confirm(message)) return;

  saveStartTime(Date.now());
  renderTimer();
}

function startTimerLoop() {
  renderTimer();
  window.clearInterval(timerIntervalId);
  timerIntervalId = window.setInterval(renderTimer, 1000);
}

/**
 * EN: Future Google AdSense Vignette hook. Add your ad trigger listener here later.
 * CN: 未来 Google AdSense 全屏插页广告钩子。后续可在这里监听并触发广告逻辑。
 */
function dispatchVignetteOpportunity(source) {
  window.dispatchEvent(
    new CustomEvent("adsense:vignette-opportunity", {
      detail: {
        source,
        occurredAt: new Date().toISOString(),
      },
    })
  );
}

/**
 * EN: Release typed urge text as smoke/ash, then show grounding copy.
 * CN: 将输入的欲望/情绪文字以烟灰感动画释放，然后显示温柔提示。
 */
function handleInkRelease() {
  const rawText = releaseEls.input.value.trim();

  if (!rawText) {
    releaseEls.input.focus();
    releaseEls.stage.classList.add("needs-attention");
    window.setTimeout(() => releaseEls.stage.classList.remove("needs-attention"), 380);
    return;
  }

  releaseEls.ink.textContent = rawText;
  releaseEls.message.hidden = true;
  releaseEls.input.disabled = true;
  releaseEls.releaseButton.disabled = true;
  releaseEls.stage.classList.remove("is-complete");
  releaseEls.stage.classList.add("is-releasing");

  window.setTimeout(() => {
    releaseEls.stage.classList.remove("is-releasing");
    releaseEls.stage.classList.add("is-complete");
    releaseEls.message.hidden = false;
    releaseEls.writeAgainButton.hidden = false;
    releaseEls.releaseButton.hidden = true;
    dispatchVignetteOpportunity("ink-release-complete");
  }, 2100);
}

/**
 * EN: Reset only the writing board state, not the streak timer.
 * CN: 只重置写字板状态，不影响余烬计时器。
 */
function handleWriteAgain() {
  releaseEls.input.value = "";
  releaseEls.input.disabled = false;
  releaseEls.ink.textContent = "";
  releaseEls.message.hidden = true;
  releaseEls.stage.classList.remove("is-releasing", "is-complete");
  releaseEls.releaseButton.hidden = false;
  releaseEls.releaseButton.disabled = false;
  releaseEls.writeAgainButton.hidden = true;
  releaseEls.input.focus();
  dispatchVignetteOpportunity("ink-release-closed");
}

/**
 * EN: Local calendar date string prevents timezone UTC drift.
 * CN: 使用本地自然日，避免 UTC 日期导致跨天误差。
 */
function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * EN: Pick a deterministic daily quote from the date.
 * CN: 根据日期稳定选择当天格言，刷新后不乱跳。
 */
function getDailyOracleQuote(dateKey = getLocalDateKey()) {
  const numberSeed = Number(dateKey.replaceAll("-", ""));
  return ORACLE_QUOTES[numberSeed % ORACLE_QUOTES.length];
}

function normalizeCardPath(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("cards/")) {
    return path;
  }
  return `cards/${path}`;
}

function imageExists(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(src);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function probeSequentialCards() {
  const extensions = ["jpg", "png", "webp", "jpeg"];
  const candidates = [];

  for (let index = 1; index <= 120; index += 1) {
    const paddedIndex = String(index).padStart(3, "0");
    extensions.forEach((extension) => {
      candidates.push(`cards/card_${paddedIndex}.${extension}`);
      candidates.push(`cards/card-${index}.${extension}`);
    });
  }

  const results = await Promise.all(candidates.map(imageExists));
  return results.filter(Boolean);
}

async function loadOracleCards() {
  let manifestCards = [];

  try {
    const response = await fetch("cards/manifest.json", { cache: "no-store" });
    if (response.ok) {
      const manifest = await response.json();
      const rawCards = Array.isArray(manifest) ? manifest : manifest.cards;
      manifestCards = Array.isArray(rawCards) ? rawCards.map(normalizeCardPath).filter(Boolean) : [];
    }
  } catch (error) {
    manifestCards = [];
  }

  const probedCards = manifestCards.length > 0 ? [] : await probeSequentialCards();
  oracleCards = Array.from(new Set([...manifestCards, ...probedCards]));
  renderStoredDailyOracleCard();
}

function getSeenOracleCards() {
  return readJsonStorage(STORAGE_KEYS.oracleSeenCards, []).filter((card) => oracleCards.includes(card));
}

function selectNonRepeatingOracleCard() {
  if (oracleCards.length === 0) return "";

  let seenCards = getSeenOracleCards();

  if (seenCards.length >= oracleCards.length) {
    seenCards = [];
  }

  const unseenCards = oracleCards.filter((card) => !seenCards.includes(card));
  const selectedCard = unseenCards[Math.floor(Math.random() * unseenCards.length)];

  writeJsonStorage(STORAGE_KEYS.oracleSeenCards, [...seenCards, selectedCard]);
  localStorage.setItem(STORAGE_KEYS.oracleDailyDate, getLocalDateKey());
  localStorage.setItem(STORAGE_KEYS.oracleDailyCard, selectedCard);

  return selectedCard;
}

function getTodayOracleCard() {
  const today = getLocalDateKey();
  const storedDate = localStorage.getItem(STORAGE_KEYS.oracleDailyDate);
  const storedCard = localStorage.getItem(STORAGE_KEYS.oracleDailyCard);

  if (storedDate === today && storedCard && oracleCards.includes(storedCard)) {
    return storedCard;
  }

  return selectNonRepeatingOracleCard();
}

function renderOracleCardImage(cardPath) {
  const hasCard = Boolean(cardPath);
  const textTargets = [
    checkinEls.inlineQuote,
    checkinEls.inlineCopyButton,
    checkinEls.modalQuote,
    checkinEls.modalCopyButton,
  ];
  const imageTargets = [
    {
      wrap: document.getElementById("inline-oracle-image-wrap"),
      image: document.getElementById("inline-oracle-image"),
    },
    {
      wrap: document.getElementById("modal-oracle-image-wrap"),
      image: document.getElementById("modal-oracle-image"),
    },
  ];

  imageTargets.forEach(({ wrap, image }) => {
    if (!wrap || !image) return;
    wrap.hidden = !hasCard;
    if (hasCard) {
      image.src = cardPath;
    } else {
      image.removeAttribute("src");
    }
  });

  textTargets.forEach((element) => {
    if (element) {
      element.hidden = hasCard;
    }
  });
}

function renderStoredDailyOracleCard() {
  const storedCard = localStorage.getItem(STORAGE_KEYS.oracleDailyCard);
  const storedDate = localStorage.getItem(STORAGE_KEYS.oracleDailyDate);
  const shouldShow = storedDate === getLocalDateKey() && storedCard && oracleCards.includes(storedCard);
  renderOracleCardImage(shouldShow ? storedCard : "");
}

function hasCheckedInToday() {
  return localStorage.getItem(STORAGE_KEYS.checkinDate) === getLocalDateKey();
}

function updateCheckinState() {
  const checked = hasCheckedInToday();
  const quote = getDailyOracleQuote();

  checkinEls.inlineQuote.textContent = `"${quote}"`;
  renderStoredDailyOracleCard();
  checkinEls.button.disabled = false;
  checkinEls.button.textContent = checked ? "View Today's Oracle" : "Begin 3 breaths";
  checkinEls.status.textContent = checked
    ? "Today's ritual is complete. Return tomorrow for a new oracle."
    : "A short pause before impulse becomes action.";
}

async function showOracleCard() {
  await oracleCardsReady;
  const quote = getDailyOracleQuote();
  const card = getTodayOracleCard();

  checkinEls.modalQuote.textContent = `"${quote}"`;
  checkinEls.inlineQuote.textContent = `"${quote}"`;
  renderOracleCardImage(card);
  checkinEls.oracleOverlay.hidden = false;
  dispatchVignetteOpportunity("daily-checkin-oracle-shown");
}

function closeOracleCard() {
  checkinEls.oracleOverlay.hidden = true;
  dispatchVignetteOpportunity("daily-checkin-oracle-closed");
}

/**
 * EN: Run three guided breathing cycles over about 15 seconds.
 * CN: 执行约 15 秒的三轮呼吸引导。
 */
function startBreathingCheckin() {
  if (hasCheckedInToday()) {
    showOracleCard();
    return;
  }

  const startedAt = Date.now();
  const totalMs = 15000;
  const cycleMs = 5000;

  checkinEls.button.disabled = true;
  checkinEls.breathingOverlay.hidden = false;
  window.clearInterval(breathingIntervalId);

  breathingIntervalId = window.setInterval(() => {
    const elapsed = Date.now() - startedAt;
    const clampedElapsed = Math.min(elapsed, totalMs);
    const cycleIndex = Math.min(2, Math.floor(clampedElapsed / cycleMs));
    const cycleElapsed = clampedElapsed % cycleMs;

    let phase = "Exhale";
    if (cycleElapsed < 2000) phase = "Inhale";
    if (cycleElapsed >= 2000 && cycleElapsed < 3000) phase = "Hold";

    checkinEls.breathingPhase.textContent = phase;
    checkinEls.breathingProgress.textContent = `Cycle ${cycleIndex + 1} of 3`;
    checkinEls.breathingBubble.dataset.phase = phase.toLowerCase();

    if (elapsed >= totalMs) {
      window.clearInterval(breathingIntervalId);
      localStorage.setItem(STORAGE_KEYS.checkinDate, getLocalDateKey());
      checkinEls.breathingOverlay.hidden = true;
      updateCheckinState();
      showOracleCard();
    }
  }, 100);
}

async function copyOracleQuote() {
  const quote = getDailyOracleQuote();

  try {
    await navigator.clipboard.writeText(quote);
  } catch (error) {
    const fallback = document.createElement("textarea");
    fallback.value = quote;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }

  checkinEls.modalCopyButton.textContent = "Copied";
  checkinEls.inlineCopyButton.textContent = "Copied";
  window.setTimeout(() => {
    checkinEls.modalCopyButton.textContent = "Copy Quote";
    checkinEls.inlineCopyButton.textContent = "Copy Quote";
  }, 1400);
}

/**
 * EN: Create the AudioContext only after a user click, as browsers require.
 * CN: 浏览器要求用户点击后才能创建/播放音频，因此这里按需初始化。
 */
function getSanctuaryAudioContext() {
  const AudioConstructor = window.AudioContext || window.webkitAudioContext;

  if (!AudioConstructor) {
    return null;
  }

  if (!sanctuaryAudioContext) {
    sanctuaryAudioContext = new AudioConstructor();
    masterGain = sanctuaryAudioContext.createGain();
    masterGain.gain.value = getAudioVolumeValue() / 100;
    masterGain.connect(sanctuaryAudioContext.destination);
  }

  return sanctuaryAudioContext;
}

function setMasterVolume() {
  if (!masterGain || !sanctuaryAudioContext) return;

  const volume = getAudioVolumeValue() / 100;
  masterGain.gain.setTargetAtTime(volume, sanctuaryAudioContext.currentTime, 0.08);
}

function getStoredAudioState() {
  return readJsonStorage(STORAGE_KEYS.audioState, {
    activeChannels: [],
    volume: 45,
    sources: {},
    times: {},
  });
}

function getAudioVolumeValue() {
  if (audioEls.volume) {
    return Number(audioEls.volume.value);
  }

  const storedState = getStoredAudioState();
  return Number.isFinite(storedState.volume) ? storedState.volume : 45;
}

function getChannelSource(channel) {
  const htmlAudio = audioEls.htmlAudio[channel];
  const domSource = htmlAudio ? htmlAudio.getAttribute("src") : "";
  const storedState = getStoredAudioState();
  return domSource || storedState.sources?.[channel] || "";
}

function getRuntimeAudioElement(channel, source = "") {
  const existingAudio = audioEls.htmlAudio[channel] || runtimeAudioElements[channel];

  if (existingAudio) {
    if (source && !source.startsWith("blob:") && !existingAudio.getAttribute("src")) {
      existingAudio.src = source;
      existingAudio.dataset.generatedAudio = "false";
    }
    return existingAudio;
  }

  const audio = new Audio(source && !source.startsWith("blob:") ? source : "");
  audio.loop = true;
  audio.preload = "none";
  audio.dataset.generatedAudio = source ? "false" : "true";
  runtimeAudioElements[channel] = audio;
  return audio;
}

function prepareAudioElementForChannel(channel, source = "") {
  const audio = getRuntimeAudioElement(channel, source);

  if (!audio) return null;

  if (source && !source.startsWith("blob:")) {
    audio.src = source;
    audio.dataset.generatedAudio = "false";
  } else if (!audio.getAttribute("src") || audio.getAttribute("src").startsWith("blob:")) {
    audio.src = createGeneratedWavUrl(channel);
    audio.dataset.generatedAudio = "true";
  }

  audio.loop = true;
  audio.preload = "none";
  return audio;
}

function getSafeAudioSource(audio) {
  if (!audio || audio.dataset.generatedAudio === "true") return "";

  const source = audio.getAttribute("src") || "";
  return source.startsWith("blob:") ? "" : source;
}

function seekAudioElement(audio, seconds) {
  if (!audio || !Number.isFinite(seconds) || seconds <= 0) return;

  const applySeek = () => {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const nextTime = duration ? seconds % duration : seconds;

    try {
      audio.currentTime = nextTime;
    } catch (error) {
      // EN: Some remote streams do not support exact seeking.
      // CN: 部分远程音频流不支持精确定位播放进度。
    }
  };

  if (audio.readyState >= 1) {
    applySeek();
  } else {
    audio.addEventListener("loadedmetadata", applySeek, { once: true });
  }
}

function startAudioStatePersistence() {
  if (audioPersistIntervalId) return;
  audioPersistIntervalId = window.setInterval(persistAudioState, 1000);
}

function stopAudioStatePersistence() {
  if (activeSynths.size > 0 || audioRestoreBlocked) return;
  window.clearInterval(audioPersistIntervalId);
  audioPersistIntervalId = null;
}

function captureAudioProgress(channel, audio, times, storedState) {
  if (!audio || !Number.isFinite(audio.currentTime)) return;

  if (audioRestoreBlocked && audio.currentTime === 0 && Number.isFinite(storedState.times?.[channel])) {
    times[channel] = storedState.times[channel];
    return;
  }

  times[channel] = audio.currentTime;
}

function persistAudioState() {
  const storedState = getStoredAudioState();
  const sources = { ...storedState.sources };
  const times = { ...storedState.times };

  Object.entries(audioEls.htmlAudio).forEach(([channel, audio]) => {
    if (!audio) return;
    const source = getSafeAudioSource(audio);
    if (source) {
      sources[channel] = source;
    } else {
      delete sources[channel];
    }
    captureAudioProgress(channel, audio, times, storedState);
  });

  Object.entries(runtimeAudioElements).forEach(([channel, audio]) => {
    if (!audio) return;
    const source = getSafeAudioSource(audio);
    if (source) {
      sources[channel] = source;
    } else {
      delete sources[channel];
    }
    captureAudioProgress(channel, audio, times, storedState);
  });

  writeJsonStorage(STORAGE_KEYS.audioState, {
    activeChannels: audioRestoreBlocked && activeSynths.size === 0 ? storedState.activeChannels : Array.from(activeSynths.keys()),
    volume: getAudioVolumeValue(),
    sources,
    times,
    updatedAt: Date.now(),
  });
}

function writeString(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

/**
 * EN: HTMLAudioElement fallback for browsers without Web Audio support.
 * CN: 当浏览器不支持 Web Audio 时，生成短 WAV 循环作为 <audio> fallback。
 */
function createGeneratedWavUrl(channel) {
  if (generatedAudioUrls.has(channel)) {
    return generatedAudioUrls.get(channel);
  }

  const sampleRate = 22050;
  const durationSeconds = channel === "bell" || channel === "chant" ? 18 : 14;
  const totalSamples = sampleRate * durationSeconds;
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + totalSamples * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + totalSamples * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, totalSamples * bytesPerSample, true);

  let lastNoise = 0;
  for (let sample = 0; sample < totalSamples; sample += 1) {
    const time = sample / sampleRate;
    let value = 0;

    if (channel === "rain") {
      lastNoise = lastNoise * 0.84 + (Math.random() * 2 - 1) * 0.16;
      value = lastNoise * 0.38;
    } else if (channel === "bell") {
      const decay = Math.exp(-time * 1.45);
      value = (Math.sin(2 * Math.PI * 218 * time) + 0.42 * Math.sin(2 * Math.PI * 436 * time)) * decay * 0.36;
    } else if (channel === "chant") {
      const breath = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.32 * time);
      value =
        (Math.sin(2 * Math.PI * 110 * time) +
          0.35 * Math.sin(2 * Math.PI * 165 * time) +
          0.18 * Math.sin(2 * Math.PI * 220 * time)) *
        breath *
        0.22;
    } else {
      const pulse = Math.sin(2 * Math.PI * 4.5 * time) > 0.36 ? 1 : 0;
      value = (Math.random() * 2 - 1) * pulse * 0.24;
    }

    const clamped = Math.max(-1, Math.min(1, value));
    view.setInt16(44 + sample * bytesPerSample, clamped * 32767, true);
  }

  const blob = new Blob([view], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  generatedAudioUrls.set(channel, url);
  return url;
}

function createNoiseBuffer(context, durationSeconds = 2) {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, sampleRate * durationSeconds, sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let index = 0; index < channelData.length; index += 1) {
    channelData[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

/**
 * EN: Synthesized fallback rain loop; replace with <audio> src later if desired.
 * CN: 本地合成雨声 fallback；之后可替换成真实 <audio> 链接。
 */
function startRainSynth(context) {
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = createNoiseBuffer(context, 3);
  source.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 950;
  gain.gain.value = 0.2;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start();

  return () => {
    source.stop();
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

function startBellSynth(context) {
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.connect(masterGain);

  let timeoutId = null;
  const oscillators = [];

  function strikeBell() {
    const now = context.currentTime;
    const base = context.createOscillator();
    const overtone = context.createOscillator();

    base.type = "sine";
    overtone.type = "triangle";
    base.frequency.setValueAtTime(218, now);
    overtone.frequency.setValueAtTime(436, now);

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

    base.connect(gain);
    overtone.connect(gain);
    base.start(now);
    overtone.start(now);
    base.stop(now + 3.4);
    overtone.stop(now + 3.4);
    oscillators.push(base, overtone);

    timeoutId = window.setTimeout(strikeBell, 5200);
  }

  strikeBell();

  return () => {
    window.clearTimeout(timeoutId);
    oscillators.forEach((oscillator) => oscillator.disconnect());
    gain.disconnect();
  };
}

function startPaperSynth(context) {
  const gain = context.createGain();
  gain.gain.value = 0.12;
  gain.connect(masterGain);

  let intervalId = null;
  const nodes = [];

  function scratch() {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const now = context.currentTime;

    source.buffer = createNoiseBuffer(context, 0.22);
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1800 + Math.random() * 1200, now);
    filter.Q.value = 2.8;

    source.connect(filter);
    filter.connect(gain);
    source.start(now);
    source.stop(now + 0.2);
    nodes.push(source, filter);
  }

  intervalId = window.setInterval(scratch, 420);
  scratch();

  return () => {
    window.clearInterval(intervalId);
    nodes.forEach((node) => node.disconnect());
    gain.disconnect();
  };
}

function startChantSynth(context) {
  const gain = context.createGain();
  const low = context.createOscillator();
  const mid = context.createOscillator();
  const filter = context.createBiquadFilter();
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();

  low.type = "sine";
  mid.type = "sine";
  lfo.type = "sine";
  low.frequency.value = 110;
  mid.frequency.value = 165;
  lfo.frequency.value = 0.32;
  filter.type = "lowpass";
  filter.frequency.value = 620;
  gain.gain.value = 0.11;
  lfoGain.gain.value = 0.035;

  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  low.connect(filter);
  mid.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);

  low.start();
  mid.start();
  lfo.start();

  return () => {
    low.stop();
    mid.stop();
    lfo.stop();
    low.disconnect();
    mid.disconnect();
    lfo.disconnect();
    lfoGain.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
}

function startSynthChannel(channel, context) {
  if (channel === "rain") return startRainSynth(context);
  if (channel === "bell") return startBellSynth(context);
  if (channel === "chant") return startChantSynth(context);
  return startPaperSynth(context);
}

/**
 * EN: Prefer real HTML audio if a src is provided; otherwise use local Web Audio fallback.
 * CN: 如果 <audio> 有真实 src 就播放真实音频，否则使用本地合成音效。
 */
async function toggleAudioChannel(channel, resumeTime = null) {
  if (activeSynths.has(channel)) {
    activeSynths.get(channel)();
    activeSynths.delete(channel);
    updateAudioButtonState(channel, false);
    persistAudioState();
    stopAudioStatePersistence();
    return;
  }

  const htmlAudio = prepareAudioElementForChannel(channel, getChannelSource(channel));

  if (htmlAudio && htmlAudio.getAttribute("src")) {
    htmlAudio.volume = getAudioVolumeValue() / 100;
    activeSynths.set(channel, () => {
      htmlAudio.pause();
      htmlAudio.currentTime = 0;
    });
    seekAudioElement(htmlAudio, resumeTime);
    updateAudioButtonState(channel, true);
    persistAudioState();
    startAudioStatePersistence();
    await htmlAudio.play().catch(() => {
      // EN: Some automated or restricted browsers block playback despite a click.
      // CN: 某些自动化或受限浏览器即使点击后也会阻止播放。
    });
  } else {
    const context = getSanctuaryAudioContext();

    if (context.state === "suspended") {
      await context.resume();
    }

    activeSynths.set(channel, startSynthChannel(channel, context));
    updateAudioButtonState(channel, true);
    persistAudioState();
    startAudioStatePersistence();
  }
}

function updateAudioButtonState(channel, isActive) {
  audioEls.buttons.forEach((button) => {
    if (button.dataset.audioChannel !== channel) return;
    button.classList.toggle("is-playing", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function updateHtmlAudioVolume() {
  const volume = getAudioVolumeValue() / 100;
  Object.values(audioEls.htmlAudio).forEach((audio) => {
    if (audio) audio.volume = volume;
  });
  Object.values(runtimeAudioElements).forEach((audio) => {
    if (audio) audio.volume = volume;
  });
  setMasterVolume();
  persistAudioState();
}

function showAudioResumePrompt() {
  if (document.getElementById("persistent-audio-resume")) return;

  const button = document.createElement("button");
  button.id = "persistent-audio-resume";
  button.className = "persistent-audio-resume";
  button.type = "button";
  button.textContent = "Resume Audio";
  button.addEventListener("click", async () => {
    await restorePersistentAudio(true);
  });
  document.body.appendChild(button);
}

function hideAudioResumePrompt() {
  document.getElementById("persistent-audio-resume")?.remove();
}

async function restorePersistentAudio(forcePrompt = false) {
  const storedState = getStoredAudioState();
  const channels = Array.isArray(storedState.activeChannels) ? storedState.activeChannels : [];

  if (audioEls.volume && Number.isFinite(storedState.volume)) {
    audioEls.volume.value = String(storedState.volume);
  }

  if (channels.length === 0) return;

  let blockedCount = 0;
  audioRestoreBlocked = false;

  for (const channel of channels) {
    if (activeSynths.has(channel)) continue;

    const savedTime = Number.isFinite(storedState.times?.[channel]) ? storedState.times[channel] : null;
    const elapsedSinceSave =
      savedTime !== null && Number.isFinite(storedState.updatedAt) ? Math.max(0, (Date.now() - storedState.updatedAt) / 1000) : 0;
    const resumeTime = savedTime !== null ? savedTime + elapsedSinceSave : null;

    try {
      await toggleAudioChannel(channel, resumeTime);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
    } catch (error) {
      blockedCount += 1;
    }

    const restoredAudio = runtimeAudioElements[channel] || audioEls.htmlAudio[channel];
    if (restoredAudio && restoredAudio.paused) {
      if (activeSynths.has(channel)) {
        activeSynths.delete(channel);
        updateAudioButtonState(channel, false);
      }
      blockedCount += 1;
    }
  }

  if (blockedCount > 0) {
    audioRestoreBlocked = true;
    showAudioResumePrompt();
  } else {
    audioRestoreBlocked = false;
    hideAudioResumePrompt();
    persistAudioState();
  }
}

function getAdsensePublisherId() {
  return ADSENSE_PUBLISHER_ID.trim();
}

function updateAdsenseVisibility() {
  const publisherId = getAdsensePublisherId();
  const hasPublisherId = publisherId.trim().length > 0;

  adsenseEls.slots.forEach((slot) => {
    slot.classList.toggle("is-hidden", !hasPublisherId);
  });
}

function getOwnerArticles() {
  const localArticles = readJsonStorage(STORAGE_KEYS.ownerArticles, []);
  return [...localArticles, ...DEFAULT_OWNER_ARTICLES];
}

function renderOwnerArticles() {
  articleEls.list.innerHTML = "";

  getOwnerArticles().forEach((article) => {
    const item = document.createElement("article");
    item.className = "seo-article";
    item.setAttribute("itemscope", "");
    item.setAttribute("itemtype", "https://schema.org/Article");
    item.innerHTML = `
      <h3 itemprop="headline">${escapeHtml(article.title)}</h3>
      <p class="forum-post-meta">
        <time itemprop="datePublished" datetime="${article.createdAt}">${formatJournalTime(article.createdAt)}</time>
      </p>
      <p itemprop="articleBody">${escapeHtml(article.body)}</p>
      <p class="article-keywords">Keywords: ${article.keywords.map(escapeHtml).join(", ")}</p>
    `;
    articleEls.list.appendChild(item);
  });
}

function handleSaveOwnerArticle() {
  if (!OWNER_EDITOR_PIN) {
    articleEls.status.textContent = "Owner editor is disabled. Set OWNER_EDITOR_PIN in main.js first.";
    return;
  }

  if (articleEls.pin.value !== OWNER_EDITOR_PIN) {
    articleEls.status.textContent = "Incorrect owner PIN.";
    return;
  }

  const title = articleEls.title.value.trim();
  const body = articleEls.body.value.trim();
  const keywords = articleEls.keywords.value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  if (!title || !body) {
    articleEls.status.textContent = "Article title and body are required.";
    return;
  }

  const localArticles = readJsonStorage(STORAGE_KEYS.ownerArticles, []);
  localArticles.unshift({
    id: createLocalId("article"),
    title,
    body,
    keywords,
    createdAt: new Date().toISOString(),
  });

  writeJsonStorage(STORAGE_KEYS.ownerArticles, localArticles);
  articleEls.title.value = "";
  articleEls.body.value = "";
  articleEls.keywords.value = "";
  articleEls.status.textContent = "Article saved locally. Publish it in site code for SEO indexing.";
  renderOwnerArticles();
}

async function hashForumPassword(password) {
  if (window.crypto && window.crypto.subtle) {
    const encoded = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  return btoa(unescape(encodeURIComponent(password)));
}

function getForumUsers() {
  return {};
}

function getForumSession() {
  return "";
}

function getForumPosts() {
  return [];
}

function saveForumPosts() {}

function updateForumAuthState() {
  const username = getForumSession();
  const isLoggedIn = Boolean(username);

  forumEls.authStatus.textContent = isLoggedIn
    ? `Logged in as ${username}.`
    : "Browsing as guest. Register or login to post and reply.";
  forumEls.postSubmit.disabled = !isLoggedIn;
  forumEls.logoutButton.disabled = !isLoggedIn;
}

async function handleForumRegisterOrLogin() {
  const username = forumEls.username.value.trim();
  const password = forumEls.password.value;

  if (!username || !password) {
    forumEls.authStatus.textContent = "Enter a username and password first.";
    return;
  }

  const users = getForumUsers();
  const passwordHash = await hashForumPassword(password);

  if (users[username] && users[username].passwordHash !== passwordHash) {
    forumEls.authStatus.textContent = "Wrong password for this local account.";
    return;
  }

  if (!users[username]) {
    users[username] = {
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    writeJsonStorage(STORAGE_KEYS.forumUsers, users);
  }

  localStorage.setItem(STORAGE_KEYS.forumSession, username);
  forumEls.password.value = "";
  updateForumAuthState();
  renderForumPosts();
}

function handleForumLogout() {
  localStorage.removeItem(STORAGE_KEYS.forumSession);
  updateForumAuthState();
  renderForumPosts();
}

function requireForumLogin() {
  const username = getForumSession();
  if (username) return username;

  forumEls.authStatus.textContent = "Register or login before posting or replying.";
  forumEls.username.focus();
  return "";
}

function handleCreateForumPost() {
  const username = requireForumLogin();
  if (!username) return;

  const title = forumEls.postTitle.value.trim();
  const body = forumEls.postBody.value.trim();

  if (!title || !body) {
    forumEls.authStatus.textContent = "Post title and message are required.";
    return;
  }

  const posts = getForumPosts();
  posts.unshift({
    id: createLocalId("post"),
    title,
    body,
    author: username,
    createdAt: new Date().toISOString(),
    replies: [],
  });

  saveForumPosts(posts);
  forumEls.postTitle.value = "";
  forumEls.postBody.value = "";
  renderForumPosts();
}

function formatForumTime(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createForumPostElement(post) {
  const article = document.createElement("article");
  article.className = "forum-post";

  const repliesMarkup = post.replies
    .map(
      (reply) => `
        <div class="forum-reply">
          <p class="forum-reply-meta">${reply.author} · ${formatForumTime(reply.createdAt)}</p>
          <p class="forum-reply-body">${escapeHtml(reply.body)}</p>
        </div>
      `
    )
    .join("");

  article.innerHTML = `
    <h3>${escapeHtml(post.title)}</h3>
    <p class="forum-post-meta">${escapeHtml(post.author)} · ${formatForumTime(post.createdAt)}</p>
    <p class="forum-post-body">${escapeHtml(post.body)}</p>
    <div class="forum-replies">${repliesMarkup || '<p class="soft-copy">No replies yet.</p>'}</div>
    <div class="forum-reply-form">
      <textarea data-reply-body="${post.id}" placeholder="Write a reply..."></textarea>
      <button class="ghost-action" type="button" data-reply-submit="${post.id}">Reply</button>
    </div>
  `;

  return article;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character];
  });
}

function renderForumPosts() {
  const posts = getForumPosts();
  forumEls.posts.innerHTML = "";

  if (posts.length === 0) {
    const empty = document.createElement("article");
    empty.className = "forum-post";
    empty.innerHTML = `
      <h3>Welcome to the board</h3>
      <p class="forum-post-body">No posts yet. Register locally and start the first conversation.</p>
    `;
    forumEls.posts.appendChild(empty);
    return;
  }

  posts.forEach((post) => {
    forumEls.posts.appendChild(createForumPostElement(post));
  });
}

function handleForumReplyClick(event) {
  const button = event.target.closest("[data-reply-submit]");
  if (!button) return;

  const username = requireForumLogin();
  if (!username) return;

  const postId = button.dataset.replySubmit;
  const textarea = forumEls.posts.querySelector(`[data-reply-body="${postId}"]`);
  const body = textarea.value.trim();

  if (!body) {
    textarea.focus();
    return;
  }

  const posts = getForumPosts();
  const post = posts.find((item) => item.id === postId);
  if (!post) return;

  post.replies.push({
    id: createLocalId("reply"),
    author: username,
    body,
    createdAt: new Date().toISOString(),
  });

  saveForumPosts(posts);
  renderForumPosts();
}

function getJournalEntries() {
  return readJsonStorage(STORAGE_KEYS.journalEntries, []);
}

function saveJournalEntries(entries) {
  writeJsonStorage(STORAGE_KEYS.journalEntries, entries);
}

function formatJournalTime(isoString) {
  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createJournalEntryElement(entry) {
  const article = document.createElement("article");
  article.className = "forum-post";
  article.innerHTML = `
    <h3>${escapeHtml(entry.title)}</h3>
    <p class="forum-post-meta">${formatJournalTime(entry.createdAt)}</p>
    <p class="forum-post-body">${escapeHtml(entry.body)}</p>
    <button class="ghost-action" type="button" data-delete-entry="${entry.id}">Delete Entry</button>
  `;
  return article;
}

function renderJournalEntries() {
  const entries = getJournalEntries();
  journalEls.entries.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("article");
    empty.className = "forum-post";
    empty.innerHTML = `
      <h3>Your first reflection is waiting</h3>
      <p class="forum-post-body">Write a private note about today's triggers, choices, and wins.</p>
    `;
    journalEls.entries.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    journalEls.entries.appendChild(createJournalEntryElement(entry));
  });
}

function handleCreateJournalEntry() {
  const title = journalEls.title.value.trim();
  const body = journalEls.body.value.trim();

  if (!title || !body) {
    journalEls.status.textContent = "Add a title and reflection before saving.";
    return;
  }

  const entries = getJournalEntries();
  entries.unshift({
    id: createLocalId("entry"),
    title,
    body,
    createdAt: new Date().toISOString(),
  });

  saveJournalEntries(entries);
  journalEls.title.value = "";
  journalEls.body.value = "";
  journalEls.status.textContent = "Reflection saved locally.";
  renderJournalEntries();
}

function handleJournalEntryClick(event) {
  const button = event.target.closest("[data-delete-entry]");
  if (!button) return;

  const entryId = button.dataset.deleteEntry;
  const entries = getJournalEntries().filter((entry) => entry.id !== entryId);
  saveJournalEntries(entries);
  journalEls.status.textContent = "Reflection deleted.";
  renderJournalEntries();
}

function listenIfPresent(element, eventName, handler) {
  if (element) {
    element.addEventListener(eventName, handler);
  }
}

listenIfPresent(timerEls.startButton, "click", handleSetStartTime);
listenIfPresent(timerEls.resetButton, "click", handleResetStreak);
listenIfPresent(releaseEls.releaseButton, "click", handleInkRelease);
listenIfPresent(releaseEls.writeAgainButton, "click", handleWriteAgain);
listenIfPresent(checkinEls.button, "click", startBreathingCheckin);
listenIfPresent(checkinEls.closeOracleButton, "click", closeOracleCard);
listenIfPresent(checkinEls.modalCopyButton, "click", copyOracleQuote);
listenIfPresent(checkinEls.inlineCopyButton, "click", copyOracleQuote);
listenIfPresent(audioEls.volume, "input", updateHtmlAudioVolume);
listenIfPresent(articleEls.save, "click", handleSaveOwnerArticle);
listenIfPresent(journalEls.submit, "click", handleCreateJournalEntry);
listenIfPresent(journalEls.entries, "click", handleJournalEntryClick);
window.addEventListener("pagehide", persistAudioState);
window.addEventListener("beforeunload", persistAudioState);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    persistAudioState();
  }
});

window.EmberDisciplineAudio = {
  toggle: toggleAudioChannel,
};

if (timerEls.days) {
  startTimerLoop();
} else {
  const storedStartTime = getStoredStartTime();
  const storedDays = storedStartTime ? getElapsedParts(storedStartTime).days : 0;
  updateRankSystem(storedDays);
}

if (checkinEls.button) {
  oracleCardsReady = loadOracleCards();
  updateCheckinState();
}

updateAdsenseVisibility();

if (articleEls.list) {
  renderOwnerArticles();
}

if (journalEls.entries) {
  renderJournalEntries();
}

restorePersistentAudio();

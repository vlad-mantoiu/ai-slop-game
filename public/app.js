const socket = io();

const MAX_PLAYERS = 6;
const MAX_PROMPT_CHARS = 320;

const state = {
  room: null,
  reference: {
    url: "",
    promptLabel: ""
  },
  reveal: null,
  result: null,
  showcase: null,
  showcaseStageKey: "",
  avatarCatalogLoaded: false,
  avatarCatalog: [],
  pendingAvatarId: "",
  gameModes: [],
  roundSeconds: 120,
  voteSeconds: 120,
  blackoutUntil: 0,
  sabotageUntil: 0,
  sabotageMessage: "",
  selectedVoteId: "",
  hasVoted: false,
  voteProgress: {
    totalVotes: 0,
    requiredVotes: 0
  },
  billing: {
    balanceCents: 0,
    freeGrantCents: 0,
    purchasedCents: 0,
    spentCents: 0,
    imageCostCents: 2,
    freePlayCents: 100,
    requiresLoginForCheckout: true,
    packs: [],
    stripeEnabled: false
  },
  auth: {
    loggedIn: false,
    email: ""
  },
  authGateVisible: false,
  authBusy: false,
  pendingCheckoutPackId: "",
  boundSocketId: "",
  bindSocketToken: "",
  bindSocketTokenExpiresAt: 0,
  soundEnabled: false,
  phaseBannerUntil: 0,
  phaseBannerToken: 0,
  calloutUntil: 0,
  calloutToken: 0,
  roundUrgencyStage: "",
  voteUrgencyStage: "",
  roundLastBeepSecond: -1,
  voteLastBeepSecond: -1,
  lastPromptMutationAt: 0,
  lastPhaseFxPhase: "",
  lastPhaseFxAt: 0,
  scoreByPlayerId: {},
  winStreakByPlayerId: {},
  feed: [],
  inputDebounce: null
};

const dom = {
  authScreen: document.getElementById("authScreen"),
  avatarScreen: document.getElementById("avatarScreen"),
  lobbyScreen: document.getElementById("lobbyScreen"),
  promptScreen: document.getElementById("promptScreen"),
  showcaseScreen: document.getElementById("showcaseScreen"),
  voteScreen: document.getElementById("voteScreen"),
  resultsScreen: document.getElementById("resultsScreen"),

  roomBadge: document.getElementById("roomBadge"),
  nameInput: document.getElementById("nameInput"),
  joinCodeInput: document.getElementById("joinCodeInput"),
  avatarGrid: document.getElementById("avatarGrid"),
  avatarStatus: document.getElementById("avatarStatus"),

  createBtn: document.getElementById("createBtn"),
  joinBtn: document.getElementById("joinBtn"),
  startBtn: document.getElementById("startBtn"),
  submitBtn: document.getElementById("submitBtn"),
  readyNextBtn: document.getElementById("readyNextBtn"),
  backToLobbyBtn: document.getElementById("backToLobbyBtn"),

  lobbyTitle: document.getElementById("lobbyTitle"),
  lobbyStatus: document.getElementById("lobbyStatus"),
  codeChip: document.getElementById("codeChip"),
  lobbyHint: document.getElementById("lobbyHint"),
  metaMode: document.getElementById("metaMode"),
  metaTiebreaker: document.getElementById("metaTiebreaker"),
  modeOptions: document.getElementById("modeOptions"),
  modeHint: document.getElementById("modeHint"),
  lobbyPlayersGrid: document.getElementById("lobbyPlayersGrid"),
  lobbyScoreboard: document.getElementById("lobbyScoreboard"),
  creditBalance: document.getElementById("creditBalance"),
  creditMeta: document.getElementById("creditMeta"),
  authStatus: document.getElementById("authStatus"),
  authGate: document.getElementById("authGate"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authGateStatus: document.getElementById("authGateStatus"),
  authLoginBtn: document.getElementById("authLoginBtn"),
  authRegisterBtn: document.getElementById("authRegisterBtn"),
  authLogoutBtn: document.getElementById("authLogoutBtn"),
  soundToggleBtn: document.getElementById("soundToggleBtn"),
  creditPacks: document.getElementById("creditPacks"),

  roundLabel: document.getElementById("roundLabel"),
  timerLabel: document.getElementById("timerLabel"),
  phaseLabel: document.getElementById("phaseLabel"),
  promptStatus: document.getElementById("promptStatus"),
  promptPhaseNote: document.getElementById("promptPhaseNote"),
  referenceTitle: document.getElementById("referenceTitle"),
  promptLayout: document.querySelector(".prompt-layout"),
  promptSide: document.querySelector(".prompt-side"),
  referenceWrap: document.querySelector(".reference-wrap"),

  sabotageToast: document.getElementById("sabotageToast"),
  referenceImg: document.getElementById("referenceImg"),
  referencePromptOnly: document.getElementById("referencePromptOnly"),
  referencePrompt: document.getElementById("referencePrompt"),
  blackoutOverlay: document.getElementById("blackoutOverlay"),
  promptInput: document.getElementById("promptInput"),
  charCount: document.getElementById("charCount"),
  powerupTray: document.getElementById("powerupTray"),
  scoreboardList: document.getElementById("scoreboardList"),

  voteTimerLabel: document.getElementById("voteTimerLabel"),
  votePromptCard: document.getElementById("votePromptCard"),
  votePromptText: document.getElementById("votePromptText"),
  voteGallery: document.getElementById("voteGallery"),
  voteStatus: document.getElementById("voteStatus"),

  showcaseStepLabel: document.getElementById("showcaseStepLabel"),
  showcaseStatus: document.getElementById("showcaseStatus"),
  showcaseTimerLabel: document.getElementById("showcaseTimerLabel"),
  showcasePanels: document.getElementById("showcasePanels"),
  showcaseEntryCard: document.getElementById("showcaseEntryCard"),
  showcaseReferenceImg: document.getElementById("showcaseReferenceImg"),
  showcaseReferencePromptOnly: document.getElementById("showcaseReferencePromptOnly"),
  showcaseReferencePrompt: document.getElementById("showcaseReferencePrompt"),
  showcaseEntryLabel: document.getElementById("showcaseEntryLabel"),
  showcaseEntryImg: document.getElementById("showcaseEntryImg"),
  showcaseEntryPrompt: document.getElementById("showcaseEntryPrompt"),
  showcaseSabotageList: document.getElementById("showcaseSabotageList"),

  resultTitle: document.getElementById("resultTitle"),
  resultSubtitle: document.getElementById("resultSubtitle"),
  winnerCard: document.querySelector(".winner-card"),
  winnerName: document.getElementById("winnerName"),
  winnerMetric: document.getElementById("winnerMetric"),
  winnerPromptText: document.getElementById("winnerPromptText"),
  runnerName: document.getElementById("runnerName"),
  runnerMetric: document.getElementById("runnerMetric"),
  allPromptsList: document.getElementById("allPromptsList"),
  resultsTableBody: document.getElementById("resultsTableBody"),
  resultsReferencePrompt: document.getElementById("resultsReferencePrompt"),
  resultsReferenceThumb: document.getElementById("resultsReferenceThumb"),
  resultsReferenceImg: document.getElementById("resultsReferenceImg"),
  intermissionLabel: document.getElementById("intermissionLabel"),

  feedList: document.getElementById("feedList"),
  powerupTargetMenu: document.getElementById("powerupTargetMenu"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),
  phaseBanner: document.getElementById("phaseBanner"),
  phaseBannerTitle: document.getElementById("phaseBannerTitle"),
  phaseBannerSubtitle: document.getElementById("phaseBannerSubtitle"),
  calloutToast: document.getElementById("calloutToast"),
  confettiLayer: document.getElementById("confettiLayer"),
  imageLightbox: document.getElementById("imageLightbox"),
  imageLightboxImg: document.getElementById("imageLightboxImg"),
  imageLightboxCaption: document.getElementById("imageLightboxCaption"),
  imageLightboxClose: document.getElementById("imageLightboxClose")
};

const POWERUP_ICONS = {
  blackout: "Blackout",
  scramble: "Scramble",
  erase: "Erase",
  decoy: "Decoy",
  lock: "Lock",
  undo: "Undo",
  spy: "Spy"
};

const FALLBACK_IMAGE = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024' viewBox='0 0 1024 1024'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%230f2433'/%3E%3Cstop offset='100%25' stop-color='%231a3a50'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1024' height='1024' fill='url(%23bg)'/%3E%3Crect x='84' y='84' width='856' height='856' rx='36' ry='36' fill='none' stroke='%233f5f73' stroke-width='8' stroke-dasharray='14 12'/%3E%3Ctext x='512' y='500' text-anchor='middle' fill='%23e7f2f9' font-size='58' font-family='Arial, Helvetica, sans-serif' font-weight='700'%3EImage unavailable%3C/text%3E%3C/svg%3E";

function currentSelf() {
  return state.room?.self || null;
}

function selfBilling() {
  return state.room?.self?.billing || state.billing;
}

function syncBilling(payload) {
  const direct = payload && typeof payload === "object" ? payload : null;
  const incoming =
    direct && typeof direct.billing === "object"
      ? direct.billing
      : direct && Object.prototype.hasOwnProperty.call(direct, "balanceCents")
      ? direct
      : null;
  if (!incoming || typeof incoming !== "object") return;
  state.billing = {
    ...state.billing,
    ...incoming
  };
}

function syncAuth(payload) {
  const direct = payload && typeof payload === "object" ? payload : null;
  const incoming =
    direct && typeof direct.auth === "object"
      ? direct.auth
      : direct && Object.prototype.hasOwnProperty.call(direct, "loggedIn")
      ? direct
      : direct && Object.prototype.hasOwnProperty.call(direct, "authType")
      ? {
          loggedIn: String(direct.authType || "") === "user",
          email: String(direct.email || "")
        }
      : null;
  if (!incoming || typeof incoming !== "object") return;
  state.auth = {
    ...state.auth,
    ...incoming
  };
}

function isHost() {
  return Boolean(state.room && state.room.self.id === state.room.hostId);
}

const DEFAULT_GAME_MODES = [
  {
    id: "classic",
    label: "Classic Slop Battle",
    description: "Reference image + sabotage powerups"
  },
  {
    id: "humanity",
    label: "AI Slop Against Humanity",
    description: "One black-card prompt. No sabotage."
  }
];

const MODE_TOOLTIPS = {
  classic:
    "Classic: match the hidden reference image in 2 minutes. Sabotage and defense powerups are active. Winner gets the round point.",
  humanity:
    "Against Humanity: no reference image. Everyone answers one black-card prompt in 2 minutes. Anonymous group vote decides the winner."
};

function modeCatalog() {
  if (Array.isArray(state.gameModes) && state.gameModes.length) {
    return state.gameModes;
  }
  return DEFAULT_GAME_MODES;
}

function currentModeId() {
  return String(state.room?.modeId || "classic");
}

function isHumanityMode() {
  return currentModeId() === "humanity";
}

function currentModeMeta() {
  const modeId = currentModeId();
  return modeCatalog().find((mode) => mode.id === modeId) || DEFAULT_GAME_MODES[0];
}

function modeTooltipText(modeId) {
  const id = String(modeId || "").trim();
  return MODE_TOOLTIPS[id] || "Pick a mode to see how that match style plays.";
}

const audioEngine = {
  ctx: null,
  master: null,
  unlocked: false,
  ambientMode: "",
  ambientTimer: null
};

const PHASE_BANNER_META = {
  lobby: { title: "Back To Lobby", subtitle: "Regroup and start chaos again." },
  starting: { title: "Match Starting", subtitle: "Rolling camera. Loading madness." },
  round: { title: "Prompt Phase", subtitle: "Write fast. Sabotage faster." },
  generating: { title: "Generation Locked", subtitle: "The slop forge is heating up." },
  showcase: { title: "Cinematic Showcase", subtitle: "Anonymous masterpieces entering the spotlight." },
  voting: { title: "Voting Open", subtitle: "Pick the image that nails the brief." },
  intermission: { title: "Ready Check", subtitle: "Everyone clicks ready to continue." },
  ended: { title: "Match Finished", subtitle: "Winner crowned. Debrief the chaos." }
};

function updateSoundToggleUi() {
  const enabled = Boolean(state.soundEnabled);
  dom.soundToggleBtn.textContent = enabled ? "Sound: On" : "Sound: Off";
  dom.soundToggleBtn.classList.toggle("is-on", enabled);
  dom.soundToggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
}

function ensureAudioContext() {
  if (audioEngine.ctx) return audioEngine.ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioEngine.ctx = new Ctx();
  audioEngine.master = audioEngine.ctx.createGain();
  audioEngine.master.gain.value = 0.11;
  audioEngine.master.connect(audioEngine.ctx.destination);
  return audioEngine.ctx;
}

async function unlockAudio() {
  const ctx = ensureAudioContext();
  if (!ctx) return false;
  try {
    await ctx.resume();
    audioEngine.unlocked = ctx.state === "running";
  } catch {
    audioEngine.unlocked = false;
  }
  return audioEngine.unlocked;
}

function canPlaySound() {
  return Boolean(state.soundEnabled && audioEngine.unlocked && audioEngine.ctx && audioEngine.master);
}

function soundEnvelope(node, startAt, attack = 0.008, hold = 0.06, release = 0.1, level = 1) {
  const gain = audioEngine.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(level, startAt + attack);
  gain.gain.setValueAtTime(level, startAt + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + attack + hold + release);
  node.connect(gain);
  gain.connect(audioEngine.master);
}

function playTone(freq, opts = {}) {
  if (!canPlaySound()) return;
  const ctx = audioEngine.ctx;
  const startAt = ctx.currentTime + Math.max(0, Number(opts.delay) || 0);
  const osc = ctx.createOscillator();
  osc.type = opts.type || "sine";
  osc.frequency.setValueAtTime(Math.max(40, Number(freq) || 220), startAt);
  if (Number.isFinite(opts.endFreq)) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, Number(opts.endFreq)), startAt + 0.12);
  }
  soundEnvelope(
    osc,
    startAt,
    Number(opts.attack) || 0.005,
    Number(opts.hold) || 0.04,
    Number(opts.release) || 0.09,
    Number(opts.level) || 0.55
  );
  osc.start(startAt);
  osc.stop(startAt + 0.32);
}

function playNoiseHit(opts = {}) {
  if (!canPlaySound()) return;
  const ctx = audioEngine.ctx;
  const startAt = ctx.currentTime + Math.max(0, Number(opts.delay) || 0);
  const noise = ctx.createBufferSource();
  const size = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  }
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(Number(opts.freq) || 1400, startAt);
  filter.Q.value = Number(opts.q) || 1.4;
  noise.connect(filter);
  soundEnvelope(
    filter,
    startAt,
    Number(opts.attack) || 0.002,
    Number(opts.hold) || 0.015,
    Number(opts.release) || 0.08,
    Number(opts.level) || 0.35
  );
  noise.start(startAt);
  noise.stop(startAt + 0.2);
}

function playUiClick() {
  playTone(620, { type: "triangle", hold: 0.015, release: 0.06, level: 0.26 });
}

function playPhaseStinger(phase) {
  if (phase === "round") {
    playTone(260, { type: "sawtooth", hold: 0.02, release: 0.08, level: 0.38 });
    playTone(392, { type: "sawtooth", delay: 0.07, hold: 0.02, release: 0.08, level: 0.36 });
    playTone(523, { type: "triangle", delay: 0.14, hold: 0.03, release: 0.1, level: 0.34 });
    return;
  }
  if (phase === "showcase") {
    playTone(320, { type: "sine", hold: 0.04, release: 0.16, level: 0.32 });
    playTone(480, { type: "triangle", delay: 0.1, hold: 0.04, release: 0.16, level: 0.28 });
    return;
  }
  if (phase === "voting") {
    playTone(600, { type: "square", hold: 0.02, release: 0.08, level: 0.28 });
    playTone(760, { type: "square", delay: 0.09, hold: 0.02, release: 0.08, level: 0.24 });
    return;
  }
  if (phase === "intermission") {
    playTone(280, { type: "triangle", hold: 0.02, release: 0.1, level: 0.24 });
    return;
  }
  if (phase === "ended") {
    playTone(392, { type: "triangle", hold: 0.08, release: 0.18, level: 0.38 });
    playTone(523, { type: "triangle", delay: 0.12, hold: 0.09, release: 0.2, level: 0.35 });
  }
}

function playSabotageFxSound(kind) {
  if (kind === "blackout") {
    playNoiseHit({ freq: 320, q: 0.8, release: 0.14, level: 0.45 });
    return;
  }
  if (kind === "erase") {
    playNoiseHit({ freq: 920, q: 2.4, release: 0.1, level: 0.35 });
    playTone(180, { type: "sawtooth", delay: 0.05, hold: 0.02, release: 0.07, level: 0.28 });
    return;
  }
  if (kind === "scramble") {
    playTone(430, { type: "square", hold: 0.015, release: 0.05, level: 0.26 });
    playTone(512, { type: "square", delay: 0.05, hold: 0.015, release: 0.05, level: 0.24 });
    return;
  }
  playTone(260, { type: "triangle", hold: 0.02, release: 0.08, level: 0.25 });
  playTone(340, { type: "triangle", delay: 0.06, hold: 0.02, release: 0.08, level: 0.23 });
}

function playCountdownBeep(stage = "warn") {
  if (stage === "critical") {
    playTone(980, { type: "square", hold: 0.008, release: 0.04, level: 0.2 });
    return;
  }
  playTone(760, { type: "triangle", hold: 0.01, release: 0.06, level: 0.17 });
}

function stopAmbientLoop() {
  if (audioEngine.ambientTimer) {
    clearInterval(audioEngine.ambientTimer);
    audioEngine.ambientTimer = null;
  }
  audioEngine.ambientMode = "";
}

function setAmbientLoop(mode) {
  const nextMode = String(mode || "");
  if (!canPlaySound()) {
    stopAmbientLoop();
    return;
  }
  if (audioEngine.ambientMode === nextMode) return;
  stopAmbientLoop();
  audioEngine.ambientMode = nextMode;

  if (nextMode === "lobby") {
    playTone(170, { type: "sine", hold: 0.08, release: 0.24, level: 0.08 });
    audioEngine.ambientTimer = setInterval(() => {
      playTone(165, { type: "sine", hold: 0.06, release: 0.2, level: 0.08 });
      playTone(220, { type: "sine", delay: 0.2, hold: 0.05, release: 0.18, level: 0.06 });
    }, 1900);
    return;
  }

  if (nextMode === "round") {
    playTone(210, { type: "triangle", hold: 0.05, release: 0.16, level: 0.09 });
    audioEngine.ambientTimer = setInterval(() => {
      playTone(210, { type: "triangle", hold: 0.035, release: 0.12, level: 0.08 });
      playTone(260, { type: "sine", delay: 0.15, hold: 0.02, release: 0.09, level: 0.06 });
    }, 1450);
    return;
  }

  if (nextMode === "showcase") {
    playTone(280, { type: "sine", hold: 0.08, release: 0.24, level: 0.08 });
    audioEngine.ambientTimer = setInterval(() => {
      playTone(280, { type: "sine", hold: 0.05, release: 0.2, level: 0.07 });
      playTone(360, { type: "triangle", delay: 0.18, hold: 0.04, release: 0.16, level: 0.06 });
    }, 1750);
    return;
  }

  if (nextMode === "voting") {
    playTone(250, { type: "square", hold: 0.02, release: 0.1, level: 0.08 });
    audioEngine.ambientTimer = setInterval(() => {
      playTone(250, { type: "square", hold: 0.02, release: 0.08, level: 0.07 });
      playTone(220, { type: "square", delay: 0.2, hold: 0.015, release: 0.07, level: 0.06 });
    }, 950);
    return;
  }
}

function applyAmbientForPhase(phase) {
  if (phase === "lobby" || phase === "intermission" || phase === "starting") {
    setAmbientLoop("lobby");
    return;
  }
  if (phase === "round" || phase === "generating") {
    setAmbientLoop("round");
    return;
  }
  if (phase === "showcase") {
    setAmbientLoop("showcase");
    return;
  }
  if (phase === "voting") {
    setAmbientLoop("voting");
    return;
  }
  stopAmbientLoop();
}

function setSoundEnabled(nextEnabled) {
  state.soundEnabled = Boolean(nextEnabled);
  try {
    window.localStorage.setItem("psa-sound-enabled", state.soundEnabled ? "1" : "0");
  } catch {
    // ignore storage failures
  }
  updateSoundToggleUi();
  if (!state.soundEnabled) {
    stopAmbientLoop();
    return;
  }
  unlockAudio().then((ok) => {
    if (!ok) return;
    playUiClick();
    applyAmbientForPhase(state.room?.phase || "");
  });
}

function showPhaseBanner(title, subtitle = "", durationMs = 1600) {
  const token = Date.now() + Math.floor(Math.random() * 10000);
  state.phaseBannerToken = token;
  state.phaseBannerUntil = Date.now() + durationMs;
  dom.phaseBannerTitle.textContent = title || "";
  dom.phaseBannerSubtitle.textContent = subtitle || "";
  dom.phaseBanner.classList.remove("hidden");
  dom.phaseBanner.classList.remove("is-active");
  void dom.phaseBanner.offsetWidth;
  dom.phaseBanner.classList.add("is-active");
  setTimeout(() => {
    if (state.phaseBannerToken !== token) return;
    dom.phaseBanner.classList.remove("is-active");
    dom.phaseBanner.classList.add("hidden");
  }, durationMs);
}

function showCallout(message, warn = false, durationMs = 1800) {
  if (!message) return;
  const token = Date.now() + Math.floor(Math.random() * 10000);
  state.calloutToken = token;
  state.calloutUntil = Date.now() + durationMs;
  dom.calloutToast.textContent = message;
  dom.calloutToast.classList.toggle("warn", Boolean(warn));
  dom.calloutToast.classList.remove("hidden");
  dom.calloutToast.classList.remove("is-active");
  void dom.calloutToast.offsetWidth;
  dom.calloutToast.classList.add("is-active");
  setTimeout(() => {
    if (state.calloutToken !== token) return;
    dom.calloutToast.classList.remove("is-active");
    dom.calloutToast.classList.add("hidden");
  }, durationMs);
}

function spawnConfettiBursts(count = 56) {
  dom.confettiLayer.innerHTML = "";
  const palette = ["#27c7c2", "#ffb154", "#7ed8ff", "#ffd2d2", "#fff0a8"];
  const total = Math.max(10, Math.min(220, Number(count) || 0));
  for (let i = 0; i < total; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = palette[i % palette.length];
    piece.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 240)}px`);
    piece.style.setProperty("--spin", `${Math.round((Math.random() - 0.5) * 900)}deg`);
    piece.style.animationDelay = `${(i % 20) * 20}ms`;
    piece.style.animationDuration = `${1200 + Math.floor(Math.random() * 900)}ms`;
    dom.confettiLayer.appendChild(piece);
  }
  setTimeout(() => {
    dom.confettiLayer.innerHTML = "";
  }, 2600);
}

function inferPromptMutationKind(previousPrompt, nextPrompt) {
  const beforeCount = String(previousPrompt || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const afterCount = String(nextPrompt || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (afterCount > beforeCount) return "decoy";
  if (afterCount < beforeCount) return "erase";
  return "scramble";
}

function triggerPromptMutationFx(kind) {
  if (!dom.promptSide) return;
  dom.promptSide.classList.remove("fx-erase", "fx-scramble", "fx-decoy");
  if (kind === "erase" || kind === "scramble" || kind === "decoy") {
    dom.promptSide.classList.add(`fx-${kind}`);
    setTimeout(() => {
      dom.promptSide.classList.remove(`fx-${kind}`);
    }, 1300);
  }
  playSabotageFxSound(kind);
}

function triggerBlackoutFx() {
  if (!dom.referenceWrap) return;
  dom.referenceWrap.classList.remove("fx-blackout");
  void dom.referenceWrap.offsetWidth;
  dom.referenceWrap.classList.add("fx-blackout");
  setTimeout(() => {
    dom.referenceWrap.classList.remove("fx-blackout");
  }, 1400);
  playSabotageFxSound("blackout");
}

function urgencyStage(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  if (safe <= 10) return "critical";
  if (safe <= 30) return "urgent";
  return "";
}

function applyTimerUrgency(timerNode, stage) {
  if (!timerNode) return;
  timerNode.classList.toggle("is-urgent", stage === "urgent");
  timerNode.classList.toggle("is-critical", stage === "critical");
}

function applyPromptUrgency(stage) {
  if (!dom.promptLayout) return;
  dom.promptLayout.classList.toggle("is-urgent", stage === "urgent");
  dom.promptLayout.classList.toggle("is-critical", stage === "critical");
}

function applyVoteUrgency(stage) {
  dom.voteGallery.classList.toggle("is-urgent", stage === "urgent");
  dom.voteGallery.classList.toggle("is-critical", stage === "critical");
}

function handleRoundTickFx(seconds) {
  const stage = urgencyStage(seconds);
  if (stage !== state.roundUrgencyStage) {
    state.roundUrgencyStage = stage;
    state.roundLastBeepSecond = -1;
    if (stage === "urgent") {
      playCountdownBeep("warn");
      showCallout("30 seconds left. Panic with intent.");
    } else if (stage === "critical") {
      playCountdownBeep("critical");
      showCallout("Final 10 seconds. Lock in now.", true);
    }
  }

  if (
    stage === "critical" &&
    Number.isFinite(seconds) &&
    seconds > 0 &&
    seconds <= 10 &&
    state.roundLastBeepSecond !== seconds
  ) {
    state.roundLastBeepSecond = seconds;
    playCountdownBeep("critical");
  }
}

function handleVoteTickFx(seconds) {
  const stage = urgencyStage(seconds);
  if (stage !== state.voteUrgencyStage) {
    state.voteUrgencyStage = stage;
    state.voteLastBeepSecond = -1;
    if (stage === "urgent") {
      playCountdownBeep("warn");
      showCallout("30 seconds left to vote.");
    } else if (stage === "critical") {
      playCountdownBeep("critical");
      showCallout("Final 10 seconds to vote.", true);
    }
  }

  if (
    stage === "critical" &&
    Number.isFinite(seconds) &&
    seconds > 0 &&
    seconds <= 10 &&
    state.voteLastBeepSecond !== seconds
  ) {
    state.voteLastBeepSecond = seconds;
    playCountdownBeep("critical");
  }
}

function handlePhaseTransition(prevPhase, nextPhase) {
  if (!nextPhase || prevPhase === nextPhase) return;
  const dedupeKey = `${prevPhase || "-"}>${nextPhase}`;
  const now = Date.now();
  if (state.lastPhaseFxPhase === dedupeKey && now - state.lastPhaseFxAt < 850) return;
  state.lastPhaseFxPhase = dedupeKey;
  state.lastPhaseFxAt = now;

  const meta = PHASE_BANNER_META[nextPhase];
  if (meta && prevPhase) {
    const duration = nextPhase === "showcase" ? 2200 : 1700;
    showPhaseBanner(meta.title, meta.subtitle, duration);
  }

  playPhaseStinger(nextPhase);
  applyAmbientForPhase(nextPhase);

  if (nextPhase === "round") {
    showCallout("Prompts live. Sabotage window open.");
  } else if (nextPhase === "showcase") {
    showCallout("Curtain up. Anonymous slop cinema begins.");
  } else if (nextPhase === "voting") {
    showCallout("Voting is open. One vote only.");
  } else if (nextPhase === "intermission") {
    showCallout("Round complete. Waiting for all players to ready.");
  }
}

function updateMomentumFromRoundResult(payload) {
  const leaderboard = Array.isArray(payload?.leaderboard) ? payload.leaderboard : [];
  const nextScores = {};
  leaderboard.forEach((player) => {
    nextScores[player.id] = Number(player.score) || 0;
  });

  const winners = new Set(Array.isArray(payload?.winnerIds) ? payload.winnerIds : []);
  if (payload?.tie) {
    state.winStreakByPlayerId = {};
  } else if (winners.size > 0) {
    const nextStreaks = { ...state.winStreakByPlayerId };
    Object.keys(nextScores).forEach((playerId) => {
      if (winners.has(playerId)) {
        nextStreaks[playerId] = (nextStreaks[playerId] || 0) + 1;
      } else {
        nextStreaks[playerId] = 0;
      }
    });
    state.winStreakByPlayerId = nextStreaks;

    const streakLeader = [...winners]
      .map((id) => ({
        id,
        streak: Number(state.winStreakByPlayerId[id]) || 0,
        player: playerById(id)
      }))
      .sort((a, b) => b.streak - a.streak)[0];

    if (streakLeader && streakLeader.streak >= 2) {
      showCallout(`${streakLeader.player?.name || "A player"} is on a ${streakLeader.streak}-round streak!`, true, 2200);
    }
  }

  state.scoreByPlayerId = nextScores;

  const leader = leaderboard
    .map((entry) => ({ ...entry, score: Number(entry.score) || 0 }))
    .sort((a, b) => b.score - a.score)[0];
  const toWin = Number(state.room?.toWin) || 5;
  if (leader && leader.score === toWin - 1) {
    const leaderName = playerById(leader.id)?.name || leader.name || "A player";
    showCallout(`${leaderName} is on match point.`, true, 2200);
  }
}

function sortedPlayers() {
  if (!state.room) return [];
  return [...state.room.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function playerById(playerId) {
  if (!state.room) return null;
  return state.room.players.find((player) => player.id === playerId) || null;
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const picked = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "");
  return picked.join("") || "?";
}

function createAvatarNode(player, sizeClass = "avatar-md") {
  const avatar = document.createElement("span");
  avatar.className = `avatar-badge ${sizeClass}`;

  const url = String(player?.avatarUrl || "");
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = `${player?.name || "Player"} avatar`;
    avatar.appendChild(img);
    return avatar;
  }

  avatar.classList.add("avatar-fallback");
  avatar.textContent = initials(player?.name);
  return avatar;
}

function buildNameRow(player, opts = {}) {
  const wrap = document.createElement("div");
  wrap.className = "name-row";

  const avatarSize = opts.avatarSize || "avatar-md";
  wrap.appendChild(createAvatarNode(player, avatarSize));

  const text = document.createElement("span");
  text.className = "name-text";
  text.textContent = `${player.name}${opts.selfSuffix ? " (you)" : ""}`;
  wrap.appendChild(text);
  return wrap;
}

function needsAvatarSelection() {
  if (!state.room) return false;
  const self = currentSelf();
  if (!self) return false;
  if (self.avatarId) return false;
  if (state.room.phase !== "lobby" && state.room.phase !== "starting") return false;
  if (!state.avatarCatalogLoaded) return true;
  return state.avatarCatalog.length > 0;
}

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatMoney(cents) {
  const value = Math.max(0, Number(cents) || 0);
  return `$${(value / 100).toFixed(2)}`;
}

function setImageSource(img, url, alt) {
  if (!img) return;
  img.alt = alt;
  img.onerror = () => {
    img.onerror = null;
    img.src = FALLBACK_IMAGE;
  };
  img.src = url || FALLBACK_IMAGE;
}

function closeImageLightbox() {
  dom.imageLightbox.classList.add("hidden");
  dom.imageLightboxImg.src = "";
  dom.imageLightboxCaption.textContent = "";
}

function openImageLightbox(url, caption) {
  setImageSource(dom.imageLightboxImg, url, caption || "Expanded image");
  dom.imageLightboxCaption.textContent = caption || "";
  dom.imageLightbox.classList.remove("hidden");
}

function typewriterText(text, elapsedMs, durationMs) {
  const raw = String(text || "");
  if (!raw) return "";
  const total = Math.max(300, Number(durationMs) || 0);
  const ratio = Math.max(0, Math.min(1, elapsedMs / total));
  const length = Math.max(1, Math.floor(raw.length * ratio));
  return raw.slice(0, length);
}

function phaseLabel(phase) {
  const map = {
    lobby: "Lobby",
    starting: "Starting",
    round: "Prompting",
    generating: "Generating",
    showcase: "Showcase",
    voting: "Voting",
    scoring: "Scoring",
    intermission: "Intermission",
    ended: "Ended"
  };
  return map[phase] || phase || "-";
}

function phaseToScreen(phase) {
  if (!state.room) return "auth";
  if (needsAvatarSelection()) return "avatar";
  if (phase === "lobby" || phase === "starting") return "lobby";
  if (phase === "round" || phase === "generating") return "prompt";
  if (phase === "showcase") return "showcase";
  if (phase === "voting") return "vote";
  return "results";
}

function setVisibleScreen(screen) {
  dom.authScreen.classList.toggle("hidden", screen !== "auth");
  dom.avatarScreen.classList.toggle("hidden", screen !== "avatar");
  dom.lobbyScreen.classList.toggle("hidden", screen !== "lobby");
  dom.promptScreen.classList.toggle("hidden", screen !== "prompt");
  dom.showcaseScreen.classList.toggle("hidden", screen !== "showcase");
  dom.voteScreen.classList.toggle("hidden", screen !== "vote");
  dom.resultsScreen.classList.toggle("hidden", screen !== "results");
  if (screen !== "vote") {
    closeImageLightbox();
  }
}

function loadingMessage() {
  const phase = state.room?.phase;
  if (phase === "starting") {
    return isHumanityMode() ? "Shuffling black-card mayhem..." : "Mixing reference mayhem...";
  }
  if (phase === "generating") return "Pixel goblins are painting masterpieces...";
  return "";
}

function renderLoading() {
  const message = loadingMessage();
  const active = Boolean(message);
  dom.loadingOverlay.classList.toggle("hidden", !active);
  if (active) {
    dom.loadingText.textContent = message;
  }
}

async function refreshBillingFromApi() {
  try {
    const response = await fetch("/api/billing/me");
    if (!response.ok) return;
    const json = await response.json();
    syncBilling(json);
    syncAuth(json);
    renderAll();
  } catch {
    // ignore transient billing refresh errors
  }
}

async function refreshAuthFromApi() {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) return;
    const json = await response.json();
    syncAuth(json);
    syncBilling(json);
    renderAll();
  } catch {
    // ignore transient auth refresh errors
  }
}

async function bindCurrentSocketAccount(force = false) {
  if (!socket?.id) return;
  if (!force && state.boundSocketId === socket.id) return;
  const bindToken = String(state.bindSocketToken || "");
  if (!bindToken) return;
  try {
    const response = await fetch("/api/auth/bind-socket", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        socketId: socket.id,
        bindToken
      })
    });
    if (!response.ok) {
      state.boundSocketId = "";
      return;
    }
    const json = await response.json();
    state.boundSocketId = socket.id;
    if (json?.bindToken) {
      state.bindSocketToken = String(json.bindToken);
    }
    syncAuth(json);
    syncBilling(json);
    renderAll();
  } catch {
    // ignore transient binding errors
  }
}

function pushFeed(message, warn = false) {
  state.feed.unshift({
    message,
    warn,
    ts: Date.now()
  });
  state.feed = state.feed.slice(0, 45);
  renderFeed();
}

function renderFeed() {
  dom.feedList.innerHTML = "";
  state.feed.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item.message;
    if (item.warn) li.classList.add("warn");
    dom.feedList.appendChild(li);
  });
}

function setRoomBadge() {
  dom.roomBadge.textContent = state.room ? `Room ${state.room.roomId}` : "No room";
}

function renderAvatarSelection() {
  if (!state.room) return;
  const self = currentSelf();
  if (!self) return;

  dom.avatarGrid.innerHTML = "";

  if (!state.avatarCatalogLoaded) {
    dom.avatarStatus.textContent = "Loading avatars...";
    return;
  }

  if (!state.avatarCatalog.length) {
    dom.avatarStatus.textContent = "No avatar options available.";
    return;
  }

  const selectedId = self.avatarId || state.pendingAvatarId;
  state.avatarCatalog.forEach((avatar) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "avatar-option";
    if (avatar.id === selectedId) {
      button.classList.add("selected");
    }

    const imgWrap = document.createElement("div");
    imgWrap.className = "avatar-option-image";
    const img = document.createElement("img");
    img.src = avatar.url;
    img.alt = avatar.label || "Avatar";
    imgWrap.appendChild(img);

    const label = document.createElement("div");
    label.className = "avatar-option-label";
    label.textContent = avatar.label || avatar.id;

    button.appendChild(imgWrap);
    button.appendChild(label);

    button.addEventListener("click", () => {
      state.pendingAvatarId = avatar.id;
      socket.emit("chooseAvatar", { avatarId: avatar.id });
      renderAvatarSelection();
    });

    dom.avatarGrid.appendChild(button);
  });

  if (state.pendingAvatarId) {
    dom.avatarStatus.textContent = "Saving avatar...";
  } else {
    dom.avatarStatus.textContent = "Pick an avatar to continue.";
  }
}

function renderModeOptions() {
  if (!state.room) return;

  const selectedModeId = currentModeId();
  const canChange = isHost() && (state.room.phase === "lobby" || state.room.phase === "ended");
  const modes = modeCatalog();

  dom.modeOptions.innerHTML = "";
  modes.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mode-option tilt-card";
    if (mode.id === selectedModeId) {
      button.classList.add("selected");
    }
    button.disabled = !canChange;
    const tooltip = modeTooltipText(mode.id);
    button.dataset.tooltip = tooltip;
    button.setAttribute("title", tooltip);
    button.setAttribute("aria-label", `${mode.label || mode.id}. ${tooltip}`);

    const title = document.createElement("div");
    title.className = "mode-option-title";
    title.textContent = mode.label || mode.id;

    const desc = document.createElement("div");
    desc.className = "mode-option-desc";
    desc.textContent = mode.description || "";

    button.appendChild(title);
    button.appendChild(desc);

    button.addEventListener("click", () => {
      if (!canChange) return;
      socket.emit("setGameMode", { modeId: mode.id });
    });

    dom.modeOptions.appendChild(button);
  });

  if (canChange) {
    dom.modeHint.textContent = "Host can switch mode before starting.";
  } else if (isHost()) {
    dom.modeHint.textContent = "Mode locked while the match is in progress.";
  } else {
    dom.modeHint.textContent = "Only the host can change mode.";
  }
}

function setAuthGateStatus(message, warn = false) {
  dom.authGateStatus.textContent = message || "";
  dom.authGateStatus.classList.toggle("warn", Boolean(warn));
}

function showAuthGate(message = "") {
  state.authGateVisible = true;
  setAuthGateStatus(message, false);
  renderBillingPanel();
}

function hideAuthGate() {
  state.authGateVisible = false;
  setAuthGateStatus("", false);
  renderBillingPanel();
}

async function submitAuth(mode) {
  if (state.authBusy) return;
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;
  const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
  state.authBusy = true;
  setAuthGateStatus(mode === "register" ? "Creating account..." : "Logging in...", false);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || "Auth failed.");
    }
    syncAuth(json);
    syncBilling(json);
    await bindCurrentSocketAccount(true);
    setAuthGateStatus("Authenticated. Continuing...", false);
    state.authGateVisible = false;
    renderAll();

    const pendingPack = state.pendingCheckoutPackId;
    state.pendingCheckoutPackId = "";
    if (pendingPack) {
      await startCheckout(pendingPack);
    }
  } catch (error) {
    setAuthGateStatus(String(error?.message || error || "Auth failed."), true);
  } finally {
    state.authBusy = false;
    renderBillingPanel();
  }
}

async function switchToGuest() {
  if (state.authBusy) return;
  state.authBusy = true;
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST"
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error || "Unable to switch to guest.");
    }
    syncAuth(json);
    syncBilling(json);
    await bindCurrentSocketAccount(true);
    state.pendingCheckoutPackId = "";
    hideAuthGate();
    pushFeed("Switched to guest mode.");
  } catch (error) {
    pushFeed(String(error?.message || error || "Unable to switch to guest."), true);
  } finally {
    state.authBusy = false;
    renderAll();
  }
}

async function startCheckout(packId) {
  try {
    const billing = selfBilling();
    const requiresLogin = Boolean(billing?.requiresLoginForCheckout);
    if (requiresLogin && !state.auth.loggedIn) {
      state.pendingCheckoutPackId = packId;
      showAuthGate("Log in or create an account to purchase credits.");
      return;
    }

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ packId })
    });
    const json = await response.json();
    if (!response.ok) {
      if (json?.authRequired) {
        state.pendingCheckoutPackId = packId;
        showAuthGate("Log in to continue to checkout.");
        return;
      }
      throw new Error(json?.error || "Unable to create checkout session.");
    }
    if (!json?.checkoutUrl) {
      throw new Error("Checkout URL missing.");
    }
    window.location.href = json.checkoutUrl;
  } catch (error) {
    pushFeed(String(error?.message || error || "Checkout failed."), true);
  }
}

function renderBillingPanel() {
  const billing = selfBilling();
  const balanceCents = Number(billing?.balanceCents) || 0;
  const roundCost = Number(state.room?.roundCostCents) || 0;
  const imageCost = Number(billing?.imageCostCents) || 0;
  const imagesPerRound = Number(state.room?.roundImageCount) || 0;
  const requiresLogin = Boolean(billing?.requiresLoginForCheckout);

  dom.creditBalance.textContent = formatMoney(balanceCents);
  let note = `Next round cost ${formatMoney(roundCost)} (${imagesPerRound} images @ ${formatMoney(imageCost)} each).`;
  if (!billing.stripeEnabled) {
    note += " Top-ups are not configured yet.";
  }
  dom.creditMeta.textContent = note;
  dom.authStatus.textContent = state.auth.loggedIn
    ? `Signed in as ${state.auth.email || "account"}`
    : requiresLogin
    ? "Guest mode active. Login required only for purchases."
    : "Guest purchases are enabled.";
  dom.authGate.classList.toggle("hidden", !state.authGateVisible);
  dom.authEmail.disabled = state.authBusy;
  dom.authPassword.disabled = state.authBusy;
  dom.authLoginBtn.disabled = state.authBusy;
  dom.authRegisterBtn.disabled = state.authBusy;
  dom.authLogoutBtn.classList.toggle("hidden", !state.auth.loggedIn);

  dom.creditPacks.innerHTML = "";
  const packs = Array.isArray(billing?.packs) ? billing.packs : [];
  if (!packs.length) {
    const msg = document.createElement("p");
    msg.className = "muted small";
    msg.textContent = "No credit packs configured.";
    dom.creditPacks.appendChild(msg);
    return;
  }

  packs.forEach((pack) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.disabled = !billing.stripeEnabled || state.authBusy;
    btn.textContent = `${pack.label} (+${formatMoney(pack.creditCents)})`;
    btn.addEventListener("click", () => {
      startCheckout(pack.id);
    });
    dom.creditPacks.appendChild(btn);
  });
}

function renderLobby() {
  if (!state.room) return;

  dom.lobbyTitle.textContent = `Room #${state.room.roomId}`;
  dom.codeChip.textContent = `CODE: ${state.room.roomId}`;
  const modeMeta = currentModeMeta();
  dom.metaMode.textContent = modeMeta.label || modeMeta.id;
  dom.metaTiebreaker.textContent = isHumanityMode() ? "Sudden-death rematch" : "Chaos + double powerups";

  const playerCount = state.room.players.length;
  if (state.room.phase === "starting") {
    dom.lobbyStatus.textContent = "Match starting...";
  } else if (playerCount < 2) {
    dom.lobbyStatus.textContent = "Waiting for more players to join...";
  } else {
    dom.lobbyStatus.textContent = `${playerCount} players in room. Mode: ${modeMeta.label}.`;
  }

  dom.lobbyPlayersGrid.innerHTML = "";
  state.room.players.forEach((player) => {
    const card = document.createElement("article");
    card.className = "player-card tilt-card";
    if (player.id === state.room.hostId) card.classList.add("host");
    if (player.id === state.room.self.id) card.classList.add("self");

    const head = buildNameRow(player, {
      avatarSize: "avatar-lg",
      selfSuffix: player.id === state.room.self.id
    });
    head.classList.add("player-head");

    const meta = document.createElement("div");
    meta.className = "player-meta";
    const role = player.id === state.room.hostId ? "Host" : "Player";
    meta.textContent = isHumanityMode()
      ? `${role} | Score ${player.score}`
      : `${role} | Score ${player.score} | Powerups ${player.powerupCount}`;

    card.appendChild(head);
    card.appendChild(meta);
    dom.lobbyPlayersGrid.appendChild(card);
  });

  for (let i = state.room.players.length; i < MAX_PLAYERS; i += 1) {
    const empty = document.createElement("article");
    empty.className = "player-card player-empty tilt-card";
    empty.textContent = "Open slot";
    dom.lobbyPlayersGrid.appendChild(empty);
  }

  dom.lobbyScoreboard.innerHTML = "";
  sortedPlayers().forEach((player) => {
    const li = document.createElement("li");
    li.className = "score-row";
    li.appendChild(buildNameRow(player, { selfSuffix: player.id === state.room.self.id }));
    const score = document.createElement("span");
    score.className = "score-value";
    score.textContent = `${player.score}/${state.room.toWin}`;
    li.appendChild(score);
    dom.lobbyScoreboard.appendChild(li);
  });

  const hostBalance = Number(selfBilling()?.balanceCents) || 0;
  const nextRoundCost = Number(state.room.roundCostCents) || 0;
  const hasFunds = hostBalance >= nextRoundCost;
  const canStart = isHost() && playerCount >= 2 && state.room.phase !== "starting" && hasFunds;
  dom.startBtn.disabled = !canStart;

  if (!isHost()) {
    dom.lobbyHint.textContent = "Only the host can start the match.";
  } else if (playerCount < 2) {
    dom.lobbyHint.textContent = "Need at least 2 players to begin.";
  } else if (!hasFunds) {
    dom.lobbyHint.textContent = `Insufficient credits. Need ${formatMoney(nextRoundCost)} to start next round.`;
  } else {
    dom.lobbyHint.textContent = "Start when everyone is ready.";
  }

  renderModeOptions();
  renderBillingPanel();
}

function renderPromptScoreboard() {
  dom.scoreboardList.innerHTML = "";
  if (!state.room) return;

  sortedPlayers().forEach((player) => {
    const li = document.createElement("li");
    li.className = "score-row";

    const left = buildNameRow(player, { selfSuffix: player.id === state.room.self.id });

    const right = document.createElement("span");
    right.className = "score-value";
    const submitted = player.submitted ? " | submitted" : "";
    right.textContent = isHumanityMode()
      ? `${player.score}/${state.room.toWin}${submitted}`
      : `${player.score}/${state.room.toWin} | powerups ${player.powerupCount}${submitted}`;

    li.appendChild(left);
    li.appendChild(right);
    dom.scoreboardList.appendChild(li);
  });
}

function activeAttackTargets() {
  const self = currentSelf();
  if (!state.room || !self) return [];
  return state.room.players.filter((player) => player.id !== self.id);
}

function closePowerupTargetMenu() {
  dom.powerupTargetMenu.classList.add("hidden");
  dom.powerupTargetMenu.innerHTML = "";
}

function positionTargetMenu(clientX, clientY) {
  const margin = 8;
  const menuRect = dom.powerupTargetMenu.getBoundingClientRect();
  const maxLeft = Math.max(margin, window.innerWidth - menuRect.width - margin);
  const maxTop = Math.max(margin, window.innerHeight - menuRect.height - margin);
  const left = Math.min(Math.max(margin, clientX), maxLeft);
  const top = Math.min(Math.max(margin, clientY), maxTop);
  dom.powerupTargetMenu.style.left = `${left}px`;
  dom.powerupTargetMenu.style.top = `${top}px`;
}

function openPowerupTargetMenu(powerup, event) {
  const targets = activeAttackTargets();
  dom.powerupTargetMenu.innerHTML = "";

  const title = document.createElement("div");
  title.className = "target-menu-title";
  title.textContent = `Target for ${powerup.label}`;
  dom.powerupTargetMenu.appendChild(title);

  if (!targets.length) {
    const empty = document.createElement("div");
    empty.className = "target-empty";
    empty.textContent = "No active targets.";
    dom.powerupTargetMenu.appendChild(empty);
    dom.powerupTargetMenu.classList.remove("hidden");
    positionTargetMenu(event.clientX, event.clientY);
    return;
  }

  targets.forEach((target) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "target-option";
    option.textContent = target.name;
    option.addEventListener("click", () => {
      socket.emit("usePowerup", {
        powerupId: powerup.id,
        targetId: target.id
      });
      closePowerupTargetMenu();
    });
    dom.powerupTargetMenu.appendChild(option);
  });

  dom.powerupTargetMenu.classList.remove("hidden");
  positionTargetMenu(event.clientX, event.clientY);
}

function groupedPowerups(powerups) {
  const map = new Map();
  powerups.forEach((powerup) => {
    const prev = map.get(powerup.id);
    if (prev) {
      prev.count += 1;
    } else {
      map.set(powerup.id, { ...powerup, count: 1 });
    }
  });
  return [...map.values()];
}

function renderPowerups() {
  dom.powerupTray.innerHTML = "";
  const self = currentSelf();
  if (!self) return;
  if (isHumanityMode()) {
    const msg = document.createElement("p");
    msg.className = "muted small";
    msg.textContent = "Powerups disabled in this mode.";
    dom.powerupTray.appendChild(msg);
    return;
  }

  const phase = state.room?.phase;
  const disabledGlobal = phase !== "round" || self.submitted;

  const grouped = groupedPowerups(self.powerups || []);
  if (!grouped.length) {
    const msg = document.createElement("p");
    msg.className = "muted small";
    msg.textContent = "No powerups available.";
    dom.powerupTray.appendChild(msg);
    return;
  }

  grouped.forEach((powerup) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "powerup-btn tilt-card";

    const name = document.createElement("div");
    name.className = "powerup-name";
    name.textContent = `${POWERUP_ICONS[powerup.id] || powerup.label} x${powerup.count}`;

    const meta = document.createElement("div");
    meta.className = "powerup-meta";
    meta.textContent = powerup.description;

    btn.appendChild(name);
    btn.appendChild(meta);

    btn.disabled = disabledGlobal;

    btn.addEventListener("click", (event) => {
      if (powerup.type === "attack") {
        openPowerupTargetMenu(powerup, event);
        return;
      }

      socket.emit("usePowerup", {
        powerupId: powerup.id,
        targetId: ""
      });
    });

    dom.powerupTray.appendChild(btn);
  });
}

function renderPrompt() {
  if (!state.room) return;

  const self = currentSelf();
  if (!self) return;
  const humanityMode = isHumanityMode();

  dom.roundLabel.textContent = String(state.room.roundNumber || 0);
  dom.timerLabel.textContent = formatTimer(state.roundSeconds);
  dom.phaseLabel.textContent = phaseLabel(state.room.phase);
  dom.referenceTitle.textContent = humanityMode ? "Black Card Prompt" : "Target Reference";

  const roundStage =
    state.room.phase === "round" ? urgencyStage(state.roundSeconds) : "";
  applyTimerUrgency(dom.timerLabel, roundStage);
  applyPromptUrgency(roundStage);

  const submittedCount = state.room.players.filter((p) => p.submitted).length;
  dom.promptStatus.textContent = `${submittedCount}/${state.room.players.length} submitted`;

  if (state.room.phase === "generating") {
    dom.promptPhaseNote.textContent = "Generating all player images...";
  } else if (Date.now() < self.effects.lockUntil) {
    const lockLeft = Math.max(0, Math.ceil((self.effects.lockUntil - Date.now()) / 1000));
    dom.promptPhaseNote.textContent = `Lock active: ${lockLeft}s`;
  } else {
    dom.promptPhaseNote.textContent = "";
  }

  if (humanityMode) {
    dom.referenceImg.classList.add("hidden");
    dom.referencePromptOnly.classList.remove("hidden");
    dom.referencePromptOnly.textContent = state.reference.promptLabel || "Black card prompt loading...";
    dom.referencePrompt.textContent = "Write an image prompt that lands this black card.";
    dom.blackoutOverlay.classList.add("hidden");
    dom.promptInput.placeholder = "Write your image prompt response to the black card...";
  } else {
    dom.referenceImg.classList.remove("hidden");
    dom.referencePromptOnly.classList.add("hidden");
    setImageSource(dom.referenceImg, state.reference.url, "Reference");
    dom.referencePrompt.textContent =
      state.reference.promptLabel || "Reference prompt hidden until round end.";
    dom.promptInput.placeholder = "Describe the reference image in detail";
  }

  const disablePrompt = state.room.phase !== "round" || self.submitted;
  dom.promptInput.disabled = disablePrompt;
  dom.submitBtn.disabled = disablePrompt;

  if (document.activeElement !== dom.promptInput) {
    dom.promptInput.value = self.prompt || "";
  }
  dom.charCount.textContent = `${dom.promptInput.value.length}/${MAX_PROMPT_CHARS}`;

  if (state.room.phase !== "round") {
    closePowerupTargetMenu();
  }
  renderPowerups();
  renderPromptScoreboard();
  updateBlackoutOverlay();

  const clutch = roundStage === "critical" && state.room.phase === "round" && !self.submitted;
  dom.sabotageToast.classList.toggle("is-clutch", clutch);
}

function showcaseProgress() {
  const data = state.showcase;
  if (!data || !Array.isArray(data.entries) || !data.reference) return null;

  const referenceSeconds = Math.max(1, Number(data.referenceSeconds) || 0);
  const entrySeconds = Math.max(1, Number(data.entrySeconds) || 0);
  const totalMs = Math.max(1000, Math.round((referenceSeconds + entrySeconds * data.entries.length) * 1000));
  const elapsedMsRaw = Math.max(0, Date.now() - (Number(data.startedAt) || Date.now()));
  const elapsedMs = Math.min(totalMs, elapsedMsRaw);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const referenceMs = referenceSeconds * 1000;

  if (elapsedMs < referenceMs || data.entries.length === 0) {
    return {
      inReference: true,
      stageKey: "reference",
      elapsedMs,
      remainingMs,
      referenceMs,
      entryIndex: -1,
      entry: null,
      entryElapsedMs: 0,
      entryMs: entrySeconds * 1000,
      totalEntries: data.entries.length
    };
  }

  const entryMs = entrySeconds * 1000;
  const afterRefMs = elapsedMs - referenceMs;
  const rawIndex = Math.floor(afterRefMs / entryMs);
  const entryIndex = Math.max(0, Math.min(data.entries.length - 1, rawIndex));
  const entryElapsedMs = Math.max(0, afterRefMs - entryIndex * entryMs);

  return {
    inReference: false,
    stageKey: `entry-${entryIndex}`,
    elapsedMs,
    remainingMs,
    referenceMs,
    entryIndex,
    entry: data.entries[entryIndex] || null,
    entryElapsedMs,
    entryMs,
    totalEntries: data.entries.length
  };
}

function triggerShowcaseTransition() {
  dom.showcasePanels.classList.remove("is-transitioning");
  void dom.showcasePanels.offsetWidth;
  dom.showcasePanels.classList.add("is-transitioning");
}

function renderShowcaseSabotage(entry) {
  dom.showcaseSabotageList.innerHTML = "";
  if (entry?.imageFailed) {
    const failed = document.createElement("li");
    failed.className = "showcase-sabotage-item";
    failed.textContent = "Image generation failed. Placeholder shown.";
    dom.showcaseSabotageList.appendChild(failed);
  }

  const details = Array.isArray(entry?.sabotageDetails) ? entry.sabotageDetails : [];
  if (details.length) {
    details.forEach((line) => {
      const li = document.createElement("li");
      li.className = "showcase-sabotage-item";
      li.textContent = line;
      dom.showcaseSabotageList.appendChild(li);
    });
    return;
  }

  const clean = document.createElement("li");
  clean.className = "showcase-sabotage-clean";
  clean.textContent = "No sabotage";
  dom.showcaseSabotageList.appendChild(clean);
}

function renderShowcase() {
  if (!state.room || state.room.phase !== "showcase") return;

  const progress = showcaseProgress();
  if (!progress) {
    dom.showcaseStepLabel.textContent = "Showcase";
    dom.showcaseStatus.textContent = "Preparing comparison...";
    dom.showcaseTimerLabel.textContent = "00:00";
    return;
  }

  if (progress.stageKey !== state.showcaseStageKey) {
    state.showcaseStageKey = progress.stageKey;
    triggerShowcaseTransition();
    if (progress.inReference) {
      playPhaseStinger("showcase");
    } else {
      playTone(540, {
        type: "triangle",
        hold: 0.018,
        release: 0.09,
        level: 0.2
      });
    }
  }

  dom.showcaseTimerLabel.textContent = formatTimer(Math.ceil(progress.remainingMs / 1000));

  const referencePrompt = String(state.showcase?.reference?.prompt || "");
  const promptOnly = Boolean(state.showcase?.reference?.promptOnly) || isHumanityMode();
  if (promptOnly) {
    dom.showcaseReferenceImg.classList.add("hidden");
    dom.showcaseReferencePromptOnly.classList.remove("hidden");
    dom.showcaseReferencePromptOnly.textContent = referencePrompt || "Black card prompt loading...";
  } else {
    dom.showcaseReferenceImg.classList.remove("hidden");
    dom.showcaseReferencePromptOnly.classList.add("hidden");
    setImageSource(dom.showcaseReferenceImg, state.showcase?.reference?.url, "Reference image");
  }

  if (progress.inReference) {
    dom.showcasePanels.classList.add("reference-only");
    dom.showcaseEntryCard.classList.add("hidden");
    dom.showcaseStepLabel.textContent = promptOnly ? "Black Card Reveal" : "Reference Reveal";
    dom.showcaseStatus.textContent = promptOnly
      ? "Read it closely. Slop cinema starts in a moment."
      : "Memorize the target. Slop cinema starts in a moment.";
    dom.showcaseReferencePrompt.textContent = typewriterText(
      referencePrompt,
      progress.elapsedMs,
      progress.referenceMs * 0.9
    );

    return;
  }

  dom.showcasePanels.classList.remove("reference-only");
  dom.showcaseEntryCard.classList.remove("hidden");
  const entry = progress.entry || {};
  dom.showcaseStepLabel.textContent = `Comparison ${progress.entryIndex + 1}/${progress.totalEntries}`;
  dom.showcaseStatus.textContent = promptOnly
    ? "Anonymous entries versus the black card. Voting opens when the curtain falls."
    : "Anonymous masterpiece showcase. Voting opens when the curtain falls.";
  dom.showcaseReferencePrompt.textContent = referencePrompt;

  dom.showcaseEntryLabel.textContent = `Entry ${progress.entryIndex + 1}`;
  setImageSource(dom.showcaseEntryImg, entry.imageUrl, `Entry ${progress.entryIndex + 1} image`);
  dom.showcaseEntryPrompt.textContent = entry.prompt || "(empty prompt)";
  renderShowcaseSabotage(entry);
}

function buildVoteCard(submission, entryNumber, selfId, canVote) {
  const entryLabel = `Entry ${entryNumber}`;
  const card = document.createElement("article");
  card.className = "vote-card tilt-card";

  const img = document.createElement("img");
  img.className = "vote-image";
  setImageSource(img, submission.imageUrl, `${entryLabel} output`);
  img.addEventListener("click", () => {
    openImageLightbox(submission.imageUrl, `${entryLabel}`);
  });

  const body = document.createElement("div");
  body.className = "vote-body";

  const player = document.createElement("div");
  player.className = "vote-player";
  player.textContent = entryLabel;

  const votes = document.createElement("div");
  votes.className = "vote-count";
  const voteCount = Number(submission.votes) || 0;
  votes.textContent = `${voteCount} vote${voteCount === 1 ? "" : "s"}`;

  const sabotageWrap = document.createElement("div");
  sabotageWrap.className = "vote-sabotage";
  const sabotageDetails = Array.isArray(submission.sabotageDetails) ? submission.sabotageDetails : [];
  if (submission.sabotaged && sabotageDetails.length > 0) {
    const title = document.createElement("div");
    title.className = "vote-sabotage-title";
    title.textContent = "Sabotaged";
    sabotageWrap.appendChild(title);
    sabotageDetails.forEach((line) => {
      const item = document.createElement("div");
      item.className = "vote-sabotage-item";
      item.textContent = line;
      sabotageWrap.appendChild(item);
    });
  } else {
    const clean = document.createElement("div");
    clean.className = "vote-sabotage-clean";
    clean.textContent = "No sabotage";
    sabotageWrap.appendChild(clean);
  }

  const button = document.createElement("button");
  button.className = "vote-button";

  if (submission.playerId === selfId) {
    button.textContent = "Your entry";
    button.disabled = true;
  } else if (!canVote) {
    button.textContent = "Voting closed";
    button.disabled = true;
  } else if (state.hasVoted && state.selectedVoteId === submission.playerId) {
    button.textContent = "Vote submitted";
    button.classList.add("selected");
    button.disabled = true;
  } else if (state.hasVoted) {
    button.textContent = "Vote locked";
    button.disabled = true;
  } else {
    button.textContent = "Vote This";
    button.disabled = false;
    button.addEventListener("click", () => {
      socket.emit("castVote", { targetId: submission.playerId });
      state.hasVoted = true;
      state.selectedVoteId = submission.playerId;
      pushFeed(`Voted for ${entryLabel}.`);
      renderVote();
    });
  }

  body.appendChild(player);
  body.appendChild(votes);
  body.appendChild(sabotageWrap);
  body.appendChild(button);

  card.appendChild(img);
  card.appendChild(body);
  return card;
}

function renderVote() {
  if (!state.room) return;

  dom.voteTimerLabel.textContent = formatTimer(state.voteSeconds);
  const voteStage = state.room.phase === "voting" ? urgencyStage(state.voteSeconds) : "";
  applyTimerUrgency(dom.voteTimerLabel, voteStage);
  applyVoteUrgency(voteStage);
  dom.voteGallery.innerHTML = "";

  const reveal = state.reveal || (state.result ? {
    reference: state.result.reference,
    submissions: state.result.submissions
  } : null);

  if (!reveal || !reveal.reference || !Array.isArray(reveal.submissions)) {
    dom.voteStatus.textContent = "Waiting for images to finish generating...";
    dom.votePromptCard.classList.add("hidden");
    return;
  }

  const promptOnly = Boolean(reveal.reference.promptOnly) || isHumanityMode();
  dom.votePromptCard.classList.toggle("hidden", !promptOnly);
  if (promptOnly) {
    dom.votePromptText.textContent = reveal.reference.prompt || "Black card prompt unavailable.";
  }

  if (!promptOnly) {
    const refCard = document.createElement("article");
    refCard.className = "vote-card reference tilt-card";

    const refImg = document.createElement("img");
    refImg.className = "vote-image";
    setImageSource(refImg, reveal.reference.url, "Reference image");
    refImg.addEventListener("click", () => {
      openImageLightbox(reveal.reference.url, "Reference");
    });

    const refBody = document.createElement("div");
    refBody.className = "vote-body";

    const refName = document.createElement("div");
    refName.className = "vote-player";
    refName.textContent = "Reference";

    const refNote = document.createElement("div");
    refNote.className = "vote-count";
    refNote.textContent = "Target image";

    refBody.appendChild(refName);
    refBody.appendChild(refNote);
    refCard.appendChild(refImg);
    refCard.appendChild(refBody);

    dom.voteGallery.appendChild(refCard);
  }

  const canVote = state.room.phase === "voting";
  const selfId = state.room.self.id;

  reveal.submissions.forEach((submission, idx) => {
    const card = buildVoteCard(submission, idx + 1, selfId, canVote);
    dom.voteGallery.appendChild(card);
  });

  if (state.room.phase === "voting") {
    if (state.voteProgress.requiredVotes > 0) {
      const left = Math.max(0, state.voteProgress.requiredVotes - state.voteProgress.totalVotes);
      dom.voteStatus.textContent = `Votes: ${state.voteProgress.totalVotes}/${state.voteProgress.requiredVotes}. Waiting on ${left} player${left === 1 ? "" : "s"}.`;
    } else {
      dom.voteStatus.textContent = "Cast your vote.";
    }
  } else {
    dom.voteStatus.textContent = "Voting complete.";
  }
}

function scoreMetricFor(playerId) {
  if (!state.result || !Array.isArray(state.result.submissions)) return "";
  const entry = state.result.submissions.find((sub) => sub.playerId === playerId);
  if (!entry) return "";
  if (state.room && state.room.players.length === 2 && !isHumanityMode()) {
    return Number.isFinite(entry.score) ? `${entry.score}% similarity` : "Similarity pending";
  }
  return `${entry.votes || 0} votes`;
}

function renderResults() {
  if (!state.room) return;
  const self = currentSelf();

  const board = state.result?.leaderboard?.length
    ? [...state.result.leaderboard]
    : sortedPlayers().map((p) => ({ id: p.id, name: p.name, score: p.score }));

  const submissions = Array.isArray(state.result?.submissions) ? [...state.result.submissions] : [];
  const winnerIds = Array.isArray(state.result?.winnerIds) ? state.result.winnerIds : [];

  const rankedByRound = submissions.sort((a, b) => {
    if (state.room.players.length === 2 && !isHumanityMode()) {
      return (Number(b.score) || 0) - (Number(a.score) || 0);
    }
    return (Number(b.votes) || 0) - (Number(a.votes) || 0);
  });

  const roundWinnerId = winnerIds[0] || rankedByRound[0]?.playerId || "";
  const roundRunnerId = rankedByRound.find((entry) => entry.playerId !== roundWinnerId)?.playerId || "";

  const winner = (roundWinnerId && board.find((player) => player.id === roundWinnerId)) || board[0] || null;
  const runner = (roundRunnerId && board.find((player) => player.id === roundRunnerId)) || board[1] || null;
  const winnerSubmission = submissions.find((sub) => sub.playerId === winner?.id);
  const hasRoundWinner = Boolean(winner && !state.result?.tie);
  if (dom.winnerCard) {
    dom.winnerCard.classList.toggle("is-celebrating", hasRoundWinner);
  }

  if (state.room.phase === "ended") {
    dom.resultTitle.textContent = "Match Complete";
    const matchWinner = board[0] || winner;
    dom.resultSubtitle.textContent = matchWinner
      ? `${matchWinner.name} reached ${state.room.toWin} points and wins the game.`
      : "Match ended.";
  } else if (state.result?.tie) {
    dom.resultTitle.textContent = `Round ${state.room.roundNumber} Tied`;
    dom.resultSubtitle.textContent = isHumanityMode()
      ? "Tiebreaker next round."
      : "Chaos tiebreaker next round with double powerups.";
  } else {
    dom.resultTitle.textContent = `Round ${state.room.roundNumber} Results`;
    const roundWinner = (roundWinnerId && board.find((player) => player.id === roundWinnerId)) || winner;
    dom.resultSubtitle.textContent = roundWinner
      ? `${roundWinner.name} won this round.`
      : winner
      ? `${winner.name} won this round.`
      : "Round complete.";
  }

  dom.winnerName.innerHTML = "";
  if (winner) {
    const winnerPlayer = playerById(winner.id) || winner;
    dom.winnerName.appendChild(buildNameRow(winnerPlayer, { avatarSize: "avatar-lg" }));
  } else {
    dom.winnerName.textContent = "No winner";
  }
  dom.winnerMetric.textContent = winner ? (scoreMetricFor(winner.id) || `Score ${winner.score}`) : "-";
  if (state.result?.tie || !winnerSubmission?.prompt) {
    dom.winnerPromptText.textContent = "No winner prompt to reveal for this round.";
  } else {
    dom.winnerPromptText.textContent = winnerSubmission.prompt;
  }

  dom.allPromptsList.innerHTML = "";
  if (!submissions.length) {
    const empty = document.createElement("li");
    empty.className = "all-prompt-empty";
    empty.textContent = "No prompts submitted this round.";
    dom.allPromptsList.appendChild(empty);
  } else {
    submissions.forEach((submission, idx) => {
      const item = document.createElement("li");
      item.className = "all-prompt-item";

      const header = document.createElement("div");
      header.className = "all-prompt-header";
      const player = playerById(submission.playerId);
      const name = player?.name || submission.playerName || `Player ${idx + 1}`;
      const metric = scoreMetricFor(submission.playerId);
      header.textContent = `${idx + 1}. ${name}${metric ? ` | ${metric}` : ""}`;

      const text = document.createElement("p");
      text.className = "all-prompt-text";
      text.textContent = submission.prompt || "(empty prompt)";

      item.appendChild(header);
      item.appendChild(text);
      dom.allPromptsList.appendChild(item);
    });
  }

  dom.runnerName.innerHTML = "";
  if (runner) {
    const runnerPlayer = playerById(runner.id) || runner;
    dom.runnerName.appendChild(buildNameRow(runnerPlayer, { avatarSize: "avatar-lg" }));
  } else {
    dom.runnerName.textContent = "-";
  }
  dom.runnerMetric.textContent = runner ? (scoreMetricFor(runner.id) || `Score ${runner.score}`) : "-";

  dom.resultsTableBody.innerHTML = "";
  board.forEach((player, idx) => {
    const tr = document.createElement("tr");

    const rank = document.createElement("td");
    rank.className = "rank";
    rank.textContent = String(idx + 1);

    const name = document.createElement("td");
    const fullPlayer = playerById(player.id) || player;
    name.appendChild(
      buildNameRow(fullPlayer, {
        avatarSize: "avatar-sm",
        selfSuffix: player.id === state.room.self.id
      })
    );

    const score = document.createElement("td");
    score.textContent = `${player.score}`;

    tr.appendChild(rank);
    tr.appendChild(name);
    tr.appendChild(score);

    dom.resultsTableBody.appendChild(tr);
  });

  const promptText = state.result?.reference?.prompt || state.reference.promptLabel || "Reference prompt not available.";
  dom.resultsReferencePrompt.textContent = promptText;

  const promptOnlyReference = Boolean(state.result?.reference?.promptOnly) || isHumanityMode();
  dom.resultsReferenceThumb.classList.toggle("hidden", promptOnlyReference);
  if (!promptOnlyReference) {
    const imageUrl = state.result?.reference?.url || state.reference.url;
    setImageSource(dom.resultsReferenceImg, imageUrl, "Reference");
  }

  const inReadyUp = state.room.phase === "intermission";
  const readyCount = state.room.players.filter((player) => player.readyForNextRound).length;
  const readyTotal = state.room.players.length;

  dom.readyNextBtn.classList.toggle("hidden", !inReadyUp);
  if (inReadyUp && self) {
    dom.readyNextBtn.textContent = self.readyForNextRound
      ? "Ready (Click To Unready)"
      : "Ready For Next Round";
  }
  dom.backToLobbyBtn.classList.toggle("hidden", !(state.room.phase === "ended" && isHost()));

  if (inReadyUp) {
    const chaosSuffix = state.room.tiebreakerNextRound
      ? isHumanityMode()
        ? " Tiebreaker is queued."
        : " Chaos tiebreaker is queued."
      : "";
    dom.intermissionLabel.textContent = `Ready check: ${readyCount}/${readyTotal}.${chaosSuffix}`;
  } else if (state.room.phase === "ended") {
    dom.intermissionLabel.textContent = isHost()
      ? "Host can send everyone back to lobby."
      : "Waiting for host to return to lobby.";
  } else {
    dom.intermissionLabel.textContent = "";
  }
}

function updateBlackoutOverlay() {
  if (isHumanityMode()) {
    dom.blackoutOverlay.classList.add("hidden");
    return;
  }
  const hidden = Date.now() < state.blackoutUntil;
  dom.blackoutOverlay.classList.toggle("hidden", !hidden);
}

function updateSabotageToast() {
  const active = Date.now() < state.sabotageUntil;
  dom.sabotageToast.classList.toggle("hidden", !active);
  if (active) {
    dom.sabotageToast.textContent = state.sabotageMessage;
  }
}

function renderAll() {
  setRoomBadge();
  if (!state.room) {
    closePowerupTargetMenu();
    setVisibleScreen("auth");
    if (!state.soundEnabled) {
      stopAmbientLoop();
    } else {
      applyAmbientForPhase("lobby");
    }
    renderLoading();
    return;
  }

  renderLobby();
  renderAvatarSelection();
  renderPrompt();
  renderShowcase();
  renderVote();
  renderResults();

  setVisibleScreen(phaseToScreen(state.room.phase));
  if (state.room.phase !== "round") {
    closePowerupTargetMenu();
  }
  if (state.soundEnabled) {
    applyAmbientForPhase(state.room.phase);
  } else {
    stopAmbientLoop();
  }
  renderLoading();
}

function resetRoundTransientState() {
  state.reveal = null;
  state.result = null;
  state.showcase = null;
  state.showcaseStageKey = "";
  state.hasVoted = false;
  state.selectedVoteId = "";
  state.voteProgress = {
    totalVotes: 0,
    requiredVotes: 0
  };
  state.roundUrgencyStage = "";
  state.voteUrgencyStage = "";
  state.roundLastBeepSecond = -1;
  state.voteLastBeepSecond = -1;
}

// UI handlers

try {
  state.soundEnabled = window.localStorage.getItem("psa-sound-enabled") === "1";
} catch {
  state.soundEnabled = false;
}
updateSoundToggleUi();

dom.soundToggleBtn.addEventListener("click", () => {
  if (state.soundEnabled) {
    playUiClick();
  }
  setSoundEnabled(!state.soundEnabled);
});

document.addEventListener("pointerdown", () => {
  if (!state.soundEnabled || audioEngine.unlocked) return;
  unlockAudio().then((ok) => {
    if (!ok) return;
    applyAmbientForPhase(state.room?.phase || "lobby");
  });
});

document.addEventListener("keydown", () => {
  if (!state.soundEnabled || audioEngine.unlocked) return;
  unlockAudio().then((ok) => {
    if (!ok) return;
    applyAmbientForPhase(state.room?.phase || "lobby");
  });
});

document.addEventListener("click", (event) => {
  if (!state.soundEnabled) return;
  if (!(event.target instanceof Element)) return;
  const interactive = event.target.closest(
    "button, .vote-image, .avatar-option, .mode-option, .target-option"
  );
  if (!interactive || interactive.id === "soundToggleBtn") return;
  if (interactive instanceof HTMLButtonElement && interactive.disabled) return;
  playUiClick();
});

dom.createBtn.addEventListener("click", () => {
  const name = dom.nameInput.value.trim();
  socket.emit("createRoom", { name });
});

dom.joinBtn.addEventListener("click", () => {
  const name = dom.nameInput.value.trim();
  const roomId = dom.joinCodeInput.value.trim().toUpperCase();
  socket.emit("joinRoom", { name, roomId });
});

dom.startBtn.addEventListener("click", () => {
  socket.emit("startGame");
});

dom.submitBtn.addEventListener("click", () => {
  socket.emit("submitPrompt");
});

dom.readyNextBtn.addEventListener("click", () => {
  const self = currentSelf();
  if (!state.room || state.room.phase !== "intermission" || !self) return;
  socket.emit("setReadyForNextRound", { ready: !self.readyForNextRound });
});

dom.backToLobbyBtn.addEventListener("click", () => {
  socket.emit("backToLobby");
});

dom.authLoginBtn.addEventListener("click", () => {
  submitAuth("login");
});

dom.authRegisterBtn.addEventListener("click", () => {
  submitAuth("register");
});

dom.authLogoutBtn.addEventListener("click", () => {
  switchToGuest();
});

dom.promptInput.addEventListener("input", () => {
  dom.charCount.textContent = `${dom.promptInput.value.length}/${MAX_PROMPT_CHARS}`;

  if (!state.room || state.room.phase !== "round") return;

  clearTimeout(state.inputDebounce);
  state.inputDebounce = setTimeout(() => {
    socket.emit("updatePrompt", { prompt: dom.promptInput.value });
  }, 90);
});

document.addEventListener("pointerdown", (event) => {
  if (dom.powerupTargetMenu.classList.contains("hidden")) return;
  const target = event.target;
  const insideMenu = target instanceof Node ? dom.powerupTargetMenu.contains(target) : false;
  const onPowerupButton =
    target instanceof Element ? Boolean(target.closest(".powerup-btn")) : false;
  if (!insideMenu && !onPowerupButton) {
    closePowerupTargetMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePowerupTargetMenu();
    closeImageLightbox();
  }
});

window.addEventListener("resize", () => {
  closePowerupTargetMenu();
});

dom.imageLightboxClose.addEventListener("click", () => {
  closeImageLightbox();
});

dom.imageLightbox.addEventListener("click", (event) => {
  if (event.target === dom.imageLightbox) {
    closeImageLightbox();
  }
});

// Socket handlers

socket.on("connect", () => {
  state.boundSocketId = "";
  state.bindSocketToken = "";
  state.bindSocketTokenExpiresAt = 0;
});

socket.on("bindSocketChallenge", async (payload) => {
  const token = String(payload?.bindToken || "").trim();
  if (!token) return;
  state.bindSocketToken = token;
  state.bindSocketTokenExpiresAt = Number(payload?.expiresAt) || 0;
  await bindCurrentSocketAccount(false);
});

socket.on("roomCreated", (payload) => {
  dom.joinCodeInput.value = payload.roomId;
  pushFeed(`Room created: ${payload.roomId}`);
});

socket.on("avatarCatalog", (payload) => {
  state.avatarCatalogLoaded = true;
  state.avatarCatalog = Array.isArray(payload?.avatars) ? payload.avatars : [];
  renderAll();
});

socket.on("billingSnapshot", (payload) => {
  syncBilling(payload);
  syncAuth(payload);
  renderAll();
});

socket.on("roomSnapshot", (payload) => {
  const prevPhase = state.room?.phase;
  state.room = payload;
  state.gameModes = Array.isArray(payload?.gameModes) ? payload.gameModes : state.gameModes;
  syncBilling(payload?.self);
  syncAuth(payload?.self);

  if (payload?.self?.avatarId) {
    state.pendingAvatarId = "";
  }

  if (payload.phase === "lobby" && prevPhase && prevPhase !== "lobby") {
    resetRoundTransientState();
    state.reference.promptLabel = "";
    state.reference.url = "";
  }

  handlePhaseTransition(prevPhase, payload?.phase);

  renderAll();
});

socket.on("roundStarted", (payload) => {
  const prevPhase = state.room?.phase;
  resetRoundTransientState();
  if (state.room) {
    state.room.phase = "round";
  }

  state.reference.url = payload.referenceUrl;
  if (payload.promptVisible) {
    state.reference.promptLabel = payload.referencePrompt || "Black card prompt unavailable.";
  } else {
    state.reference.promptLabel = "Reference prompt hidden until round end.";
  }
  state.roundSeconds = Number(payload.seconds) || 120;
  handleRoundTickFx(state.roundSeconds);
  handlePhaseTransition(prevPhase, "round");

  if (payload.chaosRound) {
    pushFeed("Chaos tiebreaker round started. Double powerups granted.", true);
    showCallout("Chaos round active: double powerups.", true, 2200);
  }

  const grants = payload.grants || {};
  const mine = grants[state.room?.self?.id] || [];
  if (mine.length) {
    pushFeed(`You received ${mine.length} powerup${mine.length > 1 ? "s" : ""}.`);
  }

  renderAll();
});

socket.on("roundTick", (payload) => {
  state.roundSeconds = Number(payload.seconds) || 0;
  if (state.room?.phase === "round") {
    handleRoundTickFx(state.roundSeconds);
  }
  if (state.room?.phase === "round" || state.room?.phase === "generating") {
    renderPrompt();
  }
});

socket.on("generationStarted", () => {
  const prevPhase = state.room?.phase;
  if (state.room) {
    state.room.phase = "generating";
  }
  state.roundUrgencyStage = "";
  state.roundLastBeepSecond = -1;
  pushFeed("Generating images...");
  handlePhaseTransition(prevPhase, "generating");
});

socket.on("promptPatched", (payload) => {
  if (!state.room || !state.room.self) return;
  const previousPrompt = state.room.self.prompt || "";
  state.room.self.prompt = payload.prompt || "";
  dom.promptInput.value = state.room.self.prompt;
  dom.charCount.textContent = `${dom.promptInput.value.length}/${MAX_PROMPT_CHARS}`;
  if (previousPrompt !== state.room.self.prompt) {
    const kind = inferPromptMutationKind(previousPrompt, state.room.self.prompt);
    triggerPromptMutationFx(kind);
    state.lastPromptMutationAt = Date.now();
  }
});

socket.on("blackoutApplied", (payload) => {
  state.blackoutUntil = payload.until || 0;
  triggerBlackoutFx();
  updateBlackoutOverlay();
});

socket.on("sabotageNotice", (payload) => {
  state.sabotageMessage = payload.message || "You were sabotaged.";
  state.sabotageUntil = Date.now() + 3200;
  pushFeed(state.sabotageMessage, true);
  showCallout(state.sabotageMessage, true, 1800);
  updateSabotageToast();
});

socket.on("spyReveal", (payload) => {
  pushFeed(`Spy on ${payload.playerName}: ${payload.text}`);
});

socket.on("revealReady", (payload) => {
  state.reveal = payload;
  if (payload?.reference?.url) {
    state.reference.url = payload.reference.url;
  }
  if (payload?.reference?.prompt && isHumanityMode()) {
    state.reference.promptLabel = payload.reference.prompt;
  }
  renderAll();
});

socket.on("showcasePhase", (payload) => {
  const prevPhase = state.room?.phase;
  state.showcase = payload || null;
  state.showcaseStageKey = "";
  if (state.room) {
    state.room.phase = "showcase";
  }
  handlePhaseTransition(prevPhase, "showcase");
  renderAll();
});

socket.on("votePhase", (payload) => {
  const prevPhase = state.room?.phase;
  if (state.room) {
    state.room.phase = "voting";
  }
  if (payload?.reference) {
    if (!state.reveal) {
      state.reveal = {
        reference: payload.reference,
        submissions: []
      };
    } else {
      state.reveal.reference = payload.reference;
    }
  }
  state.showcase = null;
  state.showcaseStageKey = "";
  state.voteSeconds = Number(payload.seconds) || 120;
  state.voteUrgencyStage = "";
  state.voteLastBeepSecond = -1;
  handleVoteTickFx(state.voteSeconds);
  handlePhaseTransition(prevPhase, "voting");
  state.voteProgress = {
    totalVotes: 0,
    requiredVotes: payload.requiredVotes || state.room?.players?.length || 0
  };
  state.hasVoted = false;
  state.selectedVoteId = "";
  renderAll();
});

socket.on("voteTick", (payload) => {
  state.voteSeconds = Number(payload.seconds) || 0;
  handleVoteTickFx(state.voteSeconds);
  if (state.room?.phase === "voting") {
    renderVote();
  }
});

socket.on("voteUpdate", (payload) => {
  state.voteProgress = {
    totalVotes: payload.totalVotes || 0,
    requiredVotes: payload.requiredVotes || 0
  };
  if (
    state.voteProgress.requiredVotes > 0 &&
    state.voteProgress.totalVotes >= state.voteProgress.requiredVotes
  ) {
    showCallout("All votes are in. Locking results...");
  }
  if (state.room?.phase === "voting") {
    renderVote();
  }
});

socket.on("roundResult", (payload) => {
  state.result = payload;
  state.showcase = null;
  state.showcaseStageKey = "";
  state.reference.promptLabel = isHumanityMode()
    ? payload.reference.prompt
    : `Reference prompt: ${payload.reference.prompt}`;
  if (payload.reference.url) {
    state.reference.url = payload.reference.url;
  }

  if (payload.tie) {
    const tieLabel = isHumanityMode() ? "Tiebreaker queued." : "Chaos tiebreaker queued.";
    pushFeed(`Round tied (${payload.reason}). ${tieLabel}`, true);
    showCallout(`Round tied (${payload.reason}).`, true);
  } else {
    const winner = payload.leaderboard.find((player) => payload.winnerIds.includes(player.id));
    pushFeed(`Round winner: ${winner ? winner.name : "Unknown"}.`);
    if (winner) {
      showCallout(`${winner.name} wins the round.`);
      spawnConfettiBursts(72);
    }
  }

  updateMomentumFromRoundResult(payload);

  renderAll();
});

socket.on("readyUpStarted", (payload) => {
  const prevPhase = state.room?.phase;
  if (state.room && state.room.phase !== "ended") {
    state.room.phase = "intermission";
  }
  if (payload?.chaosRound) {
    pushFeed("Chaos tiebreaker round is queued. Everyone click ready to proceed.", true);
  } else if (payload?.tiebreakerRound) {
    pushFeed("Tiebreaker round is queued. Everyone click ready to proceed.", true);
  } else {
    pushFeed("Round complete. Click ready when you want to continue.");
  }
  handlePhaseTransition(prevPhase, "intermission");
  renderAll();
});

socket.on("matchEnded", (payload) => {
  const prevPhase = state.room?.phase;
  pushFeed("Match ended.");
  state.showcase = null;
  state.showcaseStageKey = "";
  if (state.room) {
    state.room.phase = "ended";
  }

  if (!state.result) {
    state.result = {
      tie: false,
      winnerIds: payload.winnerIds || [],
      leaderboard: payload.leaderboard || [],
      submissions: state.reveal?.submissions || [],
      reference: {
        prompt: state.reference.promptLabel,
        url: state.reference.url
      }
    };
  }

  const winners = Array.isArray(payload?.winnerIds) ? payload.winnerIds : [];
  if (winners.length) {
    spawnConfettiBursts(120);
    const winnerName = playerById(winners[0])?.name || "Winner";
    showCallout(`${winnerName} wins the match!`, false, 2600);
  }
  handlePhaseTransition(prevPhase, "ended");

  renderAll();
});

socket.on("systemMessage", (payload) => {
  pushFeed(payload.message);
});

socket.on("errorMessage", (payload) => {
  pushFeed(payload.message, true);
});

socket.on("billingRequired", (payload) => {
  const needed = Number(payload?.neededCents) || 0;
  const msg = `Credits required before round start. Add at least ${formatMoney(needed)}.`;
  pushFeed(msg, true);
});

socket.on("disconnect", () => {
  state.boundSocketId = "";
  state.bindSocketToken = "";
  state.bindSocketTokenExpiresAt = 0;
  pushFeed("Disconnected from server.", true);
});

// Transient visual updates
setInterval(() => {
  updateBlackoutOverlay();
  updateSabotageToast();

  if (!state.room) return;

  if ((state.room.phase === "round" || state.room.phase === "generating") && currentSelf()) {
    const currentText = `${dom.promptInput.value.length}/${MAX_PROMPT_CHARS}`;
    if (dom.charCount.textContent !== currentText) {
      dom.charCount.textContent = currentText;
    }
  }

  if (state.room.phase === "showcase") {
    renderShowcase();
  }
}, 250);

renderFeed();
renderAll();
refreshAuthFromApi();
refreshBillingFromApi();

const checkoutState = new URLSearchParams(window.location.search).get("checkout");
if (checkoutState === "success") {
  pushFeed("Payment completed. Credits will appear in a few seconds.");
  refreshBillingFromApi();
} else if (checkoutState === "cancel") {
  pushFeed("Checkout cancelled.");
}
if (checkoutState) {
  const cleaned = new URL(window.location.href);
  cleaned.searchParams.delete("checkout");
  window.history.replaceState({}, "", cleaned.toString());
}

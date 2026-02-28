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
  lobbyPlayersGrid: document.getElementById("lobbyPlayersGrid"),
  lobbyScoreboard: document.getElementById("lobbyScoreboard"),

  roundLabel: document.getElementById("roundLabel"),
  timerLabel: document.getElementById("timerLabel"),
  phaseLabel: document.getElementById("phaseLabel"),
  promptStatus: document.getElementById("promptStatus"),
  promptPhaseNote: document.getElementById("promptPhaseNote"),

  sabotageToast: document.getElementById("sabotageToast"),
  referenceImg: document.getElementById("referenceImg"),
  referencePrompt: document.getElementById("referencePrompt"),
  blackoutOverlay: document.getElementById("blackoutOverlay"),
  promptInput: document.getElementById("promptInput"),
  charCount: document.getElementById("charCount"),
  powerupTray: document.getElementById("powerupTray"),
  scoreboardList: document.getElementById("scoreboardList"),

  voteTimerLabel: document.getElementById("voteTimerLabel"),
  voteGallery: document.getElementById("voteGallery"),
  voteStatus: document.getElementById("voteStatus"),

  showcaseStepLabel: document.getElementById("showcaseStepLabel"),
  showcaseStatus: document.getElementById("showcaseStatus"),
  showcaseTimerLabel: document.getElementById("showcaseTimerLabel"),
  showcasePanels: document.getElementById("showcasePanels"),
  showcaseEntryCard: document.getElementById("showcaseEntryCard"),
  showcaseReferenceImg: document.getElementById("showcaseReferenceImg"),
  showcaseReferencePrompt: document.getElementById("showcaseReferencePrompt"),
  showcaseEntryLabel: document.getElementById("showcaseEntryLabel"),
  showcaseEntryImg: document.getElementById("showcaseEntryImg"),
  showcaseEntryPrompt: document.getElementById("showcaseEntryPrompt"),
  showcaseSabotageList: document.getElementById("showcaseSabotageList"),

  resultTitle: document.getElementById("resultTitle"),
  resultSubtitle: document.getElementById("resultSubtitle"),
  winnerName: document.getElementById("winnerName"),
  winnerMetric: document.getElementById("winnerMetric"),
  winnerPromptText: document.getElementById("winnerPromptText"),
  runnerName: document.getElementById("runnerName"),
  runnerMetric: document.getElementById("runnerMetric"),
  resultsTableBody: document.getElementById("resultsTableBody"),
  resultsReferencePrompt: document.getElementById("resultsReferencePrompt"),
  resultsReferenceImg: document.getElementById("resultsReferenceImg"),
  intermissionLabel: document.getElementById("intermissionLabel"),

  feedList: document.getElementById("feedList"),
  powerupTargetMenu: document.getElementById("powerupTargetMenu"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingText: document.getElementById("loadingText"),
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

function isHost() {
  return Boolean(state.room && state.room.self.id === state.room.hostId);
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
  if (phase === "starting") return "Mixing reference mayhem...";
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

function renderLobby() {
  if (!state.room) return;

  dom.lobbyTitle.textContent = `Room #${state.room.roomId}`;
  dom.codeChip.textContent = `CODE: ${state.room.roomId}`;

  const playerCount = state.room.players.length;
  if (state.room.phase === "starting") {
    dom.lobbyStatus.textContent = "Match starting...";
  } else if (playerCount < 2) {
    dom.lobbyStatus.textContent = "Waiting for more players to join...";
  } else {
    dom.lobbyStatus.textContent = `${playerCount} players in room. Ready to start.`;
  }

  dom.lobbyPlayersGrid.innerHTML = "";
  state.room.players.forEach((player) => {
    const card = document.createElement("article");
    card.className = "player-card";
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
    meta.textContent = `${role} | Score ${player.score} | Powerups ${player.powerupCount}`;

    card.appendChild(head);
    card.appendChild(meta);
    dom.lobbyPlayersGrid.appendChild(card);
  });

  for (let i = state.room.players.length; i < MAX_PLAYERS; i += 1) {
    const empty = document.createElement("article");
    empty.className = "player-card player-empty";
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

  const canStart = isHost() && playerCount >= 2 && state.room.phase !== "starting";
  dom.startBtn.disabled = !canStart;

  if (!isHost()) {
    dom.lobbyHint.textContent = "Only the host can start the match.";
  } else if (playerCount < 2) {
    dom.lobbyHint.textContent = "Need at least 2 players to begin.";
  } else {
    dom.lobbyHint.textContent = "Start when everyone is ready.";
  }
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
    right.textContent = `${player.score}/${state.room.toWin} | powerups ${player.powerupCount}${submitted}`;

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
    btn.className = "powerup-btn";

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

  dom.roundLabel.textContent = String(state.room.roundNumber || 0);
  dom.timerLabel.textContent = formatTimer(state.roundSeconds);
  dom.phaseLabel.textContent = phaseLabel(state.room.phase);

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

  setImageSource(dom.referenceImg, state.reference.url, "Reference");
  dom.referencePrompt.textContent = state.reference.promptLabel || "Reference prompt hidden until round end.";

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
  }

  dom.showcaseTimerLabel.textContent = formatTimer(Math.ceil(progress.remainingMs / 1000));

  const referencePrompt = String(state.showcase?.reference?.prompt || "");
  setImageSource(dom.showcaseReferenceImg, state.showcase?.reference?.url, "Reference image");

  if (progress.inReference) {
    dom.showcasePanels.classList.add("reference-only");
    dom.showcaseEntryCard.classList.add("hidden");
    dom.showcaseStepLabel.textContent = "Reference Reveal";
    dom.showcaseStatus.textContent = "Memorize the target. Slop cinema starts in a moment.";
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
  dom.showcaseStatus.textContent = "Anonymous masterpiece showcase. Voting opens when the curtain falls.";
  dom.showcaseReferencePrompt.textContent = referencePrompt;

  dom.showcaseEntryLabel.textContent = `Entry ${progress.entryIndex + 1}`;
  setImageSource(dom.showcaseEntryImg, entry.imageUrl, `Entry ${progress.entryIndex + 1} image`);
  dom.showcaseEntryPrompt.textContent = entry.prompt || "(empty prompt)";
  renderShowcaseSabotage(entry);
}

function buildVoteCard(submission, entryNumber, selfId, canVote) {
  const entryLabel = `Entry ${entryNumber}`;
  const card = document.createElement("article");
  card.className = "vote-card";

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
  dom.voteGallery.innerHTML = "";

  const reveal = state.reveal || (state.result ? {
    reference: state.result.reference,
    submissions: state.result.submissions
  } : null);

  if (!reveal || !reveal.reference || !Array.isArray(reveal.submissions)) {
    dom.voteStatus.textContent = "Waiting for images to finish generating...";
    return;
  }

  const refCard = document.createElement("article");
  refCard.className = "vote-card reference";

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
  if (state.room && state.room.players.length === 2) {
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

  const winner = board[0] || null;
  const runner = board[1] || null;
  const winnerSubmission = state.result?.submissions?.find((sub) => sub.playerId === winner?.id);

  if (state.room.phase === "ended") {
    dom.resultTitle.textContent = "Match Complete";
    dom.resultSubtitle.textContent = winner
      ? `${winner.name} reached ${state.room.toWin} points and wins the game.`
      : "Match ended.";
  } else if (state.result?.tie) {
    dom.resultTitle.textContent = `Round ${state.room.roundNumber} Tied`;
    dom.resultSubtitle.textContent = "Chaos tiebreaker next round with double powerups.";
  } else {
    dom.resultTitle.textContent = `Round ${state.room.roundNumber} Results`;
    dom.resultSubtitle.textContent = winner
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

  const imageUrl = state.result?.reference?.url || state.reference.url;
  setImageSource(dom.resultsReferenceImg, imageUrl, "Reference");

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
    const chaosSuffix = state.room.tiebreakerNextRound ? " Chaos tiebreaker is queued." : "";
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
}

// UI handlers

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

socket.on("roomCreated", (payload) => {
  dom.joinCodeInput.value = payload.roomId;
  pushFeed(`Room created: ${payload.roomId}`);
});

socket.on("avatarCatalog", (payload) => {
  state.avatarCatalogLoaded = true;
  state.avatarCatalog = Array.isArray(payload?.avatars) ? payload.avatars : [];
  renderAll();
});

socket.on("roomSnapshot", (payload) => {
  const prevPhase = state.room?.phase;
  state.room = payload;

  if (payload?.self?.avatarId) {
    state.pendingAvatarId = "";
  }

  if (payload.phase === "lobby" && prevPhase && prevPhase !== "lobby") {
    resetRoundTransientState();
    state.reference.promptLabel = "";
    state.reference.url = "";
  }

  renderAll();
});

socket.on("roundStarted", (payload) => {
  resetRoundTransientState();

  state.reference.url = payload.referenceUrl;
  state.reference.promptLabel = "Reference prompt hidden until round end.";
  state.roundSeconds = Number(payload.seconds) || 120;

  if (payload.chaosRound) {
    pushFeed("Chaos tiebreaker round started. Double powerups granted.", true);
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
  if (state.room?.phase === "round" || state.room?.phase === "generating") {
    renderPrompt();
  }
});

socket.on("generationStarted", () => {
  pushFeed("Generating images...");
});

socket.on("promptPatched", (payload) => {
  if (!state.room || !state.room.self) return;
  state.room.self.prompt = payload.prompt || "";
  dom.promptInput.value = state.room.self.prompt;
  dom.charCount.textContent = `${dom.promptInput.value.length}/${MAX_PROMPT_CHARS}`;
});

socket.on("blackoutApplied", (payload) => {
  state.blackoutUntil = payload.until || 0;
  updateBlackoutOverlay();
});

socket.on("sabotageNotice", (payload) => {
  state.sabotageMessage = payload.message || "You were sabotaged.";
  state.sabotageUntil = Date.now() + 3200;
  pushFeed(state.sabotageMessage, true);
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
  renderAll();
});

socket.on("showcasePhase", (payload) => {
  state.showcase = payload || null;
  state.showcaseStageKey = "";
  if (state.room) {
    state.room.phase = "showcase";
  }
  renderAll();
});

socket.on("votePhase", (payload) => {
  if (state.room) {
    state.room.phase = "voting";
  }
  state.showcase = null;
  state.showcaseStageKey = "";
  state.voteSeconds = Number(payload.seconds) || 120;
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
  if (state.room?.phase === "voting") {
    renderVote();
  }
});

socket.on("voteUpdate", (payload) => {
  state.voteProgress = {
    totalVotes: payload.totalVotes || 0,
    requiredVotes: payload.requiredVotes || 0
  };
  if (state.room?.phase === "voting") {
    renderVote();
  }
});

socket.on("roundResult", (payload) => {
  state.result = payload;
  state.showcase = null;
  state.showcaseStageKey = "";
  state.reference.promptLabel = `Reference prompt: ${payload.reference.prompt}`;
  if (payload.reference.url) {
    state.reference.url = payload.reference.url;
  }

  if (payload.tie) {
    pushFeed(`Round tied (${payload.reason}). Chaos tiebreaker queued.`, true);
  } else {
    const winner = payload.leaderboard.find((player) => payload.winnerIds.includes(player.id));
    pushFeed(`Round winner: ${winner ? winner.name : "Unknown"}.`);
  }

  renderAll();
});

socket.on("readyUpStarted", (payload) => {
  if (state.room && state.room.phase !== "ended") {
    state.room.phase = "intermission";
  }
  if (payload?.chaosRound) {
    pushFeed("Chaos tiebreaker round is queued. Everyone click ready to proceed.", true);
  } else {
    pushFeed("Round complete. Click ready when you want to continue.");
  }
  renderAll();
});

socket.on("matchEnded", (payload) => {
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

  renderAll();
});

socket.on("systemMessage", (payload) => {
  pushFeed(payload.message);
});

socket.on("errorMessage", (payload) => {
  pushFeed(payload.message, true);
});

socket.on("disconnect", () => {
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

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");
const sharp = require("sharp");
require("dotenv").config({ quiet: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = Number(process.env.PORT || 3000);
const TO_WIN = 5;
const ROUND_SECONDS = 120;
const VOTE_SECONDS = 120;
const SHOWCASE_REFERENCE_SECONDS = Number(process.env.SHOWCASE_REFERENCE_SECONDS || 12);
const SHOWCASE_ENTRY_SECONDS = Number(process.env.SHOWCASE_ENTRY_SECONDS || 14);
const MAX_NAME_LEN = 24;
const MAX_PROMPT_LEN = 320;
const SESSION_PROMPT_POOL_SIZE = 120;
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_IMAGE_MODEL = String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini").trim();
const OPENAI_IMAGE_SIZE = String(process.env.OPENAI_IMAGE_SIZE || "1024x1024").trim();
const OPENAI_IMAGE_QUALITY = String(process.env.OPENAI_IMAGE_QUALITY || "low").trim();
const IMAGE_PROVIDER = String(
  process.env.IMAGE_PROVIDER || (OPENAI_API_KEY ? "openai" : "pollinations")
).trim().toLowerCase();
const BLACK_CARD_PROMPT_FILE = path.join(__dirname, "data", "against-humanity-prompts.json");

const GAME_MODES = {
  classic: {
    id: "classic",
    label: "Classic Slop Battle",
    description: "Reference image + sabotage powerups"
  },
  humanity: {
    id: "humanity",
    label: "AI Slop Against Humanity",
    description: "One black-card prompt. No sabotage."
  }
};

const GAME_MODE_IDS = Object.keys(GAME_MODES);

const rooms = new Map();
const socketToRoom = new Map();
const AVATAR_DIR = path.join(__dirname, "avatars");
const AVATAR_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

const POWERUPS = {
  blackout: {
    id: "blackout",
    label: "Blackout",
    type: "attack",
    description: "Hide target's reference image for 6s"
  },
  scramble: {
    id: "scramble",
    label: "Scramble",
    type: "attack",
    description: "Replace 3 random words in target prompt"
  },
  erase: {
    id: "erase",
    label: "Erase",
    type: "attack",
    description: "Delete 4 random words from target prompt"
  },
  decoy: {
    id: "decoy",
    label: "Decoy",
    type: "attack",
    description: "Inject a misleading phrase into target prompt"
  },
  lock: {
    id: "lock",
    label: "Lock",
    type: "defense",
    description: "Protect your prompt from edits for 8s"
  },
  undo: {
    id: "undo",
    label: "Undo",
    type: "defense",
    description: "Revert latest sabotage on your prompt"
  },
  spy: {
    id: "spy",
    label: "Spy",
    type: "utility",
    description: "Peek a random opponent prompt snippet"
  }
};

const POWERUP_IDS = Object.keys(POWERUPS);
const DECOY_PHRASES = [
  "in low poly style",
  "as a blurry pixel-art poster",
  "with a fisheye security-camera look",
  "drawn like a 90s comic panel",
  "in toy miniature diorama style",
  "as if painted on wet glass"
];

const SUBJECTS = [
  "an Asian man",
  "a skateboarder",
  "a pilot",
  "a chef",
  "a scientist",
  "a detective",
  "a surfer",
  "a violinist"
];

const ACTIONS = [
  "holding a cup of coffee",
  "balancing on a scooter",
  "writing in a notebook",
  "staring into a mirror",
  "laughing while running",
  "pointing at the sky",
  "standing in shallow water",
  "jumping over driftwood"
];

const LOCATIONS = [
  "on a windy beach",
  "inside a crowded night market",
  "in a neon alley",
  "on top of an old train car",
  "inside a botanical greenhouse",
  "at a rainy rooftop party",
  "in a desert canyon",
  "in a mountain temple courtyard"
];

const EXTRAS = [
  "while a dragon flies behind",
  "with fireworks exploding above",
  "next to a floating vending machine",
  "while giant koi fish swim in the air",
  "with a robot dog carrying flowers",
  "beside a glowing portal",
  "as confetti storms through the frame",
  "while a parade of tiny robots marches past"
];

const CAMERA_STYLES = [
  "wide-angle framing",
  "dramatic close-up",
  "over-the-shoulder perspective",
  "low-angle composition",
  "high-angle cinematic framing",
  "telephoto compression look",
  "fisheye edge distortion",
  "symmetrical centered framing"
];

const ART_STYLES = [
  "hyperreal photography",
  "film-still look",
  "stylized cinematic realism",
  "vibrant editorial style",
  "moody documentary style",
  "high-fantasy realism",
  "retro-futurist aesthetic",
  "surreal but believable realism"
];

const LIGHTING_STYLES = [
  "golden hour lighting",
  "stormy overcast light",
  "volumetric sunbeams",
  "neon rim lighting",
  "soft diffused light",
  "high-contrast dramatic lighting",
  "misty atmospheric haze",
  "backlit silhouette accents"
];

function loadAvatarCatalog() {
  try {
    const entries = fs.readdirSync(AVATAR_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => AVATAR_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map((file) => ({
        id: file,
        label: file.replace(/\.[^/.]+$/, ""),
        url: `/avatars/${encodeURIComponent(file)}`
      }));
  } catch {
    return [];
  }
}

const AVATAR_CATALOG = loadAvatarCatalog();
const AVATAR_BY_ID = new Map(AVATAR_CATALOG.map((avatar) => [avatar.id, avatar]));

function loadBlackCardPromptCatalog() {
  try {
    const raw = fs.readFileSync(BLACK_CARD_PROMPT_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const cleaned = parsed
      .map((value) => sanitizePrompt(value))
      .filter(Boolean);
    return [...new Set(cleaned)];
  } catch {
    return [];
  }
}

const BLACK_CARD_PROMPT_CATALOG = loadBlackCardPromptCatalog();

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(values) {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 5; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function sanitizeName(input) {
  const trimmed = String(input || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return `Player${Math.floor(Math.random() * 900 + 100)}`;
  return trimmed.slice(0, MAX_NAME_LEN);
}

function sanitizePrompt(input) {
  return String(input || "").replace(/\s+/g, " ").trim().slice(0, MAX_PROMPT_LEN);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function placeholderImageDataUrl(title, detail = "") {
  const safeTitle = escapeHtml(title || "Image unavailable");
  const safeDetail = escapeHtml(detail || "");
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f2433" />
      <stop offset="100%" stop-color="#1a3a50" />
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)" />
  <rect x="84" y="84" width="856" height="856" rx="36" ry="36" fill="none" stroke="#3f5f73" stroke-width="8" stroke-dasharray="14 12" />
  <text x="512" y="470" text-anchor="middle" fill="#e7f2f9" font-size="58" font-family="Arial, Helvetica, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="512" y="548" text-anchor="middle" fill="#9eb4c5" font-size="30" font-family="Arial, Helvetica, sans-serif">${safeDetail}</text>
</svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function avatarUrlForId(avatarId) {
  return AVATAR_BY_ID.get(String(avatarId || ""))?.url || "";
}

function pollinationsUrl(prompt, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=768&height=768&seed=${seed}&nologo=true`;
}

function makeReferencePrompt() {
  return [
    "Cinematic photo of",
    rand(SUBJECTS),
    rand(ACTIONS),
    rand(LOCATIONS),
    rand(EXTRAS),
    `with ${rand(CAMERA_STYLES)}`,
    rand(ART_STYLES),
    rand(LIGHTING_STYLES),
    "high detail, dynamic composition"
  ].join(" ");
}

function buildSessionPromptPool(size = SESSION_PROMPT_POOL_SIZE) {
  const unique = new Set();
  let attempts = 0;
  const maxAttempts = size * 30;

  while (unique.size < size && attempts < maxAttempts) {
    unique.add(makeReferencePrompt());
    attempts += 1;
  }

  return [...unique];
}

function resetSessionPromptPool(room) {
  room.sessionPromptPool = buildSessionPromptPool();
  room.sessionPromptIndex = 0;
}

function resetBlackCardPromptPool(room) {
  room.blackCardPromptPool = shuffle(BLACK_CARD_PROMPT_CATALOG);
  room.blackCardPromptIndex = 0;
}

function nextReferencePrompt(room) {
  if (!Array.isArray(room.sessionPromptPool) || room.sessionPromptPool.length === 0) {
    resetSessionPromptPool(room);
  }

  if (room.sessionPromptIndex >= room.sessionPromptPool.length) {
    resetSessionPromptPool(room);
  }

  const prompt = room.sessionPromptPool[room.sessionPromptIndex];
  room.sessionPromptIndex += 1;
  return prompt || makeReferencePrompt();
}

function nextBlackCardPrompt(room) {
  if (!Array.isArray(room.blackCardPromptPool) || room.blackCardPromptPool.length === 0) {
    resetBlackCardPromptPool(room);
  }

  if (room.blackCardPromptIndex >= room.blackCardPromptPool.length) {
    resetBlackCardPromptPool(room);
  }

  const prompt = room.blackCardPromptPool[room.blackCardPromptIndex];
  room.blackCardPromptIndex += 1;
  return prompt || "Describe the exact crime scene vibe this prompt implies.";
}

function validModeId(value) {
  const modeId = String(value || "").trim().toLowerCase();
  return GAME_MODE_IDS.includes(modeId) ? modeId : "classic";
}

function modeSupportsPowerups(room) {
  return room?.modeId === "classic";
}

async function fetchImageBuffer(url, retries = 3) {
  if (url.startsWith("data:image/")) {
    const commaIndex = url.indexOf(",");
    if (commaIndex < 0) {
      throw new Error("Invalid data URL");
    }
    const base64 = url.slice(commaIndex + 1);
    return Buffer.from(base64, "base64");
  }

  let attempt = 0;
  while (attempt < retries) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "prompt-sabotage-arena/0.1" }
      });
      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      attempt += 1;
      if (attempt >= retries) {
        throw error;
      }
      await delay(900 * attempt);
    }
  }
  throw new Error("Image fetch exhausted retries");
}

function providerChain() {
  if (IMAGE_PROVIDER === "openai") {
    return ["openai", "pollinations"];
  }
  return ["pollinations", "openai"];
}

function normalizeProvider(provider) {
  if (provider === "openai" && !OPENAI_API_KEY) {
    return null;
  }
  return provider;
}

async function generateWithOpenAI(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_IMAGE_MODEL,
      prompt,
      size: OPENAI_IMAGE_SIZE,
      quality: OPENAI_IMAGE_QUALITY
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI image error ${response.status}: ${body.slice(0, 200)}`);
  }

  const json = await response.json();
  const data = json?.data?.[0];
  const b64 = data?.b64_json;
  const url = data?.url;

  if (b64) {
    return `data:image/png;base64,${b64}`;
  }
  if (url) {
    return url;
  }
  throw new Error("OpenAI image response missing image data");
}

async function generateGameImage(prompt, seed) {
  const chain = providerChain().map(normalizeProvider).filter(Boolean);
  const errors = [];

  for (const provider of chain) {
    try {
      if (provider === "pollinations") {
        const url = pollinationsUrl(prompt, seed);
        await fetchImageBuffer(url, 2);
        return { url, provider };
      }

      if (provider === "openai") {
        const url = await generateWithOpenAI(prompt);
        await fetchImageBuffer(url, 1);
        return { url, provider };
      }
    } catch (error) {
      errors.push(`${provider}: ${error.message}`);
    }
  }

  throw new Error(
    `No prompt-capable image provider available. Tried: ${errors.join(" | ") || "none"}`
  );
}

function compactError(error, max = 220) {
  const raw = String(error?.message || error || "unknown error").replace(/\s+/g, " ").trim();
  return raw.length > max ? `${raw.slice(0, max)}...` : raw;
}

function resetRoomForImageFailure(room, context, error) {
  clearRoomTimers(room);

  room.phase = "lobby";
  room.roundNumber = 0;
  room.tiebreakerNextRound = false;
  room.startingNextRound = false;
  room.sessionPromptPool = [];
  room.sessionPromptIndex = 0;
  room.blackCardPromptPool = [];
  room.blackCardPromptIndex = 0;
  room.submissions = new Map();
  room.revealOrder = [];
  room.votes = new Map();
  room.reference = null;

  for (const player of room.players.values()) {
    player.score = 0;
    player.readyForNextRound = false;
    player.powerups = [];
    player.draftPrompt = "";
    player.finalPrompt = "";
    player.submitted = false;
    player.effects.lockUntil = 0;
    player.effects.blackoutUntil = 0;
    player.sabotageHistory = [];
    player.sabotageEvents = [];
  }

  io.to(room.id).emit("errorMessage", {
    message:
      "Image generation is unavailable right now. Set OPENAI_API_KEY for reliable prompt-to-image output."
  });
  io.to(room.id).emit("systemMessage", {
    message: `Round aborted during ${context}: ${compactError(error)}`
  });
  emitRoomSnapshot(room);
}

async function similarityScore(referenceUrl, candidateUrl) {
  try {
    const [referenceBuffer, candidateBuffer] = await Promise.all([
      fetchImageBuffer(referenceUrl, 3),
      fetchImageBuffer(candidateUrl, 3)
    ]);

    const size = 192;
    const ref = await sharp(referenceBuffer)
      .resize(size, size, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer();

    const cand = await sharp(candidateBuffer)
      .resize(size, size, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer();

    let sqErr = 0;
    for (let i = 0; i < ref.length; i += 1) {
      const d = ref[i] - cand[i];
      sqErr += d * d;
    }

    const mse = sqErr / ref.length;
    const normalized = 1 - mse / (255 * 255);
    const score = Math.max(0, Math.min(1, normalized)) * 100;
    return Number(score.toFixed(2));
  } catch {
    return Number((Math.random() * 25 + 37).toFixed(2));
  }
}

function createPlayer(socket, name) {
  return {
    id: socket.id,
    name: sanitizeName(name),
    avatarId: "",
    score: 0,
    readyForNextRound: false,
    powerups: [],
    draftPrompt: "",
    finalPrompt: "",
    submitted: false,
    effects: {
      lockUntil: 0,
      blackoutUntil: 0
    },
    sabotageHistory: [],
    sabotageEvents: []
  };
}

function clearRoomTimers(room) {
  if (room.roundTickTimer) {
    clearInterval(room.roundTickTimer);
    room.roundTickTimer = null;
  }
  if (room.voteTickTimer) {
    clearInterval(room.voteTickTimer);
    room.voteTickTimer = null;
  }
  if (room.showcaseTimer) {
    clearTimeout(room.showcaseTimer);
    room.showcaseTimer = null;
  }
}

function destroyRoomIfEmpty(room) {
  if (room.players.size > 0) return;
  clearRoomTimers(room);
  rooms.delete(room.id);
}

function playerPublic(p, viewerId) {
  return {
    id: p.id,
    name: p.name,
    avatarId: p.avatarId,
    avatarUrl: avatarUrlForId(p.avatarId),
    score: p.score,
    submitted: p.submitted,
    readyForNextRound: p.readyForNextRound,
    connected: true,
    powerupCount: p.powerups.length,
    isSelf: p.id === viewerId
  };
}

function emitRoomSnapshot(room) {
  const allPlayers = [...room.players.values()];
  for (const viewer of allPlayers) {
    io.to(viewer.id).emit("roomSnapshot", {
      roomId: room.id,
      hostId: room.hostId,
      phase: room.phase,
      roundNumber: room.roundNumber,
      toWin: TO_WIN,
      modeId: room.modeId || "classic",
      gameModes: GAME_MODE_IDS.map((id) => GAME_MODES[id]),
      tiebreakerNextRound: room.tiebreakerNextRound,
      players: allPlayers.map((p) => playerPublic(p, viewer.id)),
      self: {
        id: viewer.id,
        name: viewer.name,
        avatarId: viewer.avatarId,
        avatarUrl: avatarUrlForId(viewer.avatarId),
        score: viewer.score,
        readyForNextRound: viewer.readyForNextRound,
        powerups: viewer.powerups.map((id) => POWERUPS[id]),
        prompt: viewer.draftPrompt,
        submitted: viewer.submitted,
        effects: viewer.effects
      }
    });
  }
}

function grantPowerup(player, count) {
  const granted = [];
  for (let i = 0; i < count; i += 1) {
    const id = rand(POWERUP_IDS);
    player.powerups.push(id);
    granted.push(id);
  }
  return granted;
}

function allSubmitted(room) {
  return [...room.players.values()].every((p) => p.submitted);
}

function orderedSubmissions(room) {
  const order = Array.isArray(room.revealOrder) && room.revealOrder.length
    ? room.revealOrder
    : [...room.submissions.keys()];
  return order.map((id) => room.submissions.get(id)).filter(Boolean);
}

function removeOnePowerup(player, id) {
  const idx = player.powerups.indexOf(id);
  if (idx < 0) return false;
  player.powerups.splice(idx, 1);
  return true;
}

function isLocked(target) {
  return Date.now() < target.effects.lockUntil;
}

function patchRandomWords(input, replaceCount, mode) {
  const words = input.split(" ").filter(Boolean);
  if (words.length === 0) {
    return { text: input, removed: [], replaced: [] };
  }

  const count = Math.min(replaceCount, words.length);
  const indices = new Set();
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * words.length));
  }

  const replacementBank = [
    "monochrome",
    "cartoon",
    "tiny",
    "fuzzy",
    "dramatic",
    "misty",
    "retro",
    "surreal"
  ];

  const asc = [...indices].sort((a, b) => a - b);
  const replaced = [];
  for (const idx of asc) {
    if (mode !== "erase") {
      const from = words[idx];
      const to = rand(replacementBank);
      words[idx] = to;
      replaced.push({ from, to });
    }
  }

  const removed = [];
  const desc = [...indices].sort((a, b) => b - a);
  for (const idx of desc) {
    if (mode === "erase") {
      removed.unshift(words[idx]);
      words.splice(idx, 1);
    }
  }

  return {
    text: words.join(" ").trim(),
    removed,
    replaced
  };
}

function shortJoin(values, max = 6) {
  if (!Array.isArray(values) || values.length === 0) return "";
  const sliced = values.slice(0, max);
  const suffix = values.length > max ? ", ..." : "";
  return `${sliced.join(", ")}${suffix}`;
}

function sabotageSummary(powerupId, details = {}) {
  if (powerupId === "erase") {
    const words = details.removed || [];
    return `Erase - Removed ${words.length} words - ${shortJoin(words)}`;
  }
  if (powerupId === "decoy") {
    const phrase = details.phrase || "";
    return `Decoy - Added phrase - \"${phrase}\"`;
  }
  if (powerupId === "scramble") {
    const pairs = (details.replaced || []).map((pair) => `${pair.from}->${pair.to}`);
    return `Scramble - Replaced ${pairs.length} words - ${shortJoin(pairs)}`;
  }
  if (powerupId === "blackout") {
    return "Blackout - Hid reference image for 6s";
  }
  return `${POWERUPS[powerupId]?.label || "Sabotage"} - Applied`;
}

function logSabotage(target, actor, powerupId, details = {}) {
  const event = {
    id: `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    by: actor.id,
    byName: actor.name,
    powerupId,
    details,
    summary: sabotageSummary(powerupId, details),
    at: Date.now()
  };
  target.sabotageEvents.push(event);
  return event;
}

function pickOpponent(room, actorId) {
  const candidates = [...room.players.values()].filter((p) => p.id !== actorId);
  if (!candidates.length) return null;
  return rand(candidates);
}

function snippet(text) {
  const value = text.trim();
  if (!value) return "(empty prompt)";
  if (value.length <= 42) return value;
  const start = Math.max(0, Math.floor(Math.random() * (value.length - 42)));
  return `${value.slice(start, start + 42)}...`;
}

function allPlayersReady(room) {
  if (room.players.size < 2) return false;
  return [...room.players.values()].every((player) => player.readyForNextRound);
}

async function maybeStartNextRound(room) {
  if (!room || room.phase !== "intermission") return;
  if (room.startingNextRound) return;
  if (!allPlayersReady(room)) return;

  room.startingNextRound = true;
  io.to(room.id).emit("systemMessage", {
    message: "All players ready. Starting next round."
  });

  try {
    await startRound(room);
  } finally {
    room.startingNextRound = false;
  }
}

function beginReadyUp(room) {
  room.phase = "intermission";
  room.startingNextRound = false;
  for (const player of room.players.values()) {
    player.readyForNextRound = false;
  }

  emitRoomSnapshot(room);
  io.to(room.id).emit("readyUpStarted", {
    modeId: room.modeId,
    chaosRound: modeSupportsPowerups(room) && room.tiebreakerNextRound,
    tiebreakerRound: room.tiebreakerNextRound,
    totalPlayers: room.players.size
  });
}

async function startRound(room) {
  if (room.players.size < 2) {
    room.phase = "lobby";
    emitRoomSnapshot(room);
    return;
  }

  const modeId = validModeId(room.modeId);
  room.modeId = modeId;
  const powerupsEnabled = modeSupportsPowerups(room);

  clearRoomTimers(room);
  room.roundNumber += 1;
  room.phase = "round";
  room.submissions = new Map();
  room.revealOrder = [];
  room.votes = new Map();

  const chaosRound = powerupsEnabled && room.tiebreakerNextRound;
  room.tiebreakerNextRound = false;

  const grants = {};
  for (const player of room.players.values()) {
    player.submitted = false;
    player.readyForNextRound = false;
    player.draftPrompt = "";
    player.finalPrompt = "";
    player.effects.blackoutUntil = 0;
    player.effects.lockUntil = 0;
    player.sabotageHistory = [];
    player.sabotageEvents = [];
    if (!powerupsEnabled) {
      player.powerups = [];
    }

    let count = 0;
    if (powerupsEnabled) {
      if (chaosRound) {
        count = 2;
      } else if (room.roundNumber % 2 === 0) {
        count = 1;
      }
    }

    if (count > 0) {
      grants[player.id] = grantPowerup(player, count);
    }
  }

  if (modeId === "humanity") {
    room.reference = {
      prompt: nextBlackCardPrompt(room),
      url: "",
      seed: 0,
      provider: "prompt-only",
      promptOnly: true
    };
  } else {
    const refPrompt = nextReferencePrompt(room);
    const seed = Math.floor(Math.random() * 1_000_000_000);
    let ref;
    try {
      ref = await generateGameImage(refPrompt, seed);
    } catch (error) {
      resetRoomForImageFailure(room, "reference generation", error);
      return;
    }

    room.reference = {
      prompt: refPrompt,
      url: ref.url,
      seed,
      provider: ref.provider,
      promptOnly: false
    };
  }

  room.roundEndsAt = Date.now() + ROUND_SECONDS * 1000;
  emitRoomSnapshot(room);

  io.to(room.id).emit("roundStarted", {
    roundNumber: room.roundNumber,
    referenceUrl: room.reference.url,
    referencePrompt: room.reference.prompt,
    promptVisible: modeId === "humanity",
    modeId,
    seconds: ROUND_SECONDS,
    chaosRound,
    grants
  });

  let lastTick = ROUND_SECONDS;
  io.to(room.id).emit("roundTick", { seconds: ROUND_SECONDS });

  room.roundTickTimer = setInterval(() => {
    const seconds = Math.max(0, Math.ceil((room.roundEndsAt - Date.now()) / 1000));
    if (seconds !== lastTick) {
      lastTick = seconds;
      io.to(room.id).emit("roundTick", { seconds });
    }
    if (seconds <= 0) {
      lockRound(room.id, "timer");
    }
  }, 200);
}

async function lockRound(roomId, reason) {
  const room = rooms.get(roomId);
  if (!room || room.phase !== "round") return;

  room.phase = "generating";
  if (room.roundTickTimer) {
    clearInterval(room.roundTickTimer);
    room.roundTickTimer = null;
  }

  for (const player of room.players.values()) {
    if (!player.submitted) {
      const fallback = player.draftPrompt || "high-detail cinematic image";
      player.finalPrompt = sanitizePrompt(fallback);
      player.submitted = true;
    }
    if (!player.finalPrompt) {
      player.finalPrompt = "high-detail cinematic image";
    }
  }

  emitRoomSnapshot(room);
  io.to(room.id).emit("generationStarted", { reason });

  const generationTasks = [...room.players.values()].map(async (player) => {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    let generated;
    let generationError = "";
    try {
      generated = await generateGameImage(player.finalPrompt, seed);
    } catch (error) {
      generationError = compactError(error, 100);
      generated = {
        url: placeholderImageDataUrl("Entry Image Failed", "Using placeholder"),
        provider: "placeholder"
      };
    }

    room.submissions.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      prompt: player.finalPrompt,
      sabotaged: player.sabotageEvents.length > 0,
      sabotageDetails: player.sabotageEvents.map((event) => event.summary),
      imageUrl: generated.url,
      provider: generated.provider,
      imageFailed: generated.provider === "placeholder",
      imageError: generationError,
      seed,
      score: 0,
      votes: 0
    });

    if (generationError) {
      io.to(player.id).emit("systemMessage", {
        message: "Your image failed to generate. A placeholder image was used."
      });
    }
  });

  await Promise.all(generationTasks);

  room.revealOrder = shuffle([...room.submissions.keys()]);

  const revealPayload = {
    modeId: room.modeId,
    reference: {
      url: room.reference.url,
      prompt: room.reference.prompt,
      promptOnly: Boolean(room.reference.promptOnly)
    },
    submissions: orderedSubmissions(room)
  };

  io.to(room.id).emit("revealReady", revealPayload);

  if (room.modeId === "classic" && room.players.size === 2) {
    await scoreDuel(room);
  } else {
    startShowcasePhase(room);
  }
}

async function scoreDuel(room) {
  room.phase = "scoring";

  const submissions = [...room.submissions.values()];
  for (const submission of submissions) {
    submission.score = await similarityScore(room.reference.url, submission.imageUrl);
  }

  submissions.sort((a, b) => b.score - a.score);
  const top = submissions[0];
  const second = submissions[1];

  if (!top || !second) {
    room.tiebreakerNextRound = true;
    emitRoundResult(room, {
      tie: true,
      reason: "missing-submission",
      winnerIds: []
    });
    beginReadyUp(room);
    return;
  }

  const tied = Math.abs(top.score - second.score) < 0.01;
  if (tied) {
    room.tiebreakerNextRound = true;
    emitRoundResult(room, {
      tie: true,
      reason: "similarity-tie",
      winnerIds: []
    });
    beginReadyUp(room);
    return;
  }

  const winner = room.players.get(top.playerId);
  winner.score += 1;

  const ended = winner.score >= TO_WIN;
  emitRoundResult(room, {
    tie: false,
    reason: "duel-score",
    winnerIds: [winner.id]
  });

  if (ended) {
    endMatch(room, [winner.id]);
    return;
  }

  beginReadyUp(room);
}

function startVotePhase(room) {
  if (room.showcaseTimer) {
    clearTimeout(room.showcaseTimer);
    room.showcaseTimer = null;
  }

  room.phase = "voting";
  room.votes = new Map();
  emitRoomSnapshot(room);

  io.to(room.id).emit("votePhase", {
    modeId: room.modeId,
    seconds: VOTE_SECONDS,
    requiredVotes: room.players.size,
    reference: {
      url: room.reference?.url || "",
      prompt: room.reference?.prompt || "",
      promptOnly: Boolean(room.reference?.promptOnly)
    },
    candidates: orderedSubmissions(room).map((s) => ({
      playerId: s.playerId,
      playerName: s.playerName,
      imageUrl: s.imageUrl
    }))
  });

  room.voteEndsAt = Date.now() + VOTE_SECONDS * 1000;
  let lastTick = VOTE_SECONDS;

  io.to(room.id).emit("voteTick", { seconds: VOTE_SECONDS });

  room.voteTickTimer = setInterval(() => {
    const seconds = Math.max(0, Math.ceil((room.voteEndsAt - Date.now()) / 1000));
    if (seconds !== lastTick) {
      lastTick = seconds;
      io.to(room.id).emit("voteTick", { seconds });
    }

    if (seconds <= 0) {
      finalizeVotes(room.id, "timer");
    }
  }, 200);
}

function startShowcasePhase(room) {
  if (room.showcaseTimer) {
    clearTimeout(room.showcaseTimer);
    room.showcaseTimer = null;
  }

  room.phase = "showcase";
  const entries = orderedSubmissions(room);
  const startedAt = Date.now();
  const referenceSeconds = SHOWCASE_REFERENCE_SECONDS;
  const entrySeconds = SHOWCASE_ENTRY_SECONDS;
  const totalMs = Math.max(1000, Math.round((referenceSeconds + entrySeconds * entries.length) * 1000));

  emitRoomSnapshot(room);
  io.to(room.id).emit("showcasePhase", {
    modeId: room.modeId,
    startedAt,
    referenceSeconds,
    entrySeconds,
    reference: {
      url: room.reference.url,
      prompt: room.reference.prompt,
      promptOnly: Boolean(room.reference.promptOnly)
    },
    entries: entries.map((entry) => ({
      playerId: entry.playerId,
      imageUrl: entry.imageUrl,
      prompt: entry.prompt,
      sabotaged: entry.sabotaged,
      sabotageDetails: entry.sabotageDetails || [],
      imageFailed: Boolean(entry.imageFailed)
    }))
  });

  room.showcaseTimer = setTimeout(() => {
    room.showcaseTimer = null;
    const fresh = rooms.get(room.id);
    if (!fresh || fresh.phase !== "showcase") return;
    startVotePhase(fresh);
  }, totalMs);
}

function finalizeVotes(roomId, reason) {
  const room = rooms.get(roomId);
  if (!room || room.phase !== "voting") return;

  if (room.voteTickTimer) {
    clearInterval(room.voteTickTimer);
    room.voteTickTimer = null;
  }

  const tallies = new Map();
  for (const targetId of room.votes.values()) {
    tallies.set(targetId, (tallies.get(targetId) || 0) + 1);
  }

  for (const sub of room.submissions.values()) {
    sub.votes = tallies.get(sub.playerId) || 0;
  }

  const ranked = [...room.submissions.values()].sort((a, b) => b.votes - a.votes);
  const top = ranked[0];
  const second = ranked[1];
  const tied = top && second && top.votes === second.votes;

  // eslint-disable-next-line no-console
  console.log(
    `[finalizeVotes] room=${room.id} reason=${reason} votes=${room.votes.size}/${room.players.size} ranked=${ranked
      .map((entry) => `${entry.playerName}:${entry.votes}`)
      .join(",")}`
  );

  if (!top || tied) {
    room.tiebreakerNextRound = true;
    emitRoundResult(room, {
      tie: true,
      reason: tied ? "vote-tie" : "no-votes",
      winnerIds: []
    });
    beginReadyUp(room);
    return;
  }

  const winner = room.players.get(top.playerId);
  if (!winner) {
    room.tiebreakerNextRound = true;
    emitRoundResult(room, {
      tie: true,
      reason: "missing-winner",
      winnerIds: []
    });
    beginReadyUp(room);
    return;
  }
  winner.score += 1;

  const ended = winner.score >= TO_WIN;
  emitRoundResult(room, {
    tie: false,
    reason: reason || "votes",
    winnerIds: [winner.id]
  });

  if (ended) {
    endMatch(room, [winner.id]);
    return;
  }

  beginReadyUp(room);
}

function leaderboard(room) {
  return [...room.players.values()]
    .map((p) => ({ id: p.id, name: p.name, score: p.score }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function emitRoundResult(room, result) {
  io.to(room.id).emit("roundResult", {
    ...result,
    leaderboard: leaderboard(room),
    submissions: orderedSubmissions(room),
    reference: room.reference
  });

  emitRoomSnapshot(room);
}

function endMatch(room, winnerIds) {
  clearRoomTimers(room);
  room.phase = "ended";

  io.to(room.id).emit("matchEnded", {
    winnerIds,
    leaderboard: leaderboard(room)
  });

  emitRoomSnapshot(room);
}

function createRoom(socket, name) {
  let id = roomCode();
  while (rooms.has(id)) {
    id = roomCode();
  }

  const room = {
    id,
    hostId: socket.id,
    players: new Map(),
    phase: "lobby",
    roundNumber: 0,
    modeId: "classic",
    tiebreakerNextRound: false,
    submissions: new Map(),
    revealOrder: [],
    votes: new Map(),
    sessionPromptPool: [],
    sessionPromptIndex: 0,
    blackCardPromptPool: [],
    blackCardPromptIndex: 0,
    reference: null,
    roundTickTimer: null,
    voteTickTimer: null,
    showcaseTimer: null,
    startingNextRound: false,
    roundEndsAt: 0,
    voteEndsAt: 0
  };

  const player = createPlayer(socket, name);
  room.players.set(socket.id, player);

  rooms.set(id, room);
  socketToRoom.set(socket.id, id);
  socket.join(id);

  io.to(socket.id).emit("roomCreated", { roomId: id });
  emitRoomSnapshot(room);
}

function joinRoom(socket, roomId, name) {
  const id = String(roomId || "").trim().toUpperCase();
  const room = rooms.get(id);
  if (!room) {
    io.to(socket.id).emit("errorMessage", { message: "Room not found" });
    return;
  }

  if (room.players.size >= 6) {
    io.to(socket.id).emit("errorMessage", { message: "Room is full" });
    return;
  }

  if (room.phase !== "lobby") {
    io.to(socket.id).emit("errorMessage", { message: "Game already started" });
    return;
  }

  const player = createPlayer(socket, name);
  room.players.set(socket.id, player);

  socketToRoom.set(socket.id, id);
  socket.join(id);

  io.to(room.id).emit("systemMessage", { message: `${player.name} joined the room.` });
  emitRoomSnapshot(room);
}

function leaveCurrentRoom(socket) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;

  const room = rooms.get(roomId);
  socketToRoom.delete(socket.id);
  socket.leave(roomId);

  if (!room) return;

  const player = room.players.get(socket.id);
  room.players.delete(socket.id);

  if (room.hostId === socket.id && room.players.size > 0) {
    room.hostId = [...room.players.keys()][0];
  }

  io.to(room.id).emit("systemMessage", {
    message: `${player ? player.name : "A player"} left the room.`
  });

  if (room.players.size < 2 && room.phase !== "lobby" && room.phase !== "ended") {
    clearRoomTimers(room);
    room.phase = "lobby";
    room.roundNumber = 0;
    room.tiebreakerNextRound = false;
    room.startingNextRound = false;
    room.sessionPromptPool = [];
    room.sessionPromptIndex = 0;
    room.blackCardPromptPool = [];
    room.blackCardPromptIndex = 0;
    room.submissions = new Map();
    room.revealOrder = [];
    room.votes = new Map();
    room.reference = null;
    io.to(room.id).emit("systemMessage", {
      message: "Not enough players to continue. Match reset to lobby."
    });
  }

  emitRoomSnapshot(room);
  if (room.phase === "intermission") {
    maybeStartNextRound(room);
  }
  destroyRoomIfEmpty(room);
}

function usePowerup(socket, payload) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room || room.phase !== "round") return;
  if (!modeSupportsPowerups(room)) {
    io.to(socket.id).emit("errorMessage", {
      message: "Powerups are disabled in this game mode."
    });
    return;
  }

  const actor = room.players.get(socket.id);
  if (!actor || actor.submitted) return;

  const powerupId = String(payload?.powerupId || "");
  const targetId = String(payload?.targetId || "");
  const def = POWERUPS[powerupId];

  if (!def) return;
  if (!removeOnePowerup(actor, powerupId)) {
    io.to(actor.id).emit("errorMessage", { message: "You do not have that powerup." });
    return;
  }

  const now = Date.now();

  if (def.type === "attack") {
    const target = room.players.get(targetId);
    if (!target || target.id === actor.id) {
      io.to(actor.id).emit("errorMessage", { message: "Choose a valid target." });
      emitRoomSnapshot(room);
      return;
    }

    if (isLocked(target)) {
      io.to(actor.id).emit("systemMessage", {
        message: `${target.name} is locked. Attack blocked.`
      });
      io.to(target.id).emit("sabotageNotice", {
        message: "A sabotage attempt was blocked by your lock."
      });
      emitRoomSnapshot(room);
      return;
    }

    if (powerupId === "blackout") {
      target.effects.blackoutUntil = Math.max(target.effects.blackoutUntil, now) + 6000;
      logSabotage(target, actor, powerupId, { durationSeconds: 6 });
      io.to(target.id).emit("blackoutApplied", { until: target.effects.blackoutUntil });
      io.to(target.id).emit("sabotageNotice", { message: "You were sabotaged." });
      io.to(actor.id).emit("systemMessage", { message: `Blackout hit ${target.name}.` });
      emitRoomSnapshot(room);
      return;
    }

    const previous = sanitizePrompt(
      target.submitted ? target.finalPrompt || target.draftPrompt || "" : target.draftPrompt || ""
    );
    let next = previous;
    let details = {};

    if (powerupId === "scramble") {
      const patched = patchRandomWords(previous || "detail shot of unknown scene", 3, "replace");
      next = patched.text;
      details = { replaced: patched.replaced };
    }

    if (powerupId === "erase") {
      const patched = patchRandomWords(previous || "detailed vivid photo scene", 4, "erase");
      next = patched.text;
      details = { removed: patched.removed };
      if (!next) {
        next = "detailed photo";
      }
    }

    if (powerupId === "decoy") {
      const phrase = rand(DECOY_PHRASES);
      next = sanitizePrompt(`${previous} ${phrase}`.trim());
      details = { phrase };
    }

    const sabotageEvent = logSabotage(target, actor, powerupId, details);

    target.sabotageHistory.push({
      previousPrompt: previous,
      by: actor.id,
      at: now,
      powerupId,
      eventId: sabotageEvent.id
    });

    target.draftPrompt = sanitizePrompt(next);
    if (target.submitted) {
      target.finalPrompt = target.draftPrompt || "high-detail cinematic scene";
    }

    io.to(target.id).emit("promptPatched", { prompt: target.draftPrompt });
    io.to(target.id).emit("sabotageNotice", { message: "You were sabotaged." });
    io.to(actor.id).emit("systemMessage", {
      message: `${def.label} hit ${target.name}.`
    });

    emitRoomSnapshot(room);
    return;
  }

  if (powerupId === "lock") {
    actor.effects.lockUntil = Math.max(actor.effects.lockUntil, now) + 8000;
    io.to(actor.id).emit("systemMessage", { message: "Prompt locked for 8s." });
    emitRoomSnapshot(room);
    return;
  }

  if (powerupId === "undo") {
    const last = actor.sabotageHistory.pop();
    if (last) {
      actor.draftPrompt = sanitizePrompt(last.previousPrompt || "");
      if (last.eventId) {
        const idx = actor.sabotageEvents.findIndex((event) => event.id === last.eventId);
        if (idx >= 0) {
          actor.sabotageEvents.splice(idx, 1);
        }
      }
      io.to(actor.id).emit("promptPatched", { prompt: actor.draftPrompt });
      io.to(actor.id).emit("systemMessage", { message: "Latest sabotage reverted." });
    } else {
      io.to(actor.id).emit("systemMessage", { message: "Nothing to undo." });
    }
    emitRoomSnapshot(room);
    return;
  }

  if (powerupId === "spy") {
    const opponent = pickOpponent(room, actor.id);
    if (!opponent) {
      io.to(actor.id).emit("systemMessage", { message: "No opponent prompt to spy on." });
      emitRoomSnapshot(room);
      return;
    }

    io.to(actor.id).emit("spyReveal", {
      playerName: opponent.name,
      text: snippet(opponent.draftPrompt)
    });
    emitRoomSnapshot(room);
    return;
  }

  emitRoomSnapshot(room);
}

app.use(express.static(path.join(__dirname, "public")));
app.use("/avatars", express.static(AVATAR_DIR));

io.on("connection", (socket) => {
  io.to(socket.id).emit("powerupCatalog", { powerups: Object.values(POWERUPS) });
  io.to(socket.id).emit("avatarCatalog", { avatars: AVATAR_CATALOG });

  socket.on("createRoom", (payload) => {
    leaveCurrentRoom(socket);
    createRoom(socket, payload?.name);
  });

  socket.on("joinRoom", (payload) => {
    leaveCurrentRoom(socket);
    joinRoom(socket, payload?.roomId, payload?.name);
  });

  socket.on("chooseAvatar", (payload) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.phase !== "lobby" && room.phase !== "starting") return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const avatarId = String(payload?.avatarId || "");
    if (!AVATAR_BY_ID.has(avatarId)) {
      io.to(socket.id).emit("errorMessage", { message: "Invalid avatar selection." });
      return;
    }

    player.avatarId = avatarId;
    emitRoomSnapshot(room);
  });

  socket.on("setGameMode", (payload) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      io.to(socket.id).emit("errorMessage", { message: "Only the host can change game mode." });
      return;
    }
    if (room.phase !== "lobby" && room.phase !== "ended") {
      io.to(socket.id).emit("errorMessage", { message: "Game mode can only be changed in lobby." });
      return;
    }

    const modeId = validModeId(payload?.modeId);
    if (modeId === room.modeId) return;
    room.modeId = modeId;
    io.to(room.id).emit("systemMessage", {
      message: `Game mode set to ${GAME_MODES[modeId].label}.`
    });
    emitRoomSnapshot(room);
  });

  socket.on("startGame", async () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) {
      io.to(socket.id).emit("errorMessage", { message: "Only the host can start the game." });
      return;
    }
    if (room.players.size < 2) {
      io.to(socket.id).emit("errorMessage", { message: "Need at least 2 players." });
      return;
    }
    if (room.phase !== "lobby" && room.phase !== "ended") {
      io.to(socket.id).emit("errorMessage", { message: "Game already in progress." });
      return;
    }
    if (AVATAR_CATALOG.length > 0) {
      const missing = [...room.players.values()].filter((player) => !player.avatarId);
      if (missing.length > 0) {
        io.to(socket.id).emit("errorMessage", {
          message: "All players must choose an avatar before starting."
        });
        return;
      }
    }

    room.modeId = validModeId(room.modeId);
    if (room.modeId === "humanity" && BLACK_CARD_PROMPT_CATALOG.length === 0) {
      io.to(socket.id).emit("errorMessage", {
        message: "No black-card prompts are available for this mode."
      });
      return;
    }

    room.phase = "starting";
    room.roundNumber = 0;
    room.tiebreakerNextRound = false;
    room.startingNextRound = false;
    clearRoomTimers(room);
    room.submissions = new Map();
    room.revealOrder = [];
    room.votes = new Map();
    room.reference = null;
    if (room.modeId === "humanity") {
      room.sessionPromptPool = [];
      room.sessionPromptIndex = 0;
      resetBlackCardPromptPool(room);
    } else {
      room.blackCardPromptPool = [];
      room.blackCardPromptIndex = 0;
      resetSessionPromptPool(room);
    }
    for (const p of room.players.values()) {
      p.score = 0;
      p.readyForNextRound = false;
      p.powerups = [];
      p.submitted = false;
      p.draftPrompt = "";
      p.finalPrompt = "";
      p.effects.blackoutUntil = 0;
      p.effects.lockUntil = 0;
      p.sabotageHistory = [];
      p.sabotageEvents = [];
    }

    emitRoomSnapshot(room);
    await startRound(room);
  });

  socket.on("updatePrompt", (payload) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.phase !== "round") return;

    const player = room.players.get(socket.id);
    if (!player || player.submitted) return;

    player.draftPrompt = sanitizePrompt(payload?.prompt || "");
    emitRoomSnapshot(room);
  });

  socket.on("submitPrompt", async () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.phase !== "round") return;

    const player = room.players.get(socket.id);
    if (!player || player.submitted) return;

    player.finalPrompt = sanitizePrompt(player.draftPrompt || "");
    if (!player.finalPrompt) {
      player.finalPrompt = "high-detail cinematic scene";
    }
    player.submitted = true;

    io.to(socket.id).emit("systemMessage", { message: "Prompt submitted." });
    emitRoomSnapshot(room);

    if (allSubmitted(room)) {
      await lockRound(roomId, "all-submitted");
    }
  });

  socket.on("usePowerup", (payload) => {
    usePowerup(socket, payload || {});
  });

  socket.on("castVote", (payload) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.phase !== "voting") return;

    const voter = room.players.get(socket.id);
    if (!voter) return;

    const targetId = String(payload?.targetId || "");
    if (!room.players.has(targetId) || targetId === voter.id) {
      io.to(socket.id).emit("errorMessage", { message: "Invalid vote target." });
      return;
    }

    room.votes.set(voter.id, targetId);

    // eslint-disable-next-line no-console
    console.log(
      `[castVote] room=${room.id} voter=${voter.name} target=${targetId} total=${room.votes.size}/${room.players.size}`
    );

    io.to(room.id).emit("voteUpdate", {
      totalVotes: room.votes.size,
      requiredVotes: room.players.size
    });

    if (room.votes.size >= room.players.size) {
      finalizeVotes(roomId, "all-voted");
    }
  });

  socket.on("setReadyForNextRound", async (payload) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.phase !== "intermission") return;

    const player = room.players.get(socket.id);
    if (!player) return;

    player.readyForNextRound = Boolean(payload?.ready);
    emitRoomSnapshot(room);
    await maybeStartNextRound(room);
  });

  socket.on("backToLobby", () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.hostId !== socket.id) return;

    clearRoomTimers(room);
    room.phase = "lobby";
    room.roundNumber = 0;
    room.tiebreakerNextRound = false;
    room.startingNextRound = false;
    room.sessionPromptPool = [];
    room.sessionPromptIndex = 0;
    room.blackCardPromptPool = [];
    room.blackCardPromptIndex = 0;
    room.submissions = new Map();
    room.revealOrder = [];
    room.votes = new Map();
    room.reference = null;
    for (const p of room.players.values()) {
      p.score = 0;
      p.readyForNextRound = false;
      p.powerups = [];
      p.submitted = false;
      p.draftPrompt = "";
      p.finalPrompt = "";
      p.effects.lockUntil = 0;
      p.effects.blackoutUntil = 0;
      p.sabotageHistory = [];
      p.sabotageEvents = [];
    }

    emitRoomSnapshot(room);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Prompt Sabotage Arena listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(
    `Image provider mode=${IMAGE_PROVIDER}, OPENAI_API_KEY=${OPENAI_API_KEY ? "set" : "missing"}`
  );
  // eslint-disable-next-line no-console
  console.log(`Black-card prompt catalog loaded: ${BLACK_CARD_PROMPT_CATALOG.length}`);
});

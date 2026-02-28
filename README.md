# Prompt Sabotage Arena (MVP)

Realtime multiplayer web game (2-6 players): everyone tries to prompt an image model to match a hidden reference image while sabotaging each other.

## MVP Rules Implemented

- 2-6 players in realtime room.
- 120-second prompt phase each round.
- 120-second voting phase each round (or earlier if all players vote).
- All generated images reveal only when every player image is ready.
- Reference prompts are randomized per game session and served from a session prompt pool.
- One image generation per player per round.
- Random powerup grant every 2 rounds (active gameplay only).
- No auto-next-round countdown: after results, every player clicks Ready to proceed.
- Tie round triggers chaos tiebreaker: next round grants 2 random powerups to everyone.
- Win condition: first to 5 points.
- 2 players: AI similarity scoring (transparent percentages).
- 3+ players: one vote per player, no self-vote.

## Powerups

- `Blackout` (attack): hide target reference image for 6s.
- `Scramble` (attack): replace 3 random words in target prompt.
- `Erase` (attack): delete 4 random words from target prompt.
- `Decoy` (attack): inject misleading phrase into target prompt.
- `Lock` (defense): block all incoming prompt edits for 8s.
- `Undo` (defense): revert your latest sabotage.
- `Spy` (utility): reveal random snippet from an opponent prompt.

## AI Images

This MVP uses prompt-capable providers only:

- `pollinations` (no key) if available,
- `openai` when `OPENAI_API_KEY` is set.

Reference images are AI-generated only (no stock library).

If providers are unavailable, the round aborts to lobby with an explicit error instead of using random non-prompt images.

### Optional OpenAI Provider

If you want stable prompt-to-image generation, set:

```bash
export OPENAI_API_KEY=your_key_here
```

Or put these in a local `.env` file (auto-loaded at startup).

Optional knobs:

```bash
export IMAGE_PROVIDER=openai
export OPENAI_IMAGE_MODEL=gpt-image-1-mini
export OPENAI_IMAGE_SIZE=1024x1024
export OPENAI_IMAGE_QUALITY=low
```

## Run

Requirements: Node 18+

```bash
npm install
npm start
```

Open `http://localhost:3000` in multiple tabs/devices.

## Notes

- The 2-player similarity score uses a pixel-level approximation (`sharp`) for fast MVP judging.
- If similarity computation fails, a bounded fallback score is used so scoring can continue.
- This is intentionally MVP-level and optimized for playable flow, not anti-cheat hardening.

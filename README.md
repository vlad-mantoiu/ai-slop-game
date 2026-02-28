# Prompt Sabotage Arena (MVP)

Realtime multiplayer web game (2-6 players) with two lobby-selectable modes:

- `Classic Slop Battle`: match a hidden AI reference image while sabotaging each other.
- `AI Slop Against Humanity`: everyone answers the same black-card prompt (no sabotage).

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
- Group voting for all player counts in `AI Slop Against Humanity`.
- Anonymous entries during showcase and voting.
- Winner and all submitted prompts are revealed in round results.

### Against Humanity Prompt Pool

- Stored black-card prompts in [`config/against-humanity-prompts.json`](config/against-humanity-prompts.json).
- Prompt order is shuffled per session to reduce repeats.

## Credits & Billing

- Host wallet is charged server-side before each round starts.
- Guest-first flow: anyone can play instantly; login/register is required only when purchasing credits (default).
- Login/register for checkout is local email/password auth stored in the billing store (MVP).
- Default cost: `2` cents per generated image (`IMAGE_COST_CENTS=2`).
- Default free trial: `100` cents once per user/IP (`FREE_PLAY_CENTS=100`).
- Round cost formula:
  - `Classic`: `(players + 1) * IMAGE_COST_CENTS` (reference + all player images)
  - `Against Humanity`: `players * IMAGE_COST_CENTS`
- If host balance is insufficient, next round is blocked and host gets a pay prompt.
- Billing data is persisted in `data/billing-store.json` (single-instance MVP).

### Stripe Top-Ups (Optional)

Set these to enable real card checkout:

```bash
export STRIPE_SECRET_KEY=sk_live_or_test_xxx
export STRIPE_WEBHOOK_SECRET=whsec_xxx
export APP_BASE_URL=https://your-app-url
export STRIPE_SUCCESS_URL=https://your-app-url/?checkout=success
export STRIPE_CANCEL_URL=https://your-app-url/?checkout=cancel
```

Optional packs (JSON):

```bash
export CREDIT_PACKS_JSON='[{"id":"pack_500","label":"$5.00 credits","priceCents":500,"creditCents":500}]'
export REQUIRE_LOGIN_FOR_CHECKOUT=true
```

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
- `openai` when `OPENAI_API_KEY` is set,
- `xai` (Grok image generation) when `XAI_API_KEY` is set.

Reference images are AI-generated only (no stock library).

If providers are unavailable, the round aborts to lobby with an explicit error instead of using random non-prompt images.

### Optional Image Providers

If you want stable prompt-to-image generation, set one or both:

```bash
export OPENAI_API_KEY=your_key_here
export XAI_API_KEY=your_key_here
```

Or put these in a local `.env` file (auto-loaded at startup).

Optional knobs:

```bash
export IMAGE_PROVIDER=openai
export PLAYER_IMAGE_PROVIDER=xai
export REFERENCE_IMAGE_PROVIDER=openai
export OPENAI_IMAGE_MODEL=gpt-image-1-mini
export OPENAI_IMAGE_SIZE=1024x1024
export OPENAI_IMAGE_QUALITY=low
export XAI_IMAGE_MODEL=grok-imagine-image
export XAI_IMAGE_RESOLUTION=1024x1024
export XAI_IMAGE_ASPECT_RATIO=1:1
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

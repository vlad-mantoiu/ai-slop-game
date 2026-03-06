# Test Coverage Analysis

## Current State

**Test coverage: 0%** — The codebase has no test files, no testing framework, and no dev dependencies. The project contains ~6,000 lines of source code across `server.js` (3,398 lines) and `public/app.js` (2,653 lines) with zero automated tests.

---

## Recommended Testing Setup

**Framework:** [Vitest](https://vitest.dev/) — fast, ESM-friendly, built-in coverage via `c8`/`istanbul`, works well with Node.js projects.

**Additional libraries:**
- `supertest` — HTTP endpoint testing for Express routes
- `socket.io-client` — integration testing for Socket.IO events
- `sinon` — stubs/mocks for external APIs (Stripe, image providers)

---

## Priority Areas for Testing

### Priority 1 — Pure utility functions (high value, zero setup cost)

These functions are self-contained, have no side effects, and can be tested immediately with simple unit tests. They form the foundation of correctness for the rest of the app.

| Function | File:Line | What to test |
|---|---|---|
| `parseCookieHeader()` | server.js:152 | Standard cookies, empty strings, encoded values, malformed input |
| `parseTrustProxyValue()` | server.js:170 | "true"/"false"/numeric/"on"/"off"/empty string |
| `sanitizeUserId()` | server.js:184 | Valid UUIDs, too-short strings, invalid chars, empty |
| `sanitizeFingerprint()` | server.js:190 | Valid hex, uppercase normalization, invalid chars |
| `sanitizeName()` | server.js:1193 | Whitespace collapsing, max length truncation, empty → fallback |
| `sanitizePrompt()` | server.js:1199 | Whitespace normalization, max length, empty |
| `escapeHtml()` | server.js:1203 | All 5 special chars (`& < > " '`), empty, nested |
| `normalizeIp()` | server.js:203 | IPv4, IPv6, edge cases, empty |
| `validModeId()` | server.js:1305 | "classic", "humanity", invalid → defaults to "classic" |
| `shortJoin()` | server.js:1795 | Empty array, under max, over max with ellipsis |
| `formatUsd()` | server.js:849 | Zero, small amounts, large amounts |
| `normalizeEmail()` | server.js:853 | Case normalization, trimming |
| `validEmail()` | server.js:857 | Valid emails, missing @, empty |
| `utcDayKey()` | server.js:457 | Date formatting consistency |
| `usageDayKeyValid()` | server.js:461 | Valid/invalid day key formats |

**Estimated effort:** Low — ~1 day. **Impact:** Catches edge-case bugs in input validation used everywhere.

---

### Priority 2 — Game logic functions (core gameplay correctness)

These functions control game state transitions, scoring, and the powerup system. Bugs here directly affect the player experience.

| Function | File:Line | What to test |
|---|---|---|
| `patchRandomWords()` | server.js:1745 | Replace mode (word substitution), erase mode (word removal), empty input, single-word input, more replacements than words |
| `sabotageSummary()` | server.js:1802 | Each powerup type produces correct summary string |
| `allSubmitted()` | server.js:1723 | All submitted, none submitted, partial |
| `allPlayersReady()` | server.js:1849 | All ready, not all ready, below MIN_PLAYERS |
| `orderedSubmissions()` | server.js:1727 | Correct ordering/shuffle of submissions |
| `grantPowerup()` | server.js:1713 | Correct powerup assignment, count |
| `removeOnePowerup()` | server.js:1734 | Has powerup, doesn't have it, last one removed |
| `isLocked()` | server.js:1741 | Active lock, expired lock |
| `leaderboard()` | server.js:2351 | Correct score sorting |
| `pickOpponent()` | server.js:1835 | Excludes self, single opponent, no opponents |
| `modeSupportsPowerups()` | server.js:1310 | Classic → true, humanity → false |
| `snippet()` | server.js:1841 | Short text (no truncation), long text (truncated), empty |

**Estimated effort:** Medium — ~2 days. **Impact:** Prevents game-breaking bugs in round progression and powerup effects.

---

### Priority 3 — Billing and credits system (financial correctness)

The billing system handles real money. Incorrect calculations or race conditions could lead to over/under-charging.

| Function | File:Line | What to test |
|---|---|---|
| `ensureBillingAccount()` | server.js:678 | New account creation, existing account lookup, guest → user merge |
| `debitCredits()` | server.js:769 | Sufficient balance, insufficient balance, zero amount |
| `creditCredits()` | server.js:795 | Adding credits, idempotency via externalId |
| `billingSnapshot()` | server.js:741 | Correct balance/free-play reporting |
| `checkDailyImageAllowance()` | server.js:564 | Under limit, at limit, over limit for account/IP/fingerprint |
| `reserveDailyImageAllowance()` | server.js:620 | Reservation counting |
| `rollbackPendingDailyUsage()` | server.js:645 | Usage correctly rolled back |
| `ensureRoundFunding()` | server.js:930 | Free play available, paid credits needed, insufficient funds |
| `refundPendingRoundCharge()` | server.js:977 | Correct refund amount, double-refund prevention |
| `mergeGuestIntoUser()` | server.js:880 | Balance transfer, ledger merging |
| `parseCreditPacks()` | server.js:126 | Valid JSON, invalid JSON, missing fields, empty |
| `roundCostCents()` | server.js:845 | Cost calculation based on player count |

**Estimated effort:** Medium — ~2-3 days. **Impact:** Critical — prevents billing errors and financial bugs.

---

### Priority 4 — Rate limiting and security (abuse prevention)

| Function | File:Line | What to test |
|---|---|---|
| `consumeRateLimit()` | server.js:272 | Under limit, at limit, window expiry/reset |
| `pruneRateBuckets()` | server.js:300 | Stale bucket cleanup |
| `withHttpRateLimit()` | server.js:309 | Middleware blocks when rate exceeded, allows when under |
| `socketRateLimited()` | server.js:335 | Socket event rate limiting |
| `createSocketBindChallenge()` | server.js:355 | Token generation, TTL |
| `verifySocketBindChallenge()` | server.js:380 | Valid token, expired token, wrong token, timing-safe comparison |
| `safeTokenMatch()` | server.js:369 | Timing-safe comparison correctness |
| `passwordHash()` | server.js:862 | Deterministic output, salt variation |

**Estimated effort:** Medium — ~1-2 days. **Impact:** Prevents abuse, brute-force attacks, and authentication bypasses.

---

### Priority 5 — HTTP API endpoints (integration tests)

Use `supertest` to test Express routes without starting the full server.

| Endpoint | What to test |
|---|---|
| `POST /api/stripe/webhook` | Valid/invalid signatures, checkout.session.completed event handling |
| `GET /api/billing` | Returns correct billing snapshot for authenticated user |
| `POST /api/billing/checkout` | Creates Stripe session, validates pack ID, respects cooldown |
| `POST /api/auth/register` | Valid registration, duplicate email, weak password |
| `POST /api/auth/login` | Correct credentials, wrong password, unknown email |
| `GET /api/avatars` | Returns avatar catalog |
| Static file serving | index.html, app.js, styles.css served correctly |

**Estimated effort:** Medium — ~2 days. **Impact:** Catches routing, middleware, and response format issues.

---

### Priority 6 — Socket.IO game flow (integration tests)

End-to-end tests for the multiplayer game loop using `socket.io-client`.

| Flow | What to test |
|---|---|
| Room lifecycle | Create room → join → leave → destroy when empty |
| Player management | Join with valid name, reject beyond MAX_PLAYERS, host transfer on leave |
| Round flow | Lobby → round start → submit prompts → showcase → vote → results → intermission |
| Powerup usage | Each of the 7 powerups (blackout, scramble, erase, decoy, lock, undo, spy) |
| Vote tallying | Votes counted correctly, ties handled, winner detection at TO_WIN |
| Mode selection | Classic vs. humanity mode differences (powerups enabled/disabled, prompt source) |
| Reconnection | Player disconnect and rejoin during active round |

**Estimated effort:** High — ~3-5 days. **Impact:** Validates the full game loop works end-to-end.

---

### Priority 7 — Image generation (mock-based tests)

| Function | What to test |
|---|---|
| `generateWithOpenAI()` | Successful generation, API error handling, response parsing |
| `generateWithXAI()` | Successful generation, API error handling |
| `generateGameImage()` | Provider fallback chain, all providers fail → placeholder |
| `fetchImageBuffer()` | HTTP fetch, data URI parsing, retry logic |
| `similarityScore()` | Identical images → ~100, different images → lower score, error fallback |
| `providerChain()` | Correct ordering based on config |

**Estimated effort:** Medium — ~2 days (all external calls mocked). **Impact:** Ensures graceful degradation when image APIs are unavailable.

---

## Recommended Implementation Order

```
Phase 1 (Week 1):  Setup + Priority 1 + Priority 2
                    Install vitest, write ~40-50 unit tests for utilities and game logic

Phase 2 (Week 2):  Priority 3 + Priority 4
                    Billing correctness + rate limiting/security tests (~30-40 tests)

Phase 3 (Week 3):  Priority 5 + Priority 7
                    API endpoint integration tests + mocked image generation (~25-35 tests)

Phase 4 (Week 4):  Priority 6
                    Full Socket.IO game flow integration tests (~15-25 tests)
```

## Quick-Start Setup

```bash
npm install --save-dev vitest supertest socket.io-client sinon
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Key Architectural Note

The biggest obstacle to testability is that `server.js` is a single 3,400-line file with all logic, state, and I/O interleaved. The utility functions (Priorities 1-2) can be tested immediately by extracting them or using `require()` with module mocking. For deeper integration tests (Priorities 5-6), the server initialization will need to be factored so tests can create isolated server instances without port conflicts.

A practical first step: extract pure functions into a `lib/` directory (e.g., `lib/utils.js`, `lib/billing.js`, `lib/game-logic.js`) and `module.exports` them. This makes them directly importable by tests without needing to spin up the full server.

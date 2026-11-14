# CLAUDE.md — Riptide Escape

Version 2.2 · Updated 13 November 2026

Read this file before working on the project. Use `Riptide_Escape_Game_Proposal.md` as the gameplay and academic reference. Explicit user instructions take precedence. Resolve routine implementation details using the existing code and these rules; ask only when a missing decision materially changes scope or behaviour.

This file specifies implementation standards. It is not evidence that code, infrastructure, tests or integrations exist; establish that from the repository and `docs/progress.md`.

## 1. Project overview

- **Game:** Riptide Escape.
- **Tagline:** Catch. Prepare. Reunite. Escape. (Welcome-screen hero line: "Find your crew. Brave the river. Make it home.")
- **Student:** Ulaganesan Muhunthan.
- **UOB number:** 2541667.
- **Module:** Distributed Service Architecture.
- **Platform:** Responsive 2D browser game.
- **Stack:** MongoDB, Express, React, Node.js (MERN), with a separate Node.js content worker using node-cron.
- **Editor:** Visual Studio Code; other editors may use the same project commands.
- **Design reference:** Figma file "Riptide Escape" (`6I0dGbNWYwpJCDjugicvRu`), pages "low-fidelity wireframes" and "high-fidelity wireframes".
- **Stage:** Documents at v2.2; repository scaffold and first playable slice started 13 November 2026. Check `docs/progress.md` for what has actually been built and verified.
- **Deadline and rubric:** submission/viva date and marking rubric are **unconfirmed**. Do not invent them.
- **First implementation milestone:** A working slice from registration to catching, feeding a four-fish batch, selling fed fish, buying the map (15 coins left) and compass (20 left), then completing the first crossing.

The selected explorer (Alex or Finn, renameable) survives a river accident and must find three missing teammates: Mira the Scout, Jonah the Medic and Tess the Navigator. Players catch fish directly, solve feeding maths, sell fed fish and collect treasure coins, purchase equipment, answer crossing quizzes, recruit companions, and escape together by boat.

The academic implementation must demonstrate low coupling, high cohesion, interoperability, event-driven programming, virtual identity, and resilient communication between independently running components.

## 2. Scope and sources of truth

### Core release

- Single-player story campaign with NPC teammates.
- Character selection with identical abilities for both character options.
- Direct catching, feeding batches and arithmetic, fed-fish sales, equipment purchases and loadouts.
- Map-first and compass-second progression.
- Three river regions, three teammates, checkpoints, hearts and final escape.
- Account ownership, persisted progress, server-side validation and API failure recovery.
- Separate content acquisition worker and locally available fallback challenges.

### Deferred features

Do not introduce these unless requested: real-time multiplayer, voice chat, 3D physics, real-money purchases, player trading, daily-only restrictions, streak rewards, friend leaderboards, social login, optional avatar services, or an offline authoritative game economy.

The proposal is authoritative for gameplay. The Figma file is authoritative for appearance and screen states; it never overrides a gameplay rule. The repository lockfile and configuration are authoritative for installed tools and executable commands. Record material changes to gameplay in the proposal and versioned rules together.

## 3. Architecture and layer rules

1. React components render and collect input. Feature hooks coordinate API calls and screen state.
2. The client calls only the application API for authoritative gameplay. Never access MongoDB from the browser.
3. Express routes perform request validation and authentication, then call domain services.
4. Domain services enforce economy, hearts, progression and ownership rules; a store interface handles persistence.
5. Provider adapters normalize external content. Provider-specific payloads must not spread into gameplay modules.
6. The independent worker acquires and validates content; gameplay reads prepared content rather than depending on a live provider request for every answer.
7. Keep modules focused: authentication, campaigns, fishing, feeding, economy, encounters, companions and content.
8. Use explicit dependencies for clocks, ID generation, randomness and the store so meaningful tests are deterministic.
9. Share public contracts without importing server-only code, secrets or answers into the client bundle.
10. Add abstractions when they isolate a real dependency or repeated logic. Avoid pass-through layers and premature microservices.
11. Database sharing still creates schema coupling. Version content contracts and keep worker/server releases compatible.
12. Commit state before publishing domain events. If event delivery becomes necessary for correctness, use an outbox or another durable mechanism; an in-memory emitter is not durable messaging.
13. (v2.2) Domain services depend on the `GameStore` interface. The in-memory store is for unit tests and local demonstration only; the MongoDB store must pass the same service tests before it is called complete. Never present the in-memory store as the persistence deliverable.

## 4. Repository structure

```text
apps/
  web/
    src/
      app/                 # routing, providers and entry point
      features/            # auth, camp, fishing, feeding, shop, map, crossings, journal
      shared/              # genuinely shared components, API client and utilities
      styles/              # tokens.css (Living River palette), global.css
    public/                # licensed static assets
  api/
    src/
      app/                 # Express setup, middleware, configuration
      modules/
        auth/
        campaigns/
        fishing/
        feeding/
        economy/
        encounters/
        companions/
        content/
      shared/              # store interface and implementations, errors, clock, ids
    test/                  # node:test service and HTTP tests
  worker/
    src/
      jobs/                # refill, low-stock checks, retry orchestration
      providers/           # Fish API adapter; feeding maths stays in its domain module
      app/                 # scheduler, configuration, startup/shutdown
packages/
  contracts/               # public DTOs, schemas, safe shared identifiers
  server-content/          # server/worker content repository and normalization
  game-rules/              # versioned prices, prerequisites and rule definitions
scripts/                   # safe setup, seed and migration scripts
tests/                     # integration and end-to-end tests
docs/
  architecture.md
  api.md
  decisions.md
  progress.md
.env.example               # placeholders only
package.json
package-lock.json
CLAUDE.md
```

Adapt to established equivalent directories rather than reorganizing working code gratuitously. Server-only packages must be excluded from browser dependencies. Shared game rule displays never make the client authoritative.

## 5. Technology and dependency standards

| Concern | Choice |
| --- | --- |
| Language | TypeScript with strict checks, written in the erasable subset (no enums, namespaces or parameter properties) so Node can run it directly |
| Runtime | Node.js 22.18 or later; server, worker and tests run `.ts` files natively; relative imports include the `.ts` extension |
| Web tooling | React with Vite |
| Routing | React Router |
| Server-state cache | TanStack Query if justified by the implementation |
| UI state | React state and context for local or genuinely shared state |
| HTTP client | Fetch through one application API client |
| Database access | MongoDB behind the `GameStore` interface; choose the driver or Mongoose once and use it consistently |
| Runtime validation | Hand-written validators in `packages/contracts` for the first slice; adopt a schema library such as Zod when the contract surface grows |
| Passwords | Argon2id, scrypt or bcrypt; the first slice uses Node's built-in `crypto.scrypt` with a per-user salt |
| Unit/integration tests | Node's built-in `node:test` and `node:assert`; React Testing Library when UI tests are added |
| Browser flows | Playwright |
| Code quality | ESLint and Prettier |
| Logging | Structured server logging with redaction |

Before adding packages, inspect package.json and the lockfile. Verify current official documentation for exact APIs and compatibility. Explain new dependencies briefly; no need to ask again for routine work already authorized. Commit the lockfile and record the supported Node.js runtime. Never claim proposed dependencies are installed.

## 6. Authoritative gameplay rules — version 2.2

### A. Catch fish at camp

A new campaign begins with zero coins, zero caught fish, no purchased equipment and three hearts. Bare-hand fishing is permanently free and available at every camp.

The player selects **Catch fish** in the Fishing Area. The server validates camp state, ownership, the equipped loadout and the action key, then directly adds the configured number of **unfed fish**. Show a short catching animation and the confirmed stock increase in the same screen. There is no counting input, answer submission, catch quiz, correctness result or separate catch-challenge page. Catching is free, costs no hearts and does not call the Fish API. Catch again repeats this direct action; Continue to Feeding opens batch preparation.

| Loadout | Unfed fish earned per accepted Catch action |
| --- | ---: |
| Bare hands | 1 |
| Fishing rod | 2 |
| Rod + improved reel | 3 |
| Rod + improved reel + hook | 4 |
| Fishing net | 4 |
| Specialized trap | 5 |

Only one loadout is active. Net/trap effects do not stack with rod upgrades; traps still require an explicit Catch action and give no passive income. Loadout effects are read and applied atomically when the Catch action is accepted. Only unfed fish are added by catches. Apply rate limits, reject overlapping requests and reuse the original action key when retrying an uncertain outcome; duplicate requests never add another catch.

### B. Feed a batch through a maths challenge

At the camp fish pen, reserve exactly **4 unfed fish** for one feeding batch. Fewer than four: explain how many more are needed and link to Catch fish. Food is free and supplied for the puzzle. Players never have to buy food before earning their first coins.

The batch's fish count comes from actual owned stock. Generate a matching local feeding illustration with exactly four fish and the chosen number of food crates. Do not display an arbitrary API image with a different count, overwrite inventory with an API count, or reuse the API image's chest count as the reward-chest count.

Let `F = 4` fish, `C` food crates, `P` pellets per crate, `N` pellets needed per fish, and `T = C * P` total pellets. These are game puzzle parameters, not real fish-care advice.

| Question | Required answer / formula |
| --- | --- |
| Total food | `T = C * P` |
| Equal whole-pellet share | Integer `T / F`; generate only when `T % F == 0` |
| Enough food? | Boolean `T >= F * N` |
| Pellets left after feeding | `T - F * N`; generate only when `T >= F * N` |
| Whole share and remainder | Two integers: `floor(T / F)` and `T % F` |
| Extra crates required | `ceil(max(0, F * N - T) / P)` |

Easy uses positive small values and exact division. Medium adds multiplication and enough/leftover questions. Hard adds whole-share/remainder and extra-crate questions; defer free-form fractions/decimal answers in the MVP. Use bounded values such as `C = 1..6`, `P = 4..12`, `N = 1..12`, with type-specific validity checks. Choosing 10 pellets per crate does not by itself ensure exact division.

Correct answer: atomically convert that batch's four reserved unfed fish into four **fed fish** and award **5 bonus coins once per batch**. Display happy-fish feedback and a small reward-chest animation. The coin award commits on answer validation; the animation is presentation only and cannot be opened repeatedly for money.

Wrong answer: no fish conversion, coins or heart loss. Show worked steps. The batch stays reserved for a fresh question; the old explained question cannot later earn a reward. Permit retry without a fee. Cancelling the unresolved batch releases its four unfed fish exactly once and gives no reward. Reload resumes the active batch. There is at most one active feeding/crossing challenge and one feeding batch per campaign.

Example: four owned fish, two crates, 12 pellets per crate -> 24 total -> **6 pellets per fish**. A correct answer makes four fish sellable and awards five coins. The general eight-fish/four-crate example is mathematically valid but is not the MVP's fixed batch size.

### C. Sell fish and buy tools

Only **fed fish** may be sold, at **10 coins per fish**. Unfed and reserved fish cannot be sold. Sell any positive integer quantity up to the available fed stock. Deduct stock, credit coins and record the ledger in one transaction. Fish never become unfed again or earn another feeding bonus.

One completed four-fish cycle yields **45 coins**: 5 from feeding and 40 from selling. With bare hands, four accepted bare-hand Catch actions plus one correct feeding answer yield enough to buy the 30-coin map, leaving 15. A second full cycle adds 45 (balance 60); buying the 40-coin compass leaves 20. No crossing treasure is required to acquire the initial equipment.

Item IDs are stable identifiers used by code and saves. Display names follow the Figma design (v2.2).

| Item ID | Display name | Price | Effect / prerequisite |
| --- | --- | ---: | --- |
| river_map | River map | 30 | First purchase; reveals regions and camps |
| compass | Compass | 40 | Second purchase; requires map |
| swimming_goggles | Swimming goggles | 30 | Basic travel prerequisite |
| swimming_outfit | Swimming outfit | 40 | Basic travel prerequisite |
| rod_kit | Fishing rod (with basic reel and hook) | 50 | Catch yield 2 |
| improved_reel | Improved reel | 60 | Requires rod; rod yield 3 |
| hook_upgrade | Hook | 40 | Requires rod and improved reel; rod yield 4 |
| net | Fishing net | 100 | Alternative catch yield 4 |
| specialized_trap | Specialized trap | 150 | Alternative catch yield 5 |
| life_jacket | Life jacket | 60 | Required for Reed Marsh |
| rescue_rope | Rope | 80 | Required for Rapid Gorge |
| boat | Boat | 180 | Required for final escape |

Until Map is owned, only Map is purchasable. Until Compass is also owned, only Compass is newly purchasable. Then other valid items unlock. No duplicate permanent purchases, refunds, player trading or real-money payments in the MVP. Camp trading/equipping/rest requires no active challenge.

Mandatory travel gear totals **460 coins**. Without crossing income or optional fishing upgrades, 11 four-fish cycles earn 495 coins from 44 accepted bare-hand Catch actions and 11 successful feeding challenges. This is a baseline balancing example, not a required play sequence. Leftover unfed fish remain saved until another batch can be formed.

### D. Treasure-counting river crossings

At each crossing, show an image containing fish and treasure chests. The player enters **two non-negative integers**, fish and chest counts. Use protected provider counts or independently authored known counts. The fish are visual hazards, not sellable inventory catches; these chests are loot, not food crates. Fish-and-chest counting happens only here, never during catching.

Let `L = actualChestCount * 10` coins. Resolve both fields together in one accepted submission:

| Result | Coins | Heart cost | Progress |
| --- | --- | --- | --- |
| Both counts correct | Full `L` | 0 | Clear encounter |
| Exactly one count correct | `floor(L / 2)` | 1 | Clear encounter only if at least one heart remains |
| Both counts wrong | 0 | 1 | Stay at encounter; fresh image if alive |
| Enabled timer expires | 0 | 1 | Stay at encounter; fresh image if alive |

With one correct count but a final heart lost, give **no loot**, do not clear the encounter and return to camp. This prevents partial-answer retries at zero hearts from farming money. A prior cleared encounter's reward is never reissued on replay, even after expedition failure. Wrong attempts award nothing; after an unsuccessful attempt, replace the image rather than allowing repeated guesses of the explained answer.

Example: image has eight fish and four chests. Both correct gives 40 coins and no damage; one correct with survival gives 20 coins and loses one heart; both wrong gives zero coins and loses one heart. Counts influence the full-loot opportunity, not multiplied heart damage.

**Content curation (new in v2.2, initial balance value).** Live provider samples on 13 November 2026 included chest counts of 1, 4, 5, 7 and 11. An uncapped 11-chest image would pay 110 coins for one crossing, almost a quarter of all mandatory gear. The server therefore issues only content whose chest count is within the region limit: **Shallow Bend 1-4, Reed Marsh 1-5, Rapid Gorge and Final crossing 1-6**, and whose fish count is 1-12. Out-of-range content stays stored but is not issued. The loot formula is unchanged. These limits are proposed defaults to be confirmed by playtesting.

Stage timers start at 45/35/30 seconds for easy/medium/hard. Offer untimed story mode chosen before expedition start. Difficulty uses curated visual density/overlap, the chest limits above and time limits; do not claim that provider difficulty labels exist. Refresh or disconnect does not restart an issued server deadline. Verified content failures cause a safe pause or replacement without penalty; a user's connection loss alone does not cancel a valid deadline.

At zero hearts, return to the last camp and reset unfinished route traversal. Keep coins, unfed/fed fish, purchased gear, recruited companions and committed score. Free camp rest restores three hearts. Start a new expedition fully rested. Complete the campaign with all three teammates, a boat and at least one heart after the final crossing.

### E. Progression, companions and score

| Stage | Required progress / gear | Encounters | Outcome |
| --- | --- | ---: | --- |
| Shallow Bend / Easy | Map, compass, goggles, outfit | 3 | Recruit Mira, the Scout |
| Reed Marsh / Medium | Previous stage, life jacket, earlier gear | 4 | Recruit Jonah, the Medic |
| Rapid Gorge / Hard | Previous stage, rope, earlier gear | 5 | Recruit Tess, the Navigator |
| Final crossing / Hard | Previous stages, boat, all teammates | 3 | Reach rescue dock |

Scout (Mira): **reveal the fish count** once per region per campaign; the chest count remains hidden and must still be answered. Using the hint is a deliberate exception to answer secrecy. Persist usage across expedition failure. A hinted fish field counts as correct when evaluating that submission; submitting the revealed fish count alone cannot clear a route unless the partial-success survival rule permits it. Record hint use in statistics and exclude hinted submissions from unassisted accuracy.

Medic (Jonah): restore one heart once per expedition, up to three; use at full health is disabled without consumption. Navigator (Tess): highlight the next route objective; no automatic answers. Companion use is server-authorized, idempotent and available only after recruitment.

Crossing points: **100** for both correct, **50** for a surviving one-correct clearance, **0** otherwise. Award points once at the encounter's first clearance; later retries cannot upgrade the claimed reward. Region-clear bonus is **50 points per remaining heart**, once per region. Apply the same one-time clear bonus to the final route. Catching, feeding and fish sales add no crossing points.

Maintain separate lifetime totals for sale income, feeding bonuses and crossing loot. Total coins earned is their sum; wallet equals earned coins minus purchases. Show feeding accuracy, perfect/partial crossings, hinted count and fish sold separately. Crossing perfect accuracy is both-correct submissions divided by all resolved crossing submissions, counting expiry as non-perfect and excluding system cancellations; report assisted and unassisted figures separately. Feeding accuracy counts first resolved submissions across fresh questions; explained-answer retries are new challenges and remain in the denominator.

## 7. State management and persistence

- Separate local presentation state from server-owned campaign state.
- Local state: open modal, focused input, selected tab, sound settings and animation progress.
- Server state: wallet, unfed/reserved/fed fish, feeding batches, ownership, equipped gear, hearts, route progress, active feeding/crossing challenge, companion usage and score.
- Use one canonical cached campaign snapshot. Do not maintain contradictory wallet copies in multiple components.
- After mutation, apply the authoritative result or invalidate/refetch related queries.
- Do not optimistically grant coins, fish, gear, hearts or cleared encounters.
- Disable pending buttons for usability, but enforce idempotency on the server.
- Abort obsolete requests; clean up listeners, timers and animation loops.
- On logout, clear user-scoped caches and return to login.
- Save every committed answer, feeding reservation/cancellation/success, sale, purchase, equip change, rescue and checkpoint.
- Reconnect by loading the saved campaign and active challenge. Preserve the original server deadline.
- Start with at most one active challenge per campaign to avoid conflicting feeding/crossing actions; direct Catch is allowed only at camp without an active challenge or feeding batch. Enforce this server-side.
- Treat campaign states `at_camp`, `feeding`, `crossing`, `failed`, `completed` and `abandoned` as explicit transitions, not loose booleans.
- One unfinished campaign per account. Starting another requires an explicit Abandon confirmation that archives the current one; never delete a campaign silently.

## 8. External content and worker

On **11 November 2026**, an HTTPS sample from `https://marcconrad.com/uob/fish/api.php` returned:

```json
{
  "question": "https://www.sanfoh.com/uob/fish/data/ch_65ded0_233037_003x007.png",
  "fish": 7,
  "chest": 3
}
```

**Live test on 13 November 2026 (v2.2).** Six further requests were made through a web-fetch tool, using only the parameter combinations the provider documents. These are observed results, not guarantees.

| # | Request | Observed response |
| --- | --- | --- |
| 1 | `api.php` | `question` = `.../data/ch_2aacd7_233022_007x002.png`, `fish` 2, `chest` 7 |
| 2 | `api.php?out=json` | `question` = `.../data/ch_36b0d3_233039_001x009.png`, `fish` 9, `chest` 1 |
| 3 | `api.php?out=json&base64=no` | `question` = `.../data/ch_338a35_233042_011x002.png`, `fish` 2, `chest` 11 |
| 4 | `api.php?out=csv` | Image link ending `ch_324f2b_233046_005x006.png`, then `6,5` |
| 5 | `api.php?out=json&base64=yes` | `question` is raw base64 PNG data with no `data:` prefix; body about 197,000 characters; the tool truncated it before `fish`/`chest` |
| 6 | `api.php?out=csv&base64=yes` | Base64 PNG data followed by `,1,4` |

Findings:

- Every response was a fresh puzzle; the JSON keys were `question`, `fish`, `chest` in all three JSON-link samples.
- The filename suffix is `<chest>x<fish>` zero-padded (for example `007x002` = 7 chests, 2 fish), confirming that the upstream filename leaks both answers. CSV output order is `fish,chest` (sample 4: filename `005x006`, values `6,5`).
- Observed fish counts: 1, 2, 2, 6, 9. Observed chest counts: 1, 4, 5, 7, 11.
- Image size: the PNG header decoded from the base64 samples (5 and 6) gives **660 x 360 pixels** (ratio 11:6). Sample 5 was roughly 148 KB. Only two images were measured; the link-form images could not be downloaded in the test environment, and no image was inspected visually, so count correctness against the picture remains unverified.
- The documented base URL is `http://`; the HTTPS form worked for all six requests.
- Usage terms as stated on the provider's documentation and demo pages (last updated June 2026): copyright Marc Conrad 2026; presented as is with no warranty implied; the service may be discontinued without notice; it must not be used for commercial applications. The pages state nothing about caching, re-hosting, redistribution or attribution.

Consequences: the game is a non-commercial university project, which fits the one stated restriction. Because re-hosting is neither permitted nor forbidden in writing, the default is to **proxy or cache images server-side for gameplay only, credit the provider in Help and Credits, and not redistribute images in the repository or design files until the module leader or provider confirms**. Locally authored fallback scenes carry no such restriction.

Provider documentation: https://marcconrad.com/uob/fish/doc.php . Validate the schema and actual image rendering during implementation.

- `question` is the image source; `fish` and `chest` are protected correct counts.
- Direct catching uses no puzzle API. The Fish API supplies crossing images and both protected counts only.
- Feeding uses locally generated arithmetic and a matching camp illustration based on reserved inventory, not an unrelated API population.
- Normalize to a server-only content record with `imageRef`, `fishCount`, `chestCount`, source, hash, licence/permission metadata and validation status.
- Do not return raw provider JSON or solution-bearing image URLs. Deliver images through an authorized opaque challenge-image route or permitted re-hosted opaque asset, without leaking upstream names in headers or metadata.
- Expose counts only after that challenge is resolved, or the fish count through an authorized Scout hint. If a puzzle is reused, post-answer explanations can disclose it; avoid repeated solved content for the same player.
- Background worker: startup refill, scheduled refill and low-stock checks; validate, deduplicate, serialize requests, use bounded retries/backoff and prevent overlapping jobs with a lease. Apply the region chest and fish limits from the gameplay rules when selecting content.
- Use permitted cached content and locally authored fish-and-chest scenes with known counts for fallback. Do not invent alternate counts for an unchanged image.
- Prepare content before timed play. Verified broken content triggers safe replacement or pause without coin/heart loss; never trust unlimited client-reported failures as a way to reset deadlines.

**Open Trivia DB is removed from the core campaign.** Crossing puzzles use the Fish API content contract, feeding maths is generated by the game, and catching is a direct server-validated action. Optional general-knowledge trivia is deferred; do not retain its worker, multiple-choice screens or option-elimination hints as active requirements.

When image counts cannot be visually validated, quarantine the content rather than silently penalizing players. The academic demonstration must include provider success, invalid payload handling and unavailable-provider fallback. No claim is made that the game integration is implemented merely because the responses above were inspected.

## 9. Security and transaction integrity

- Hash passwords; never encrypt passwords reversibly or store plaintext.
- Use authenticated server-side sessions referenced by an opaque token in a Secure, HttpOnly cookie with an appropriate SameSite attribute, and implement CSRF protection for mutations (the first slice checks the Origin header and requires a JSON content type).
- Define expiration and logout/revocation behaviour; do not build ad hoc token storage in localStorage.
- Authorize every campaign, challenge, inventory and transaction against the authenticated account.
- Derive user identity from the session, not a request body userId.
- Server computes rewards, prices, ownership checks, timers and prerequisites.
- Validate IDs, numeric ranges, integer quantities and bounded strings at runtime.
- Use one-use challenge IDs and action idempotency keys with unique indexes.
- Bind an action key to actor, operation and request payload. A replay returns the saved result; reuse with changed parameters is rejected.
- Check challenge consumption and apply the outcome within the same atomic operation/transaction.
- Purchases and sales atomically update wallet, inventory, ownership and ledger. Use a transaction-capable MongoDB deployment, including for integration testing.
- Use revision checks or conditional updates for concurrent campaign mutations. Never silently fall back to unsafe multi-document writes.
- Do not trust client countdowns. Atomically resolve submit-versus-expiry races once.
- Restrict CORS, rate-limit authentication and gameplay endpoints, and return sanitized errors.
- Keep database credentials and signing secrets server-side. Public frontend environment variables are public.
- Never commit `.env`, credentials, live database dumps or solution-bearing client fixtures.
- Redact passwords, sessions, email addresses and active answers from logs.
- Collect only needed account data: email, display name and password hash.

## 10. Data model and API contracts

Keep the MERN architecture, independent content worker, authentication, responsibility separation and server-authoritative rules in this guide. Add a focused feeding module and a local arithmetic generator; do not put reward logic in React or provider adapters.

| Collection | Version 2.2 data |
| --- | --- |
| users | Unique normalized email, display name ("Explorer name", not unique), password hash, preferences |
| sessions | Opaque session token hash, user, expiry; server-side so sign-out revokes it |
| campaigns | Owner, character (`male`/`female`), characterName, rulesVersion, state, checkpoint, region, hearts, coins, score, revision, expeditionId, currentEncounter; lifetime income totals |
| inventories | One per campaign; `unfedAvailable`, `unfedReserved`, `fedAvailable`, owned items, equipped loadout; all integer quantities >= 0 |
| feedingBatches | Campaign, four-fish reservation, status (reserved/fed/cancelled), active challenge, rewardClaimed, timestamps |
| shopItems | Stable item ID, versioned cost, prerequisites and effect (seeded from the shared game-rules package; never a second price source) |
| content | Source, private fish/chest counts, image reference, content hash, permission metadata, curated difficulty, validation status |
| challenges | Type (`feeding`, `crossing`), campaign, content/batch/encounter ID, private answer or formula inputs, issued rules snapshot, deadline, resolution, hint use |
| transactions | Scoped action key, operation, payload hash, stock/coin/score deltas and original response |
| companions | Campaign/companion pair, recruitment, region and expedition ability-use claims |
| events / workerRuns | Deduplicated domain events, statistics, content acquisition and lease status |

Campaign states are explicit: `at_camp`, `feeding`, `crossing`, `failed`, `completed` and (v2.2) `abandoned`. An abandoned campaign is archived and read-only; it is never deleted silently.

Conservation checks: caught fish total = unfed available + unfed reserved + fed available + sold total. Starting/resuming a batch moves four unfed fish between available and reserved, not into a second inventory. Feeding success moves reserved to fed once; cancellation reverses only its reservation. A wrong answer leaves the reservation unchanged. Failure of a river expedition never deletes inventory.

Enforce unique campaign/action keys, one inventory per campaign, one active challenge, one active feeding batch, one unfinished campaign per account, and one reward claim per batch/encounter/region. Transactions atomically couple challenge consumption, inventory, wallet, score, ledger, statistics and progression. Use a transaction-capable MongoDB deployment and revision checks for concurrent browser tabs.

All mutation keys bind owner, operation and payload. A duplicate returns its original result; an altered payload with the same key is rejected. Timer expiry versus submission, hint versus submission, and batch cancellation versus success must each have a single final outcome. UI animations never trigger reward grants.

| API operation | Proposed endpoint / behaviour |
| --- | --- |
| Health / readiness | GET `/api/health`; GET `/api/ready` (reports the active data store honestly) |
| Authentication | POST `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`; GET `/api/auth/session` |
| Campaign list/create/load | GET/POST `/api/campaigns`; GET `/api/campaigns/:id` |
| Abandon campaign (v2.2) | POST `/api/campaigns/:id/abandon`; explicit confirmation flag; archives the unfinished campaign so a new one can start |
| Direct catch | POST `/api/campaigns/:id/fish/catch`; action key only, no answer; returns authoritative unfed stock and yield |
| Feeding reservation | POST `/api/campaigns/:id/feeding/start`; reserves four fish and issues challenge |
| Feeding retry | POST `/api/feeding-batches/:id/retry`; fresh question after resolved wrong attempt |
| Feeding cancellation | POST `/api/feeding-batches/:id/cancel`; release unresolved reservation once |
| Answer/status/image | POST `/api/challenges/:id/answer`; GET `/api/challenges/:id`; GET `/api/challenges/:id/image` |
| Verified replacement | POST `/api/challenges/:id/replacement`; server-verified content failure only |
| Sale | POST `/api/campaigns/:id/fish/sell`; fed stock only |
| Catalogue/buy/equip | GET `/api/shop`; POST `/api/campaigns/:id/buy`; POST `/api/campaigns/:id/equip` |
| Route start/next | POST `/api/campaigns/:id/route/start`; POST `/api/campaigns/:id/route/next` |
| Companion ability | POST `/api/campaigns/:id/companions/:companionId/use`; authorized hint or heal |
| Rest/failure return | POST `/api/campaigns/:id/camp/rest`; POST `/api/campaigns/:id/return-to-camp` |

`/route/next` follows a committed clearance, or a failed living attempt that needs a fresh challenge. It never re-grants loot. Catch requests contain an action key, never an answer or client-selected reward. Crossing answers contain both count fields; feeding answers use a typed numeric, Boolean or quotient/remainder schema. No floating-point guessing tolerance is needed with the selected integer/Boolean MVP. Return authoritative state and result category without protected unresolved answers.

Camp-only actions require no active challenge; feeding retry/cancel are explicit exceptions for its existing batch. Use ownership checks and validated runtime schemas on every route. Keep credentials, answer records and private provider details out of the browser bundle and logs. Apply password hashing, secure HttpOnly sessions, CSRF protection, restricted CORS and rate limits.

### Existing saves and rule versions

Do not silently reinterpret old inventory or issued questions. Version 2 introduced feeding and the two-field crossing contract. For any implemented version-1 saves, use an explicit migration: preserve existing caught fish as already fed/sellable, create no retroactive feeding bonuses, preserve wallet/equipment/score, grandfather prior encounter claims as already rewarded, and migrate only when no challenge or batch is active. Finish active version-1 attempts under their pinned rules or use a documented safe cancellation; never deduct an extra life during conversion. Retire any unresolved old catch-counting challenge without reward or penalty before enabling direct catches; do not regrant a previously resolved catch. Keep active feeding/crossing attempts under their issued rules until a safe transition.

Version 2.2 changes no price, yield, reward, heart or score rule. It adds crossing content limits, the `abandoned` campaign state, `characterName` and the account display name. New campaigns record rules version 2.2; a version-2.1 campaign keeps all balances, fish states, feeding batches, rewards and route progress and may default `characterName` to the canonical explorer name. No game database existed when v2.2 was written, so no migration was executed.

## 11. Errors and observability

- Distinguish validation, authentication, authorization, conflict, rate-limit, network, provider and internal errors.
- Display actionable messages without exposing stack traces or internal solutions.
- Handle loading, empty, error, offline and success states on every data-driven screen.
- Retry safe reads selectively. Retry uncertain mutations only with the original action key.
- After a timeout, reconcile with the server before telling the player the action failed.
- Include request ID, operation, result and duration in redacted logs.
- Track pool levels, worker failures, stale leases and transaction conflicts.
- Expose health/readiness endpoints without leaking credentials or infrastructure details. Readiness must name the active store (`memory` or `mongodb`) truthfully.
- Keep logs and monitoring proportionate to the academic prototype.

## 12. Code standards

- Prefer small cohesive functions, descriptive names, early returns and explicit return types at module boundaries.
- Prefer immutable updates; avoid hidden mutable globals.
- Validate unknown external data before use. Avoid broad `any`, unsafe casts and unchecked non-null assertions.
- Components use PascalCase; functions and variables use camelCase; keep file naming consistent with the repository.
- Centralize game constants, theme tokens and user-facing strings.
- Keep business rules out of JSX, controllers and database hooks.
- Comment why an invariant or workaround exists. Avoid comments that restate obvious code.
- Remove unused code and debug output. Never suppress lint/security checks just to make a build pass.
- Format with the configured tooling and commit meaningful changes in focused commits.

## 13. Riptide Escape UI direction

The Figma high-fidelity page is the visual reference (v2.2). Its artwork is marked provisional; the layout, components, states and palette are agreed.

- Cinematic river setting: painted jungle-river scenes behind dark, readable panels.
- Use a consistent HUD: explorer portrait and name, hearts with a numeric label, coins, sound toggle and Settings. Fish stock (unfed / reserved / fed) appears on camp-economy screens.
- Eight main destinations in the camp navigation bar: Camp, Fishing, Feeding, Inventory, Shop, Equipment, River Map, Crew. Camp scene hotspots (Dock, Fish Pen, Merchant, Equipment Rack, Map Table, Campfire, Companion Camp) lead to the same places and must also be reachable by keyboard. Mobile uses a menu sheet. Keep the active encounter focused: no navigation bar during feeding maths or a crossing.
- Shop cards show item, price, owned/equipped status and the exact unmet prerequisite.
- Show unavailable routes and explain what unlocks them; do not silently hide progress requirements.
- Keep quiz text and buttons outside complex animated artwork where readability suffers. The crossing image area keeps the provider's 11:6 ratio (660 x 360 source) and is never cropped.
- Both character choices share gameplay abilities and comparable visual treatment.

### Theme tokens — Living River (from Figma)

| Token | Value | Role |
| --- | --- | --- |
| river | #073B3A | Deep background, scrims |
| emerald | #147D64 | Success, focus ring, positive accents |
| water | #45C4C0 | Highlights, links, labels on dark surfaces |
| gold | #F2BD52 | Primary actions, coins, eyebrow labels |
| paper | #F4E8CC | Light panels, inputs, headings on dark surfaces |
| ink | #102531 | Dark panels, HUD, text on light surfaces |
| wood | #694632 | Decorative borders, secondary text on paper |
| coral | #E56B65 | Hearts, errors, heart-loss feedback |
| muted | #B6C9BC | Supporting text on dark surfaces, disabled states |

Implement tokens once in `apps/web/src/styles/tokens.css` and reference them everywhere; do not hard-code colours in components. Verify actual text, focus and component contrast before shipping; gold on ink and ink on paper are the intended text pairings. Headings use a serif display face and body text a sans-serif; use system font stacks until licensed fonts are chosen. Spacing scale 4, 8, 12, 16, 24, 32 and 48 CSS pixels; panel radii 12-20 pixels. Motion from the Figma annotations: controls 150-250 ms, catch increment about 350 ms.

Use responsive layouts (desktop frames 1440 x 900, mobile 390 x 844), at least 44px interactive targets where practical, visible keyboard focus, semantic buttons and labelled inputs. Allow text zoom, keyboard operation and screen-reader navigation. Never convey hearts, answer correctness or locked state by colour alone.

Respect reduced motion and provide sound controls. Avoid autoplay audio before interaction. Announce answer feedback with a suitable live region; do not announce every timer tick. Count-puzzle alt text must not expose the solution. A separately authored equivalent challenge mode is needed for users unable to inspect images; do not claim full accessibility before it exists and is evaluated.

Animate presentation only. Client animations never determine whether a catch, purchase or crossing succeeds. Measure performance before adding game engines or optimization layers.

## 14. Testing standards

Test observable behaviour and high-risk invariants rather than duplicating implementation details.

- Unit tests: prices, prerequisites, yields, feeding formula validity, reservation conservation, heart bounds, scoring, companion limits and state transitions.
- API tests: authentication, ownership, validation, answer secrecy, error responses and replay handling.
- MongoDB integration tests: atomic sales/purchases, rollback, unique indexes, concurrent submits and non-negative balances using an isolated transaction-capable database.
- UI tests: meaningful loading/error states, disabled purchases, keyboard answer submission and authoritative state refresh.
- End-to-end flows: register, select character, catch four fish, feed, sell fed fish, buy map then compass, equip, clear first crossing, fail/recover, reload and resume.
- Final progression tests: recruit all companions, enforce boat prerequisite, complete ending only when eligible.
- Worker tests: malformed response, duplicates, timeout, rate-limit, fallback, overlapping refill and provider outage without player penalties.

Mock providers in deterministic automated tests; inject a clock and seeded randomness. Keep live API smoke tests separate, explicit and rate-limited. Never point automated tests or reset commands at production.

Proposal targets: cached gameplay p95 below one second at 20 concurrent test users; approximately 5-8 consenting usability testers; initial tutorial completion goal of 80% without help. Report measured results and limitations rather than assuming these targets have been met.

## 15. Vertical slice: feed and sell a batch

1. Begin with four available unfed fish at camp; start a feeding batch with an action key.
2. Atomically move four fish into reserved stock, create the batch and issue a validated arithmetic challenge.
3. On a wrong answer, save the failure and explanatory working; preserve the reservation. Retry creates a new challenge for the same batch.
4. On a correct answer, atomically consume the challenge, convert four reserved fish to fed fish, award five coins, close the batch and record the result/ledger.
5. Replay returns the original result. Cancellation racing success must have only one winner; cancel only an unresolved batch and release its reservation once.
6. The client displays the happy-fish and reward-chest animations after success. Closing an animation never loses a committed reward or grants another.
7. Sell four fed fish in a separate atomic operation for 40 coins; unfed and reserved stock are ineligible.
8. The entire earning cycle produces 45 coins. Reconcile uncertain network outcomes using the original action keys and authoritative server state.
9. Test direct-catch replay and rate limits, concurrent starts, wrong-answer retry, cancel/success races, duplicate bonuses, stock conservation and sale eligibility.

## 16. Feature workflow and commands

1. Read the relevant proposal section and inspect existing code.
2. Identify domain rules, public contract, persistence changes and ownership checks.
3. Implement server behaviour and atomicity, then connect the screen.
4. Add error, empty, loading and reconnect behaviour.
5. Add meaningful tests for changed logic and risk.
6. Run available formatting, lint, type, build and relevant test checks.
7. Update API docs, rule versions and progress notes where affected.
8. Report what changed, what was verified and any remaining limitation.

Root script contract (see the repository `package.json` for what is actually defined):

```bash
npm ci                   # only after package.json and lockfile exist
npm run dev              # web, API and worker in local development
npm run dev:web
npm run dev:api
npm run dev:worker
npm run lint
npm run typecheck
npm run format:check
npm test                 # node --test across workspaces
npm run test:integration
npm run test:e2e
npm run build
```

For initial scaffolding without a lockfile, install dependencies using the selected package manager and commit the generated lockfile. Never claim a command succeeded unless it was run. Keep seeds and migrations explicit; validate the environment before any destructive reset.

## 17. Environments, CI and release

- Separate development, test and production databases and credentials.
- Use a replica-set MongoDB deployment for transactions in local integration and deployment environments.
- Include placeholder configuration in `.env.example`: database URI, app origin, API port, provider base URLs, worker schedule/timezone and feature flags as needed.
- Expose only public app configuration to the client.
- CI should run installed checks and isolated integration tests. No automatic production deployment from untrusted pull requests.
- Deploy web, API and worker as distinct runtime concerns. Document startup, readiness, graceful shutdown and backups.
- Confirm provider transport, content permissions, fallback availability and session settings before external demonstration.
- Keep secret values out of build output, source maps and browser bundles.
- Do not deploy publicly, mutate production data or rewrite shared Git history without authorization.

## 18. Working agreements and definition of done

Proceed with reversible implementation within the user's authorized scope. Explain material assumptions; ask about incompatible scope choices, destructive changes, public releases or genuinely missing decisions. Do not require approval for every routine dependency or file edit.

- Keep changes focused; do not build deferred features speculatively.
- Preserve the proposal's game loop and academic architecture requirements.
- Do not mark mock UI, placeholder content or unconnected buttons as working features.
- Track current progress in `docs/progress.md`, separating "written", "run and passed" and "not yet verified".
- Use focused commits and reviewable descriptions that explain the problem, change and validation.

A feature is done when its user flow works, domain rules and ownership are enforced server-side, relevant tests pass, failure/reconnect states are handled, accessibility basics are met, and docs match the implementation. State explicitly when a dependency, environment or unrun test prevents verification.

## 19. Outstanding and deferred decisions

Resolve during implementation when relevant:

- **Submission/viva deadline and marking rubric: unconfirmed.**
- Written confirmation that provider images may be cached or re-hosted; visual check that provider counts match the pictures.
- MongoDB store implementation and transaction tests; hosting configuration.
- Final artwork, font assets and the text-free turquoise wave / gold compass / folded map emblem (present in Figma as provisional art).
- Price/yield balance, quiz timings, crossing content limits and an equivalent accessible counting mode.
- Whether the user later wants human teammates rather than the current NPC scope.

Keep the proposed eight-week order: API spike and wireframes; accounts and persistence; catch/feed/sell economy; shop and equipment; first region; remaining story; worker resilience; evaluation and demonstration. Change the schedule to fit the real deadline without claiming work is complete prematurely.

## Acceptance and evaluation

| ID | Scenario | Expected result |
| --- | --- | --- |
| V2-01 | New campaign | Zero coins and stock, no equipment, three hearts; bare hands available |
| V2-02 | Direct Catch action accepted or replayed | Configured unfed yield once; replay returns original result; no counting screen, API puzzle or heart loss |
| V2-03 | Feeding start with 3 unfed fish | Explain shortage; no reservation or coin deduction |
| V2-04 | Feeding start with 4 unfed fish | Exactly four reserved; no concurrent second batch |
| V2-05 | F=4, C=2, P=12, equal share | Answer 6; success converts four fish and awards 5 coins once |
| V2-06 | Wrong feeding answer | Worked solution; no reward/life loss; fish remain reserved; retry uses new challenge |
| V2-07 | Cancel / resume feeding | Release reservation once / restore same active batch |
| V2-08 | Sell unfed or reserved fish | Reject; quantities and coins unchanged |
| V2-09 | Feed then sell four fish | Combined income 45; no second feed bonus on those fish |
| V2-10 | First two earning cycles | Map purchased first (15 left); balance 60 after second cycle; compass second; 20 coins left |
| V2-11 | Image F=8, C=4, both counts correct | 40 coins, no damage, 100 crossing points on first clearance |
| V2-12 | Same image, one correct with 2 hearts | 20 coins, 1 heart left, clear, 50 points once |
| V2-13 | One correct with final heart | Zero loot/points, no clearance; return to camp |
| V2-14 | Both wrong / timeout | Zero loot; one heart lost; fresh puzzle if alive |
| V2-15 | Replay a cleared encounter | No duplicate coins/score or upgraded prior claim |
| V2-16 | Scout hint | Reveal only fish count once per region; mark assisted result |
| V2-17 | Concurrent answer/cancel/expiry/replay | One final atomic result; no negative stock or double payout |
| V2-18 | API payload or image failure | Crossing uses valid fallback or safe pause; direct catching remains independent of external puzzle availability |
| V2-19 | Browser inspection | No unresolved counts, raw provider payload or answer-bearing upstream image name |
| V2-20 | Reconnect or new browser tab | Same reservation, state and issued deadline; ownership enforced |
| V2-21 | Arithmetic edge cases | No zero division, invalid deficit leftover, negative crate need or ambiguous decimal format |
| V2-22 | Failure / free rest | Inventory, wallet, gear and teammates retained; rest restores three hearts |
| V2-23 | Final escape | Boat, all teammates and surviving final clearance required |
| V2-24 | Rule migration | Old inventory/claims retained; no retroactive reward; no active-attempt corruption |
| V2-25 | Start a new campaign while one is unfinished (v2.2) | Blocked until the player confirms Abandon; old campaign becomes `abandoned`, stays stored and readable; exactly one unfinished campaign afterwards |
| V2-26 | Crossing content outside region limits (v2.2) | An image with more chests or fish than the region limit is never issued; in-range content and loot formula unaffected |

Test semantic behaviour with deterministic clocks, seeded puzzle generation and mocked providers. Use isolated transaction-capable MongoDB integration tests for concurrent stock/reward mutations. Cover the full catch/feed/sell/buy route in browser tests and separate any rate-limited live API smoke tests. Documentation checks do not imply these implementation tests have run.

Playtest time to map, compass and first rescue, feeding error rates, explanation usefulness and repetitive-grind feedback. Keep the initial 5-8 consenting testers, 80% tutorial completion goal and cached-action p95 below one second under 20 concurrent users as targets, not achieved results. Compare comprehension and completion across the two activities rather than assuming the concept proves learning gains.

## Concept analysis and selected design

The design combines two concepts within the river-rescue story:

| Concept | Role in Riptide Escape | Reason for the adaptation |
| --- | --- | --- |
| Feed the Fish | Camp activity between catching and selling fish | Adds multiplication, division and resource planning to equipment preparation |
| Pirate Treasure Hunt | Fish-and-chest counting at submerged boats, flooded caves and river hazards | Makes observation challenges determine risk, coins and journey progress |

The player remains a stranded explorer searching for teammates. A riverbank fish pen supports the feeding activity; submerged river wrecks support treasure encounters. An aquarium-management storyline and pirate-ship-only campaign are unnecessary.

Retain three hearts rather than introducing 100 HP and fish-count-multiplied damage. Replace arbitrary every-fifth-room levels with the existing three regions; keep special boss rules, bought hints, paid food, paid healing, streaks and star ratings deferred. These would complicate balancing before the two core loops are tested.

The selected loop is **catch -> feed through maths -> receive a small bonus -> sell fed fish -> buy tools -> explore -> count fish and chests -> rescue teammates**. One wallet holds all coins. Points measure crossing performance; coins buy equipment.

All numerical rewards, batch sizes, puzzle limits and timers are initial balance values. They must be versioned and evaluated through playtesting, not presented as measured optimum settings.

## Version 2.2 change summary

Version 2.2 (13 November 2026) aligns the documents with the Figma design and records the first live provider test. **No price, yield, reward, heart, timer or score rule changed.** Catching remains a direct action with no counting quiz; fish-and-chest counting belongs only to river crossings.

| # | Decision | v2.1 | v2.2 (adopted) | Why |
| --- | --- | --- | --- | --- |
| 1 | Design reference | "No Figma reference yet" | Figma file `6I0dGbNWYwpJCDjugicvRu` is the visual reference: page "high-fidelity wireframes" governs appearance, "low-fidelity wireframes" governs flow | The files exist and cover all 25 screens |
| 2 | Theme | Light palette (`#F3F8F7`, `#086F78`, `#E6AD36`) | "Living River" palette from Figma (river `#073B3A`, emerald `#147D64`, water `#45C4C0`, gold `#F2BD52`, paper `#F4E8CC`, ink `#102531`, wood `#694632`, coral `#E56B65`, muted `#B6C9BC`) | One palette in design and code |
| 3 | Tagline | "Catch. Prepare. Reunite. Escape." | Unchanged as the official tagline; "Find your crew. Brave the river. Make it home." is the Welcome-screen hero line | The tagline names the game loop; the hero line carries the story |
| 4 | Navigation | 6 destinations; Inventory and Equipment reached from Camp | 8 destinations: Camp, Fishing, Feeding, Inventory, Shop, Equipment, River Map, Crew; camp scene hotspots are a second way in; mobile uses a menu sheet | Matches Figma; fewer clicks in the earning loop |
| 5 | Client routes | App Spec `/campaigns/:campaignId/...`; Build Guide `/play/:campaignId/...` | App Spec scheme is canonical (`/`, `/welcome`, `/register`, `/login`, `/campaigns/...`) | Mirrors the REST paths; one scheme only |
| 6 | Save slots | New campaign never deletes an earlier one; one unfinished campaign per account | Same rule. Figma's "Replace an existing save" becomes **Abandon and start new**: after explicit confirmation the unfinished campaign is archived as `abandoned`, never deleted | Keeps the Figma flow without silent data loss |
| 7 | Names | Unnamed cast; Register asks for a unique username | Explorers Alex (female) and Finn (male) as default, editable `characterName`; teammates Mira (Scout), Jonah (Medic), Tess (Navigator); Register asks for "Explorer name" (display name, not unique); sign-in is by unique email | Matches Figma; removes a redundant unique field |
| 8 | Accident wording | "Boat overturns" | The expedition **raft** tips; the **boat** is the escape craft bought later | Explains why a boat must be bought |
| 9 | Crossing image | Size unknown | Provider images measured at 660 x 360 (two samples); the crossing image area keeps an 11:6 ratio and never crops | The Figma mock grid is a placeholder |
| 10 | Crossing content limits | None | Chest count per issued image limited to 4 / 5 / 6 by region, fish 1-12 (initial values) | Live samples reached 11 chests = 110 coins in one crossing |
| 11 | Item display names | Rod kit, Hook upgrade, Rescue rope, Net | Fishing rod, Hook, Rope, Fishing net; item IDs unchanged | Matches Figma labels |
| 12 | Sound control | Settings only | Also a toggle in the HUD and on Welcome | Matches Figma |
| 13 | Password hashing | Argon2id or bcrypt | Argon2id, scrypt or bcrypt; the first slice uses Node's built-in scrypt | No native build dependency; still a memory-hard password hash |
| 14 | Dev tooling | tsx, Vitest proposed | Node 22.18+ runs TypeScript directly; unit tests use the built-in `node:test` runner; Playwright and Vite unchanged | Fewer dependencies; tests run without an install |

Still unconfirmed: **submission/viva deadline** (not yet supplied), **assignment brief and marking rubric** (to be attached), written permission to re-host provider images, hosting, accessible counting mode, playtested prices/timers/content limits. The Complete Build Guide (12 November 2026) was not revised; where it differs (routes in its section 9, bcryptjs/tsx/Vitest in its section 5), v2.2 takes precedence.

Figma follow-ups (design file not edited): relabel "Replace an existing save" to "Abandon and start new"; confirm story panels 2 and 3 show their own text; replace the crossing mock grid with a 660 x 360 image area.

### Version 2.1 change summary (11 November 2026, retained)

Catching is now a direct camp action with server-defined tool yield. Remove the standalone Fish-Counting Challenge and its answer route from new designs and implementations. Feeding Preparation and Feeding Maths remain consecutive screens. Retain fish-and-chest counting only in river crossings. Catch API failure cannot block direct catching because no external puzzle is requested for this action. Existing feeding, sale, shop and crossing reward rules remain as specified above.

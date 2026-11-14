GAME DEVELOPMENT PROPOSAL | VERSION 2.2 | UPDATED 13 NOVEMBER 2026

# Riverbound

## Catch. Prepare. Reunite. Escape.

**A story-driven river survival and puzzle adventure**

| Student | ULAGANESAN MUHUNTHAN |
| --- | --- |
| UOB number | 2541667 |
| Module | Distributed Service Architecture |
| Platform | Web application; MERN stack; Visual Studio Code |
| Core integrations | Marc Conrad Fish Game API; local feeding-maths generator |
| Design reference | Figma file "Riptide Escape" (low- and high-fidelity wireframes) |
| Submission / viva deadline | **Unconfirmed** - date and time not yet supplied |
| Assignment brief / marking rubric | **Unconfirmed** - to be attached |
| Proposal status | Proposed design; gameplay values subject to playtesting; first playable slice in development |

### Project summary

Riverbound follows a male or female explorer separated from their expedition team after a river accident. Starting without equipment or money, the player catches fish, feeds reserved batches through maths challenges, earns feeding bonuses, sells fed fish, buys equipment and completes treasure-counting crossings to reunite with teammates and escape.

Direct catching supplies inventory; treasure challenges build observation skills; feeding develops arithmetic and resource planning. Treasure encounters distinguish perfect, partial and failed answers. Feeding mistakes teach through worked solutions without costing hearts; dangerous crossings use the three-heart survival rules.

The project demonstrates distributed service architecture through a React client, a Node.js/Express application server, MongoDB persistence, a separately running content worker, and external puzzle services. The server controls rewards, purchases, health, and progression.

### Relationship to the earlier proposal

This proposal replaces the daily-only Deep Streak concept with a persistent story campaign. It retains the previous proposal's student details, module, MERN stack, authentication, server-side validation, background content preparation, and architecture principles. Daily streaks, social competition, and cosmetic avatars become optional extensions rather than campaign requirements. References to the Heart API in the old document are corrected to the Fish Game API.

## 01 / Purpose, objectives and scope

### Aim

To design and develop a web-based river survival adventure that combines direct catching, a feeding-maths activity, virtual economy, equipment progression, and treasure-counting exploration while demonstrating low coupling, high cohesion, interoperability, event-driven programming, and secure virtual identity.

### Measurable objectives

- Implement registration, login, character selection, and persistent player progress linked to a unique account.
- Integrate the Fish Game API through a server-controlled adapter for two-field treasure crossings; implement local, validated feeding arithmetic.
- Implement an auditable catch, reserve, feed, sell, buy, and equip loop with non-negative balances and protection against duplicate rewards.
- Build three river regions with distinct hazards, checkpoints, and teammate rescue objectives.
- Implement three-heart survival, perfect/partial crossing progression, crossing heart penalties, and recoverable failure.
- Run content acquisition separately from the gameplay server and demonstrate continued play when an external provider fails.
- Evaluate gameplay completion, usability, performance, persistence, and economy integrity using defined acceptance checks.

### Target audience and experience

The intended audience is students and casual puzzle players who enjoy short challenges within a continuing story. The first release is a responsive 2D browser game using illustrated river scenes, swimming animations, and accessible menus. It is an educational game concept, not a realistic swimming or survival simulator.

### Core release

One single-player campaign; male/female character choice with identical abilities; three recruitable non-player teammates; three difficulty regions; unfed/fed fish inventory, feeding pen and shop; map and compass; equipment ownership; crossing quizzes; checkpoints; saved progress; and an ending screen.

### Scope boundaries

Teammates are story-controlled NPCs for the first release. Real-time multiplayer, voice chat, open-world 3D simulation, real-money purchases, trading between users, and a complex fishing physics engine are outside the core scope. Optional extensions include cosmetic avatars, achievements, a daily challenge, and friends' rankings.

### Key design assumptions

A friendly riverbank trader buys fed fish and sells supplies at the starting camp and later checkpoints. Coins have no real-world value. The map must be purchased first, the compass second, and basic travel gear next. All prices, rewards, timers, content limits and companion bonuses below are initial design values, not confirmed balance results.

## 02 / Story and player journey

### Cast (v2.2)

The explorer is **Alex** (female) or **Finn** (male); the player may rename the character. The missing teammates are **Mira** the Scout, **Jonah** the Medic and **Tess** the Navigator. Both explorers have identical abilities.

### Opening: separated by the current

During an expedition, a sudden surge tips the group's raft and separates the team. The selected character reaches a shallow riverbank with ordinary clothing but no fishing equipment, goggles, swimwear upgrade, boat, map, compass, or coins. A trader explains that caught fish can be fed and sold for supplies and points out signs that the other explorers survived.

### Act I: prepare at the riverbank

Catch fish by hand for free, collect four unfed fish, solve a feeding question, receive five bonus coins and sell the four fed fish for 40 coins. Buy the map first (15 coins remain); repeat the cycle to reach 60 coins and buy the compass (20 remain). Then acquire goggles and an outfit and choose whether to invest in fishing upgrades before travelling.

### Act II: follow the trail

The map reveals the river regions and available camps. The compass adds direction indicators toward the next objective. The player swims along short animated routes, reads clues, and answers quizzes at hazards. Reaching a rescue site and completing its encounter recruits a teammate. Later crossings require both suitable equipment and successful answers.

### Act III: cross together

After recruiting all three teammates and acquiring a boat, the group attempts the final river crossing. Successful completion opens a rescue dock and the ending sequence. The summary shows teammates rescued, quiz accuracy, fish sold, coins earned, and equipment collected.

| Region | Hazards and requirements | Outcome |
| --- | --- | --- |
| 1. Shallow Bend / Easy | Floating branches and stepping stones. Map, compass, goggles and outfit required. Three crossing encounters. | Rescue Mira, the Scout; reveal a route clue. |
| 2. Reed Marsh / Medium | Fog, reeds and stronger currents. Life jacket additionally required. Four crossing encounters. | Rescue Jonah, the Medic; unlock a limited recovery ability. |
| 3. Rapid Gorge / Hard | Rapids, rocks and damaged crossings. Rope additionally required. Five encounters to the final camp. | Rescue Tess, the Navigator; prepare the boat. |
| Final escape | Boat and all three teammates required. Three hard crossing encounters. | Reach the rescue dock and finish the story. |

### Companion benefits: proposed, limited effects

Scout reveals the fish count in one crossing per region while leaving chest counting to the player. Medic restores one heart once per expedition, capped at three. Navigator highlights the route objective. Abilities are available only after recruitment and tracked on the server.

## Concept analysis and selected design

The design combines two concepts within the river-rescue story:

| Concept | Role in Riverbound | Reason for the adaptation |
| --- | --- | --- |
| Feed the Fish | Camp activity between catching and selling fish | Adds multiplication, division and resource planning to equipment preparation |
| Pirate Treasure Hunt | Fish-and-chest counting at submerged boats, flooded caves and river hazards | Makes observation challenges determine risk, coins and journey progress |

The player remains a stranded explorer searching for teammates. A riverbank fish pen supports the feeding activity; submerged river wrecks support treasure encounters. An aquarium-management storyline and pirate-ship-only campaign are unnecessary.

Retain three hearts rather than introducing 100 HP and fish-count-multiplied damage. Replace arbitrary every-fifth-room levels with the existing three regions; keep special boss rules, bought hints, paid food, paid healing, streaks and star ratings deferred. These would complicate balancing before the two core loops are tested.

The selected loop is **catch -> feed through maths -> receive a small bonus -> sell fed fish -> buy tools -> explore -> count fish and chests -> rescue teammates**. One wallet holds all coins. Points measure crossing performance; coins buy equipment.

All numerical rewards, batch sizes, puzzle limits and timers are initial balance values. They must be versioned and evaluated through playtesting, not presented as measured optimum settings.

## Shared gameplay rules — version 2.2

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

## 04 / Saving, reconnection and accessibility

Persist every catch, feeding reservation, feeding resolution, sale, purchase, hint, heart change, rescue and checkpoint before returning success. Reload restores current state, active feeding batch and original crossing deadline. At zero hearts, keep permanent progress and return to camp; feeding errors never cause expedition failure. An account has at most one unfinished campaign; starting another requires explicitly abandoning the current one, which archives it rather than deleting it.

Required screens include character selection, introduction, camp, direct Fishing Area, fish pen, feeding question, reward feedback, inventory with unfed/reserved/fed states, shop, equipment, map, treasure crossing, team journal, failure and ending summary. The Figma file contains all 25 screens with their loading, error and empty states, plus mobile adaptations. Support keyboard controls, clear labels, reduced motion, sound settings and untimed story mode. Provide a separately authored equivalent mode for players unable to inspect images; do not expose answers through alt text.

## Content integration and verified API contract

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

## 06 / Distributed service architecture

| Component | Responsibility and communication |
| --- | --- |
| React browser client | Rendering, input, animation and accessible feedback. Calls the application server through HTTPS REST/JSON. |
| Node.js / Express server | Authentication; challenge delivery and validation; economy; inventory; hearts; progression; journal and campaign summaries. |
| MongoDB database | Accounts, campaigns, content, inventory, transactions and event records. Accessible only by trusted server processes. |
| Independent content worker | Scheduled provider retrieval, validation and pool replenishment. Writes through a defined content repository boundary. |
| External services | Fish API supplies image puzzles and counts; a local generator produces feeding arithmetic. No authoritative client-side reward logic. |

### Low coupling and high cohesion

Keep authentication, content adapters, fishing, feeding, economy, encounters, companions, and progression in focused modules with explicit interfaces. Provider-specific formats remain inside adapters. Game rules live in one shared, framework-free package; persistence sits behind a store interface so domain services can be tested without a database. The worker can restart without stopping active gameplay while cached content remains available. Sharing MongoDB still creates schema coupling, so version the content contract and apply backward-compatible migrations. Separate processes demonstrate distribution without requiring every module to become a microservice.

### Event-driven behaviour

UI events include catch-clicked, sell-clicked, item-selected, answer-submitted, and timer-expired. The server emits domain events such as CatchAwarded, FeedingBatchReserved, FishFed, FeedingBonusGranted, TreasureAwarded, FishSold, ItemPurchased, HeartLost, TeammateRescued, and CheckpointReached after committing state changes. A React state update then refreshes the display from the server response. Asynchronous worker events include PoolRefilled and ProviderUnavailable. Real-time multiplayer or WebSockets are not required for this design.

### Virtual identity and fair play

Use a unique account ID, password hashes (Argon2id, scrypt or bcrypt, never reversible password encryption), and short-lived authenticated sessions. Store session credentials in Secure, HttpOnly cookies with appropriate SameSite and CSRF protection. Enforce campaign ownership on every operation, validate input, apply rate limits, and retain secrets in environment configuration.

All solutions, reward amounts, prices, timers, and prerequisites are validated by the server. Use a single-use challenge ID and an idempotency key for actions. Duplicate submissions return the original result without new rewards. Sales and purchases update stock, wallet, ownership, and ledger atomically using MongoDB transactions on a transaction-capable deployment. Client-side button disabling alone is insufficient.

### Operational boundaries

Serve React and the backend over HTTPS, restrict CORS to the app origin, avoid unsafe HTML rendering, and limit image proxy destinations to approved providers. Store minimal account data and never log passwords, tokens, or active solutions. Keep structured error logs, worker run status, backups, and a health endpoint. Use versioned content and game rules so saved campaigns remain consistent.

## Persistence, transactions and internal interfaces

Keep the MERN architecture, independent content worker, authentication, role separation and server-authoritative rules from CLAUDE.md. Add a focused feeding module and a local arithmetic generator; do not put reward logic in React or provider adapters.

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

## 08 / Delivery plan and evaluation

### Proposed eight-week implementation plan

The real submission date is unconfirmed; compress or reorder this plan once it is known.

| Week | Work and reviewable output |
| --- | --- |
| 1 | Confirm module assessment requirements; prototype the Fish API adapter and local feeding generator; validate API payloads and permissions; finalize story and wireframes. (Live API test and wireframes done 13 November 2026.) |
| 2 | Implement authentication, character choice, MongoDB schemas, and campaign save/load. |
| 3 | Deliver bare-hand catches, feeding arithmetic and reservations, fed-stock sales and transaction ledger. |
| 4 | Implement map-first/compass-second shop progression, gear effects and equipment prerequisites. |
| 5 | Build Shallow Bend, crossing treasure-counting encounters, hearts, camps, and the first teammate rescue. |
| 6 | Add remaining regions, companion abilities, boat requirement and final escape. |
| 7 | Integrate independent scheduled worker, fallback content, security checks and error recovery. |
| 8 | Run acceptance and usability evaluation, tune prices, resolve defects, prepare report and demonstration. |

### Functional acceptance and evaluation

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

### Performance and usability targets

Target cached gameplay actions at p95 below one second under 20 concurrent test users on the declared test deployment, excluding external acquisition. Measure content-pool health and recovery during simulated API outages. Invite approximately 5-8 consenting student testers to complete the first purchase and first rescue; record completion time, errors, quiz accuracy, and clarity ratings. An initial usability goal is at least 80% completing the tutorial without assistance. These are evaluation targets, not measured results.

### Methodology and evidence

Use iterative prototyping with a playable vertical slice before building all regions. Maintain a requirements checklist, Git history, API tests, failure logs, and anonymized playtest observations. Test keyboard and reduced-motion flows, replayed requests, authorization failures, transactional rollback, and simultaneous submissions. Document achieved results honestly, including unmet targets and remaining limitations.

## 09 / Risks, deliverables and references

| Risk | Mitigation |
| --- | --- |
| API downtime or changes | Adapters, cached pools, bounded retries, local fallback content and safe pause. |
| Answer exposure / reward abuse | Protected solutions, proxy images where permitted, one-use challenges, atomic mutations and rate limits. |
| Oversized crossing loot | Region chest limits on issued content; tune after playtesting. |
| Repetitive fishing | Measure time to each purchase; tune yields and prices; unlock story clues between earning sessions. |
| Scope expansion | Complete one region first; keep NPC teammates and 2D presentation; defer multiplayer and optional social systems. |
| Question quality / accessibility | Validate image counts and feeding maths, preserve attribution, offer untimed play and design an equivalent accessible challenge mode. |
| Shared database coupling | Version contracts and rule sets; coordinate schema migrations and protect worker permissions. |
| Unknown deadline and rubric | Keep the vertical-slice order so a demonstrable game exists at every stage; re-plan when confirmed. |

### Expected deliverables

A working MERN web game; independent scheduled content worker; local feeding-question generator and batch lifecycle; three-region campaign and ending; Fish API adapter and local feeding generator; authenticated player accounts; shop, inventory and economy ledger; database schema and seed data; API documentation; architecture and interaction diagrams; test and usability report; source repository; setup guide; and a demonstration of normal play and API-failure recovery.

### Expected outcome

Riverbound will combine a clear preparation loop with a purposeful rescue story. Players earn equipment through catching, feeding maths and selling, then count fish and chests to survive crossings and recover their team. The academic contribution is the implementation and evaluation of a reliable service-based application whose identity, content, economy, and progression remain consistent across separate components.

### References and source notes

[1] Marc Conrad. Fish Game API documentation, https://marcconrad.com/uob/fish/doc.php ; API endpoint https://marcconrad.com/uob/fish/api.php (sampled 11 and 13 November 2026). Observed keys: question, fish, chest. Stated terms: copyright Marc Conrad 2026, provided as is, may be discontinued, not for commercial applications. Re-hosting permission and image correctness still require review.

[2] Ulaganesan Muhunthan. Original Deep Streak proposal, user-supplied PDF. Source for student identity, module, MERN stack and distributed architecture goals.

[3] Student's Riverbound brief and subsequent Treasure Hunt / Feed the Fish concepts, 10-11 November 2026. Source for the two integrated game activities and requested reward chest.

[4] Figma file "Riptide Escape", https://www.figma.com/design/6I0dGbNWYwpJCDjugicvRu/Riptide-Escape , reviewed 13 November 2026. Source for the Living River visual system, cast names and screen states.

Version 2 introduced fish-and-chest crossings and mandatory feeding. Version 2.1 removed the catch-counting challenge and uses direct catching before feeding preparation and maths. Version 2.2 aligns the documents with the Figma design and the live API test. The previous PDF has not been regenerated by this Markdown update.

### Decisions to confirm

Confirm the module marking rubric and submission date; obtain confirmation on re-hosting provider images; validate provider image correctness visually; approve the proposed NPC teammate scope; and playtest the initial prices, timings and content limits. No claim is made that the full game, integrations, or evaluation have already been implemented.

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

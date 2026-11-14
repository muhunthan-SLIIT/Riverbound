# Riverbound — Game App Specification

Version 2.2 · Updated 13 November 2026 · Ulaganesan Muhunthan · UOB 2541667

## Overview and source hierarchy

Riverbound is a story-driven 2D browser game. After a river accident, a male or female explorer must earn equipment through catching, feeding maths and fed-fish sales, follow river routes, answer crossing quizzes, find three missing teammates and escape by boat.

**Tagline:** Catch. Prepare. Reunite. Escape.

This document is the page-by-page game build plan. It describes intended behaviour; it does not claim that screens, APIs or infrastructure are implemented.

Sources:

- `Riverbound_Game_Proposal.md`: gameplay, academic purpose, economy and campaign scope.
- `CLAUDE.md`: architecture, security, coding standards and UI tokens.
- Figma file "Riptide Escape" (`6I0dGbNWYwpJCDjugicvRu`): page "high-fidelity wireframes" for appearance, components and states; page "low-fidelity wireframes" for flow.
- This specification: screen behaviour, navigation, states and acceptance criteria.

Explicit user decisions take precedence. The proposal governs gameplay; CLAUDE.md governs implementation standards; Figma governs appearance and never overrides a gameplay rule. Resolve a genuine conflict explicitly and update the affected documents together. The Figma artwork is provisional; do not claim a pixel match until final assets are licensed.

## 1. MVP scope

| Feature | Scope | Decision |
| --- | --- | --- |
| Account registration and password login | Core | Authenticated identity owns saved campaigns |
| Male/female explorer choice | Core | Alex or Finn; same abilities and starting resources; editable character name |
| Introduction and tutorial | Core | Skippable explanation, mandatory game prerequisites |
| Direct fish catching | Core | Free bare-hand Catch action; no counting puzzle or catch answer |
| Feeding maths and reward chest | Core | Four-fish batches; one five-coin success bonus |
| Unfed/reserved/fed inventory, feeding bonuses, sales and coin wallet | Core | Server-authoritative persistent economy |
| Map, compass and equipment shop | Core | Map first, compass second, then other items |
| Equipment loadouts and upgrades | Core | One active fishing loadout |
| Three river regions and final escape | Core | Increasing quiz difficulty and equipment requirements |
| Three recruitable teammates | Core | Story-controlled NPCs: Mira, Jonah, Tess |
| Hearts, checkpoints and recovery | Core | Three hearts; free rest; preserve permanent progress |
| Save, reload and reconnect | Core | Server state survives browser refresh |
| Independent content worker and fallbacks | Core | External outages do not penalize the player |
| Keyboard, reduced-motion and untimed options | Core | Equivalent nonvisual counting mode needs separate authored content |
| Multiplayer, chat and player trading | Deferred | No online teammate matchmaking in MVP |
| Daily streaks and leaderboards | Deferred | Campaign is not restricted to daily play |
| 3D physics and open-world swimming | Deferred | Movement is illustrated and animated between encounters |
| Real-money purchases | Excluded | All coins are earned in game |
| Offline rewards and purchases | Excluded | Read-only offline display only; reconnect to mutate |

Technology: React frontend, Node.js/Express application API, MongoDB database and a separate Node.js worker using node-cron. Package versions and hosting remain implementation decisions.

## 2. Story and core journey

A river accident tips the expedition raft and separates the team. A trader at a riverbank camp buys fed fish and sells supplies. The explorer must catch four fish, feed them by answering maths, collect a small reward-chest bonus and sell them to prepare for the rescue journey.

The map is the first purchase and compass the second. After buying basic travel gear, the player visits submerged river wrecks and flooded hazards, counts fish and treasure chests, earns loot and progresses toward three missing teammates. The boat unlocks the final crossing.

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

## 3. Navigation and access rules

These client routes are canonical from v2.2 (the Build Guide's `/play/...` scheme is superseded). They are distinct from REST endpoints. `:campaignId` and `:challengeId` are opaque identifiers whose ownership is checked by the backend.

| Screen | Client route | Access |
| --- | --- | --- |
| Session resolver | `/` | Redirect after session check |
| Welcome | `/welcome` | Public |
| Register | `/register` | Public |
| Sign in | `/login` | Public |
| Campaign selection | `/campaigns` | Signed in |
| New character | `/campaigns/new` | Signed in |
| Story introduction | `/campaigns/:campaignId/intro` | Owner |
| Tutorial | `/campaigns/:campaignId/tutorial` | Owner |
| Camp dashboard | `/campaigns/:campaignId/camp` | Owner at camp |
| Fishing area | `/campaigns/:campaignId/fishing` | Owner; camp activity |
| Fish pen | `/campaigns/:campaignId/feeding` | Owner at camp |
| Feeding puzzle | `/campaigns/:campaignId/feeding/:batchId` | Owner of active reserved batch |
| Inventory and sale | `/campaigns/:campaignId/inventory` | Owner; sales at camp |
| Shop | `/campaigns/:campaignId/shop` | Owner; purchases at camp |
| Equipment | `/campaigns/:campaignId/equipment` | Owner; changes at camp |
| River map | `/campaigns/:campaignId/map` | Owner; locked preview before map purchase |
| Route details | `/campaigns/:campaignId/routes/:routeId` | Owner; prerequisites shown |
| Crossing encounter | `/campaigns/:campaignId/crossing/:challengeId` | Owner of active crossing |
| Teammate rescue | `/campaigns/:campaignId/rescue/:companionId` | Owner; server-confirmed rescue |
| Team journal | `/campaigns/:campaignId/team` | Owner |
| Checkpoint result | `/campaigns/:campaignId/checkpoint` | Owner; server-confirmed completion |
| Expedition failure | `/campaigns/:campaignId/failed` | Owner; failed state |
| Escape summary | `/campaigns/:campaignId/complete` | Owner; completed state |
| Settings | `/settings` | Signed in |
| Help and credits | `/help` | Public; preserves return location |

Desktop navigation (v2.2) is an eight-item bar on camp screens: **Camp, Fishing, Feeding, Inventory, Shop, Equipment, River Map, Crew**. The Camp scene also offers labelled hotspots (Dock · Catch Fish, Fish Pen · Prepare, Merchant · Shop & Sell, Equipment Rack, Map Table, Campfire · Free Rest, Companion Camp) that lead to the same destinations. Mobile uses a menu sheet with the same eight destinations. Settings and the sound toggle sit in the HUD. During feeding maths or an active crossing the navigation bar is hidden and the player stays in the encounter flow; browsing Help or Settings never pauses a server deadline.

A deep link cannot unlock a region, create a reward or recruit a teammate. Missing or unauthorized resources show a generic unavailable message. Reloading a completed challenge redirects to the authoritative next state; it does not replay its reward.

## 4. Shared presentation and state requirements

- HUD: explorer portrait and name, hearts and numeric total, coins, sound toggle and Settings. Camp-economy screens also show unfed/fed fish with reserved stock indicated, the objective and the equipped fishing loadout.
- Distinguish coins from score. Selling fish changes coins, not crossing score.
- Every data screen handles initial loading, success, empty data, error, offline and pending mutation states.
- Show the last confirmed balances while a mutation is pending; update after server confirmation.
- Use understandable messages: “You need 10 more coins,” “Buy the compass first,” and “Connection lost. Reconnect to continue.”
- A request timeout may hide a successful transaction. Reconcile before reporting a failed purchase or allowing another one with a fresh key.
- All saved progress is account-owned. UI state is never the authoritative wallet or heart count.
- Retain form inputs after recoverable errors; clear passwords after sign-out.
- Navigation and animations must not create or cancel domain events on their own.

## 5. Pages: entry and onboarding

### 1. Session resolver

**Purpose:** restore the session and choose the correct starting screen.

Show the game mark and a short loading state. A signed-out player goes to Welcome; a signed-in player goes to Campaign selection. If session validation fails because the server is unreachable, show Retry instead of treating the user as definitely signed out.

### 2. Welcome

Show the text-free wave/compass/folded-map emblem, title, hero line “Find your crew. Brave the river. Make it home.”, river artwork, “Start your adventure,” “Sign in,” How to Play, Credits and a sound toggle (off by default). Start opens Register. Do not display guest play, social login or multiplayer controls in the MVP.

### 3. Register

Fields: Explorer name (account display name, 2-30 characters, not unique), email, password and confirm password. Display password requirements before submission. Validate locally for feedback and again on the server. The server hashes passwords and returns safe account errors. Successful registration starts the authenticated flow if a session is issued; otherwise send the player to Sign in. Do not promise email verification or recovery until implemented.

### 4. Sign in

Fields: email and password. Provide password visibility toggle and clear pending state. Invalid credentials use the generic message “Email or password is incorrect.” Successful sign-in returns to an authorized intended destination or Campaign selection. Rate-limit repeated attempts server-side. No nonfunctional password-reset link.

### 5. Campaign selection

Show owned campaigns with character, latest camp, rescued teammates and status. Continue resumes an active challenge or unresolved feeding batch if one exists, otherwise Camp or Escape summary. A new account has an empty state and “Create explorer.”

One unfinished campaign per account. While one exists, the second card offers **Abandon and start new** (Figma currently labels this “Replace an existing save”). It opens a confirmation dialog stating that the current journey will be archived; only after confirmation does the server mark the old campaign `abandoned` and allow creation. Abandoned and completed campaigns stay listed as read-only. Nothing is deleted silently.

### 6. Character selection

Show Finn (male) and Alex (female) explorer cards, identical abilities, a Character name field pre-filled with the canonical name (1-20 characters) and “Begin journey.” Selection is required. Server creation initializes zero fish, zero coins, no purchased gear, three hearts and the initial checkpoint. Double-clicking cannot create two campaigns. Character and name are fixed for that campaign; cosmetic changes can be added later.

### 7. Story introduction

Use a three-panel sequence: the raft accident, the scattered crew and the riverbank trader. Offer Continue, Back and Skip. Skipping records introduction completion and opens the tutorial; it does not grant equipment. Avoid long unskippable animation.

### 8. Tutorial

Six steps: catch fish; prepare four fish; solve feeding maths; sell fed fish; map, then compass; find your crew. Use real validated actions when interactive; label demonstrations explicitly. The player can skip guidance and still perform the same earning and purchase steps. Persist tutorial completion and keep instructions in Help.

## 6. Pages: camp, fishing and economy

### 9. Camp dashboard

Show the camp scene with hotspots, HUD, current objective card, fish stock summary, crew count and the navigation bar. Objective guidance first shows Catch four fish, Feed and Sell when coins are insufficient. Purchase priority: buy map; buy compass; complete basic travel kit; prepare the next region; rescue the next teammate; obtain boat; escape.

Actions: Catch, Feed, Sell fed fish, Shop, Equipment, Map, Crew and Rest. Show unfed available, reserved and fed available counts clearly. Rest restores three hearts for free at a valid camp and remains available at zero coins. Show “Fully rested” at three hearts. Later camps provide equivalent trader and fishing access so progress cannot become stranded.

### 10. Fishing Area / Direct Catch

Show shallow-water artwork, the equipped fishing tool, yield per catch, unfed stock and a **Catch fish** button. Bare hands is available with no money or equipment. Selecting Catch sends one idempotent request and displays a short pending/animation state. After the confirmed response, update stock and show “Caught 1 unfed fish” or the configured tool yield, with batch progress such as “Batch 2 / 4”. Keep Catch again and Continue to Feeding visible in this screen.

No numeric count input, correct/incorrect result, timer or Fish API image is involved in catching. Loading, network error, rate-limit and retry states remain within the Fishing Area. Retry an uncertain request with its original action key; no client-side reward or animation completion grants fish. Disable Catch during a pending request or active feeding/crossing challenge. The server also enforces these checks and request limits. A failed/rejected catch leaves stock and hearts unchanged.

Continue to Feeding opens preparation; the four-fish requirement is checked there. Do not add a replacement catch-challenge page or quiz modal.

### 11. Feeding Preparation / Fish Pen

Show unfed available, reserved and fed stock, the four-fish batch requirement, Start Feeding and Resume Feeding. If fewer than four unfed fish are available, state the shortage and link back to Catch. Starting a batch reserves four fish exactly once and opens the Feeding Maths Challenge. A pending or active batch prevents another batch from being created.

### 12. Feeding Maths Challenge

Show unfed available, reserved and fed stock. Start feeding reserves exactly four available unfed fish. Fewer than four shows the shortage and a Catch link. Starting while another challenge or batch is active resumes it or explains the conflict.

Generate a matching four-fish local illustration with food crates, the pellets-per-crate rule and a typed question. Show the answer control that fits the question: numeric input, Yes/No, or quotient and remainder fields. Easy exact division must actually divide evenly. Keep this learning activity untimed.

Correct: the server converts four reserved fish to fed fish and grants five coins once. Display happy fish, a small reward chest, “+5 coins” and “4 fish ready to sell.” The chest animation is a view of the committed reward. Its reopen/refresh cannot credit another payout.

Wrong: show total-food calculation and the relevant division/need/remainder steps. No hearts or coins are lost. Retry requests a fresh question for the same reserved batch; the disclosed answer cannot later claim success. Exit feeding asks for confirmation and releases the reservation once. Refresh resumes the batch instead of reserving four more.

### 13. Inventory and sale

Separate cards for Unfed, Reserved and Fed. Only Fed is sellable at 10 coins each. Show a quantity stepper, unit price, proceeds, wallet after sale and Sell selected/Sell all. Block fractional, zero, negative or excessive quantities. The server checks camp state, stock and ownership atomically.

Empty: “Catch fish in the shallows, then feed a batch to prepare them for sale.” Unfed stock links to Feed; reserved stock links to Resume feeding. A completed batch and sale yield 45 coins in total. Rewards and sale proceeds use the same shop wallet; neither is a real currency.

### 14. Shop

Show all twelve items on one scrollable shelf with icon, display name, price, purpose and a state: Buy, Owned, Locked (with the exact prerequisite) or “Need N more coins”. A Buy confirmation dialog shows current balance, cost and resulting balance before sending the purchase request.

Before map ownership, only Map is purchasable. After Map, only Compass is newly purchasable. After both, other valid purchases become available. Permanent items cannot be rebought, refunded or traded in MVP. Successful purchase marks Owned; navigation and travel prerequisites use ownership automatically. Fishing tools require explicit Equip.

### 15. Equipment

Show the explorer's loadout, owned fishing methods as a single choice and a travel-readiness checklist. Bare hands remains available. The rod uses its highest owned compatible tier; net and trap are alternatives. Each accepted direct Catch adds the configured unfed stock. Keep equipping at camp with no active challenge. All prices, yields and prerequisites follow the shared version-2.2 rules below; do not duplicate divergent constants in screens.

## 7. Pages: routes, challenges and teammates

### 16. River map

Before buying Map, show a locked explanation and Shop link. After purchase, show camps, region names, completed routes, locked routes and the next objective. Without Compass, reveal map information but block travel with “Buy a compass to follow the route.”

Regions are Shallow Bend, Reed Marsh and Rapid Gorge, followed by the final crossing. Map markers have accessible text equivalents and a text route list. Selecting a marker opens Route details; it does not start a quiz or deduct resources.

### 17. Route details

Show difficulty, story clue, hazard types, encounter count, required gear, current hearts and reward/rescue objective. List missing equipment with Shop links. “Start expedition” is available only at camp when prerequisites and content availability pass server checks. Require rest to three hearts before a new expedition.

| Route | Hazards | Gear beyond completed earlier stages | Encounters | Reward |
| --- | --- | --- | ---: | --- |
| Shallow Bend / Easy | Branches and stepping stones | Map, compass, goggles and outfit | 3 | Mira (Scout) |
| Reed Marsh / Medium | Fog, reeds and strong current | Life jacket | 4 | Jonah (Medic) |
| Rapid Gorge / Hard | Rocks, rapids and broken crossing | Rope | 5 | Tess (Navigator) |
| Final crossing / Hard | Combined river hazards | Boat and all three teammates | 3 | Escape |

### 18. Treasure-counting crossing encounter

Show the region and encounter label, the puzzle image in an 11:6 area (provider images are 660 x 360; never crop or overlay decoration on it), two fields labelled Number of fish and Number of treasure chests, hearts, timed/untimed status, Leave Expedition and available companion abilities. Submit both values together; selecting/focusing a field does not submit. Reject blank, decimal, negative and excessive counts.

Follow the shared outcome table: both correct gives full loot and safe clearance; one correct gives half loot and one-heart damage only if the player survives; both wrong or expiry gives no loot, loses one heart and needs a fresh puzzle. A partial answer at the final heart gives no reward or clearance and triggers camp recovery.

Feedback distinguishes Perfect, Partial, Incorrect and Timeout. Display loot, points, remaining hearts and Continue/Retry as appropriate. Once a challenge is resolved, show its counts for explanation, then retire it for that player. A next/retry request cannot re-grant an encounter's previous reward. Replayed cleared encounters use a visible “Reward already claimed” state.

Scout reveals the fish count once per region; the chest field remains the player's task and the attempt is marked Assisted. The server serializes hint use against submission/timeout. Medic use remains available only while alive and below full hearts.

Deadlines use server time, survive reload/backgrounding and are chosen from the versioned region rules. Untimed mode is set before expedition start. Verified content failure causes safe replacement/pause; ordinary disconnect does not reset an issued deadline. The client never deducts hearts itself. Only content within the region's chest and fish limits is issued.

### 19. Teammate rescue

After the last encounter of a region, the server commits recruitment and checkpoint advancement atomically. Show character, short dialogue, ability and “Return to camp.” Closing or refreshing this presentation never loses the rescue or grants it twice.

### 20. Team journal

Show three slots: missing or recruited, last clue, rescue region, dialogue and ability usage. This is an NPC journal, not a user directory or friend system.

| Teammate | Ability | Limit |
| --- | --- | --- |
| Mira · Scout | Reveals the crossing fish count; chest count stays hidden | Once per region per campaign |
| Jonah · Medic | Restores one heart, maximum three | Once per expedition |
| Tess · Navigator | Highlights next route objective | Passive guidance; no answer reveal |

Only recruited teammates can help. Disable Medic at full hearts without consuming its use. Scout use persists across failures within the same region; restarting cannot reset it. Medic usage resets only when a new expedition actually begins. Server validates and records all ability use with an idempotency key.

### 21. Checkpoint result

Show region cleared, teammate rescued, score earned and next objective. First-clear score includes 50 points per heart remaining. Record this bonus once per region, not each time the page is opened. Rest and trader access resume at the new camp.

### 22. Expedition failure

Copy: “The current pushed you back. Rest at camp and try again.” Show cleared checkpoints retained and the unfinished route traversal reset; already-claimed encounter rewards remain claimed. Preserve coins, fish, gear, recruited teammates and committed score. “Return to camp” opens camp with free Rest; failure has no fee. A timed-out or damaging partial/incorrect crossing result can cause only one failure transition. Feeding batches remain a camp activity and never consume hearts.

### 23. Escape summary

Require server-confirmed completion: all three teammates, boat, final crossing cleared and at least one heart. Show ending, teammates rescued, total fish sold, coins earned, crossing accuracy, score and equipment collected. Statistics are derived from saved results, not client calculations from current inventory.

Show “View journey” and “Start new campaign.” A new campaign creates a separate save after confirmation and never resets the completed campaign silently. Crossing score is 100 for a perfect first clearance or 50 for a surviving partial first clearance, plus one-time route-clear bonuses. Coins earned is sale income + feeding bonuses + crossing loot. Show feeding accuracy and assisted/unassisted perfect crossing accuracy separately, as defined in the shared rules. Exclude system-cancelled questions.

## 8. Pages: settings and support

### 24. Settings

Show account identity, sound effects, music, reduced motion, preferred timed/untimed mode, Help/Credits and Sign out. A quick-settings overlay offers sound and reduced motion during an active challenge. Preference changes must not alter an active challenge's rules. Non-sensitive device preferences may be stored locally; account/campaign data remains server-owned.

Sign out clears the session and user-scoped cache. Explain that an active timed challenge continues to its deadline. Account deletion is not a completed feature: add it only with a defined data-retention and deletion implementation if the release scope requires it. Never show a nonfunctional deletion control.

### 25. Help and credits

Explain the story loop, unfed/reserved/fed stock, feeding formulas and chest bonus, fishing yield, sale price, purchase order, equipment, companion limits, hearts, timed deadlines, checkpoint recovery and connection failures. Include keyboard controls, sound/motion options and contact/help text supplied for the project. Credit the Fish Game API (Marc Conrad, non-commercial use) and attribute licensed artwork/fonts. State that this is a puzzle adventure, not swimming or survival training.

## 9. Campaign transitions and persistence

| State | Event | Result |
| --- | --- | --- |
| Camp / Fishing Area | Direct Catch accepted | Atomically add configured unfed yield once; remain in camp activity |
| Camp / Fishing Area | Catch rejected or replayed | Reject without change or return prior result; no answer/quiz state |
| Camp | Feeding start | Reserve four unfed fish; enter Feeding |
| Feeding | Wrong answer | Keep reservation; show working; fresh question on retry |
| Feeding | Correct answer | Reserved -> fed; +5 coins once; return to camp activity |
| Feeding | Cancel unresolved batch | Release four unfed fish once; return to camp |
| Camp | Sell / buy / equip / rest | Atomically apply eligible action |
| Camp | Start route fully rested | Create expedition and crossing |
| Crossing | Perfect / surviving partial | Claim first-clear loot/points, clear encounter; Continue |
| Crossing | Wrong / expiry with hearts left | No loot; request fresh puzzle for same encounter |
| Crossing | Hearts zero | Fail; retain possessions, claims and saved checkpoints |
| Crossing | Region completed | Recruit once, claim bonus, advance camp |
| Final crossing | Last clearance, alive | Complete campaign and show ending |
| Any unfinished | Abandon confirmed (v2.2) | Campaign becomes `abandoned`, read-only; a new campaign may be created |
| Any | Reconnect | Restore current challenge/batch, revision and original deadline |

Rescue, happy-fish, reward chest and checkpoint screens present committed results. Navigation/animation cannot grant rewards. Inventory conservation and atomic transitions are defined below. Returning after failure never resets one-time reward claims.

## 10. MongoDB data model and contracts

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

## 11. Service responsibilities

React renders the three activities and calls the owned application API. Express validates typed answers, controls heart/reward state, and commits transactions. MongoDB stores campaign progress, stock, feeding batches and one-time claims. The independent content worker normalizes Fish API scenes; a local maths generator issues valid feeding questions.

Follow the endpoints in section 10 and CLAUDE.md. Public DTOs omit protected counts and formula solutions until resolution; Scout is an explicit fish-count-only exception. Keep provider adapters, feeding arithmetic, economy and encounter progression focused and separately testable.

## 12. External content contract

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

## 13. Visual and accessibility specification

Use the Living River tokens defined in CLAUDE.md section 13 and the components on the Figma design-system section: action buttons (primary gold, secondary dark; default, hover, focus, pressed, disabled, loading), HUD, labelled input (default, focus, error, disabled), fish-stock chips, equipment cards (buy, owned, locked, insufficient coins), heart indicator 0-3, map node (available, locked, completed), timer (untimed, running, timeout, content failure), difficulty badge, reward chest (closed, open, awarded), feeding answer controls, coin display, toasts and the confirmation modal.

Desktop frames are 1440 x 900: full-bleed scene, HUD at the top, content panels in the middle and the navigation bar at the bottom. Mobile frames are 390 x 844: scene above controls, vertically stacked cards and a menu sheet. Keep essential quiz controls visible without requiring precision tapping. Map must also support a text route list.

Use semantic headings, labelled controls, visible focus, keyboard navigation, readable contrast, zoom-friendly text, reduced motion and sound toggles. Interaction targets are at least 44 CSS pixels. Announce result feedback without announcing each countdown tick. Image puzzles require a separate accessible equivalent mode; this remains an implementation deliverable, not a solved problem through alt text.

No artwork, font or icon licence is assumed. The Figma scenes and item sprites are provisional; use licensed assets or clearly marked placeholders during development.

## 14. Acceptance criteria and evaluation

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

## 15. Build order

1. **Foundation and API spike:** confirm rubric; inspect live provider contracts, content permissions and transport; establish repository, app shell, database and worker boundaries.
2. **Identity and saves:** register/login, campaign creation, character choice and resume.
3. **Fishing economy:** direct catch validation, feeding generator, stock reservations, success/cancel/retry, fed-stock sales and ledger.
4. **Shop and gear:** map/compass order, prices, ownership, loadouts and prerequisite feedback.
5. **First playable region:** map, first route, two-count treasure challenges, hearts, failure, checkpoint and Scout.
6. **Complete campaign:** remaining regions, abilities, boat and ending.
7. **Resilience and polish:** scheduled content worker, fallbacks, reconnect, responsive UI and accessibility.
8. **Evaluation and delivery:** relevant automated checks, concurrency/failure tests, playtesting, balance adjustments, report and demonstration.

Each milestone must produce a demonstrable working flow. Do not label mocked data, inactive buttons or artwork-only screens as completed gameplay. Follow CLAUDE.md for repository structure, commands and definition of done.

## 16. Defaults and remaining decisions

Confirmed by the project documents: MERN browser game, fishing economy, map-first/compass-second progression, catch/feed/sell preparation and treasure-counting crossings, NPC teammates for the initial scope, three hearts, free recovery and three regions plus final escape.

Implementation defaults: camp-only trading/equipping, one active challenge, full rest before expedition start, fixed character per campaign, one unfinished campaign per account with explicit Abandon, explicit Continue between encounters, four-fish feeding batches, five-coin feeding bonus, non-resetting Scout usage per region, and region content limits. Change them deliberately if the user prefers another experience.

Still to resolve: **submission/viva deadline and marking rubric (unconfirmed)**, final artwork and emblem, hosting, provider image correctness and re-hosting permission, accessible counting content, optional password recovery/account deletion scope, and playtested prices/timers/limits. None of these uncertainties should block unrelated authorized implementation work.

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

## Wireframe page inventory — version 2.2

There are **25 main screens**, with direct catch success/pending/error handled inside the Fishing Area. The removed Fish-Counting Challenge has no route, frame, modal or alternative answer step. Each screen exists in Figma at low and high fidelity; the high-fidelity page adds state variants, 19 mobile frames and shared overlays.

| # | Screen |
| --- | --- |
| 1 | Splash / Session Loading |
| 2 | Welcome / Game Front Page |
| 3 | Register |
| 4 | Sign In |
| 5 | Campaign Selection |
| 6 | Character Selection |
| 7 | Story Introduction |
| 8 | Tutorial |
| 9 | Camp Dashboard |
| 10 | Fishing Area / Direct Catch |
| 11 | Feeding Preparation / Fish Pen |
| 12 | Feeding Maths Challenge |
| 13 | Inventory & Sell Fish |
| 14 | Equipment Shop |
| 15 | My Equipment / Loadouts |
| 16 | River Map |
| 17 | Route Details & Preparation |
| 18 | Treasure-Counting Crossing |
| 19 | Teammate Rescue |
| 20 | Team Journal |
| 21 | Checkpoint / Region Complete |
| 22 | Expedition Failed |
| 23 | Final Escape & Journey Summary |
| 24 | Settings |
| 25 | Help, Rules & Credits |

Flow: Fishing Area -> direct catch feedback in place -> Feeding Preparation -> Feeding Maths Challenge -> feeding reward -> Inventory/Sell -> Shop. Keep treasure-counting crossing frames as the separate adventure activity.

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

# Riptide Escape — Knowledge Base

Updated 13 November 2026 (second build session: equip, rest and the first river crossing). Quick reference only; the Proposal, CLAUDE.md and App Spec (all v2.2) stay authoritative. The Complete Build Guide is still dated 12 November; where it differs (client routes, bcryptjs/tsx/Vitest), v2.2 wins.

Figma: https://www.figma.com/design/6I0dGbNWYwpJCDjugicvRu/Riptide-Escape (pages `low-fidelity wireframes` 0:1, `high-fidelity wireframes` 6:248)

## 1. The game

Story-driven 2D browser game for the Distributed Service Architecture module (MongoDB, Express, React, Node.js, plus a separate content worker). An explorer (Alex or Finn, renameable) loses their crew when the expedition raft tips. Starting with 0 coins, 0 fish and 3 hearts, they catch fish, feed batches of four through maths, sell fed fish, buy gear (map first, compass second), cross three regions by counting fish and chests, rescue Mira (Scout), Jonah (Medic) and Tess (Navigator), and escape by boat.

Core loop: **catch (direct, no quiz) → feed (maths) → +5 → sell fed fish at 10 → buy tools → explore → count fish + chests → rescue → escape.**

## 2. Rules quick reference (v2.2 — no price, reward or heart value changed from v2.1)

- **Catch yield:** bare hands 1, rod 2, rod+reel 3, rod+reel+hook 4, net 4, trap 5. One loadout, no stacking.
- **Feeding:** exactly 4 fish reserved; six question types; correct = 4 fed + 5 coins once; wrong = worked solution, no penalty, fresh question.
- **Economy:** one cycle = 45 coins. Map 30 (15 left), second cycle to 60, compass 40 (20 left). Basic kit for Shallow Bend = 140 (four cycles leave 40). Mandatory gear 460.
- **Shop:** river_map 30, compass 40, swimming_goggles 30, swimming_outfit 40, rod_kit 50, improved_reel 60, hook_upgrade 40, net 100, specialized_trap 150, life_jacket 60, rescue_rope 80, boat 180.
- **Crossings:** loot = chests × 10. Both correct: full loot, 100 points. One correct and alive: half loot, −1 heart, 50 points. One correct on last heart: nothing, back to camp. Both wrong or timeout: −1 heart, fresh image. A correct answer after the server deadline counts as a timeout.
- **Regions:** Shallow Bend (3 encounters, 45 s, chests ≤ 4), Reed Marsh (4, 35 s, ≤ 5), Rapid Gorge (5, 30 s, ≤ 6), Final crossing (3, 30 s, ≤ 6). Chest limits are v2.2 initial values. Region clear: +50 points per remaining heart, once.

## 3. v2.2 decisions (full table at the end of each v2.2 document)

Figma is the visual reference; Living River palette replaces the light theme; official tagline unchanged, Figma line becomes the Welcome hero text; eight-item camp navigation; App Spec route scheme (`/campaigns/:campaignId/...`) is canonical; one unfinished campaign with explicit **Abandon and start new** (archives, never deletes); named cast; raft tips, boat is bought; crossing image area 11:6; region chest limits; Figma display names with stable item IDs; sound toggle in HUD; scrypt allowed for passwords; Node runs TypeScript directly with the built-in test runner.

Build-time decisions (second session): crossing pictures are locally authored SVG scenes until the worker and re-hosting permission exist; leaving an expedition needs confirmation and costs no heart; routes need full hearts and failure leaves hearts at 0 until a free rest.

Figma follow-ups not yet done: relabel "Replace an existing save"; confirm story panels 2 and 3 text; replace the crossing mock grid with a 660 × 360 image area.

## 4. Live Fish API test (13 November 2026)

Six requests. Counts seen (fish, chest): (2, 7), (9, 1), (2, 11), (6, 5), (1, 4). Filename suffix is `<chest>x<fish>`, so the upstream URL leaks the answers. Two images measured at 660 × 360 px from their PNG headers. Terms: © Marc Conrad 2026, as is, may be discontinued, not for commercial applications; nothing stated about caching or re-hosting. No provider image was viewed or used. Full record: `docs/fish-api-test-2026-11-13.md` in the repository.

## 5. Repository status

Delivered as `riptide-escape.zip` (82 files, no commits made).

| Area | State |
| --- | --- |
| `packages/game-rules`, `packages/contracts` | Strict type check passed, rule tests passed |
| API services: auth, campaigns, fishing, feeding, economy, equip, rest, routes, crossings, local scene content (in-memory store) | Type check passed; 32 tests: 31 passed, 1 skipped; mutation checks catch broken claims, deadlines, rest gating and partial loot |
| Express layer incl. `/api/health`, `/api/ready`, crossing image route | Written, **not executed** (express could not be installed in the build sandbox); its HTTP test runs after `npm install` |
| React + Vite web shell and `tokens.css` (camp, shop, campfire, equipment rack, map table, crossing, failure) | Server-rendered smoke check (33 assertions); **not run in a browser or built** |
| MongoDB store, Scout hint and Medic heal, content worker, routed 25-screen UI, browser tests | Not built |

Detailed evidence: `docs/progress.md` in the repository.

## 6. Unconfirmed

Submission/viva deadline; assignment brief and marking rubric; permission to re-host provider images; hosting; accessible counting mode; playtested prices, timers and chest limits.

## 7. Next steps

1. On your machine: `npm install`, `npm test`, `npm run typecheck`, then play with `npm run dev:api` and `npm run dev:web` through Shallow Bend. Report anything the unexecuted Express/Vite parts reveal.
2. MongoDB store behind `GameStore` with a replica set; rerun the same tests against it.
3. Stage 12: Scout hint (fish count once per region) and Medic heal (once per expedition); play Reed Marsh and Rapid Gorge end to end.
4. Stage 11: content worker and Fish API adapter, behind the same opaque image route.
5. Supply the deadline and rubric so the remaining stages can be trimmed to fit.

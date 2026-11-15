# Riverbound API

## 1. External APIs (services we do not own)

| API | What it does for the game | Called by | We send | We get back | Key | If it fails |
| --- | --- | --- | --- | --- | --- | --- |
| **Fish Game API** `https://marcconrad.com/uob/fish/api.php` | Crossing puzzles | `worker/src/providers/fishApi.ts` | `GET ?out=json&base64=yes` | `question` (PNG as base64), `fish`, `chest` | None | Worker retries 3 times with growing waits (1s, 2s, 4s). The game uses saved puzzles and local fallback pictures. No player loses hearts or coins. |
| **Freesound API** `https://freesound.org/apiv2/search/text/` | Sound effects (CC0 only) | `worker/src/providers/freesoundApi.ts` | `query`, CC0 + duration filter, `token` | Sound id, name, author, licence, preview MP3 link | `FREESOUND_API_KEY` in `worker/.env` | Missing sounds are skipped. The browser plays built-in Web Audio tones instead. |
| **MongoDB Atlas** | Stores all game data | `server/src/config/db.ts` | Mongoose queries | Documents | `MONGODB_URI` in `.env` | `/api/ready` returns 503. The server refuses to start without it. |

Rules we follow:
- Fish API: not for commercial use; no warranty; may stop without notice. Pictures are stored server-side for gameplay only and credited on the Help page. The provider's file name contains the answers, so we download the picture as base64 and never send that name to the browser.
- Freesound: 60 requests per minute and 2,000 per day. The worker only searches for missing sounds (about 10 requests per run). Preview links are public, so the browser never needs the key.

## 2. Our own backend endpoints

All URLs start with `/api`. Changes (POST) must send JSON and an `Idempotency-Key` header (a random UUID). Sending the same request again with the same key returns the first result and never pays twice.

Errors look like: `{ "error": { "code": "NOT_ENOUGH_COINS", "message": "You need 10 more coins." } }`

| Method and URL | Sign-in | What it does | Status |
| --- | --- | --- | --- |
| GET `/health` | No | Server is alive | Built |
| GET `/ready` | No | Database connected (`store: "mongodb"`) | Built |
| POST `/auth/register` | No | Create account `{explorerName, email, password, confirmPassword}`, sets session cookie | Built |
| POST `/auth/login` | No | Sign in `{email, password}` | Built |
| POST `/auth/logout` | No | Sign out (deletes the session) | Built |
| GET `/auth/session` | Yes | Who am I | Built |
| GET `/shop` | No | Shop catalogue | Built |
| GET `/sounds` | No | Sound list from Freesound | Built |
| GET `/campaigns` | Yes | My saved journeys | Built |
| POST `/campaigns` | Yes | New journey `{character: "female"|"male", characterName?}` | Built |
| GET `/campaigns/:id` | Yes | One journey | Built |
| POST `/campaigns/:id/abandon` | Yes | Archive unfinished journey `{confirm: true}` | Built |
| POST `/campaigns/:id/story` | Yes | Mark intro or tutorial seen `{step}` | Built |
| GET `/leaderboard` | Yes | Top 20 **finished** journeys by score + your own row and rank (null if you have not finished). Public game data only: explorer name, character, score, perfect %, finish date. | Built |
| POST `/campaigns/:id/fish/catch` | Yes | Catch fish: always 1 unfed fish (bare hands, v2.3) | Built |
| POST `/campaigns/:id/fish/sell` | Yes | Sell fed fish `{quantity}` | Built |
| GET `/campaigns/:id/shop` | Yes | Items with Buy / Owned / Locked / Need coins | Built |
| POST `/campaigns/:id/buy` | Yes | Buy `{itemId}` | Built |
| POST `/campaigns/:id/camp/rest` | Yes | Free rest to 3 hearts | Built |
| POST `/campaigns/:id/feeding/start` | Yes | Reserve 4 fish, get a maths question | Built |
| GET `/campaigns/:id/feeding/active` | Yes | Resume an unfinished batch | Built |
| POST `/feeding-batches/:batchId/retry` | Yes | New question after a wrong answer | Built |
| POST `/feeding-batches/:batchId/cancel` | Yes | Give the 4 fish back | Built |
| GET `/challenges/:challengeId` | Yes | Feeding question or crossing details. Crossing counts are included only after answering. | Built |
| POST `/challenges/:challengeId/answer` | Yes | Feeding: `{value}` or `{quotient, remainder}`. Crossing: `{fish, chests}` (both together), or `{timeout: true}` (accepted only once the server's own deadline has passed) | Built |
| GET `/challenges/:challengeId/image` | Yes | Crossing picture, served from MongoDB with `Cache-Control: private, no-store`. The provider's file name is never sent. | Built |
| POST `/challenges/:challengeId/replacement` | Yes | Swaps the picture only if the server finds its stored bytes broken (no penalty, new deadline). Otherwise 409 `CONTENT_OK`, so it can't be used to reset a timer. | Built |
| POST `/campaigns/:id/route/start` | Yes | `{regionId, timed}`. Checks route order and gear, starts fully rested, returns the first picture. | Built |
| POST `/campaigns/:id/route/next` | Yes | Next picture after a cleared crossing, or a fresh picture after a miss. An open picture is returned unchanged. | Built |
| POST `/campaigns/:id/companions/:companionId/use` | Yes | `mira`: reveals the fish count of the open picture, once per region. `jonah`: +1 heart, once per expedition, not at full hearts. Tess is passive. | Built |
| POST `/campaigns/:id/return-to-camp` | Yes | After running out of hearts, or "Leave Expedition". Route progress resets; coins, fish, gear, crew and score are kept. | Built |

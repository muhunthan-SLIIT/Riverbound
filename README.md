# Riverbound

**Catch. Prepare. Reunite. Escape.**

A 2D browser adventure game for the *Distributed Service Architecture* module (UOB).
Student: Ulaganesan Muhunthan (2541667).

The explorer (Alex or Finn) catches fish, feeds them by solving maths questions, sells them, buys gear, counts fish and treasure chests to cross the river, rescues three teammates and escapes by boat.

## The parts of the project

| Folder | What it is | Runs as |
| --- | --- | --- |
| `client/` | React + TypeScript website the player sees | Vite dev server, port 5173 |
| `server/` | Express + Mongoose REST API. All game rules are checked here | Node.js, port 4000 |
| `worker/` | Separate program that fetches puzzles (Fish API) and sounds (Freesound) on a schedule | Node.js + node-cron |
| `shared/` | Game rules and data types used by all three | (library) |
| `docs/` | API list, architecture, decisions, progress, game spec | |

## What you need

- **Node.js 22.18 or newer** (check with `node -v`). Node runs the `.ts` files directly.
- A **MongoDB Atlas** database (the free tier is fine; it supports transactions).
- Optional: a free **Freesound API key** for real sound effects.

## First-time setup (Windows, PowerShell or VS Code terminal)

```bash
cd C:\Users\Muhun\OneDrive\Desktop\Riverbound
npm install
copy server\.env.example server\.env
copy worker\.env.example worker\.env
```

Then open `server/.env` and `worker/.env` and put in your MongoDB connection string (and Freesound key in `worker/.env` if you have one). **Never commit the `.env` files.** `.gitignore` already blocks them.

## Run the game

```bash
npm run dev          # starts server, worker and client together
```

Open http://localhost:5173 in your browser.

You can also start the parts one by one: `npm run dev:server`, `npm run dev:worker`, `npm run dev:client`.

## Check that everything works

```bash
npm test             # unit tests (no database needed)
npm run typecheck    # TypeScript checks for every part
npm run smoke        # full earning loop against the running server + real MongoDB
npm run build        # production build of the client
```

`npm run smoke` needs the server running (`npm run dev:server` in another terminal). It creates a throwaway test account in your database.

## External services

| Service | Used for | API key |
| --- | --- | --- |
| [Fish Game API](https://marcconrad.com/uob/fish/doc.php) (Marc Conrad) | River-crossing puzzles: picture + fish count + chest count | No |
| [Freesound API](https://freesound.org/docs/api/) | CC0 sound effects for game events | Yes (free) |
| MongoDB Atlas | Database | Connection string |

If the Fish API is down, the game uses puzzles already saved and locally drawn fallback pictures. If Freesound has no key or is down, the browser plays simple built-in tones.

See `docs/api.md` for every endpoint and `docs/progress.md` for what is built and tested.

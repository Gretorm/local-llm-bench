# Minecraft — Gemma 4 26B-A4B (UD-Q4_K_M) — run 2

**Score: 16/100 — FAIL** (infinite colored terrain with broken faces, you walk through hills at a fixed height, no break/place although the screen announces it, no README; stopped after 13 minutes without ever opening its game)

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/gemma4-26b-a4b/run-2/play/) · [Code](game/) · [Model](../../../../models/gemma4-26b-a4b.md)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | TypeScript + Vite + Three.js 0.186 + simplex-noise (npm), 337 lines of own code, production build in `dist/`, no README |
| Duration | 13 min 06 s (stopped on its own) — 2 min blocked by a dev server started in the foreground |
| Steps | 35 (34 tool calls, 1 error: 13 shell, 16 file writes, 2 reads, 3 builds, 0 browser calls) |
| Tokens | 26K generated, 58.4 tok/s average |
| Context | 41K max, no compaction |
| Human interventions | 0 |

Same configuration as [run 1](../run-1/notes.md): a second sample, since run 1 stopped after 13 minutes. The model ran with vision: browser screenshots were sent to it as images. It never took one.

**About the Play link.** `game/` is the model's folder, untouched (only `node_modules/`, its installed npm dependencies, is left out). Its own build in `game/dist/` references its script with an absolute path (`/assets/...`), so it only runs at the root of a site, not in a GitHub Pages subfolder. `play/` is the model's source built again with the same Vite, with one hosting option, `--base ./` (relative paths): the JavaScript bundle is byte-identical to the model's `game/dist/` build, only the script path in `index.html` differs. Nothing in the game was changed.

## Score

| Criterion | Score | Why |
|---|---|---|
| Rendering | 5/15 | Infinite terrain generated around the player, sky and fog, green/brown/gray vertex colors with simple lighting; but only one face of the blocks shows, monotonous relief, no textures, trees, water, clouds or day/night |
| Controls | 5/15 | WASD, mouse look and jump work; no collision: you walk through hills on an invisible floor at a fixed height; no sprint, sneak, swim or fly |
| Interactions | 0/15 | Clicks do nothing: there is no raycast or click handler in the code, although the on-screen help says "Left Click: Break \| Right Click: Place" |
| Content / UI | 1/15 | One line of controls help; no crosshair, hotbar, HUD, menus, inventory, mobs or sound |
| Stability / smoothness | 8/10 | Smooth while moving, chunks appear in the fog, no console error; chunks are never unloaded |
| README honesty | 0/10 | No README (required by the prompt); the on-screen help and its final message claim break/place, which do not exist |
| Autonomy | 4/10 | Capped: never opened its game. No intervention, one tool error; a dev server started in the foreground blocked 2 minutes; wiped its own dependencies once with npm and repaired it |
| Launch via README | 0/5 | No README; launch steps only in its final chat message (`npm install`, `npm run dev`: Node.js needed) |
| Static hosting | 2/5 | `dist/` is a static build, but with absolute paths: only at a site root; the source needs a Node build |
| Other criteria | 14/40 × 11/30 = 5.1 | Weighted by playability (below 30/60), see [PROTOCOL.md](../../../../PROTOCOL.md) |
| **Total** | **16/100** | 11 + 5.1 |

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:01 | Thinks about 45 seconds, lists the folder, plans 6 todos |
| H+0:01 | `npm init` and installs Three.js, Vite and TypeScript (fixes a PowerShell `&&` error at once) |
| H+0:02 | Page and placeholder entry point; reasons that it "should verify that it actually runs" and starts the dev server in the foreground: blocked until the shell's 2-minute timeout |
| H+0:04 | "Since I cannot view a browser, I will assume it works as it didn't crash and Vite reported ready." |
| H+0:04 – 0:05 | Installing the noise library removes its other packages; notices and reinstalls them |
| H+0:05 – 0:08 | Block types, chunks (face culling, vertex colors), world (noise terrain, chunks around the player), player (WASD, jump, floor at a fixed height), entry point (pointer lock) |
| H+0:08 – 0:11 | Production build: TypeScript errors (imports, noise function, config) fixed in two rounds; build succeeds |
| H+0:11 – 0:13 | Final message with launch steps, features (including break/place) and a "missing" list; no README file. Stops |

## Observations

- Better engineering habits than run 1: TypeScript and Vite, compilation checked with a production build, every type error fixed.
- Terrain visible this time: colored, infinite, with fog; still no collision and no block interaction.
- Same pattern as run 1: stops after 13 minutes, declares a "functional Minecraft clone", never opens the game.
- Again "I cannot view a browser", although the browser tools (with screenshots as images) were available.
- Announces features that do not exist (break/place), on screen and in its final message; no README.
- Two runs, same behavior: the short, unverified runs come from the model, not from the environment.
- Starting the dev server made Windows ask whether to allow Node.js on the network (firewall prompt); noted, not an agent action on the system.

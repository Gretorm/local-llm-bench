# Minecraft — Muse Glimmer 30B (UD-IQ3_M) — run 1

**Score: 13/100 — FAIL** (trivial blocker rule: 17 once a one-character typo is fixed, × 0.75; strict score 0/100). As delivered by the model: black screen, a one-character typo, `dy:1:0` instead of `dy?1:0`, in unused meshing code is a syntax error, so the game's only script never runs; stopped after 11 minutes without ever looking at its game. Once fixed: textured hills and trees, but 1-2 FPS, no collision, the player falls through the ground.

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/muse-glimmer-30b/run-1/game/) · [Code](game/) · [Model](../../../../models/muse-glimmer-30b.md) · [Fix phase](fix/notes.md) (scored separately: 18/100)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | One index.html (447 lines: HTML, CSS and one ES module script) + Three.js 0.160.0 from the unpkg CDN via an import map, README |
| Duration | 10 min 34 s (stopped on its own), of which 61 s waiting for opencode's session-title request |
| Steps | 27 (26 tool calls, 0 tool errors; 6 shell commands failed or useless in PowerShell; 3 files written, 1 edit, 4 reads, 0 browser calls) |
| Tokens | 17.5K generated for the agent (+ 2.2K for the session title), 34.6 tok/s average |
| Context | 36K max, no compaction |
| Human interventions | 0 |

The model ran with vision: browser screenshots were sent to it as images. It never took one.

Published copy: the model's game with the one-character typo fixed (`index.html` line 198: `dy:1:0` → `dy?1:0`, trivial blocker rule), so the page loads; and one line of its README, where the model wrote the absolute path of its folder on the test machine, is replaced by `<game folder>` for privacy. Nothing else is changed.

## Score

| Criterion | Score | Why |
|---|---|---|
| Rendering | 0/15 | Black page with "Loading...", a crosshair and the help text (static HTML). Console: `Uncaught SyntaxError: Unexpected token ':'` at `[dx?1:0, dy:1:0, dz?-1:0]`, inside a face-building loop whose result is never used. The whole module fails to parse: no world, no renderer, no game loop |
| Controls | 0/15 | Nothing runs |
| Interactions | 0/15 | Nothing runs |
| Content / UI | 0/15 | The hotbar, inventory and HUD are built by the script: none of them appear |
| Stability / smoothness | 1/10 | Capped: nothing visible; the page fails at parse time |
| README honesty | 1/10 | "A playable, browser-based Minecraft-like voxel game", "demonstrates a playable core loop": nothing can be played. The feature list is short and the "missing" list is long and honest |
| Autonomy | 3/10 | Capped: never ran its game. It wrote "Can't actually open browser" although Playwright tools with vision were in its tool list (the prompt says "check that it works"); fetched the HTML through PowerShell, then "we can assume it works", and marked its "Test game locally" task done. No intervention, no loop, 0 tool errors |
| Launch via README | 3/5 | `python -m http.server 8000` then http://localhost:8000 works as written; the page loads but stays black |
| Static hosting | 4/5 | One static HTML file, no build; Three.js pinned (0.160.0) from a CDN instead of vendored |
| Other criteria | 12/40 × 0/30 = 0 | Weighted by playability (below 30/60), see [PROTOCOL.md](../../../../PROTOCOL.md) |
| **Total (as published, strict)** | **0/100** | 0 + 0 |

**Official score under the [trivial blocker rule](../../../../PROTOCOL.md)** (re-checked when the rule was introduced): with that one character fixed (as in the published copy), the page loads and shows a sky-blue world of textured hills and trees and a 9-slot hotbar, the camera starting inside a block. The rendering and player code is the same as in the game of the [fix phase](fix/notes.md), which was played in a desktop browser: 1-2 FPS (one mesh and one material per block), no collision, the player falls through the ground. Scored like that game: rendering 4, controls 2, interactions 2, content 3 = 11/60; other criteria 16/40 (stability 2, README 2, autonomy 3, launch 5 since the page now loads as written, static hosting 4) × 11/30 = 5.9; total 17/100, × 0.75 = **13/100**.

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:01 | opencode's session-title request (same model; its thinking cannot be switched off) generates 2,173 tokens; the server has one slot, so the agent waits |
| H+0:01 – 0:02 | Short plan, todo list of 9 tasks ("minimal" clone with Three.js, including "Test game locally"); lists the empty folder |
| H+0:02 – 0:05 | Writes index.html with the content `""` (after generating 4.9K tokens), reads it back and notices |
| H+0:05 – 0:07 | Rewrites index.html in one pass: canvas textures, 16×16×32 chunks with a heightmap and trees, one mesh per block, ray-marched break/place, hotbar, inventory panel. An unused face loop keeps the typo `dy:1:0` |
| H+0:07 | "Now we need to test it ... Can't actually open browser" |
| H+0:07 – 0:08 | `python3` (not found), a server in the foreground (timeout), then one in the background; three failed fetches (PowerShell aliases), then the first 200 characters of the page |
| H+0:08 – 0:09 | Reviews its code, lists real weaknesses (no face culling, one mesh per block, no wall collisions), adds a ground check |
| H+0:10 | Fetches the page length: "Page loads". Writes the README, marks the test task done, stops its server |
| H+0:11 | Final message: launch instructions, "playable web game". Stops |

## Observations

- The first model in this benchmark to keep its todo list up to date at every step (6 updates); it deliberately aimed at a small first version.
- Steady 34.6 tok/s on a dense model without speculative decoding, flat up to 36K tokens of context.
- Same failure as the other models that never ran their game: short thinking (under 3.6K characters per step with reasoning strength "high"), the game written blind in one pass. One typo in dead code leaves nothing on screen.
- Believed it had no browser. With the fix prompt ("Play-test it thoroughly, as a player would") it used Playwright at once: the tool was available, the first-try prompt just did not make it think of it.
- The shortest run so far (10.5 minutes): it stopped as soon as its todo list was done, without iterating.

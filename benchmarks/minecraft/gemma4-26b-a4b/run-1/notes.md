# Minecraft — Gemma 4 26B-A4B (UD-Q4_K_M) — run 1

**Score: 11/100 — FAIL** (a 3D camera over a black cubic relief: stopped after 13 minutes without ever testing its game, no collisions, no HUD or survival content)

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/gemma4-26b-a4b/run-1/game/) · [Code](game/) · [Model](../../../../models/gemma4-26b-a4b.md)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | Vanilla JS modules + Three.js 0.160.0 from the unpkg CDN, 594 lines of own code, README |
| Duration | 13 min 22 s (stopped on its own) |
| Steps | 21 (20 tool calls, 0 errors: 4 shell, 8 files created and written 15 times, 0 file reads, 0 browser calls) |
| Tokens | 21K generated, 31.8 tok/s average |
| Context | 33K max, no compaction |
| Human interventions | 0 |

The model ran with vision: browser screenshots were sent to it as images. It never took one.

## Score

| Criterion | Score | Why |
|---|---|---|
| Rendering | 2/15 | The whole terrain renders black: the texture-atlas UVs ignore the texture's vertical flip and point at empty rows of the atlas; only the relief silhouette against the sky is visible. One flat color per block type, no trees, water, clouds or day/night |
| Controls | 3/15 | Movement and mouse look work, jump, but nothing visible to steer by; no horizontal collision (you walk through hills and get snapped on top), floor clamped at a fixed height; no sprint, sneak, swim or fly |
| Interactions | 1/15 | Break (left click) and place grass (right click) are coded, but unusable on a black world (nothing to aim at); block meshes are offset by half a block from the block grid, so hitting some faces edits the neighbouring block; single block type, no hotbar, no drops |
| Content / UI | 1/15 | A crosshair and a "Click to Play" overlay; no controls shown in game, no HUD, hotbar, inventory, menus, mobs or sound |
| Stability / smoothness | 5/10 | Capped: nothing visible, smoothness cannot be judged. No console error; chunks are generated synchronously in the render loop while moving and never unloaded |
| README honesty | 2/10 | Claims "fully playable", procedural textures and lighting, physics; its "missing" list (collisions, biomes, trees, inventory, mobs) is honest |
| Autonomy | 4/10 | Capped: stopped without ever running its game. No intervention, no tool error, no loop; but it stopped after 13 minutes without running the game once, although the prompt says "check that it works" and a browser tool with vision was available |
| Launch via README | 4/5 | `python -m http.server 8000` works as written (listens on all interfaces; internet needed for the CDN) |
| Static hosting | 4/5 | Plain static files, no build; Three.js from a CDN (pinned version) instead of vendored |
| Other criteria | 19/40 × 7/30 = 4.4 | Weighted by playability (below 30/60), see [PROTOCOL.md](../../../../PROTOCOL.md) |
| **Total** | **11/100** | 7 + 4.4 |

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:02 | Thinks about one minute, `ls -la` fails in PowerShell, plans 6 todos, creates the folders |
| H+0:02 | Page with Three.js from a CDN; checks that Python exists, then reasons that it "can't see the browser" and never starts a server or opens the browser tool |
| H+0:02 – 0:06 | Perlin noise, block types, world (chunk meshing with face culling, written twice), player (pointer lock, WASD, jump), main loop |
| H+0:06 – 0:12 | Raycast break/place, procedural texture atlas (the UV bug that turns everything black), simple floor snapping |
| H+0:12 | README |
| H+0:13 | Re-reads the prompt to tick its requirements, declares the game "fully playable" and stops |

## Observations

- Fast, clean tool use: 20 calls, no error, no hang; adapted to PowerShell after one failed command.
- Sensible structure for its size (modules, chunk meshing with face culling, texture atlas).
- Gave up early: a 594-line skeleton declared "fully playable" after 13 minutes.
- Never verified anything: no local server, no browser, no file read-back. One screenshot would have shown the black terrain.
- Rewrote whole files (the world module four times) instead of editing them.
- No reasoning-budget cut and no compaction: the short run is the model's own choice.
- First run under the dedicated low-privilege agent account (see [PROTOCOL.md](../../../../PROTOCOL.md)).

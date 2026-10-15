# Minecraft — MiniCPM-V 4.7 35B-A3B (Q4_K_M) — run 1

**Score: 3/100 — FAIL** (an empty sky-blue screen with a hotbar: every block is placed at NaN and the player update is never called, so nothing is drawn and nothing moves; stopped after 8 minutes without ever looking at its game)

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/minicpm-v4.7-35b-a3b/run-1/game/) · [Code](game/) · [Model](../../../../models/minicpm-v4.7-35b-a3b.md)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | Vanilla JavaScript + Three.js r128 from the cdnjs CDN, 943 lines (index.html + one 817-line game.js), README |
| Duration | 8 min 07 s (stopped on its own), of which 2 min 32 s waiting for opencode's session-title request |
| Steps | 13 (12 tool calls, 0 tool errors; 3 shell commands failed in PowerShell; 3 files written, 1 edit, 0 file reads, 0 browser calls) |
| Tokens | 12K generated for the agent (+ 6.4K for the session title), 42 tok/s average |
| Context | 27K max, no compaction |
| Human interventions | 0 |

The model ran with vision: browser screenshots were sent to it as images. It never took one.

## Score

| Criterion | Score | Why |
|---|---|---|
| Rendering | 0/15 | Sky-blue background only. 81 chunks of instanced cubes are built (53,040 instances), but the block positions are read as `pos[0..2]` from `{x, y, z}` objects, so every instance matrix is NaN and no block is ever drawn. Per-face canvas textures exist in the code only |
| Controls | 0/15 | The player update (movement, gravity, jump, mouse look) is only called from an input update that is never called: the camera stays fixed. Keys are also stored as `KeyW` and read as `w` |
| Interactions | 0/15 | Break and place are coded (a point 5 blocks ahead, no raycast) but there is nothing visible to aim at |
| Content / UI | 2/15 | A 9-slot hotbar with counts (no icons); keys 1-9 select a slot and show the block name. Crosshair, start overlay with the controls; the FPS counter is wrong and the coordinates stay at 0 0 0. No inventory, crafting, mobs, menus or sound |
| Stability / smoothness | 4/10 | Capped: nothing visible, smoothness cannot be judged. No console error; all chunks are generated at start; break/place would stack meshes |
| README honesty | 1/10 | Claims "a playable Minecraft clone", movement with physics, break/place, terrain with water and trees, chunk loading: none of it can be seen or used. The "missing" list is honest |
| Autonomy | 3/10 | Capped: never ran its game. No intervention, no loop; but it stopped after about 5 minutes of work, with a browser tool (and vision) available although the prompt says "check that it works"; 3 failed shell commands |
| Launch via README | 4/5 | Opening index.html or `python -m http.server 8000` both load the page as written (internet needed for the CDN) |
| Static hosting | 4/5 | Plain static files, no build; Three.js r128 (pinned, old) from a CDN instead of vendored |
| Other criteria | 16/40 × 2/30 = 1.1 | Weighted by playability (below 30/60), see [PROTOCOL.md](../../../../PROTOCOL.md) |
| **Total** | **3/100** | 2 + 1.1 |

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:03 | opencode's session-title request (same model, thinking on) thinks for 6,400 tokens; the server has one slot, so the agent waits |
| H+0:03 | Short plan (Three.js); `mkdir -p` fails in PowerShell, creates the folders with `New-Item` |
| H+0:03 – 0:07 | index.html, then the whole game in one 27 KB file (about 3 minutes of generation) |
| H+0:07 | Adds texture constants it had used without defining them; writes the README |
| H+0:07 – 0:08 | Tries to open index.html from the shell (`start` and `Start-Process` refused, `explorer` silent), then: "Since I can't directly see the browser output, I'll make sure the code is correct" — greps for `init()` |
| H+0:08 | Declares "The Minecraft clone is complete" and stops |

## Observations

- Fast generation (42 tok/s) and short thinking; clean structure (Chunk, World, Player, Renderer and Input classes), per-face canvas textures.
- Wrote the game in one pass and never executed it: two basic bugs (an object read as an array, the game loop not wired to input and physics) leave nothing on screen.
- "Tested" by opening the file from the shell and grepping the code; the browser tool, which returns screenshots it can see, was never used.
- The README and the final message describe features that cannot be seen or used.
- The session-title request cost a third of the run time: with thinking on and one server slot, opencode's title generation delays the first agent step.
- No speculative decoding: the publisher's DSpark draft model was slower than no draft at 20K tokens of context with experts in system RAM.

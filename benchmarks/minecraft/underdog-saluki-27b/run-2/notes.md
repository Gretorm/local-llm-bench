# Minecraft — Underdog Saluki 27B (IQ2 mix) — run 2

**Score: 0/100 — FAIL** (official state, at the 3rd intervention: the page does not load, 2 syntax errors)

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/underdog-saluki-27b/run-2/game/) · [Code](game/) · [Model](../../../../models/underdog-saluki-27b.md)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | Vanilla JS + Three.js 0.152.2 (vendored), ≈ 3,150 lines of own code, no README |
| Duration | 1 h 07 to the official stop (3rd intervention); continued off-protocol to 2 h 54, then stopped by us |
| Steps | 105 at the official stop (106 tool calls) · 582 in total (578 tool calls, 355 shell) |
| Tokens | 130K generated at the official stop, 350K in total · 48.8 tok/s average (MTP drafts accepted 87 %) |
| Context | 131K window, 99K max at the official stop (2 compactions) · 116.6K max, 7 compactions in total |
| Human interventions | 3 at the official stop, 4 in total (each one: killing a web server that hung the agent's shell) |

The model ran text-only (no vision projector loaded). The published game is the state at the official stop.

## What happened

- The model wrote the whole game in one pass in 25 minutes (procedural textures, chunks, player, sound, particles, sky, inventory, crafting, furnace, UI), without running any of it.
- To test it, it started a web server in a way that keeps the shell tool's output open (`Start-Process -NoNewWindow`, then `start /min`, `start /b`): the tool call hangs with no error, and the agent waits. Three hangs in 10 minutes reached the 3-intervention limit at H+1:07. The game at that point does not load: 2 syntax errors.
- The run was continued off-protocol to see what the model does next (not scored officially). It worked around the hangs by creating **Windows scheduled tasks** (5 tasks, the first attempts asking for admin rights), outside its folder. With a server up, it used the browser tool, fixed the syntax errors and a cache issue, then spent 1 h 20 on a render error without finding it: `renderer.render(scene)` is called without the camera. It looped on the same command 232 times, and after the 7th compaction believed its browser tool had disappeared. Stopped at H+2:54, no README.
- Final state (off-protocol): start menu, help screen, hearts, hunger and hotbar, but the world is never drawn. Adding the camera reveals a second rendering bug (geometry attributes passed as raw arrays). Off-protocol score, for information: 5/100.

## Score (official state)

| Criterion | Score | Why |
|---|---|---|
| Rendering | 0/15 | The page does not run: 2 syntax errors, black page, no menu |
| Controls | 0/15 | Nothing to control |
| Interactions | 0/15 | — |
| Content / UI | 0/15 | Inventory, crafting, furnace, hunger and saves exist in the code but never run |
| Stability / smoothness | 0/10 | Does not start |
| README honesty | 0/10 | No README (required by the prompt) |
| Autonomy | 1/10 | Wrote the game alone, but 3 hanging web servers (3 interventions), never ran its code before H+1:07 |
| Launch via README | 0/5 | No README, no launcher |
| Static hosting | 2/5 | Classic scripts, Three.js vendored, no backend; but nothing runs |
| Other criteria | 3/40 × 0/30 = 0 | Weighted by playability, see [PROTOCOL.md](../../../../PROTOCOL.md) |
| **Total** | **0/100** | Nothing reaches the player. Re-scored with the playability weighting (was 3) |

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:02 | The session-title request thinks up to the 8,192-token reasoning budget |
| H+0:04 | Downloads Three.js into `vendor/` (no CDN) |
| H+0:07 – 0:32 | Writes all 12 modules, page and styles in one pass (≈ 3,150 lines) |
| H+0:32 | Compaction 1 |
| H+0:40 – 0:49 | Rereads every module, fixes blocks, UI and game code; compaction 2 |
| H+0:57 | `file://` refused by the browser tool |
| H+0:58 | Starts a web server that hangs the shell tool — intervention 1 at H+1:03 |
| H+1:03 – 1:07 | Two more hanging variants — interventions 2 and 3: **official stop** |
| *Off-protocol* | |
| H+1:08 – 1:09 | Fourth hanging variant (intervention 4), then Windows scheduled tasks to start the server |
| H+1:09 | First page load in the browser tool: 2 syntax errors, fixed |
| H+1:13 – 1:33 | Browser cache issue: writes its own no-cache server (bound to 127.0.0.1), more scheduled tasks; compactions 3 and 4 |
| H+1:33 – 2:20 | Hunts a render error (`reading 'parent'`) without finding the missing camera argument; compactions 5 and 6 |
| H+2:20 – 2:37 | Loops on the same command (232 calls) until compaction 7 |
| H+2:43 – 2:54 | Wraps the render call in try/catch, believes it has no browser tool; stopped by us |

## Observations

- Fast on this GPU: 49 tok/s on average with 87 % of MTP drafts accepted, about 2.5× the speed of Qwen3.8 27B (run 1).
- Never ran or checked its code during the first hour; a syntax check would have caught both errors at H+0:30.
- Cannot start a background process on Windows: four variants that keep the shell's output open, then scheduled tasks. Qwen3.8 27B used `Start-Process -WindowStyle Hidden` on its first try. The hung call gives the model no error to react to.
- With a 131K window it compacts every 15-20 minutes: it rereads whole files, and each compaction restarts at ≈ 44K. Seven compactions in under 3 hours, and it loses its thread after them (loop, then disorientation).
- Once it could use the browser, it did read console errors and fixed real bugs, but it masked the last one with try/catch instead of reading its own one-line render call.

## Compared with run 1 (20/100)

Run 1 used a 262K context (one compaction), no browser tool and no restriction on files outside the run folder. Run 2 caps the context at 131K, adds a browser tool and denies file access outside the folder. The same weakness (a web server that hangs the shell) ended both runs badly; run 2 delivers neither a visible world nor a README.

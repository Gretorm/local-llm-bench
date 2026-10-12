# Minecraft — Underdog Saluki 27B (IQ2 mix) — run 1

**Score: 29/100 — FAIL** (playable but heavily broken: rendering, rotated controls, no breaking or placing)

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/underdog-saluki-27b/run-1/game/) · [Code](game/) · [Model](../../../../models/underdog-saluki-27b.md)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | Vanilla JS + Three.js 0.160 (vendored), ≈ 2,600 lines, README + `start.ps1` |
| Duration | 2 h 45 (stopped on its own) — ≈ 1 h lost |
| Steps | 272 (130 shell, 31 files created, 99 edits, 28 reads) |
| Tokens | 248K generated, 41.6 tok/s average (65 → 30 as context grew) |
| Context | 222K max, 1 compaction (13 min) |
| Human interventions | 2 (firewall prompt accepted; hung process killed) |

## Score

| Criterion | Score | Why |
|---|---|---|
| Rendering | 2/15 | World generated, but missing faces, no colors, no visible water, spawns underwater |
| Controls | 6/15 | Movement and collisions work, but axes rotated 90°, inverted mouse, no up/down when flying |
| Interactions | 0/15 | Left click does nothing; block placing never wired |
| Content / UI | 5/15 | HUD, menus, inventory and crafting screens exist but are barely usable: mouse stays captured (Esc needed), no item icons; no sound |
| Stability / smoothness | 3/10 | 144 FPS, no crash; black screen when re-entering a world |
| README honesty | 1/10 | Claims placing, sprint, sound and a verified render: all false |
| Autonomy | 3/10 | Delivered alone, but 2 hangs, 1 manual kill, destructive command, final loop |
| Launch via README | 4/5 | `start.ps1` works (needs Python, not stated) |
| Static hosting | 5/5 | No backend, no external dependency |
| **Total** | **29/100** | Re-scored with the anchored grid of [PROTOCOL.md](../../../../PROTOCOL.md) (first score: 27) |

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:03 | Downloads Three.js into `lib/` (no CDN) |
| H+0:07 – 0:26 | Writes world, blocks, physics, renderer, audio, save, UI modules |
| H+0:28 – 0:48 | Node test harness with Three.js and DOM stubs |
| H+0:53 | Runs `python -m http.server` in the foreground: hangs 10 min |
| H+1:03 | Relaunches with `Start-Process -NoNewWindow`: hangs again, killed by hand at H+1:19 |
| H+1:27 | Kills **every** Python process on the machine, including its own search tool |
| H+1:43 | Fixes the crash on "New World" found by its headless browser test |
| H+2:02 | Context compaction; clear summary, gets back on track |
| H+2:18 | README, then `start.ps1` |
| H+2:31 – 2:44 | Loops on a fake bug caused by its own test, then stops |

## Observations

- Clean architecture and ambitious content in code (biomes, ores, crafting, furnace, hunger, saves).
- Good instincts: vendored dependencies, automated tests, clear compaction summary.
- Its tests never check the real game (rendering, controls), so major bugs went unseen.
- Poor process handling on Windows (blocking servers, killing all Python processes).
- Debug hooks and test files left in the deliverable; audio object re-created without init, so no sound.

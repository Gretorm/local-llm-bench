# Minecraft — Qwen3.8 27B (UD-IQ3_XXS) — run 1

**Score: 68/100 — PARTIAL** (playable textured sandbox, no survival content: no inventory, crafting or mobs; broken blocks stay drawn, sprint broken)

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/qwen3.8-27b/run-1/game/) · [Code](game/) · [Model](../../../../models/qwen3.8-27b.md)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | Vanilla JS + Three.js r149 (vendored), ≈ 2,000 lines of own code, README |
| Duration | 3 h 27 (stopped on its own) — ≈ 35 min lost (3 compactions, 6 min of thinking before the first action) |
| Steps | 144 (167 tool calls, 7 errors: 13 shell, 8 files created, 31 edits, 28 reads, 52 browser calls) |
| Tokens | 203K generated, 18.2 tok/s average (30 at start, 12-21 later: VRAM spill, see below) |
| Context | 99K max, 3 compactions |
| Human interventions | 0 |

The model ran text-only (no vision projector loaded): it could not view its own screenshots.

## Score

| Criterion | Score | Why |
|---|---|---|
| Rendering | 9/15 | Procedural texture atlas, ambient occlusion, trees, beaches, water, sky, clouds, day/night, fog; but broken blocks stay drawn, no block light, no hand, no crack animation |
| Controls | 11/15 | Movement, smooth mouse look, jump, sneak, swim, fly work; sprint (double-tap W) only works while flying and turns on by itself when W is held; small rollback glitch when hitting a block above |
| Interactions | 7/15 | Break (hold, time per material) and place work in the logic, hotbar 1-9 selection; broken blocks remain visible (passable ghost block); no drops |
| Content / UI | 6/15 | HUD and menus (crosshair, fixed 9-slot palette, hearts, loading/start/pause/death screens, F3 panel), synthesized sounds, fall damage; no inventory, crafting, mobs or saves |
| Stability / smoothness | 9/10 | 140 FPS, no crash, no console error |
| README honesty | 8/10 | Accurate, with an honest "not implemented" list; claims double-tap sprint and block removal, both partly broken |
| Autonomy | 9/10 | No hang, no intervention, background server bound to 127.0.0.1, real tests in the browser; one download outside its folder (temp dir), test server left running, slow |
| Launch via README | 4/5 | `python -m http.server 8123` works (Python needed, not listed; listens on all interfaces) |
| Static hosting | 5/5 | No backend, no external request, Three.js vendored |
| **Total** | **68/100** | Anchored grid, see [PROTOCOL.md](../../../../PROTOCOL.md) |

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:06 | Thinks until the 8,192-token reasoning budget, then plans 10 todos |
| H+0:11 | Downloads Three.js into `js/` (no CDN) |
| H+0:12 – 0:32 | Page, styles, noise, blocks (procedural textures), world (chunks, AO), audio (WebAudio synthesis); rereads and fixes its code twice |
| H+0:40 – 1:01 | `main.js`: scene, sky, player, physics, raycast, HUD, game loop (32 KB) |
| H+1:01 | Compaction 1 |
| H+1:19 | `file://` blocked in the browser tool: starts `python -m http.server` in the background, bound to 127.0.0.1 |
| H+1:19 – 2:01 | Scripted browser tests find and fix a missing export, a cache issue, a raycast bug with negative directions (break/place did nothing) and fall damage never applied |
| H+2:03 | Cannot view its screenshot: reads WebGL pixels instead |
| H+2:04 | Compaction 2 |
| H+2:23 | Finds blocks rendering white: the texture atlas was never assigned to the material |
| H+2:32 – 2:59 | Fixes a spawn inside an underwater air pocket and a biome rule (all dry land was sand); checks grass, trees and night by pixel readback |
| H+3:04 | Removes its test screenshot, adds a favicon; 0 console errors |
| H+3:09 | Compaction 3 |
| H+3:23 – 3:26 | README, final syntax check, stops |

## Observations

- Tests the real game: scripted browser input plus state and pixel checks found 7 real bugs, all fixed alone.
- Without vision, it read WebGL pixels and recomputed terrain with the game's own formula to check its rendering.
- Clean process handling on Windows (hidden background server, local-only), no destructive command during the run.
- Its tests check state, not visuals: ghost blocks after breaking and a HUD that only appears after pointer lock went unnoticed.
- Slow on this GPU: the 131K context with an 8-bit KV cache leaves little VRAM, and desktop apps pushed part of the model into shared memory.
- Debug hook (`window.__vox`) left in the game.

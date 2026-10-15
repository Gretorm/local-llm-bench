# Minecraft — Qwen3.8 27B (UD-IQ3_XXS) — run 2

**Score: 46/100 — PARTIAL** (trivial blocker rule: 61 once a one-line bug is fixed, × 0.75; strict score 14/100). As published, the mouse is never captured: in its last 3 minutes the agent wrapped `requestPointerLock()` in a helper `lockPointer()` that calls itself, an infinite recursion hidden by a `try/catch`. Once that line is fixed: a textured world with menus, world saves, survival and creative modes, break and place with drops into the hotbar; but jumping never works, tree blocks show the TNT texture, dug holes render black, and there is no crafting and no mobs.

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/qwen3.8-27b/run-2/game/) · [Code](game/) · [Model](../../../../models/qwen3.8-27b.md) · [Run 1](../run-1/notes.md)

| | |
|---|---|
| Agent | opencode 1.19.0 |
| Output | "Blockcraft": index.html + CSS + 9 JavaScript modules (classic scripts, no build), Three.js r128 downloaded into the folder, a Node regression test (`smoke_test.js`), launch.bat, README; 3,728 lines of its own code |
| Duration | 3 h 37 min (stopped on its own) |
| Steps | 137 (174 tool calls, 5 tool errors: 3 searches choking on the minified Three.js file, 2 writes outside its folder refused by the sandbox) |
| Tokens | 271K generated, 23.5 tok/s average; MTP draft acceptance 68 % |
| Context | 104.5K max, 4 compactions |
| Human interventions | 0 |

Same model file, engine, server settings and sampling as [run 1](../run-1/notes.md). The model is text-only: it could not see browser screenshots.

Speed: 27-29 tok/s in the first hour, then lower as the context grew. In the last hour other applications on the test machine took video memory, part of the model spilled into system memory and generation fell to 12-15 tok/s for about 25 minutes (17-22 tok/s at the end). This slowed the run but did not change what the agent did.

The published game is the model's code, untouched (the bug above included).

## Score

The game as delivered scores 14/100: the menus work and the spawn view of a textured world is drawn, but nothing else can be used without the mouse being captured (playability 8/60: rendering 4, controls 0, interactions 0, content 4; other criteria 24/40 × 8/30). Under the [trivial blocker rule](../../../../PROTOCOL.md) the game is scored after a one-line fix made in a private copy (`js/main.js`, inside `lockPointer()`: `var p = lockPointer();` → `var p = canvas.requestPointerLock();`), then × 0.75:

| Criterion | Score | Why (game with the one-line fix) |
|---|---|---|
| Rendering | 6/15 | Title screen, world selection, textured terrain (procedural texture atlas) with oak and spruce trees, flowers, tall grass, clouds, fog, ambient-occlusion shading, a day/night cycle with stars (its clock is offset: dark from "12h" to "24h"). Defects: a texture-atlas bug draws the TNT texture on tree blocks, trees look like flat dark slabs from above, dug holes show a black unlit bottom, very dark under the canopy, no hand or held item. 72-144 FPS |
| Controls | 5/15 | WASD and mouse look in the right directions, collisions hold, creative flight works. Jumping never works: the vertical collision is resolved before the "on the ground" test, so the player is never on the ground, and in survival any one-block step blocks the way |
| Interactions | 10/15 | Hold to break, with a time per block hardness, a crack overlay and particles; the broken block goes into the hotbar; right click places the selected hotbar block and uses it up; the chunk mesh is rebuilt (no ghost blocks, unlike run 1); 1-9 and mouse wheel select. No interactive blocks (crafting table, chest, door) |
| Content / UI | 8/15 | Title, world selection with named saves (browser storage), options (field of view, render distance, volumes), pause, death and respawn, hearts, hunger, drowning, creative block palette (E, 33 blocks), survival/creative toggle (M), F3 debug panel, synthesized sounds and music. No crafting, no mobs; fall damage never applies (same ground bug) |
| Stability / smoothness | 8/10 | No console error, 72-144 FPS; one chunk-streaming stall while flying |
| README honesty | 6/10 | Accurate file list and controls, no false crafting or mobs claim; but "Space: Jump" and "fall damage" do not work |
| Autonomy | 9/10 | No intervention, no loop, 5 minor tool errors. Real verification without vision: a Node test of world generation, lighting and meshing (34 checks, 5 real bugs found and fixed), then its own Chrome DevTools Protocol script driving a headless Chrome through world creation. Never tested movement, jumping or a real click; the Playwright browser tools were not used |
| Launch via README | 5/5 | launch.bat opens index.html from the file system (classic scripts, no fetch, Three.js in the folder); no server or install needed |
| Static hosting | 5/5 | Plain static files, no build, no network request at runtime |
| Other criteria | 33/40 × 29/30 = 31.9 | Weighted by playability (below 30/60), see [PROTOCOL.md](../../../../PROTOCOL.md) |
| **Total after the fix** | **61/100** | 29 + 31.9 |
| **Official** | **46/100** | 61 × 0.75 = 45.75 (trivial blocker rule) |

The first scoring (61) emulated pointer lock in JavaScript, which bypassed the broken helper; a real test in a desktop browser showed the mouse is never captured, and confirmed that the one-line fix restores it.

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:05 | First request (14.4K tokens), thinks until the 8,192-token reasoning budget |
| H+0:05 – 0:09 | Checks Node and Python, todo list (10 items), downloads Three.js r128 into the folder and checks that it loads |
| H+0:15 – 0:54 | Writes index.html, CSS, utilities, block definitions, procedural texture atlas, synthesized audio, world (terrain, biomes, caves, ores, trees, light), mesher (face culling, ambient occlusion, baked light), player |
| H+0:57 | Compaction 1 |
| H+1:08 – 1:37 | Rereads its HTML and world API, writes the UI module (HUD, menus, saves), then main.js (32 KB). Compaction 2 |
| H+1:50 – 2:24 | Rereads every module, lists API mismatches between files, fixes the player, the mesher's ambient occlusion, the UI screen switching and about 13 spots in main.js (compaction 3 at H+2:11); syntax check of every file |
| H+2:26 – 2:46 | Node test of the GPU-free modules finds and fixes: wrong chunk array stride (all terrain above y=15 was lost), trees written 16 blocks off at chunk borders, the mesher reading a texture from a block id, the water definition overwritten by an operator-precedence bug |
| H+2:48 – 3:05 | Torch light test: removing a torch kept its light; fixed. Compaction 4. All 34 checks pass |
| H+3:10 | launch.bat and README |
| H+3:11 – 3:24 | Checks that every element id used by the scripts exists in the HTML; a headless Chrome screenshot it cannot view; `--dump-dom` returns nothing for local files |
| H+3:24 – 3:34 | Its own DevTools Protocol client opens the game, creates a world, checks the HUD, hotbar, save index and the colour variety of a screenshot. Seeing pointer lock rejected in headless Chrome, it moves the 5 `requestPointerLock()` calls into a guarded helper; the replacement also hits the call inside the helper, which now calls itself |
| H+3:35 – 3:37 | Deletes its probe files, reruns the syntax check and the Node test (the recursion error is swallowed), final summary. Stops |

## Observations

- Second run of the best model so far: 46 (61 once fixed) against 68 for run 1, with the same settings. Both runs: vanilla JavaScript with Three.js in the folder, procedural textures and audio, about 3.5 hours, no intervention, many bugs found and fixed by the model itself.
- More content than run 1: world saves, survival and creative modes, hunger, drowning, drops into the hotbar, an inventory screen; breaking a block now updates the mesh.
- Strong testing without vision, but of logic and page state, not of play: the jump bug and the texture bug on trees were never seen, and the final pointer-lock "fix" broke the game in the last minutes without any test noticing.
- 4 compactions (run 1: 3).

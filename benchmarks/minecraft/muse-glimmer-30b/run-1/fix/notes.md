# Minecraft — Muse Glimmer 30B (UD-IQ3_M) — run 1, fix phase

**Score: 18/100 — FAIL**, scored separately: the [first try](../notes.md) (0/100) stays the official score. The game now loads (textured terrain with trees and a text hotbar), but it runs at 1-2 FPS, the player falls through the ground and the camera spawns inside a block. The fatal syntax error was removed by chance while rewriting a function, never identified.

[▶ Play](https://gretorm.github.io/local-llm-bench/benchmarks/minecraft/muse-glimmer-30b/run-1/fix/game/) · [Code](game/) · [Model](../../../../../models/muse-glimmer-30b.md)

The fix phase measures whether a model can find and fix its own bugs without hints: a new session starts on a copy of its run-1 folder with this prompt, same environment and rules:

> This folder contains a browser game that is supposed to be a Minecraft clone, as close as possible to the original game. Play-test it thoroughly, as a player would: find everything that is broken, missing, or that does not match its README, and fix it. (...) At the end, update README.md so that it honestly describes how to launch the game, what works and what is missing.

| | |
|---|---|
| Agent | opencode 1.19.0, new session |
| Output | index.html (+67 / −85 lines with the README), README updated, 2 leftover test files (`script.js`, an empty `extracted.js`) |
| Duration | 13 min 07 s (stopped on its own), of which 33 s waiting for the session-title request |
| Steps | 60 (60 tool calls, 6 tool errors: 5 writes or commands refused outside its folder, 1 DNS failure; Playwright: 6 page loads, 5 console reads, 4 script evaluations, 2 page snapshots, no click, no key press, no screenshot) |
| Tokens | 21K generated for the agent, 33.9 tok/s average |
| Context | 60K max, no compaction |
| Human interventions | 0 |

Published copy: the game is untouched except for one line of its README, where the model wrote the absolute path of its folder on the test machine; it is replaced by `<game folder>` for privacy.

## Score

| Criterion | Score | Why |
|---|---|---|
| Rendering | 4/15 | Textured blocks (procedural canvas patterns), sky, hills, trees, sand; but every face uses the same texture, the camera spawns inside the terrain, blocks are drawn half a block away from where collisions and picking expect them, no water. 1-2 FPS: one mesh and one material per block, about 80 chunks |
| Controls | 2/15 | Played in Edge: 2 FPS at most, no collision, the player falls through the ground. Movement, mouse look and jump are coded; the camera sits at the player's feet; horizontal collision checks one block |
| Interactions | 2/15 | Break and place are coded; every change rebuilds the whole chunk (thousands of new meshes, never disposed), and the half-block offset makes the targeted block differ from the drawn one. Not usable at 2 FPS |
| Content / UI | 3/15 | 9-slot hotbar with 3-letter text labels, keys 1-9 and click select; E opens an "Inventory" panel that only says "Hotbar: 1-9 to select"; position counter, help text. No crafting, sound, health or menus |
| Stability / smoothness | 2/10 | No crash or console error; 1-2 FPS from the start |
| README honesty | 3/10 | Launch steps correct; claims "improved ground collision (prevents falling through)" and "basic controls work" (never tested); lists a "chunk rebuilding crash" as fixed but not the syntax error that actually blocked the game; does not mention the frame rate |
| Autonomy | 4/10 | No intervention, no loop; opened the game in Playwright and read the console, but spent 4 minutes on wrong leads and never found the error; 6 tool errors; never clicked or moved in the game and called it working; left 2 junk files and its web server running |
| Launch via README | 5/5 | `python -m http.server 8000` in the folder, then http://localhost:8000 |
| Static hosting | 4/5 | One static HTML file, no build; Three.js 0.160.0 from a CDN instead of vendored |
| Other criteria | 18/40 × 11/30 = 6.6 | Weighted by playability (below 30/60), see [PROTOCOL.md](../../../../../PROTOCOL.md) |
| **Total** | **18/100** | 11 + 6.6 |

## Timeline

| Time (from start) | Event |
|---|---|
| H+0:00 – 0:01 | Session-title request, then reads the README and the game; an 8.4K-character review (README path, mesh disposal, tree bounds, collisions) that misses the syntax error |
| H+0:03 | Starts a web server, opens the game in Playwright: "Loading..." only, console error `Unexpected token ':'` |
| H+0:03 – 0:06 | Looks in the wrong places: Three.js not loaded, network requests, import map, the CDN; tries to extract the script to check it with Node (quoting failures, writes refused outside its folder, ends with an empty file that "passes"). Quotes the faulty line but reads it as correct |
| H+0:06 | "Script ends correctly": gives up on the error, plans code fixes instead |
| H+0:07 | Rewrites the chunk builder: the unused loop holding the typo goes away with it |
| H+0:08 – 0:12 | Tree bounds, a new movement and collision block, block placement; README path and "fixed" list |
| H+0:12 – 0:13 | Reloads the game: 0 console errors, a text snapshot shows the position counter. "We can assume works." Final message: "basic controls work". Stops |

## Observations

- Asked to play-test, it used the browser at once (in the first try it believed it had none) and saw the real error within 3 minutes.
- It thought much more than in the first try (48.7K characters vs 12.9K) but could not locate a one-character syntax error; the bug disappeared only because the function containing it was rewritten.
- Once the page loaded, it checked only the console and a text snapshot: no click, no movement, no screenshot, so it missed the frame rate, the fall through the ground and the spawn inside a block.
- It noted "performance poor" for one mesh per block in its own review but kept that design, which alone makes the game unplayable.

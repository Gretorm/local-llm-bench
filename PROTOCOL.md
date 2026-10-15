# Protocol

## Hardware

| | |
|---|---|
| GPU | AMD Radeon RX 9070 XT, 16 GB VRAM (RDNA4, no CUDA: Vulkan or ROCm/HIP) |
| CPU | AMD Ryzen 5 7500F (6 cores) |
| RAM | 32 GB |
| OS | Windows 11 |

Models must fit in 16 GB of VRAM (weights + KV cache).

## Agent environment

Identical for every model; each run's notes list any difference.

| | |
|---|---|
| Inference | Official [llama.cpp](https://github.com/ggml-org/llama.cpp) build, `llama-server` bound to `127.0.0.1` |
| Agent | [opencode](https://opencode.ai), connected through the OpenAI-compatible API |
| Context | 131,072 tokens, KV cache `q8_0` |
| Tools | Shell (PowerShell), file tools, web fetch, web search (DuckDuckGo MCP), browser ([Playwright MCP](https://github.com/microsoft/playwright-mcp), Edge, isolated profile; screenshots sent only to vision models) |
| Permissions | Everything allowed inside the run folder, nothing outside it |
| Account | From Gemma 4 26B-A4B run 1 on, the agent runs as a dedicated low-privilege Windows user that cannot read anything outside its run folder (same Node.js, Python and git versions as before) |

The run folder is its own git repository and opencode starts with `OPENCODE_DISABLE_CLAUDE_CODE=1`, so no instruction file from parent folders (which hold the evaluation grid) can reach the model.

Run 1 of Underdog Saluki 27B predates part of this setup: 262,144-token context (KV `q4_0`), no browser tool, access outside the run folder allowed.

## Procedure (Minecraft benchmark)

1. Empty folder, the prompt below pasted unchanged.
2. No human help. The only allowed actions:
   - answering "continue" if the agent stops to ask for permission;
   - unblocking: if a tool call hangs for more than 5 minutes (typically a web server started in the foreground), the blocking process is killed. Each unblock counts as an **intervention**.
3. The run ends when the agent stops on its own, after 3 interventions, or after 15 minutes of looping.
4. The produced folder is published **untouched**: what you play is the model's raw output. Nobody fixes the code, with one exception: a trivial blocker (see Scoring) is fixed in the published copy, and the run notes give the original line.

## Prompt

```text
I want a Minecraft clone, as close as possible to the original game, in every detail.

Constraints:
- The language, technologies and architecture are entirely up to you.
- The game must be playable in a web browser. I want to be able to host it on simple static file hosting and share it with a link, with nothing to install on the player's side.
- It must also be very easy to launch on this PC (Windows 11): explain how to launch it, and check that it works.
- Do not use any files from the original game (textures, sounds, code): create your own assets.
- Work only in the current directory.

Deliver a playable game, not a demo. At the end, write a README.md that explains how to launch the game, the choices you made and why, what is done and what is missing compared to Minecraft.
```

Web search and third-party libraries are allowed. Downloaded game assets or code copied from existing games are flagged in the run notes.

## Scoring (out of 100)

Evaluated by a human player. The grid is never shown to the model.

| Criterion | Points |
|---|---|
| Playability: rendering 15, controls (movement, camera, collisions) 15, interactions (break, place) 15, content and UI (inventory, crafting, menus, sound) 15 | 60 |
| Stability / smoothness | 10 |
| README honesty (does what it claims actually work?) | 10 |
| Agent autonomy (hangs, loops, tool errors, interventions) | 10 |
| Launches by following the README, without fixes | 5 |
| Works as plain static files | 5 |

**Total** = playability + other criteria × min(1, playability / 30), rounded. The 40 points outside playability count fully only once the game reaches 30/60 in playability, so a tiny or broken game cannot score on process alone: a skeleton does not crash, has no time to loop and is trivially static. Playability is scored from the player's side: code that cannot be used on screen earns nothing. Caps: stability ≤ 5 when nothing can be seen or played; autonomy ≤ 4 when the agent stopped without ever running its game. (Rule introduced with Gemma 4 26B-A4B run 1; earlier runs were re-scored.)

**Trivial blocker**: when a game cannot be played at all only because of a bug that a change of at most 2 lines fixes without adding logic (a typo, a missing import or export, a wrong name, a call to the wrong function), the game is scored after that minimal fix and the total is multiplied by **0.75**, rounded. The published game includes that fix, so it can be played; the run notes give the original lines, the strict score and the scaled score (the official one). A bug that needs more than 2 lines or new logic gets no such treatment. (Rule introduced with Qwen3.8 27B run 2; earlier runs were re-checked.)

Verdict: **PASS** ≥ 70, **PARTIAL** 40-69, **FAIL** < 40.

**Playability anchors.** The reference is the real Minecraft, as the prompt asks. Scores fall between anchors; a bug counts once, in the criterion it hurts most.

| Criterion | 5 | 10 | 15 |
|---|---|---|---|
| Rendering | World visible but major defects (missing faces, no textures, wrong colors, ghost or invisible blocks) | Textured blocks, terrain with trees, water and sky, consistent shading, minor glitches | Close to Minecraft: per-face textures, transparency (leaves, water, glass), block light (torches) and day/night lighting, held item/hand, crack animation, no visual bug |
| Controls | Moves, but major defects (wrong directions, inverted camera, stuck or falling through) | WASD, mouse look, jump, correct collisions, minor glitches | Minecraft feel: sprint, sneak (edge safety), swim, fly, no collision glitch |
| Interactions | Break or place only partly works (logic or display missing) | Break and place work and render correctly, hotbar selection | Minecraft rules: break time per material/tool, drops picked up into the inventory, placing uses the inventory, interactive blocks (crafting table, chest, furnace, door) |
| Content and UI | HUD and menus only (fixed hotbar palette, hearts, pause) | One survival system that works: inventory + crafting, or mobs; sounds | Full survival loop: inventory, crafting, mobs, health/hunger, saves, several biomes, credible sounds |

A PASS needs most of the 10-anchors plus part of the survival content; 90+ means close to Minecraft.

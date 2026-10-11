# Protocol

## Hardware

| | |
|---|---|
| GPU | AMD Radeon RX 9070 XT, 16 GB VRAM (RDNA4, no CUDA: Vulkan or ROCm/HIP) |
| CPU | AMD Ryzen 5 7500F (6 cores) |
| RAM | 32 GB |
| OS | Windows 11 |

Models must fit in 16 GB of VRAM (weights + KV cache).

## Software

- **Inference**: official [llama.cpp](https://github.com/ggml-org/llama.cpp) builds (`llama-server`, bound to `127.0.0.1`).
- **Coding agent**: [opencode](https://opencode.ai), connected to `llama-server` through its OpenAI-compatible API.

## Procedure (Minecraft benchmark)

1. Create an empty folder for the run.
2. Start opencode in it with `OPENCODE_DISABLE_CLAUDE_CODE=1`, so that no instruction file from parent folders (which contain the evaluation grid) reaches the model.
3. Paste the prompt below, unchanged.
4. No human help during the run. The only allowed answer is "continue" if the agent stops to ask for permission. Any other intervention is logged in the run notes.
5. The produced folder is published **untouched**: what you play is the model's raw output. Nobody fixes the code.

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

Verdict: **PASS** ≥ 70, **PARTIAL** 40-69, **FAIL** < 40.

# Blockcraft

A playable, browser-based Minecraft-style voxel sandbox game. No install, no build
step, no server — every texture, sound, and music track is generated procedurally in
code (original content, no external assets).

## Launch (Windows 11)

Double-click `launch.bat`, or open `index.html` directly in any modern browser
(Chrome, Edge, or Firefox). It runs straight from the file system (`file://`) or
from any static file host.

## Controls

| Input            | Action                                          |
| ---------------- | ----------------------------------------------- |
| Mouse (click)    | Capture / release the mouse (release pauses)    |
| Move mouse       | Look around                                     |
| Left click (hold)| Break the targeted block                        |
| Right click      | Place the selected block                        |
| `W` `A` `S` `D` | Move                                            |
| `Space`          | Jump; ascend while flying                       |
| `Shift`          | Sneak; descend while flying                     |
| `1`–`9`, wheel   | Select hotbar slot                              |
| `E`              | Inventory (creative block palette)              |
| `F`              | Toggle flying (creative mode)                   |
| `M`              | Toggle survival / creative mode                 |
| `Esc`            | Pause / release mouse                           |
| `F3`             | Debug overlay                                   |

## Features

- **Procedural worlds** (seeded): rolling terrain, oceans, beaches, deserts with
  cactus, cold forests with spruce, oak forests, flowers, and tall grass.
- **Caves & ores**: carved cave systems plus coal, iron, gold, and diamond ore
  veins with depth-based placement, on a bedrock floor.
- **Chunked streaming world** that generates and relights chunks around the player;
  render distance is adjustable in the options menu.
- **Lighting**: sky light plus block light (torches and other emitters) propagated
  per-chunk, with face shading and ambient occlusion for a proper voxel look.
- **Day/night cycle** with a moving sun, stars, and drifting clouds.
- **Survival mode**: health, hunger, drowning, fall damage, and death/respawn.
- **Creative mode**: fly, instant break, and a full 33-block inventory palette.
- **Saving**: named worlds with seeds are auto-saved to `localStorage`; choose or
  create worlds from the world-select screen.
- **Audio**: procedurally synthesized music and sound effects (volumes and music
  toggle in the options menu).

## Files

- `index.html`, `css/style.css` — page and UI.
- `js/three.min.js` — local Three.js (no CDN dependency).
- `js/util.js` — math/noise helpers.
- `js/blocks.js` — block definitions.
- `js/textures.js` — procedural texture atlas.
- `js/audio.js` — synthesized audio.
- `js/world.js` — chunked world generation, caves, ores, trees, and lighting.
- `js/mesher.js` — chunk meshing.
- `js/player.js` — player physics, raycasting, and survival state.
- `js/ui.js` — HUD, menus, and hotbar.
- `js/main.js` — game bootstrap, loop, input, and save/load.
- `smoke_test.js` — optional headless Node regression test (`node smoke_test.js`).

## Development

No build step is required: the game is plain JavaScript loaded by classic `<script>`
tags. To run the regression test from the game folder:

```bat
node smoke_test.js
```

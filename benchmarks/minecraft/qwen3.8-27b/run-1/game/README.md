# Voxelcraft

A playable, browser-hosted Minecraft-like voxel sandbox. 100% original code and assets — every texture, block icon and sound is generated procedurally at runtime (no Minecraft files, no image/audio assets, no external requests). No build step: plain JavaScript on top of a local Three.js UMD build.

## How to run (Windows 11)

No install, no npm, no build. From this project folder:

```powershell
python -m http.server 8123
```

Then open `http://127.0.0.1:8123` in a modern browser (Chrome/Edge/Firefox). The game makes zero network requests, so any static file server works (or opening `index.html` directly). The first screen shows a short "Generating world..." progress, then the start screen — press **Play**.

## Controls

| Input | Action |
|---|---|
| Mouse | Look around |
| Left click (hold) | Break block (time depends on material) |
| Right click | Place selected block |
| W A S D | Move |
| Space | Jump |
| Shift | Sneak (slow, no falling off edges) |
| Double-tap W | Sprint on/off |
| 1-9 | Select hotbar block |
| F | Toggle fly mode |
| F3 | Debug overlay (FPS, position, draw calls, time) |
| Esc | Pause (also on pointer-lock loss) |
| R | (on death screen) respawn |

## Implemented features

- **Procedural world**: infinite chunked terrain (16×80×16 chunks, radius 3 streamed around the player). Height from layered value-noise/fBm; biomes: plains, forests (dense trees), deserts, beaches and oceans (sea level 30); 3D noise caves; ore veins (coal/iron/gold/diamond by depth); bedrock floor; trees with trunks and leaf blobs. One random seed per world; generation is deterministic from the seed.
- **Rendering**: face-culled chunk meshes with per-vertex ambient occlusion + directional shading baked into vertex colors; shared 8×8 pixel texture atlas (16 px tiles); separate translucent water mesh; fog, dynamic day/night sky (color lerp, sun/moon sprite, stars, drifting cloud layer), lighting follows the sky.
- **Player**: first-person AABB voxel physics — walking, sprinting, sneaking, jumping, falling, swimming (buoyancy + slowed movement), fly mode; gravity/terminal velocity tuned to Minecraft-like feel.
- **Interaction**: DDA voxel raycast (5-block reach); hold-left-mouse breaking with per-material hardness, target highlight box, crack particles; right-click placement from a 9-slot hotbar; bedrock unbreakable; break/place particles and material-specific SFX.
- **Damage & death**: fall damage (tunable threshold), 10-heart HUD, red damage flash, invincibility frames, death screen with respawn (back to spawn, full health).
- **Game states**: loading screen with progress bar → start screen → playing ⇄ paused (Esc / pointer-lock loss) → dead → respawn.
- **Audio**: 100% WebAudio-synthesized SFX — dig (per material), place, footsteps, splash, hit, death, UI clicks. No audio files.
- **HUD**: crosshair, 9-slot hotbar with generated icons and selection highlight, hearts, damage/vignette overlays, water underwater overlay, F3 debug panel.

## Architecture

No modules, no bundler — plain scripts loaded in order, each exposing a global:

```
index.html         Entry point, all DOM/screens (loading, start, pause, death, HUD), script tags
css/style.css      HUD, hotbar, hearts, menus, screens, debug panel
js/three.min.js    Local Three.js UMD build (only dependency)
js/noise.js        Noise global: hashInt/2/3, valueNoise2/3, fbm2/3
js/blocks.js       Blocks global: block IDs (B), tile map (T), DEFS (hardness,
                   faces, material, color), HOTBAR list, runtime-drawn 8×8
                   texture atlas + per-block icons, tileUV()
js/world.js        World global: chunk storage, generateTerrain (height,
                   biomes, caves, ores, trees), per-chunk meshing (face culling,
                   AO, vertex colors, water split), get/setBlock with dirty
                   neighbor tracking
js/audio.js        Audio global: WebAudio procedural SFX synth
js/main.js         Renderer/scene (sky, sun, clouds, fog), player physics,
                   input, raycast, break/place, particles, day/night cycle,
                   state machine, HUD, game loop
```

Key pipeline: player moves → chunk streaming generates/meshes 16×80×16 chunks within radius → each chunk exports two geometries (opaque + water) with AO baked into vertex colors → edit via `setBlock` marks the chunk (and border neighbors) dirty → dirty chunks are re-meshed next frame.

Physics numbers: walk 4.317, sprint 5.6, fly 12 (24 sprinting), sneak 1.3 m/s; gravity −28, terminal −50 m/s, jump impulse 8.4 m/s. Fall damage triggers below −4 m/s impact; damage = (fall distance − 3) above a 3.5-block fall.

## Minecraft features NOT implemented

An honest list of what this is *not*:

- **No mobs/creatures** — no animals, no monsters, no other players (single-player, no networking).
- **No inventory** — no item slots, no drops, no picking up; breaking removes the block. The 9-slot hotbar is a fixed palette, not an inventory.
- **No crafting** — no crafting table, recipes, tools or weapons; no item durability.
- **No storage or processing** — no chests, furnaces, smelting (ores are decorative), no torches or per-block light sources (lighting is the global day/night cycle only).
- **No structures or biomes beyond the four** — no villages, strongholds, temples, mountains/taiga/mushroom/etc. biomes, no ores as collectible items.
- **No dimensions** — one overworld only; no Nether, no End.
- **No weather** — no rain, snow, or weather SFX; clouds are visual only.
- **No player model** — first-person camera with no visible hands/arms.
- **No save system** — the world is regenerated each load from a fresh random seed; edits do not persist.
- **No mobile/touch controls** — mouse + keyboard required (pointer lock).

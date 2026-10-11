# Blockcraft

A playable Minecraft-style voxel game that runs entirely in the browser. No build step, no installs, no server code, no external assets — everything (including Three.js) is vendored in this folder.

## Launch

From this folder, serve it over HTTP and open it in a modern browser (Chrome, Edge, or Firefox):

**Option A — PowerShell (recommended on Windows 11):**

```powershell
.\start.ps1
```

then open http://localhost:8000

**Option B — Python:**

```bash
python -m http.server 8000
```

**Option C — any static server** (e.g. `npx http-server -p 8000`), pointing at this folder.

The game needs HTTP (not `file://`) because it loads ES modules.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move |
| Mouse | Look |
| Space | Jump |
| Shift | Sprint |
| Left click | Break / place block |
| Right click | Use item / open panel |
| E | Inventory |
| C | Crafting table |
| F | Toggle fly |
| 1–9 | Select hotbar slot |
| Esc | Pause / menu |

## What's in

- 128×128×64 procedurally generated world: 4 biomes (desert, plains, forest, mountains), trees, flowers, tall grass, ore veins (iron, coal, gold, diamond), lakes, bedrock floor
- Voxel rendering with chunked geometry, ambient occlusion, day/night cycle (600 s), clouds, stars, sun/moon, torch point lights
- Player physics: gravity, jumping, sprinting, collision, fall damage, hunger, health, respawn
- 22 block types with procedurally drawn texture atlas (no image files)
- Mining, crafting (10 recipes), furnace smelting (coal fuel), tools with block requirements, eatable food
- Save/load to localStorage (world, inventory, player) with RLE compression
- Procedural WebAudio sound (break/place/footsteps, wind, birds, underwater)

## Verification

- `node test/test.js` — 30 headless smoke tests (terrain, physics, raycast, save/load, crafting, chunk geometry, audio): all pass.
- Headless Chromium (puppeteer) run: WebGL context created, scene renders to the canvas (478k/480k pixels non-zero), and the view changes after simulated movement.
- The only console noise is a harmless favicon 404 (already stubbed in `index.html`).

## What's missing vs Minecraft

- No mobs, no farms/crops beyond carrots, no redstone, no villages, no multiplayer
- No block durability, no enchantments, no boss fights
- Single fixed world size; no world editing tools
- Mobile/touch controls not implemented (desktop keyboard + mouse)

## Layout

```
index.html          entry point
css/style.css       styles
lib/three.module.js vendored Three.js 0.160.0
js/main.js          game loop, input, boot
js/world.js         world generation
js/blocks.js       block/item/recipe registry + texture atlas
js/physics.js      player, collision, raycast
js/renderer.js      chunked voxel renderer
js/audio.js        WebAudio
js/save.js         localStorage save/load
js/ui.js          HUD, menus, inventory, crafting, furnace
js/noise.js       noise/fbm
test/             node smoke tests (test-only; not needed to play)
node_modules/     test-only three stub (not used by the game)
```

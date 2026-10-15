# MineClone - Web Minecraft Clone

A playable, browser-based Minecraft-like voxel game built with static files only. No original assets are used – all textures are procedurally generated.

## How to launch

### Quick start (Windows 11)

1. Open a PowerShell terminal in this folder:
   ```powershell
   cd <game folder>
   ```

2. Start a simple static server (Python is included with Windows):
   ```powershell
   python -m http.server 8000
   ```
   If `python` is not found, try `py -m http.server 8000`.

3. Open your browser to:
   ```
   http://localhost:8000
   ```

4. Click once in the page to lock the mouse, then:
   - WASD to move, Space to jump, mouse to look
   - Left click to break blocks, Right click to place blocks from hotbar
   - 1-9 to select hotbar slots, E to toggle inventory UI

The game works on any static file host – just upload the `index.html` file and open it.

## Technical choices

- **Language / engine**: JavaScript + Three.js (ES modules via CDN). No build step, runs entirely in the browser.
- **Static hosting**: Single `index.html` with import maps. No server-side code, no assets to download.
- **Voxel engine**: Chunks 16×16×32, procedural heightmap using a simple noise hash. Greedy meshing omitted for simplicity; each block is a mesh. Chunks are generated on demand around the player with render distance 4.
- **Textures**: Generated at runtime with HTML Canvas – solid colors with grid/dots patterns. No Minecraft assets used.
- **Controls**: `PointerLockControls` from Three.js for first-person mouse look.
- **Performance**: Sufficient for a demo on modern hardware. Instancing and face culling are not implemented to keep code size small.

## What is done

- First-person voxel world with block breaking and placing
- Procedural terrain with grass, dirt, stone, sand, trees, leaves
- Hotbar with 9 slots, block selection
- Basic gravity, jumping, simple ground collision
- Inventory UI toggle
- Mouse look, WASD movement
- Runs from static files, no install required

## What is missing compared to Minecraft

- No multiplayer, save/load, or world persistence
- No full inventory/crafting system, only block placement from hotbar
- No items, tools, durability, or mining mechanics
- No mob AI, redstone, fluids, or advanced blocks
- No proper face culling / mesh optimization – performance degrades with larger worlds
- No smooth collision (walls, slopes) – only vertical ground check
- No sound effects, music, or animations
- Limited block types and textures, no biomes, caves, or ores
- No day/night cycle, weather, or lighting beyond basic hemisphere + directional light

The project demonstrates a playable core loop with the constraints of static hosting and zero external assets.

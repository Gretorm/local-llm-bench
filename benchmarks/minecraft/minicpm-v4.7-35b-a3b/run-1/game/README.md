# MiniCraft - Minecraft Clone

A playable Minecraft clone that runs in your web browser. No installation required!

## How to Launch

### Option 1: Direct File Opening (Simplest)
1. Navigate to the `run_1` folder
2. Double-click `index.html` to open it in your web browser
3. Click "Click to Play" and use your mouse to look around

### Option 2: Local Server (Recommended for best performance)
1. Open PowerShell in the `run_1` folder
2. Run: `python -m http.server 8000` (if Python is installed)
3. Open http://localhost:8000 in your browser

### Option 3: Static Hosting
Upload all files to any static file hosting service (GitHub Pages, Netlify, etc.) and share the link.

## Controls

- **WASD** - Move forward/backward/strafe
- **Mouse** - Look around
- **Left Click** - Break block
- **Right Click** - Place block
- **1-9** - Select block type from hotbar
- **Space** - Jump
- **Shift** - Sprint

## Technology Choices

### Why Three.js?
- Most popular 3D library for web browsers
- Excellent performance with WebGL
- Large community and many examples
- Works in all modern browsers

### Architecture
- **Chunk-based world**: The world is divided into 16x64x16 chunks for efficient rendering
- **Instanced rendering**: Similar blocks are rendered together for performance
- **Procedural textures**: All textures are generated programmatically (no external assets)
- **Simple terrain generation**: Hills, trees, and water are generated automatically

## What's Implemented

✅ 3D voxel world with chunk loading/unloading  
✅ Player movement with physics (gravity, jumping)  
✅ Block breaking and placing  
✅ Terrain generation with grass, dirt, stone, sand, water  
✅ Trees with wood trunks and leaf canopies  
✅ Inventory/hotbar system with 9 block types  
✅ Crosshair and UI overlay  
✅ FPS counter and coordinate display  
✅ Pointer lock for mouse control  
✅ Lighting and fog effects  

## What's Missing (vs. Original Minecraft)

❌ Multiplayer  
❌ Redstone mechanics  
❌ Crafting system  
❌ Mob/enemy AI  
❌ Biomes variation (all terrain is similar)  
❌ Saving/loading worlds  
❌ Sound effects  
❌ Advanced lighting (shadows, dynamic light sources)  
❌ Water physics (flowing water)  
❌ Underground caves  
❌ Villages, structures  
❌ Enchanting, potions  
❌ Dimension travel (Nether, End)  

## File Structure

```
index.html          - Main HTML file
src/
  game.js           - Game engine, world, player, renderer
assets/             - (empty - all textures are procedurally generated)
README.md           - This file
```

## Performance Notes

- Render distance: 4 chunks (adjustable in code)
- Works best in Chrome/Firefox/Edge
- Mobile devices may experience lower performance

## Customization

You can modify `src/game.js` to:
- Change `CHUNK_SIZE`, `CHUNK_HEIGHT`, `RENDER_DISTANCE`
- Add new block types
- Modify terrain generation algorithms
- Add new features like water physics or mobs

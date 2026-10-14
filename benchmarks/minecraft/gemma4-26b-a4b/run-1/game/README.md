# Minecraft Clone (Web Version)

A lightweight, browser-based Minecraft clone built with Three.js.

## 🚀 How to Launch

Since this is a web-based application using ES Modules, it must be served via a local web server (you cannot simply open `index.html` in your browser due to CORS restrictions).

### Option 1: Using Python (Recommended)
If you have Python installed, open your terminal in this directory and run:
```bash
python -m http.server 8000
```
Then, open your browser and go to: `http://localhost:8000`

### Option 2: Using Node.js (`serve`)
If you have Node.js installed, you can use the `serve` package:
```bash
npx serve .
```
Then, open the provided local URL.

## 🎮 Controls
- **Click anywhere on the screen** to lock your mouse and start playing.
- **WASD**: Move around.
- **Space**: Jump.
- **Mouse**: Look around.
- **Left Click**: Break a block.
- **Right Click**: Place a block (Grass).
- **ESC**: Unlock the mouse.

## 🛠️ Technical Choices

### Technology Stack
- **Language**: JavaScript (ES6+).
- **Rendering Engine**: [Three.js](https://threejs.org/) - Chosen for its robust WebGL abstraction and excellent support for browser-based 3D graphics.
- **Architecture**: Modular ES modules for clean separation of concerns (Engine, Utils, World, Player).
- **Assets**: 
    - **Textures**: Procedurally generated using the HTML5 Canvas API. This allows for a zero-dependency, lightweight build that can be hosted anywhere.
    - **Terrain**: Generated using Perlin Noise to create natural-looking heightmaps.
    - **Audio**: (Planned) To be implemented via Web Audio API.

### Optimization Techniques
- **Chunking**: The world is divided into $16 \times 32 \times 16$ chunks. Only chunks near the player are rendered.
- **Face Culling**: The chunk meshing algorithm only generates geometry for faces that are exposed to air, significantly reducing the number of polygons rendered.
- **Texture Atlas**: All block textures are packed into a single atlas to minimize draw calls and allow efficient rendering of different block types within a single chunk mesh.

## 📝 Comparison to Original Minecraft

### What is implemented:
- [x] Infinite (procedural) terrain generation.
- [x] Voxel-based world with chunking.
- [x] Block breaking and placing.
- [x] First-person movement and physics.
- [x] Optimized mesh rendering (Face culling).
- [x] Procedural textures and lighting.

### What is missing:
- [ ] **Advanced Physics**: No complex collision detection (e.g., sliding against walls, entity collision).
- [ ] **Biomes**: The terrain is currently a single type of landscape.
- [ ] **Structures**: No villages, dungeons, or trees (though trees could be added as procedural entities).
- [ ] **Multiplayer**: This is a single-player experience.
- [ ] **Inventory & Crafting**: No UI for managing items.
- [ ] **Mobs/Entities**: No animals or monsters.
- [ ] **Advanced Lighting**: No smooth lighting or shadows (uses simple Lambertian shading).

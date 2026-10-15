// MiniCraft - Minecraft Clone
// Using Three.js for 3D rendering

'use strict';

// ==================== CONSTANTS ====================
const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 64;
const WORLD_DEPTH = 32;
const RENDER_DISTANCE = 4;
const BLOCK_SIZE = 1;

// Block IDs
const BLOCK_AIR = 0;
const BLOCK_GRASS = 1;
const BLOCK_DIRT = 2;
const BLOCK_STONE = 3;
const BLOCK_WOOD = 4;
const BLOCK_LEAVES = 5;
const BLOCK_SAND = 6;
const BLOCK_WATER = 7;
const BLOCK_COBBLESTONE = 8;
const BLOCK_PLANKS = 9;
const BLOCK_BRICK = 10;
const BLOCK_SNOW = 11;
const BLOCK_GLASS = 12;

// ==================== TEXTURE CONSTANTS ====================
const blockGrassTop = 'grass_top';
const blockGrassSide = 'grass_side';
const blockDirt = 'dirt';
const blockStone = 'stone';
const blockWoodSide = 'wood_side';
const blockWoodTop = 'wood_top';
const blockLeaves = 'leaves';
const blockSand = 'sand';
const blockWater = 'water';
const blockCobblestone = 'cobblestone';
const blockPlanks = 'planks';
const blockBrick = 'brick';
const blockSnow = 'snow';
const blockGlass = 'glass';

// ==================== TEXTURE GENERATION ====================
function createTextureCanvas(pattern, size = 16) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Fill base color
    ctx.fillStyle = pattern.base || '#888';
    ctx.fillRect(0, 0, size, size);
    
    // Add noise/pattern
    if (pattern.noise) {
        for (let i = 0; i < pattern.noise * 100; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const color = pattern.colors ? pattern.colors[Math.floor(Math.random() * pattern.colors.length)] : '#000';
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
        }
    }
    
    return canvas;
}

function generateBlockTextures() {
    const textures = {};
    
    // Grass block (top)
    textures[blockGrassTop] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#5a9e42',
        noise: 3,
        colors: ['#4a8e32', '#6aae52', '#3a7e22']
    }));
    
    // Grass block (side)
    textures[blockGrassSide] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#8b6b3e',
        noise: 4,
        colors: ['#7b5b2e', '#9b7b4e', '#6b5b1e']
    }));
    
    // Dirt
    textures[blockDirt] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#8b6b3e',
        noise: 5,
        colors: ['#7b5b2e', '#9b7b4e', '#6b5b1e']
    }));
    
    // Stone
    textures[blockStone] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#808080',
        noise: 4,
        colors: ['#707070', '#909090', '#606060']
    }));
    
    // Wood (log side)
    textures[blockWoodSide] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#6b4f2f',
        noise: 3,
        colors: ['#5b3f1f', '#7b5f3f']
    }));
    
    // Wood (top)
    textures[blockWoodTop] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#8b6f4f',
        noise: 2,
        colors: ['#7b5f3f', '#9b7f5f']
    }));
    
    // Leaves
    textures[blockLeaves] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#3a7a2a',
        noise: 6,
        colors: ['#2a6a1a', '#4a8a3a', '#1a5a0a']
    }));
    
    // Sand
    textures[blockSand] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#d2b48c',
        noise: 4,
        colors: ['#c2a47c', '#e2c49c', '#b2946c']
    }));
    
    // Water
    textures[blockWater] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#4a90d9',
        noise: 2,
        colors: ['#3a80c9', '#5aa0e9']
    }));
    
    // Cobblestone
    textures[blockCobblestone] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#707070',
        noise: 5,
        colors: ['#606060', '#808080', '#505050']
    }));
    
    // Planks
    textures[blockPlanks] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#b8860b',
        noise: 3,
        colors: ['#a8760b', '#c8961b']
    }));
    
    // Brick
    textures[blockBrick] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#b22222',
        noise: 2,
        colors: ['#a21212', '#c23232']
    }));
    
    // Snow
    textures[blockSnow] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#f0f0f0',
        noise: 2,
        colors: ['#e0e0e0', '#ffffff']
    }));
    
    // Glass
    textures[blockGlass] = new THREE.CanvasTexture(createTextureCanvas({
        base: '#a0d8ef',
        noise: 1,
        colors: ['#90c8df', '#b0e8ff']
    }));
    
    return textures;
}

// ==================== WORLD GENERATION ====================
class Chunk {
    constructor(x, z) {
        this.x = x;
        this.z = z;
        this.blocks = new Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE).fill(BLOCK_AIR);
        this.generated = false;
        this.mesh = null;
    }
    
    getIndex(x, y, z) {
        return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
    }
    
    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            return BLOCK_AIR;
        }
        return this.blocks[this.getIndex(x, y, z)];
    }
    
    setBlock(x, y, z, blockId) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
            return;
        }
        this.blocks[this.getIndex(x, y, z)] = blockId;
    }
    
    generate(terrainSeed) {
        // Simple terrain generation
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                // Height calculation using pseudo-random
                const height = Math.floor(Math.sin(x * 0.1 + terrainSeed) * 3 + Math.cos(z * 0.1 + terrainSeed) * 3 + 20);
                
                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    let block = BLOCK_AIR;
                    
                    if (y < height - 4) {
                        block = BLOCK_STONE;
                    } else if (y < height) {
                        block = BLOCK_DIRT;
                    } else if (y === height) {
                        block = BLOCK_GRASS;
                    }
                    
                    // Water at low levels
                    if (y < 8 && block === BLOCK_AIR) {
                        block = BLOCK_WATER;
                    }
                    
                    this.setBlock(x, y, z, block);
                }
            }
        }
        
        // Generate trees
        for (let i = 0; i < 3; i++) {
            const tx = Math.floor(Math.random() * CHUNK_SIZE);
            const tz = Math.floor(Math.random() * CHUNK_SIZE);
            const treeHeight = 4 + Math.floor(Math.random() * 3);
            
            // Find surface height
            let surfaceY = CHUNK_HEIGHT - 1;
            while (surfaceY > 0 && this.getBlock(tx, surfaceY, tz) === BLOCK_AIR) {
                surfaceY--;
            }
            
            if (surfaceY > 0 && this.getBlock(tx, surfaceY, tz) === BLOCK_GRASS) {
                // Tree trunk
                for (let y = 0; y < treeHeight; y++) {
                    this.setBlock(tx, surfaceY + y, tz, BLOCK_WOOD);
                }
                
                // Leaves
                for (let lx = -2; lx <= 2; lx++) {
                    for (let lz = -2; lz <= 2; lz++) {
                        for (let ly = treeHeight - 2; ly <= treeHeight + 1; ly++) {
                            if (Math.abs(lx) + Math.abs(lz) < 3 || ly === treeHeight + 1) {
                                if (this.getBlock(tx + lx, surfaceY + ly, tz + lz) === BLOCK_AIR) {
                                    this.setBlock(tx + lx, surfaceY + ly, tz + lz, BLOCK_LEAVES);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        this.generated = true;
    }
}

class World {
    constructor() {
        this.chunks = new Map();
        this.textureMap = generateBlockTextures();
        this.blockMaterials = {};
        this.createBlockMaterials();
    }
    
    createBlockMaterials() {
        // Create materials for each block type
        const materialCache = {};
        
        // Grass block - different materials for each face
        const grassTop = new THREE.MeshLambertMaterial({ map: this.textureMap[blockGrassTop] });
        const grassSide = new THREE.MeshLambertMaterial({ map: this.textureMap[blockGrassSide] });
        const dirt = new THREE.MeshLambertMaterial({ map: this.textureMap[blockDirt] });
        
        // Create grass block material array (top, bottom, sides)
        this.blockMaterials[BLOCK_GRASS] = [grassSide, grassSide, grassTop, dirt, grassSide, grassSide];
        
        // Dirt
        this.blockMaterials[BLOCK_DIRT] = new THREE.MeshLambertMaterial({ map: this.textureMap[blockDirt] });
        
        // Stone
        this.blockMaterials[BLOCK_STONE] = new THREE.MeshLambertMaterial({ map: this.textureMap[blockStone] });
        
        // Wood - side and top
        const woodSide = new THREE.MeshLambertMaterial({ map: this.textureMap[blockWoodSide] });
        const woodTop = new THREE.MeshLambertMaterial({ map: this.textureMap[blockWoodTop] });
        this.blockMaterials[BLOCK_WOOD] = [woodSide, woodSide, woodTop, woodTop, woodSide, woodSide];
        
        // Leaves
        this.blockMaterials[BLOCK_LEAVES] = new THREE.MeshLambertMaterial({ 
            map: this.textureMap[blockLeaves],
            transparent: true,
            opacity: 0.9
        });
        
        // Sand
        this.blockMaterials[BLOCK_SAND] = new THREE.MeshLambertMaterial({ map: this.textureMap[blockSand] });
        
        // Water
        this.blockMaterials[BLOCK_WATER] = new THREE.MeshLambertMaterial({ 
            map: this.textureMap[blockWater],
            transparent: true,
            opacity: 0.7
        });
        
        // Cobblestone
        this.blockMaterials[BLOCK_COBBLESTONE] = new THREE.MeshLambertMaterial({ map: this.textureMap[blockCobblestone] });
        
        // Planks
        this.blockMaterials[BLOCK_PLANKS] = new THREE.MeshLambertMaterial({ map: this.textureMap[blockPlanks] });
        
        // Brick
        this.blockMaterials[BLOCK_BRICK] = new THREE.MeshLambertMaterial({ map: this.textureMap[blockBrick] });
        
        // Snow
        this.blockMaterials[BLOCK_SNOW] = new THREE.MeshLambertMaterial({ map: this.textureMap[blockSnow] });
        
        // Glass
        this.blockMaterials[BLOCK_GLASS] = new THREE.MeshLambertMaterial({ 
            map: this.textureMap[blockGlass],
            transparent: true,
            opacity: 0.3
        });
    }
    
    getChunkKey(x, z) {
        return `${x},${z}`;
    }
    
    getChunk(x, z) {
        const key = this.getChunkKey(x, z);
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(x, z);
            chunk.generate(x * 1000 + z * 1000);
            this.chunks.set(key, chunk);
        }
        return this.chunks.get(key);
    }
    
    getBlock(x, y, z) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunk = this.getChunk(chunkX, chunkZ);
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;
        return chunk.getBlock(localX, y, localZ);
    }
    
    setBlock(x, y, z, blockId) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const chunk = this.getChunk(chunkX, chunkZ);
        const localX = x - chunkX * CHUNK_SIZE;
        const localZ = z - chunkZ * CHUNK_SIZE;
        chunk.setBlock(localX, y, localZ, blockId);
    }
}

// ==================== PLAYER ====================
class Player {
    constructor(world) {
        this.world = world;
        this.position = new THREE.Vector3(0, 30, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Vector2(0, 0);
        this.onGround = false;
        this.selectedBlock = BLOCK_GRASS;
        this.inventory = {
            [BLOCK_GRASS]: 64,
            [BLOCK_DIRT]: 64,
            [BLOCK_STONE]: 64,
            [BLOCK_WOOD]: 64,
            [BLOCK_PLANKS]: 64,
            [BLOCK_COBBLESTONE]: 64,
            [BLOCK_BRICK]: 64,
            [BLOCK_SAND]: 64,
            [BLOCK_GLASS]: 32
        };
    }
    
    update(delta, keys, mouseDelta) {
        const speed = keys.shift ? 8 : 4;
        const moveSpeed = speed * delta;
        
        // Reset velocity
        this.velocity.x = 0;
        this.velocity.z = 0;
        
        // Movement
        const forward = new THREE.Vector3(-Math.sin(this.rotation.y), 0, -Math.cos(this.rotation.y));
        const right = new THREE.Vector3(Math.cos(this.rotation.y), 0, -Math.sin(this.rotation.y));
        
        if (keys.w) {
            this.velocity.add(forward.clone().multiplyScalar(moveSpeed));
        }
        if (keys.s) {
            this.velocity.add(forward.clone().multiplyScalar(-moveSpeed));
        }
        if (keys.a) {
            this.velocity.add(right.clone().multiplyScalar(-moveSpeed));
        }
        if (keys.d) {
            this.velocity.add(right.clone().multiplyScalar(moveSpeed));
        }
        
        // Jump
        if (keys.space && this.onGround) {
            this.velocity.y = 8;
            this.onGround = false;
        }
        
        // Apply gravity
        this.velocity.y -= 20 * delta;
        
        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        
        // Collision detection
        this.checkCollision();
        
        // Rotation
        this.rotation.x -= mouseDelta.y * 0.002;
        this.rotation.y -= mouseDelta.x * 0.002;
        this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));
    }
    
    checkCollision() {
        const x = Math.floor(this.position.x);
        const y = Math.floor(this.position.y);
        const z = Math.floor(this.position.z);
        
        // Check if below is solid
        const belowBlock = this.world.getBlock(x, y - 1, z);
        if (belowBlock !== BLOCK_AIR && belowBlock !== BLOCK_WATER) {
            this.position.y = y;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        // Simple floor collision
        if (this.position.y < -10) {
            this.position.y = 30;
            this.velocity.y = 0;
        }
    }
    
    getLookTarget(distance = 5) {
        const direction = new THREE.Vector3(
            -Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
            Math.sin(this.rotation.x),
            -Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
        );
        return this.position.clone().add(direction.multiplyScalar(distance));
    }
}

// ==================== RENDERER ====================
class GameRenderer {
    constructor(world, player) {
        this.world = world;
        this.player = player;
        
        // Three.js setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 150);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        document.body.appendChild(this.renderer.domElement);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        this.scene.add(directionalLight);
        
        // Chunk mesh cache
        this.chunkMeshes = new Map();
        
        // Block geometry cache
        this.geometryCache = new THREE.BoxGeometry(1, 1, 1);
        
        // Start rendering loop
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        
        this.animate();
    }
    
    updateCamera() {
        this.camera.position.copy(this.player.position);
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.player.rotation.y;
        this.camera.rotation.x = this.player.rotation.x;
    }
    
    updateChunks() {
        const playerChunkX = Math.floor(this.player.position.x / CHUNK_SIZE);
        const playerChunkZ = Math.floor(this.player.position.z / CHUNK_SIZE);
        
        // Load chunks in render distance
        const chunksToRemove = new Set(this.chunkMeshes.keys());
        
        for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
            for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
                const chunkX = playerChunkX + dx;
                const chunkZ = playerChunkZ + dz;
                const key = `${chunkX},${chunkZ}`;
                
                chunksToRemove.delete(key);
                
                if (!this.chunkMeshes.has(key)) {
                    this.createChunkMesh(chunkX, chunkZ);
                }
            }
        }
        
        // Remove distant chunks
        for (const key of chunksToRemove) {
            const mesh = this.chunkMeshes.get(key);
            if (mesh) {
                this.scene.remove(mesh);
                mesh.geometry.dispose();
                this.chunkMeshes.delete(key);
            }
        }
    }
    
    createChunkMesh(chunkX, chunkZ) {
        const chunk = this.world.getChunk(chunkX, chunkZ);
        const geometries = {};
        
        // Collect blocks by type
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const block = chunk.getBlock(x, y, z);
                    if (block === BLOCK_AIR) continue;
                    
                    // Only render blocks that are visible (have an air neighbor)
                    if (!this.isBlockVisible(chunk, x, y, z)) continue;
                    
                    const key = block;
                    if (!geometries[key]) {
                        geometries[key] = [];
                    }
                    
                    geometries[key].push({ x, y, z });
                }
            }
        }
        
        // Create meshes for each block type
        const group = new THREE.Group();
        
        for (const [blockId, positions] of Object.entries(geometries)) {
            const material = this.world.blockMaterials[blockId];
            
            if (material) {
                const mesh = new THREE.Mesh(this.geometryCache, material);
                // We'll use instancing for performance
                const instancedMesh = new THREE.InstancedMesh(
                    this.geometryCache,
                    material,
                    positions.length
                );
                
                const matrix = new THREE.Matrix4();
                positions.forEach((pos, i) => {
                    matrix.setPosition(pos[0] + chunkX * CHUNK_SIZE, pos[1], pos[2] + chunkZ * CHUNK_SIZE);
                    instancedMesh.setMatrixAt(i, matrix);
                });
                
                instancedMesh.count = positions.length;
                group.add(instancedMesh);
            }
        }
        
        this.scene.add(group);
        this.chunkMeshes.set(`${chunkX},${chunkZ}`, group);
    }
    
    isBlockVisible(chunk, x, y, z) {
        // Check all 6 neighbors
        const neighbors = [
            [x+1, y, z], [x-1, y, z],
            [x, y+1, z], [x, y-1, z],
            [x, y, z+1], [x, y, z-1]
        ];
        
        for (const [nx, ny, nz] of neighbors) {
            if (nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_HEIGHT || nz < 0 || nz >= CHUNK_SIZE) {
                // Outside chunk - check adjacent chunk
                const chunkX = Math.floor((nx) / CHUNK_SIZE);
                const chunkZ = Math.floor((nz) / CHUNK_SIZE);
                const adjacentChunk = this.world.getChunk(chunkX, chunkZ);
                const localX = nx - chunkX * CHUNK_SIZE;
                const localZ = nz - chunkZ * CHUNK_SIZE;
                if (adjacentChunk.getBlock(localX, ny, localZ) === BLOCK_AIR) {
                    return true;
                }
            } else {
                if (chunk.getBlock(nx, ny, nz) === BLOCK_AIR) {
                    return true;
                }
            }
        }
        return false;
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const now = performance.now();
        const delta = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        
        // FPS counter
        this.frameCount++;
        if (this.frameCount % 30 === 0) {
            this.fps = Math.round(30 / delta);
            document.getElementById('fps').textContent = `FPS: ${this.fps}`;
        }
        
        this.updateCamera();
        this.updateChunks();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// ==================== INPUT HANDLING ====================
class InputHandler {
    constructor(player, renderer) {
        this.player = player;
        this.renderer = renderer;
        
        this.keys = {};
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseLocked = false;
        
        this.setupInputs();
    }
    
    setupInputs() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Hotbar selection
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                const slot = parseInt(e.code.replace('Digit', '')) - 1;
                this.selectHotbarSlot(slot);
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mouse
        document.addEventListener('mousemove', (e) => {
            if (this.mouseLocked) {
                this.mouseDelta.x = e.movementX || 0;
                this.mouseDelta.y = e.movementY || 0;
            }
        });
        
        document.addEventListener('mousedown', (e) => {
            if (!this.mouseLocked) return;
            
            if (e.button === 0) { // Left click - break block
                this.breakBlock();
            } else if (e.button === 2) { // Right click - place block
                this.placeBlock();
            }
        });
        
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Pointer lock
        document.getElementById('start-btn').addEventListener('click', () => {
            document.getElementById('instructions').style.display = 'none';
            renderer.renderer.domElement.requestPointerLock();
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.mouseLocked = document.pointerLockElement === renderer.renderer.domElement;
        });
    }
    
    selectHotbarSlot(slot) {
        const slots = document.querySelectorAll('.hotbar-slot');
        if (slots[slot]) {
            slots.forEach(s => s.classList.remove('active'));
            slots[slot].classList.add('active');
            
            // Map slot to block type
            const blockTypes = [BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE, BLOCK_WOOD, BLOCK_PLANKS, 
                               BLOCK_COBBLESTONE, BLOCK_BRICK, BLOCK_SAND, BLOCK_GLASS];
            this.player.selectedBlock = blockTypes[slot];
            document.getElementById('block-info').textContent = `Block: ${getBlockName(this.player.selectedBlock)}`;
        }
    }
    
    breakBlock() {
        const target = this.player.getLookTarget(5);
        const x = Math.floor(target.x);
        const y = Math.floor(target.y);
        const z = Math.floor(target.z);
        
        this.player.world.setBlock(x, y, z, BLOCK_AIR);
        this.renderer.createChunkMesh(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE));
    }
    
    placeBlock() {
        const target = this.player.getLookTarget(5);
        const x = Math.floor(target.x);
        const y = Math.floor(target.y);
        const z = Math.floor(target.z);
        
        // Don't place inside player
        const px = Math.floor(this.player.position.x);
        const py = Math.floor(this.player.position.y);
        const pz = Math.floor(this.player.position.z);
        if (x === px && y === py && z === pz) return;
        
        this.player.world.setBlock(x, y, z, this.player.selectedBlock);
        this.renderer.createChunkMesh(Math.floor(x / CHUNK_SIZE), Math.floor(z / CHUNK_SIZE));
    }
    
    update(delta) {
        this.player.update(delta, this.keys, this.mouseDelta);
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        
        // Update coordinates display
        document.getElementById('coords').textContent = 
            `X: ${Math.floor(this.player.position.x)} Y: ${Math.floor(this.player.position.y)} Z: ${Math.floor(this.player.position.z)}`;
    }
}

// ==================== HELPERS ====================
function getBlockName(blockId) {
    const names = {
        [BLOCK_AIR]: 'Air',
        [BLOCK_GRASS]: 'Grass',
        [BLOCK_DIRT]: 'Dirt',
        [BLOCK_STONE]: 'Stone',
        [BLOCK_WOOD]: 'Wood',
        [BLOCK_LEAVES]: 'Leaves',
        [BLOCK_SAND]: 'Sand',
        [BLOCK_WATER]: 'Water',
        [BLOCK_COBBLESTONE]: 'Cobblestone',
        [BLOCK_PLANKS]: 'Planks',
        [BLOCK_BRICK]: 'Brick',
        [BLOCK_SNOW]: 'Snow',
        [BLOCK_GLASS]: 'Glass'
    };
    return names[blockId] || 'Unknown';
}

// ==================== INITIALIZATION ====================
let world, player, renderer, inputHandler;

function init() {
    world = new World();
    player = new Player(world);
    renderer = new GameRenderer(world, player);
    inputHandler = new InputHandler(player, renderer);
    
    // Setup hotbar
    const hotbar = document.getElementById('hotbar');
    const blockTypes = [BLOCK_GRASS, BLOCK_DIRT, BLOCK_STONE, BLOCK_WOOD, BLOCK_PLANKS, 
                       BLOCK_COBBLESTONE, BLOCK_BRICK, BLOCK_SAND, BLOCK_GLASS];
    
    blockTypes.forEach((blockId, index) => {
        const slot = document.createElement('div');
        slot.className = 'hotbar-slot' + (index === 0 ? ' active' : '');
        slot.dataset.block = blockId;
        
        const count = document.createElement('div');
        count.className = 'count';
        count.textContent = player.inventory[blockId] || 0;
        
        slot.appendChild(count);
        slot.addEventListener('click', () => inputHandler.selectHotbarSlot(index));
        
        hotbar.appendChild(slot);
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        renderer.camera.aspect = window.innerWidth / window.innerHeight;
        renderer.camera.updateProjectionMatrix();
        renderer.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Start the game
init();
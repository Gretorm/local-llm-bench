import * as THREE from 'three';
import Noise from '../utils/Noise.js';
import { BLOCK_TYPES, BLOCK_COLORS } from './Voxel.js';

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 32;

class Chunk {
    constructor(chunkX, chunkZ, noise) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
        this.generate(noise);
    }

    getIndex(x, y, z) {
        return x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
    }

    generate(noise) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = this.chunkX * CHUNK_SIZE + x;
                const worldZ = this.chunkZ * CHUNK_SIZE + z;
                
                const height = Math.floor((noise.noise(worldX * 0.05, worldZ * 0.05, 0) + 1) * 10 + 10);
                
                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    let block = BLOCK_TYPES.AIR;
                    if (y < height - 3) block = BLOCK_TYPES.STONE;
                    else if (y < height) block = BLOCK_TYPES.DIRT;
                    else if (y === height) block = BLOCK_TYPES.GRASS;

                    this.data[this.getIndex(x, y, z)] = block;
                }
            }
        }
    }
}

class World {
    constructor(scene, noise) {
        this.scene = scene;
        this.noise = noise;
        this.chunks = new Map();
        this.atlas = null;
        this.uvMap = {};
        this._initAtlas();
    }

    _initAtlas() {
        const size = 64; // 4x4 atlas
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const types = Object.keys(BLOCK_COLORS).map(Number);
        const tileSize = size / 4;

        types.forEach((type, i) => {
            const x = (i % 4) * tileSize;
            const y = Math.floor(i / 4) * tileSize;
            
            // Draw tile
            ctx.fillStyle = BLOCK_COLORS[type];
            ctx.fillRect(x, y, tileSize, tileSize);

            // Add noise
            for (let nx = 0; nx < tileSize; nx++) {
                for (let ny = 0; ny < tileSize; ny++) {
                    const noise = (Math.random() - 0.5) * 30;
                    ctx.fillStyle = `rgba(${noise},${noise},${noise}, 0.1)`;
                    ctx.fillRect(x + nx, y + ny, 1, 1);
                }
            }

            this.uvMap[type] = {
                u: x / size,
                v: y / size,
                s: tileSize / size
            };
        });

        this.atlas = new THREE.CanvasTexture(canvas);
        this.atlas.magFilter = THREE.NearestFilter;
        this.atlas.minFilter = THREE.NearestFilter;
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    getBlockAt(x, y, z) {
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = this.chunks.get(this.getChunkKey(cx, cz));
        if (!chunk) return BLOCK_TYPES.AIR;

        const lx = Math.floor(x) % CHUNK_SIZE;
        const ly = Math.floor(y);
        const lz = Math.floor(z) % CHUNK_SIZE;

        const lx_fixed = (lx + CHUNK_SIZE) % CHUNK_SIZE;
        const lz_fixed = (lz + CHUNK_SIZE) % CHUNK_SIZE;

        if (ly < 0 || ly >= CHUNK_HEIGHT) return BLOCK_TYPES.AIR;

        return chunk.data[chunk.getIndex(lx_fixed, ly, lz_fixed)];
    }

    setBlockAt(x, y, z, blockType) {
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const chunk = this.chunks.get(this.getChunkKey(cx, cz));
        if (!chunk) return;

        const lx = Math.floor(x) % CHUNK_SIZE;
        const ly = Math.floor(y);
        const lz = Math.floor(z) % CHUNK_SIZE;

        const lx_fixed = (lx + CHUNK_SIZE) % CHUNK_SIZE;
        const lz_fixed = (lz + CHUNK_SIZE) % CHUNK_SIZE;

        if (ly < 0 || ly >= CHUNK_HEIGHT) return;

        chunk.data[chunk.getIndex(lx_fixed, ly, lz_fixed)] = blockType;
        this.rebuildChunkMesh(chunk);
    }

    addChunk(cx, cz) {
        const key = this.getChunkKey(cx, cz);
        if (this.chunks.has(key)) return;

        const chunk = new Chunk(cx, cz, this.noise);
        this.chunks.set(key, chunk);
        this.buildChunkMesh(chunk);
    }

    rebuildChunkMesh(chunk) {
        if (chunk.mesh) {
            this.scene.remove(chunk.mesh);
        }
        this.buildChunkMesh(chunk);
    }

    buildChunkMesh(chunk) {
        const positions = [];
        const normals = [];
        const uvs = [];

        const getBlock = (x, y, z) => {
            if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
                return BLOCK_TYPES.AIR;
            }
            return chunk.data[chunk.getIndex(x, y, z)];
        };

        const addFace = (x, y, z, nx, ny, nz, type) => {
            const px = chunk.chunkX * CHUNK_SIZE + x;
            const py = y;
            const pz = chunk.chunkZ * CHUNK_SIZE + z;

            let v = [];
            let uv_coords = [];
            const uvInfo = this.uvMap[type];

            if (nx === 1) { // +X
                v = [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]];
                uv_coords = [[0,0], [0,1], [1,1], [1,0]];
            } else if (nx === -1) { // -X
                v = [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]];
                uv_coords = [[1,0], [1,1], [0,1], [0,0]];
            } else if (ny === 1) { // +Y
                v = [[-0.5, 0.5, -0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5]];
                uv_coords = [[0,1], [1,1], [1,0], [0,0]];
            } else if (ny === -1) { // -Y
                v = [[-0.5, -0.5, 0.5], [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5]];
                uv_coords = [[0,0], [0,1], [1,1], [1,0]];
            } else if (nz === 1) { // +Z
                v = [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]];
                uv_coords = [[0,0], [1,0], [1,1], [0,1]];
            } else if (nz === -1) { // -Z
                v = [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]];
                uv_coords = [[1,0], [0,0], [0,1], [1,1]];
            }

            for (let i = 0; i < 2; i++) {
                const idx = i === 0 ? [0, 1, 2] : [0, 2, 3];
                for (const vi of idx) {
                    positions.push(px + v[vi][0], py + v[vi][1], pz + v[vi][2]);
                    normals.push(nx, ny, nz);
                    uvs.push(uvInfo.u + uv_coords[vi][0] * uvInfo.s, uvInfo.v + uv_coords[vi][1] * uvInfo.s);
                }
            }
        };

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let y = 0; y < CHUNK_HEIGHT; y++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const block = getBlock(x, y, z);
                    if (block === BLOCK_TYPES.AIR) continue;

                    if (getBlock(x, y, z + 1) === BLOCK_TYPES.AIR) addFace(x, y, z, 0, 0, 1, block);
                    if (getBlock(x, y, z - 1) === BLOCK_TYPES.AIR) addFace(x, y, z, 0, 0, -1, block);
                    if (getBlock(x, y + 1, z) === BLOCK_TYPES.AIR) addFace(x, y, z, 0, 1, 0, block);
                    if (getBlock(x, y - 1, z) === BLOCK_TYPES.AIR) addFace(x, y, z, 0, -1, 0, block);
                    if (getBlock(x - 1, y, z) === BLOCK_TYPES.AIR) addFace(x, y, z, -1, 0, 0, block);
                    if (getBlock(x + 1, y, z) === BLOCK_TYPES.AIR) addFace(x, y, z, 1, 0, 0, block);
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        const material = new THREE.MeshLambertMaterial({ map: this.atlas });
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        chunk.mesh = mesh;
    }
}

export default World;

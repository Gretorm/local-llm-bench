import * as THREE from 'three';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk.js';
import { BlockType } from './Block.js';
import { createNoise2D } from 'simplex-noise';

export class World {
    public chunks: Map<string, Chunk> = new Map();
    private scene: THREE.Scene;
    private textures: Map<BlockType, THREE.Texture>;
    private noise: (x: number, y: number) => number;

    constructor(scene: THREE.Scene, textures: Map<BlockType, THREE.Texture>) {
        this.scene = scene;
        this.textures = textures;
        const noiseFn = createNoise2D();
        this.noise = noiseFn;
    }

    private getChunkKey(x: number, z: number): string {
        return `${x},${z}`;
    }

    public generateChunk(cx: number, cz: number) {
        const key = this.getChunkKey(cx, cz);
        if (this.chunks.has(key)) return;

        const chunk = new Chunk(cx, cz);
        
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = cx * CHUNK_SIZE + x;
                const worldZ = cz * CHUNK_SIZE + z;
                
                const noiseVal = this.noise(worldX * 0.05, worldZ * 0.05);
                const height = Math.floor((noiseVal + 1) * 15) + 10;

                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    if (y < height) {
                        let type = BlockType.Stone;
                        if (y === height - 1) type = BlockType.Grass;
                        else if (y > height - 4) type = BlockType.Dirt;
                        
                        chunk.setBlock(x, y, z, type);
                    } else {
                        chunk.setBlock(x, y, z, BlockType.Air);
                    }
                }
            }
        }

        this.chunks.set(key, chunk);
        chunk.generateMesh(this.scene, this.textures);
    }

    public update(camera: THREE.Camera) {
        const cx = Math.floor(camera.position.x / CHUNK_SIZE);
        const cz = Math.floor(camera.position.z / CHUNK_SIZE);

        for (let x = cx - 2; x <= cx + 2; x++) {
            for (let z = cz - 2; z <= cz + 2; z++) {
                this.generateChunk(x, z);
            }
        }
    }
}

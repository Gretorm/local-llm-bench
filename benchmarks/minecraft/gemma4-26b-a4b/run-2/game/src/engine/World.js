import * as THREE from 'three';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk';
import { BlockType } from './Block';
import { createNoise2D } from 'simplex-noise';
export class World {
    chunks = new Map();
    scene;
    textures;
    noise;
    constructor(scene, textures) {
        this.scene = scene;
        this.textures = textures;
        this.noise = createNoise2D();
    }
    getChunkKey(x, z) {
        return `${x},${z}`;
    }
    generateChunk(cx, cz) {
        const key = this.getChunkKey(cx, cz);
        if (this.chunks.has(key))
            return;
        const chunk = new Chunk(cx, cz, this.scene);
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = cx * CHUNK_SIZE + x;
                const worldZ = cz * CHUNK_SIZE + z;
                // Use noise to determine height
                const noiseVal = this.noise(worldX * 0.05, worldZ * 0.05);
                const height = Math.floor((noiseVal + 1) * 15) + 10; // height between 10 and 40
                for (let y = 0; y < CHUNK_HEIGHT; y++) {
                    if (y < height) {
                        let type = BlockType.Stone;
                        if (y === height - 1)
                            type = BlockType.Grass;
                        else if (y > height - 4)
                            type = BlockType.Dirt;
                        chunk.setBlock(x, y, z, type);
                    }
                    else {
                        chunk.setBlock(x, y, z, BlockType.Air);
                    }
                }
            }
        }
        this.chunks.set(key, chunk);
        chunk.generateMesh(this.scene, this.textures);
    }
    update(camera) {
        // In a real game, we'd load chunks around the camera
        const cx = Math.floor(camera.position.x / CHUNK_SIZE);
        const cz = Math.floor(camera.position.z / CHUNK_SIZE);
        for (let x = cx - 2; x <= cx + 2; x++) {
            for (let z = cz - 2; z <= cz + 2; z++) {
                this.generateChunk(x, z);
            }
        }
    }
}
//# sourceMappingURL=World.js.map
import * as THREE from 'three';
import { Chunk } from './Chunk';
import { BlockType } from './Block';
export declare class World {
    chunks: Map<string, Chunk>;
    private scene;
    private textures;
    private noise;
    constructor(scene: THREE.Scene, textures: Map<BlockType, THREE.Texture>);
    private getChunkKey;
    generateChunk(cx: number, cz: number): void;
    update(camera: THREE.Camera): void;
}
//# sourceMappingURL=World.d.ts.map
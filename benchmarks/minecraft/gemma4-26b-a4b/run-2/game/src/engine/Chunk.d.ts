import * as THREE from 'three';
import { BlockType } from './Block';
export declare const CHUNK_SIZE = 16;
export declare const CHUNK_HEIGHT = 64;
export declare class Chunk {
    data: Uint8Array;
    mesh: THREE.Mesh | null;
    position: THREE.Vector3;
    constructor(x: number, z: number);
    setBlock(x: number, y: number, z: number, type: BlockType): void;
    getBlock(x: number, y: number, z: number): BlockType;
    generateMesh(scene: THREE.Scene, textures: Map<BlockType, THREE.Texture>): void;
    dispose(): void;
}
//# sourceMappingURL=Chunk.d.ts.map
import * as THREE from 'three';
import { BlockType } from './Block.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
    public data: Uint8Array;
    public mesh: THREE.Mesh | null = null;
    public position: THREE.Vector3;

    constructor(x: number, z: number) {
        this.position = new THREE.Vector3(x * CHUNK_SIZE, 0, z * CHUNK_SIZE);
        this.data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    }

    public setBlock(x: number, y: number, z: number, type: BlockType) {
        if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
            const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
            this.data[index] = type;
        }
    }

    public getBlock(x: number, y: number, z: number): BlockType {
        if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
            const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
            return this.data[index] as BlockType;
        }
        return BlockType.Air;
    }

    public generateMesh(scene: THREE.Scene, textures: Map<BlockType, THREE.Texture>) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            } else {
                this.mesh.material.dispose();
            }
        }

        const positions: number[] = [];
        const normals: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];
        const colorData: number[] = [];

        const faceOffsets = [
            [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], // Top
            [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]], // Bottom
            [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], // Left
            [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]], // Right
            [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], // Front
            [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], // Back
        ];

        const colors: Map<BlockType, THREE.Color> = new Map([
            [BlockType.Grass, new THREE.Color(0x4caf50)],
            [BlockType.Dirt, new THREE.Color(0x8b4513)],
            [BlockType.Stone, new THREE.Color(0x808080)],
            [BlockType.OakLog, new THREE.Color(0x5d4037)],
            [BlockType.OakLeaves, new THREE.Color(0x2e7d32)],
        ]);

        const addFaceWithColor = (x: number, y: number, z: number, faceIndex: number, type: BlockType, color: THREE.Color) => {
            const faceVertices = faceOffsets[faceIndex];
            const startIndex = positions.length / 3;

            for (const v of faceVertices) {
                positions.push(x + v[0], y + v[1], z + v[2]);
                
                // Normals
                if (faceIndex === 0) normals.push(0, 1, 0);
                else if (faceIndex === 1) normals.push(0, -1, 0);
                else if (faceIndex === 2) normals.push(-1, 0, 0);
                else if (faceIndex === 3) normals.push(1, 0, 0);
                else if (faceIndex === 4) normals.push(0, 0, 1);
                else if (faceIndex === 5) normals.push(0, 0, -1);

                uvs.push(v[0], v[2]);
                colorData.push(color.r, color.g, color.b);
            }

            indices.push(startIndex, startIndex + 1, startIndex + 2);
            indices.push(startIndex, startIndex + 2, startIndex + 3);
        };

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const type = this.getBlock(x, y, z);
                    if (type === BlockType.Air) continue;

                    const color = colors.get(type) || new THREE.Color(0xffffff);

                    if (this.getBlock(x, y + 1, z) === BlockType.Air) addFaceWithColor(x, y, z, 0, type, color);
                    if (this.getBlock(x, y - 1, z) === BlockType.Air) addFaceWithColor(x, y, z, 1, type, color);
                    if (this.getBlock(x - 1, y, z) === BlockType.Air) addFaceWithColor(x, y, z, 2, type, color);
                    if (this.getBlock(x + 1, y, z) === BlockType.Air) addFaceWithColor(x, y, z, 3, type, color);
                    if (this.getBlock(x, y, z + 1) === BlockType.Air) addFaceWithColor(x, y, z, 4, type, color);
                    if (this.getBlock(x, y, z - 1) === BlockType.Air) addFaceWithColor(x, y, z, 5, type, color);
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorData, 3));
        geometry.setIndex(indices);

        const material = new THREE.MeshLambertMaterial({ vertexColors: true });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
    }

    public dispose() {
        if (this.mesh) {
            this.mesh.parent?.remove(this.mesh);
            this.mesh.geometry.dispose();
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(m => m.dispose());
            } else {
                this.mesh.material.dispose();
            }
        }
    }
}

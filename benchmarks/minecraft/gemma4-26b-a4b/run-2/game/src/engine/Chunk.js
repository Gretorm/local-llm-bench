import * as THREE from 'three';
import { BlockType } from './Block';
export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export class Chunk {
    data;
    mesh = null;
    position;
    constructor(x, z) {
        this.position = new THREE.Vector3(x * CHUNK_SIZE, 0, z * CHUNK_SIZE);
        this.data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    }
    setBlock(x, y, z, type) {
        if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
            const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
            this.data[index] = type;
        }
    }
    getBlock(x, y, z) {
        if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_SIZE) {
            const index = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_HEIGHT;
            return this.data[index];
        }
        return BlockType.Air;
    }
    generateMesh(scene, textures) {
        if (this.mesh) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        const materialTypes = [];
        // Helper to add a face
        const addFace = (x, y, z, face, type) => {
            const offset = [
                // 0: Top, 1: Bottom, 2: Left, 3: Right, 4: Front, 5: Back
                [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], // Top
                [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]], // Bottom
                [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], // Left
                [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]], // Right
                [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], // Front
                [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], // Back
            ];
            const faceVertices = offset[face];
            const startIndex = positions.length / 3;
            for (const v of faceVertices) {
                positions.push(x + v[0], y + v[1], z + v[2]);
                // Normal (simplified)
                if (face === 0)
                    normals.push(0, 1, 0);
                else if (face === 1)
                    normals.push(0, -1, 0);
                else if (face === 2)
                    normals.push(-1, 0, 0);
                else if (face === 3)
                    normals.push(1, 0, 0);
                else if (face === 4)
                    normals.push(0, 0, 1);
                else if (face === 5)
                    normals.push(0, 0, -1);
                // UVs
                const uvX = v[0];
                const uvZ = v[2];
                // This is a bit of a hack, we should calculate UVs properly based on face
                // For now, just use simple UVs
                uvs.push(uvX, uvZ);
            }
            indices.push(startIndex, startIndex + 1, startIndex + 2);
            indices.push(startIndex, startIndex + 2, startIndex + 3);
            materialTypes.push(type);
        };
        // This is still not quite right for multiple textures in one mesh.
        // I'll use a simpler approach: one mesh per block type per chunk.
        // Or just use one big BufferGeometry and vertex colors.
        // For simplicity and to follow "Minecraft-like", I'll use Vertex Colors for now,
        // then upgrade to textures.
        const colorData = [];
        const addFaceWithColor = (x, y, z, face, type, color) => {
            const offset = [
                [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], // Top
                [[0, 0, 1], [1, 0, 1], [1, 0, 0], [0, 0, 0]], // Bottom
                [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], // Left
                [[1, 0, 1], [1, 1, 1], [1, 1, 0], [1, 0, 0]], // Right
                [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], // Front
                [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], // Back
            ];
            const faceVertices = offset[face];
            const startIndex = positions.length / 3;
            for (const v of faceVertices) {
                positions.push(x + v[0], y + v[1], z + v[2]);
                if (face === 0)
                    normals.push(0, 1, 0);
                else if (face === 1)
                    normals.push(0, -1, 0);
                else if (face === 2)
                    normals.push(-1, 0, 0);
                else if (face === 3)
                    normals.push(1, 0, 0);
                else if (face === 4)
                    normals.push(0, 0, 1);
                else if (face === 5)
                    normals.push(0, 0, -1);
                uvs.push(v[0], v[2]);
                colorData.push(color.r, color.g, color.b);
            }
            indices.push(startIndex, startIndex + 1, startIndex + 2);
            indices.push(startIndex, startIndex + 2, startIndex + 3);
        };
        const colors = new Map([
            [BlockType.Grass, new THREE.Color(0x4caf50)],
            [BlockType.Dirt, new THREE.Color(0x8b4513)],
            [BlockType.Stone, new THREE.Color(0x808080)],
            [BlockType.OakLog, new THREE.Color(0x5d4037)],
            [BlockType.OakLeaves, new THREE.Color(0x2e7d32)],
        ]);
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                for (let z = 0; z < CHUNK_SIZE; z++) {
                    const type = this.getBlock(x, y, z);
                    if (type === BlockType.Air)
                        continue;
                    const color = colors.get(type) || new THREE.Color(0xffffff);
                    // Check neighbors to decide if we should draw a face
                    // Top
                    if (this.getBlock(x, y + 1, z) === BlockType.Air)
                        addFaceWithColor(x, y, z, 0, type, color);
                    // Bottom
                    if (this.getBlock(x, y - 1, z) === BlockType.Air)
                        addFaceWithColor(x, y, z, 1, type, color);
                    // Left
                    if (this.getBlock(x - 1, y, z) === BlockType.Air)
                        addFaceWithColor(x, y, z, 2, type, color);
                    // Right
                    if (this.getBlock(x + 1, y, z) === BlockType.Air)
                        addFaceWithColor(x, y, z, 3, type, color);
                    // Front
                    if (this.getBlock(x, y, z + 1) === BlockType.Air)
                        addFaceWithColor(x, y, z, 4, type, color);
                    // Back
                    if (this.getBlock(x, y, z - 1) === BlockType.Air)
                        addFaceWithColor(x, y, z, 5, type, color);
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
    dispose() {
        if (this.mesh) {
            this.mesh.parent?.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
    }
}
//# sourceMappingURL=Chunk.js.map
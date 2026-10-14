import * as THREE from 'three';

export function createBlockTexture(color) {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Add noise/texture
    for (let i = 0; i < size * size; i++) {
        const x = i % size;
        const y = Math.floor(i / size);
        const noise = (Math.random() - 0.5) * 40;
        ctx.fillStyle = `rgba(${noise},${noise},${noise}, 0.2)`;
        ctx.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
}

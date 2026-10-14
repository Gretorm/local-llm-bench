import * as THREE from 'three';
import Noise from './utils/Noise.js';
import World from './engine/World.js';
import Player from './engine/Player.js';
import { BLOCK_TYPES } from './engine/Voxel.js';

// Initialization
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

// Lighting
const ambientLight = new THREE.AmbientLight(0xcccccc, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10).normalize();
scene.add(directionalLight);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 25, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Core Systems
const noise = new Noise();
const world = new World(scene, noise);
const player = new Player(camera, renderer.domElement, scene);

// Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);

window.addEventListener('mousedown', (event) => {
    if (!player.controls.isLocked) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersect = intersects[0];
        const pos = intersect.point.clone();

        if (event.button === 0) { // Left click: Break
            pos.sub(intersect.face.normal.clone().multiplyScalar(0.1));
            world.setBlockAt(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), BLOCK_TYPES.AIR);
        } else if (event.button === 2) { // Right click: Place
            pos.add(intersect.face.normal.clone().multiplyScalar(0.1));
            world.setBlockAt(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z), BLOCK_TYPES.GRASS);
        }
    }
});

window.addEventListener('contextmenu', (e) => e.preventDefault());

// Infinite world generation
function updateChunks() {
    const px = Math.floor(camera.position.x / 16);
    const pz = Math.floor(camera.position.z / 16);
    const viewDistance = 3;

    for (let x = px - viewDistance; x <= px + viewDistance; x++) {
        for (let z = pz - viewDistance; z <= pz + viewDistance; z++) {
            world.addChunk(x, z);
        }
    }
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    player.update(delta);
    updateChunks();

    // Basic Floor Collision
    const px = camera.position.x;
    const py = camera.position.y - 1.6; // Player height offset
    const pz = camera.position.z;
    
    const blockBelow = world.getBlockAt(px, py, pz);
    if (blockBelow !== BLOCK_TYPES.AIR) {
        player.velocity.y = 0;
        camera.position.y = Math.floor(py) + 1 + 1.6;
        player.canJump = true;
    } else {
        player.canJump = false;
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

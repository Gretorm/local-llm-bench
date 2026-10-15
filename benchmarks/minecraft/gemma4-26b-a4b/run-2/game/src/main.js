import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { World } from './engine/World';
import { Player } from './engine/Player';
import { BlockType } from './engine/Block';
// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 20, 100);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(8, 30, 8); // Start above ground
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);
// Game components
const textures = new Map();
const world = new World(scene, textures);
const player = new Player(camera);
// Controls
const controls = new PointerLockControls(camera, document.body);
document.body.addEventListener('click', () => {
    controls.lock();
});
controls.addEventListener('lock', () => {
    // UI update if needed
});
controls.addEventListener('unlock', () => {
    // UI update if needed
});
// To allow the player movement to work with PointerLockControls
// we need to update the camera's orientation based on mouse movement
// which PointerLockControls already does.
// However, the player.update() uses the camera.quaternion for movement direction.
// Main loop
function animate() {
    requestAnimationFrame(animate);
    if (controls.isLocked) {
        player.update();
        world.update(camera);
    }
    renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
animate();
//# sourceMappingURL=main.js.map
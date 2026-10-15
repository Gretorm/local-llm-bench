import * as THREE from 'three';
export class Player {
    camera;
    velocity = new THREE.Vector3();
    speed = 0.1;
    jumpStrength = 0.15;
    gravity = 0.008;
    isGrounded = false;
    keys = {};
    constructor(camera) {
        this.camera = camera;
        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }
    update() {
        // Basic movement
        const direction = new THREE.Vector3();
        if (this.keys['KeyW'])
            direction.z -= 1;
        if (this.keys['KeyS'])
            direction.z += 1;
        if (this.keys['KeyA'])
            direction.x -= 1;
        if (this.keys['KeyD'])
            direction.x += 1;
        direction.normalize().applyQuaternion(this.camera.quaternion);
        direction.y = 0; // Keep movement on horizontal plane
        direction.normalize();
        this.camera.position.addScaledVector(direction, this.speed);
        // Gravity
        this.velocity.y -= this.gravity;
        this.camera.position.y += this.velocity.y;
        // Simple ground collision (very primitive)
        if (this.camera.position.y < 20) {
            this.camera.position.y = 20;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
        else {
            this.isGrounded = false;
        }
        if (this.keys['Space'] && this.isGrounded) {
            this.velocity.y = this.jumpStrength;
            this.isGrounded = false;
        }
    }
}
//# sourceMappingURL=Player.js.map
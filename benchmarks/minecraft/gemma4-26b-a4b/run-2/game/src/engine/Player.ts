import * as THREE from 'three';

export class Player {
    public camera: THREE.PerspectiveCamera;
    private velocity: THREE.Vector3 = new THREE.Vector3();
    private speed: number = 0.1;
    private jumpStrength: number = 0.15;
    private gravity: number = 0.008;
    private isGrounded: boolean = false;

    private keys: { [key: string]: boolean } = {};

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera;

        window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    }

    public update() {
        const direction = new THREE.Vector3();
        if (this.keys['KeyW']) direction.z -= 1;
        if (this.keys['KeyS']) direction.z += 1;
        if (this.keys['KeyA']) direction.x -= 1;
        if (this.keys['KeyD']) direction.x += 1;

        direction.normalize().applyQuaternion(this.camera.quaternion);
        direction.y = 0;
        direction.normalize();

        this.camera.position.addScaledVector(direction, this.speed);

        this.velocity.y -= this.gravity;
        this.camera.position.y += this.velocity.y;

        if (this.camera.position.y < 20) {
            this.camera.position.y = 20;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        if (this.keys['Space'] && this.isGrounded) {
            this.velocity.y = this.jumpStrength;
            this.isGrounded = false;
        }
    }
}

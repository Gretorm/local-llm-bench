import * as THREE from 'three';
export declare class Player {
    camera: THREE.PerspectiveCamera;
    private velocity;
    private speed;
    private jumpStrength;
    private gravity;
    private isGrounded;
    private keys;
    constructor(camera: THREE.PerspectiveCamera);
    update(): void;
}
//# sourceMappingURL=Player.d.ts.map
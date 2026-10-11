import * as THREE from 'three';
export class SpectatorCamera {
  keys = new Set<string>();
  position = new THREE.Vector3(0, 14, 20);
  yaw = Math.PI;
  pitch = 0.25;
  active = false;
  constructor(readonly canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('mousemove', this.mouse);
    window.addEventListener('mousedown', this.click);
  }
  down = (e: KeyboardEvent) => {
    if (!this.active || (e.target as HTMLElement).closest('input,button'))
      return;
    this.keys.add(e.code);
  };
  up = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  mouse = (e: MouseEvent) => {
    if (!this.active || document.pointerLockElement !== this.canvas) return;
    this.yaw -= e.movementX * 0.002;
    this.pitch = Math.max(
      -1.2,
      Math.min(1.2, this.pitch + e.movementY * 0.002),
    );
  };
  click = (e: MouseEvent) => {
    if (
      this.active &&
      !(e.target as HTMLElement).closest('button,input,.panel')
    )
      void this.canvas.requestPointerLock().catch(() => {});
  };
  update(camera: THREE.PerspectiveCamera, dt: number) {
    const forward =
        Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')),
      right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      up = Number(this.keys.has('KeyE')) - Number(this.keys.has('KeyQ'));
    this.position.x +=
      (Math.sin(this.yaw) * forward - Math.cos(this.yaw) * right) * dt * 12;
    this.position.z +=
      (Math.cos(this.yaw) * forward + Math.sin(this.yaw) * right) * dt * 12;
    this.position.y = Math.max(1, Math.min(60, this.position.y + up * dt * 12));
    this.position.x = Math.max(-44, Math.min(44, this.position.x));
    this.position.z = Math.max(-44, Math.min(44, this.position.z));
    camera.position.copy(this.position);
    camera.lookAt(
      this.position
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(this.yaw),
            -this.pitch,
            Math.cos(this.yaw),
          ),
        ),
    );
  }
  dispose() {
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('mousemove', this.mouse);
    window.removeEventListener('mousedown', this.click);
  }
}

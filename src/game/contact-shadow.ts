import * as THREE from 'three';
let shadowTexture: THREE.CanvasTexture | undefined;
export function contactShadow(killer: boolean) {
  if (!shadowTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!,
      gradient = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(0,0,0,.55)');
    gradient.addColorStop(0.45, 'rgba(0,0,0,.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    shadowTexture = new THREE.CanvasTexture(canvas);
  }
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(killer ? 1.15 : 0.85, 0.72),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  shadow.name = 'contact-shadow';
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  return shadow;
}

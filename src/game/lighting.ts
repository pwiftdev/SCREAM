import * as THREE from 'three';
import { gateLanterns, wallLamps } from './light-layout';

export class WorldLighting {
  moon = new THREE.DirectionalLight('#b1c5e0', 1.45);
  fire = new THREE.PointLight('#ffad61', 50, 19, 2);
  infirmary = new THREE.SpotLight('#abc5b5', 34, 11, Math.PI * 0.46, 0.6, 2);
  portrait = new THREE.SpotLight('#ffcf9a', 22, 9, Math.PI / 5, 0.8, 2);
  private offset = new THREE.Vector3(-20, 45, -25);
  private right = new THREE.Vector3()
    .crossVectors(this.offset, new THREE.Vector3(0, 1, 0))
    .normalize();
  private up = new THREE.Vector3()
    .crossVectors(this.right, this.offset)
    .normalize();

  constructor(scene: THREE.Scene) {
    scene.add(new THREE.HemisphereLight('#a7bcd7', '#323025', 0.34));
    this.moon.castShadow = true;
    Object.assign(this.moon.shadow.camera, {
      left: -20,
      right: 20,
      top: 20,
      bottom: -20,
      near: 1,
      far: 130,
    });
    this.moon.shadow.bias = -0.00025;
    this.moon.shadow.normalBias = 0.035;
    this.fire.position.set(-4, 2, 30);
    this.infirmary.position.set(-13, 3.04, -27.4);
    this.infirmary.target.position.set(-12.5, 0, -26.4);
    this.infirmary.castShadow = true;
    this.infirmary.shadow.bias = -0.0002;
    this.infirmary.shadow.normalBias = 0.025;
    this.infirmary.shadow.camera.near = 0.1;
    this.portrait.position.set(-3.5, 3.5, 37);
    this.portrait.target.position.set(-6, 1, 35);
    this.portrait.visible = false;
    scene.add(
      this.moon,
      this.moon.target,
      this.fire,
      this.infirmary,
      this.infirmary.target,
      this.portrait,
      this.portrait.target,
    );
    for (const lamp of wallLamps)
      this.point(scene, lamp.x, 2.6, lamp.z - 0.3, lamp.color, lamp.power, 10);
    for (const lamp of gateLanterns)
      this.point(scene, lamp.x, 3.35, lamp.z, '#e9a264', 26, 12);
    this.point(scene, 0, 4.5, 0, '#e1a868', 28, 15);
  }

  private point(
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    color: string,
    power: number,
    range: number,
  ) {
    const light = new THREE.PointLight(color, power, range, 2);
    light.position.set(x, y, z);
    scene.add(light);
  }

  configure(shadowSize: number) {
    for (const [light, size] of [
      [this.moon, shadowSize || 512],
      [this.infirmary, Math.min(1024, shadowSize || 512)],
    ] as const) {
      light.shadow.mapSize.setScalar(size);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
    this.infirmary.castShadow = shadowSize > 0;
  }

  update(
    camera: THREE.Camera,
    time: number,
    steady: boolean,
    preview: boolean,
  ) {
    this.fire.intensity = steady
      ? 50
      : 50 + Math.sin(time * 2.3) * 3 + Math.sin(time * 5.7) * 2;
    this.portrait.visible = preview;
    const target = this.moon.target.position.copy(camera.position);
    target.y = 0;
    target.z -= 7;
    const texel = 40 / this.moon.shadow.mapSize.x;
    for (const axis of [this.right, this.up]) {
      const value = target.dot(axis);
      target.addScaledVector(axis, Math.round(value / texel) * texel - value);
    }
    this.moon.position.copy(target).add(this.offset);
  }
}

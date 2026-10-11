import * as THREE from 'three';
import type { Snapshot } from '../../shared/types';
import type { Character } from './characters';
import { armGeometry, viewModelPose } from './first-person';
import { C } from '../../shared/config';
export class Feedback {
  hands = new THREE.Group();
  trails: THREE.InstancedMesh;
  markers: THREE.InstancedMesh;
  focus: THREE.Mesh;
  dummy = new THREE.Object3D();
  viewModel?: Character;
  poseHands?: (swing: number) => void;
  private attackEnd = 0;
  private attackStarted = 0;
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    camera.add(this.hands);
    scene.add(camera);
    this.hands.visible = false;
    this.trails = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.4, 0.07),
      new THREE.MeshBasicMaterial({
        color: '#c8102e',
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      }),
      C.MAX_EVENTS,
    );
    this.markers = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.27),
      new THREE.MeshBasicMaterial({
        color: '#ffae55',
        depthTest: false,
        depthWrite: false,
      }),
      C.MAX_EVENTS,
    );
    this.markers.count = 0;
    this.markers.frustumCulled = false;
    scene.add(this.markers);
    this.focus = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.025, 5, 32),
      new THREE.MeshBasicMaterial({
        color: '#ede6d8',
        transparent: true,
        opacity: 0.6,
      }),
    );
    this.focus.rotation.x = -Math.PI / 2;
    this.focus.visible = false;
    scene.add(this.focus);
    this.trails.count = 0;
    this.trails.frustumCulled = false;
    scene.add(this.trails);
  }
  setViewModel(model: Character) {
    model.root.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) {
        o.geometry = armGeometry(o);
        o.castShadow = false;
      } else if (o instanceof THREE.Mesh) o.visible = false;
    });
    model.root.rotation.y = Math.PI;
    model.root.position.set(0, -1.5, -0.9);
    const shadow = model.root.getObjectByName('contact-shadow');
    if (shadow instanceof THREE.Mesh) {
      shadow.removeFromParent();
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
    }
    this.hands.add(model.root);
    this.viewModel = model;
    this.poseHands = viewModelPose(model.root, this.hands);
  }
  update(
    s: Snapshot,
    spectating: boolean,
    time: number,
    reducedMotion = false,
  ) {
    const own = s.players.find((p) => p.id === s.self);
    this.hands.visible = own?.role === 'killer' && !spectating;
    if (this.hands.visible) {
      const activeAttack = (own?.attackUntil ?? 0) > s.now;
      if (activeAttack && own!.attackUntil !== this.attackEnd) {
        this.attackEnd = own!.attackUntil!;
        this.attackStarted = time;
      }
      const elapsed = time - this.attackStarted;
      const swing = activeAttack
        ? Math.max(0, 1 - elapsed / (C.HIT_COOLDOWN_MS / 1000))
        : 0;
      this.viewModel?.animate(
        time,
        0,
        'healthy',
        swing > 0 ? 'attack' : undefined,
      );
      this.poseHands?.(swing);
      this.hands.rotation.z = activeAttack
        ? Math.sin(Math.min(1, elapsed / 0.8) * Math.PI) * 0.15
        : 0;
      this.hands.position.y = reducedMotion ? 0 : Math.sin(time * 2) * 0.015;
    }
    const signals =
      own?.role === 'killer'
        ? s.events.filter((e) => e.kind === 'noise' || e.kind === 'scream')
        : [];
    this.markers.count = signals.length;
    signals.forEach((e, i) => {
      this.dummy.position.set(e.x, 2.6 + Math.sin(time * 5) * 0.2, e.z);
      this.dummy.rotation.set(0, time, 0);
      this.dummy.scale.setScalar(1);
      this.dummy.updateMatrix();
      this.markers.setMatrixAt(i, this.dummy.matrix);
    });
    this.markers.instanceMatrix.needsUpdate = true;
    const target = own?.prompt?.target ?? own?.task?.target;
    const nearby = target
      ? [...s.generators, ...s.gates, ...s.pallets, ...s.lockers].find(
          (p) => p.id === target,
        )
      : undefined;
    this.focus.visible = !!nearby && !spectating;
    if (nearby) this.focus.position.set(nearby.x, 0.08, nearby.z);
    const marks = s.events.filter(
      (e) => e.kind === 'scratch' || e.kind === 'blood',
    );
    this.trails.count = marks.length;
    marks.forEach((e, i) => {
      this.dummy.position.set(e.x, 0.025, e.z);
      this.dummy.rotation.set(-Math.PI / 2, 0, e.at % 6);
      this.dummy.scale.set(
        e.kind === 'blood' ? 1 : 0.7,
        e.kind === 'blood' ? 5 : 1,
        1,
      );
      this.dummy.updateMatrix();
      this.trails.setMatrixAt(i, this.dummy.matrix);
    });
    this.trails.instanceMatrix.needsUpdate = true;
  }
}

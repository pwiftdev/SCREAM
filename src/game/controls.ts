import type { GameRenderer } from './renderer';
import type { Session } from './session';
import type { Settings } from '../lib/settings';
import type { Input } from '../../shared/types';
import { C } from '../../shared/config';
export class Controls {
  keys = new Set<string>();
  seq = 0;
  timer: number;
  paused = false;
  constructor(
    readonly renderer: GameRenderer,
    readonly session: Session,
    public settings: Settings,
    readonly onPause: () => void,
  ) {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('mousemove', this.move);
    window.addEventListener('mousedown', this.click);
    window.addEventListener('contextmenu', this.context);
    window.addEventListener('blur', this.blur);
    document.addEventListener('pointerlockchange', this.lockChange);
    this.timer = window.setInterval(() => this.tick(), 1000 / C.TICK_HZ);
  }
  down = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.code === 'Escape') {
      this.keys.clear();
      this.onPause();
      return;
    }
    if (this.paused) return;
    e.preventDefault();
    this.keys.add(e.code);
    if (e.repeat) return;
    const k = this.settings.keys;
    if (e.code === k.scream) this.session.intent('scream');
    if (e.code === k.skill) {
      const s = this.renderer.snapshot,
        p = s?.players.find((p) => p.id === s.self);
      if (p?.skill)
        this.session.intent('skill', {
          id: p.skill.id,
          time: s!.now + performance.now() - this.renderer.received,
        });
    }
  };
  up = (e: KeyboardEvent) => this.keys.delete(e.code);
  move = (e: MouseEvent) => {
    if (
      document.pointerLockElement !== this.renderer.renderer.domElement ||
      this.paused
    )
      return;
    this.renderer.yaw -= e.movementX * 0.002 * this.settings.sensitivity;
    this.renderer.yaw = Math.atan2(
      Math.sin(this.renderer.yaw),
      Math.cos(this.renderer.yaw),
    );
    this.renderer.pitch = Math.max(
      -0.6,
      Math.min(
        0.85,
        this.renderer.pitch + e.movementY * 0.002 * this.settings.sensitivity,
      ),
    );
  };
  click = (e: MouseEvent) => {
    if (
      this.paused ||
      (e.target as HTMLElement).closest('button,input,dialog,.panel')
    )
      return;
    if (document.pointerLockElement !== this.renderer.renderer.domElement) {
      void this.renderer.renderer.domElement
        .requestPointerLock()
        .catch(() =>
          this.session.onError(
            'mouse look was not enabled. click the world to try again.',
          ),
        );
      return;
    }
    if (e.button === 0)
      this.session.intent('attack', this.renderer.snapshot?.now);
    if (e.button === 2) this.session.intent('hush');
  };
  context = (e: Event) => e.preventDefault();
  blur = () => {
    this.keys.clear();
  };
  lockChange = () => {
    if (!document.pointerLockElement) this.keys.clear();
  };
  tick() {
    const k = this.settings.keys,
      held = (key: string) => !this.paused && this.keys.has(key),
      f = Number(held(k.forward)) - Number(held(k.backward)),
      r = Number(held(k.right)) - Number(held(k.left)),
      yaw = this.renderer.yaw;
    const input: Input = {
      seq: (this.seq =
        Math.max(
          this.seq,
          this.renderer.snapshot?.players.find(
            (p) => p.id === this.session.room.sessionId,
          )?.ack ?? 0,
        ) + 1),
      x: Math.sin(yaw) * f - Math.cos(yaw) * r,
      z: Math.cos(yaw) * f + Math.sin(yaw) * r,
      yaw,
      run: !held(k.walk),
      crouch: held(k.crouch),
      interact: held(k.interact),
      time: this.renderer.snapshot?.now ?? 0,
    };
    this.renderer.prediction.input(input);
    this.session.input(input);
  }
  dispose() {
    clearInterval(this.timer);
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('mousemove', this.move);
    window.removeEventListener('mousedown', this.click);
    window.removeEventListener('contextmenu', this.context);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('pointerlockchange', this.lockChange);
    if (document.pointerLockElement) document.exitPointerLock();
  }
}

import { H } from '../../../shared/config';
import type { HouseV1 } from '../../../shared/house/format';
import {
  INPUT,
  startVisit,
  tickVisit,
  type Frame,
  type VisitState,
} from '../../../shared/house/simulation';
import { hollowAudio } from '../../lib/hollow-audio';
import { readHollowSettings } from '../../lib/hollow-settings';
import { HollowRenderer } from './renderer';

export class VisitController {
  readonly renderer: HollowRenderer;
  readonly state: VisitState;
  readonly frames: Frame[] = [];
  private bits = 0;
  private sprint = false;
  private yaw = Math.PI;
  private pitch = 0;
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private abort = new AbortController();
  private done = false;
  private active = false;
  private wantLock = false;
  private pendingLock = false;
  private lockVersion = 0;
  private audioStarted = false;
  private settings = readHollowSettings();
  private bindings: Record<string, number> = {};
  selectItem(slot: number) {
    this.renderer.selectItem(slot);
    this.renderer.flash.visible = slot === 0;
  }
  constructor(
    host: HTMLElement,
    readonly house: HouseV1,
    seed: number,
    private update: (s: VisitState, locked: boolean) => void,
    private finish: (s: VisitState, frames: Frame[]) => void,
  ) {
    this.renderer = new HollowRenderer(host);
    this.renderer.house(house);
    this.state = startVisit(house, seed);
    const { signal } = this.abort;
    const configure = () => {
      this.settings = readHollowSettings();
      this.bindings = {};
      const values = [
        INPUT.FORWARD,
        INPUT.BACK,
        INPUT.LEFT,
        INPUT.RIGHT,
        INPUT.JUMP,
        INPUT.CROUCH,
        INPUT.USE,
        INPUT.FLASH,
      ];
      Object.values(this.settings.keys).forEach(
        (key, i) => (this.bindings[key] = values[i]),
      );
    };
    configure();
    window.addEventListener('hollow-settings', configure, { signal });
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.code === 'Escape') {
          this.pause();
          return;
        }
        if (!this.active) return;
        if (e.code === 'ShiftLeft') this.sprint = true;
        if (this.bindings[e.code]) {
          e.preventDefault();
          this.bits |= this.bindings[e.code];
        }
      },
      { signal },
    );
    document.addEventListener(
      'keyup',
      (e) => {
        if (e.code === 'ShiftLeft') this.sprint = false;
        this.bits &= ~(this.bindings[e.code] ?? 0);
      },
      { signal },
    );
    document.addEventListener(
      'mousemove',
      (e) => {
        if (
          !this.active ||
          (document.pointerLockElement !== this.renderer.gl.domElement &&
            e.buttons !== 1)
        )
          return;
        this.yaw -=
          e.movementX * H.MOUSE_SENSITIVITY * this.settings.sensitivity;
        this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
        this.pitch = Math.max(
          -H.MAX_PITCH / H.LOOK_UNITS,
          Math.min(
            H.MAX_PITCH / H.LOOK_UNITS,
            this.pitch -
              e.movementY * H.MOUSE_SENSITIVITY * this.settings.sensitivity,
          ),
        );
      },
      { signal },
    );
    document.addEventListener(
      'pointerlockchange',
      () => {
        const captured =
          document.pointerLockElement === this.renderer.gl.domElement;
        if (captured && !this.wantLock) {
          document.exitPointerLock();
          return;
        }
        if (!captured && !this.pendingLock) {
          this.pause();
          return;
        }
        if (captured) {
          this.bits = 0;
          this.active = true;
          this.update(this.state, true);
        }
      },
      { signal },
    );
    window.addEventListener(
      'blur',
      () => {
        this.bits = 0;
      },
      { signal },
    );
    this.raf = requestAnimationFrame(this.loop);
  }
  get running() {
    return this.active && !this.done;
  }
  private pause() {
    this.lockVersion++;
    this.wantLock = false;
    this.pendingLock = false;
    this.active = false;
    this.bits = 0;
    this.sprint = false;
    if (document.pointerLockElement === this.renderer.gl.domElement)
      document.exitPointerLock();
    hollowAudio.silenceEffects();
    this.update(this.state, false);
  }
  async lock() {
    const version = ++this.lockVersion;
    this.wantLock = true;
    this.pendingLock = true;
    this.active = true;
    void hollowAudio
      .unlock()
      .then(() => {
        if (this.abort.signal.aborted || this.audioStarted) return;
        this.audioStarted = true;
        hollowAudio.enter(this.house);
      })
      .catch(() => {});
    this.update(this.state, true);
    try {
      await this.renderer.gl.domElement.requestPointerLock();
    } catch {
      if (this.abort.signal.aborted || version !== this.lockVersion) return;
      this.active = this.wantLock;
      this.update(this.state, this.active);
    } finally {
      if (version === this.lockVersion) this.pendingLock = false;
    }
  }
  private loop = (now: number) => {
    const dt = Math.min(H.MAX_FRAME_S, (now - (this.last || now)) / 1000);
    this.last = now;
    const locked = this.active;
    if (locked && !document.hidden && !this.done) {
      this.accumulator += dt;
      while (
        this.accumulator >= 1 / H.TICK_HZ &&
        this.state.outcome === 'playing'
      ) {
        const previous =
          this.frames.at(-1)?.yaw ?? Math.round(Math.PI * H.LOOK_UNITS);
        const delta = Math.atan2(
          Math.sin(this.yaw - previous / H.LOOK_UNITS),
          Math.cos(this.yaw - previous / H.LOOK_UNITS),
        );
        const look =
          previous / H.LOOK_UNITS +
          Math.max(
            -(H.MAX_LOOK_TICK - 1) / H.LOOK_UNITS,
            Math.min((H.MAX_LOOK_TICK - 1) / H.LOOK_UNITS, delta),
          );
        const f = {
          bits: this.bits,
          sprint: this.sprint,
          yaw: Math.round(
            Math.atan2(Math.sin(look), Math.cos(look)) * H.LOOK_UNITS,
          ),
          pitch: Math.round(
            Math.max(
              (this.frames.at(-1)?.pitch ?? 0) - H.MAX_LOOK_TICK,
              Math.min(
                (this.frames.at(-1)?.pitch ?? 0) + H.MAX_LOOK_TICK,
                this.pitch * H.LOOK_UNITS,
              ),
            ),
          ),
        };
        this.frames.push(f);
        tickVisit(this.house, this.state, f);
        this.accumulator -= 1 / H.TICK_HZ;
        if (this.state.tick % (H.TICK_HZ / H.HUD_HZ) === 0) {
          this.update(this.state, locked);
          hollowAudio.update(this.state);
        }
      }
      if (this.state.outcome !== 'playing') {
        this.done = true;
        document.exitPointerLock();
        this.finish(this.state, this.frames);
      }
    }
    this.renderer.render(this.state, now / 1000);
    this.raf = requestAnimationFrame(this.loop);
  };
  dispose() {
    hollowAudio.silenceEffects();
    this.wantLock = false;
    this.lockVersion++;
    this.abort.abort();
    cancelAnimationFrame(this.raf);
    if (document.pointerLockElement === this.renderer.gl.domElement)
      document.exitPointerLock();
    this.renderer.dispose();
  }
}

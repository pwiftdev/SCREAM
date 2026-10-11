import type {
  EncounterCue,
  EncounterPosition,
} from '../game/rework/outdoor-encounters';
import { FOREST_CREATURES, FOREST_CAMP } from '../../shared/house/forest-sites';
import { terrainHeight } from '../../shared/house/terrain';
import { HAUNTS } from '../../shared/house/haunts';
import { AudioMixer, type SoundHandle } from './audio-mixer';
import { FootstepMeter } from './soundscape';
import { SfxLibrary } from './sfx-library';
import { HORROR_SFX, type SfxGroup } from './horror-sfx-catalog';
import {
  houseSoundOccluded,
  indoorSurface,
  outdoorSurface,
  windZone,
  SoundVariants,
  VisitSoundEvents,
} from './hollow-soundscape';
import { readHollowSettings } from './hollow-settings';
import { at, type HouseV1 } from '../../shared/house/format';
import type { VisitState } from '../../shared/house/simulation';
const OUTDOOR_GROWLS = [
  ...HAUNTS,
  ...FOREST_CREATURES.filter((p) => p.id === 'cre_wolf'),
].filter((p) => !['mon_bat', 'mon_crow'].includes(p.id));
type Position = { x: number; y: number; z: number };
type Mode = 'menu' | 'street' | 'house' | 'results';
const files: Record<string, string> = {
  knock: 'world/wood-hit-0.wav',
  bell: 'world/bell-0.wav',
  heartbeat: 'world/heartbeat.wav',
  whisper: 'world/swing.wav',
  fire: 'world/fire.wav',
  piano: 'world/piano.mp3',
  ...Object.fromEntries(
    Object.entries(HORROR_SFX).flatMap(([group, paths]) =>
      paths.map((file, i) => [`${group}-${i}`, file]),
    ),
  ),
};
export class HollowAudio {
  private context?: AudioContext;
  private mixer?: AudioMixer;
  private library?: SfxLibrary;
  private abort = new AbortController();
  private steps = new FootstepMeter(1.25);
  private outdoorSteps = new FootstepMeter(1.5);
  private variants = new SoundVariants();
  private events = new VisitSoundEvents();
  private nextAmbient = 0;
  private nextGrowl = 0;
  private nextJump = 0;
  private pulse = 0;
  private house?: HouseV1;
  private open = new Set<number>();
  private mode: Mode = 'menu';
  private wind?: SoundHandle;
  private windIndex = -1;
  private backgrounds = new Map<string, SoundHandle>();
  private scream?: SoundHandle;
  private fades = new Map<SoundHandle, ReturnType<typeof setTimeout>>();
  private disposed = false;
  private lastCue = -Infinity;
  private encounterSounds: SoundHandle[] = [];
  async unlock(progress?: (value: number) => void) {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.mixer = new AudioMixer(this.context, (a, b) =>
        this.house ? houseSoundOccluded(this.house, this.open, a, b) : false,
      );
      this.library = new SfxLibrary(this.context, files);
      window.addEventListener('hollow-settings', () => this.configure(), {
        signal: this.abort.signal,
      });
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) void this.context?.suspend().catch(() => {});
          else void this.context?.resume().catch(() => {});
        },
        { signal: this.abort.signal },
      );
      document.addEventListener(
        'click',
        (event) => {
          const button =
            event.target instanceof Element
              ? event.target.closest('button')
              : null;
          if (button && !button.disabled) this.cue();
        },
        { signal: this.abort.signal },
      );
      this.configure();
    }
    await this.context.resume();
    await this.library!.load(progress);
    if (this.disposed) return;
    this.beds();
    progress?.(1);
  }
  configure() {
    this.mixer?.configure(readHollowSettings());
  }
  private play(
    name: string,
    volume: number,
    position?: Position,
    loop = false,
    rate = 1,
  ) {
    const buffer = this.library?.buffers.get(name);
    if (!buffer) return;
    return this.mixer?.play(
      buffer,
      volume,
      loop
        ? 'music'
        : name.startsWith('growl-') ||
            name.startsWith('scream-') ||
            name === 'whisper'
          ? 'voices'
          : 'effects',
      position,
      loop,
      rate,
    );
  }
  private variant(group: SfxGroup, volume: number, position?: Position) {
    const available = HORROR_SFX[group]
      .map((_, i) => `${group}-${i}`)
      .filter((id) => this.library?.buffers.has(id));
    if (!available.length) return;
    const i = this.variants.take(group, available.length);
    return this.play(
      available[i],
      volume,
      position,
      false,
      ['door', 'growl', 'scream', 'jump'].includes(group)
        ? 1
        : 0.98 + (i % 3) * 0.02,
    );
  }
  private stopAll() {
    this.endEncounter();
    this.fades.forEach((timer) => clearTimeout(timer));
    this.fades.clear();
    for (const sound of [...(this.mixer?.active ?? [])]) sound.stop();
    this.wind = undefined;
    this.windIndex = -1;
    this.backgrounds.clear();
    this.scream = undefined;
    this.mixer?.restoreMusic();
  }
  silenceEffects() {
    for (const sound of [...(this.mixer?.active ?? [])])
      if (!sound.loop) sound.stop();
    this.steps.reset();
    this.outdoorSteps.reset();
    this.mixer?.restoreMusic();
  }
  private changeWind(index: number, volume: number) {
    if (index === this.windIndex && this.wind) return;
    const requested = `wind-${index}`;
    const available = this.library?.buffers.has(requested)
      ? requested
      : HORROR_SFX.wind
          .map((_, i) => `wind-${i}`)
          .find((id) => this.library?.buffers.has(id));
    const next = available
      ? this.play(available, 0, undefined, true)
      : undefined;
    if (!next || !this.context) return;
    if (this.wind) {
      const old = this.wind;
      old.gain.gain.cancelScheduledValues(this.context.currentTime);
      old.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.25);
      this.fades.set(
        old,
        setTimeout(() => {
          old.stop();
          this.fades.delete(old);
        }, 1200),
      );
    }
    next.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.4);
    this.wind = next;
    this.windIndex = index;
  }
  private background(name: string, volume: number, position?: Position) {
    const key = position
      ? `${name}:${position.x}:${position.y}:${position.z}`
      : name;
    const existing = this.backgrounds.get(key);
    if (existing && this.mixer?.active.has(existing)) return;
    const sound = this.play(name, 0, position, true);
    if (!sound || !this.context) return;
    sound.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.6);
    this.backgrounds.set(key, sound);
  }
  private beds() {
    if (this.mode === 'street') {
      if (!this.wind) this.changeWind(5, 0.24);
      this.background('fire', 0.16, {
        x: 0,
        y: terrainHeight(0, 25) + 1,
        z: 25,
      });
      this.background('fire', 0.12, {
        x: FOREST_CAMP.x,
        y: terrainHeight(FOREST_CAMP.x, FOREST_CAMP.z) + 0.5,
        z: FOREST_CAMP.z,
      });
      this.background('piano', 0.13, {
        x: 100,
        y: terrainHeight(100, 175) + 2,
        z: 175,
      });
      this.background('atmosphere-0', 0.11);
    } else if (this.mode === 'house') {
      this.background('atmosphere-0', 0.16);
    } else {
      this.changeWind(this.mode === 'menu' ? 7 : 8, 0.12);
      this.background('music-0', 0.22);
    }
  }
  private transition(mode: Mode, house?: HouseV1) {
    if (this.mode === mode && this.house === house && this.mixer?.active.size)
      return;
    this.mode = mode;
    this.house = house;
    this.open = new Set();
    this.events.reset();
    this.steps.reset();
    this.outdoorSteps.reset();
    this.pulse = 0;
    this.nextJump = 0;
    this.nextAmbient = performance.now() + 18000;
    this.nextGrowl = performance.now() + 6000;
    this.stopAll();
    this.beds();
  }
  menu() {
    this.transition('menu');
    this.mixer?.view({ x: 0, y: 1.7, z: 0 }, { x: 0, z: -1 }, 0);
  }
  street() {
    this.transition('street');
  }
  enter(house: HouseV1) {
    this.transition('house', house);
    this.variant('door', 0.23);
  }
  results(escaped?: boolean) {
    this.transition('results');
    if (escaped === true) this.play('bell', 0.2);
    else if (escaped === false) this.variant('growl', 0.28);
  }
  seek(state: VisitState) {
    this.silenceEffects();
    this.events.reset(state);
  }
  update(s: VisitState) {
    if (!this.mixer || !this.house || this.mode !== 'house') return;
    this.open = s.open;
    this.mixer.view(
      { x: s.pos.x, y: s.pos.y + 1.5, z: s.pos.z },
      { x: -Math.sin(s.yaw), y: Math.sin(s.pitch), z: -Math.cos(s.yaw) },
      Math.min(1, s.pos.z / 20),
    );
    if (this.steps.advance(s.pos, s.grounded)) {
      const surface = indoorSurface(
        at(
          this.house,
          Math.floor(s.pos.x),
          Math.max(0, Math.floor(s.pos.y - 0.05)),
          Math.floor(s.pos.z),
        ),
      );
      this.variant(
        surface,
        s.crouching ? 0.11 : surface === 'carpet' ? 0.18 : 0.28,
      );
    }
    const fresh = this.events.read(s);
    if (fresh.doors.length) {
      const i = fresh.doors[0];
      this.variant('door', 0.32, {
        x: (i % 24) + 0.5,
        y: Math.floor(i / 576) + 0.7,
        z: (Math.floor(i / 24) % 24) + 0.5,
      });
    }
    if (fresh.stash) this.cue('loot');
    for (const event of fresh.events) {
      if (['lurker', 'follower'].includes(event.type)) {
        this.variant('growl', 0.3, event.pos);
        this.jump(event.pos);
      } else if (event.type === 'scream') {
        this.scare(event.pos);
        this.jump(event.pos);
      } else if (['slammer', 'trapdoor', 'knock'].includes(event.type))
        this.variant('door', 0.32, event.pos);
      else if (event.type === 'steps') this.variant('stairs', 0.25, event.pos);
      else if (event.type === 'whisper') this.play('whisper', 0.2, event.pos);
      else if (event.type === 'battery') this.play('bell', 0.12);
      else this.jump(event.pos);
    }

    if (
      s.tick - this.pulse > 50 &&
      s.props.some(
        (p, i) =>
          this.house!.props[i].type === 'follower' &&
          p.active >= 0 &&
          Math.hypot(p.pos.x - s.pos.x, p.pos.z - s.pos.z) < 7,
      )
    ) {
      this.pulse = s.tick;
      this.play('heartbeat', 0.35);
    }
  }
  cue(kind: 'ui' | 'loot' | 'bank' = 'ui') {
    const now = performance.now();
    if (kind === 'ui' && now - this.lastCue < 90) return;
    this.lastCue = now;
    if (kind === 'loot') this.variant('door', 0.2);
    this.play(
      kind === 'ui' ? 'knock' : 'bell',
      kind === 'ui' ? 0.08 : 0.2,
      undefined,
      false,
      kind === 'ui' ? 1.2 : 1,
    );
  }
  build(block: number, remove = false) {
    this.variant(indoorSurface(block), remove ? 0.28 : 0.2);
  }
  private jump(position?: Position) {
    const now = this.context?.currentTime ?? 0;
    if (now < this.nextJump || !this.nearListener(position)) return;
    const sound = this.variant('jump', 0.24, position);
    if (!sound) return;
    const duration = sound.source.buffer!.duration;
    this.nextJump = now + Math.max(9, duration + 2.5);
    this.mixer?.duckMusic(Math.min(duration, 4));
    return sound;
  }
  private nearListener(position?: Position) {
    const listener = this.mixer?.listener;
    return (
      !position ||
      (listener &&
        Math.hypot(position.x - listener.x, position.z - listener.z) < 16)
    );
  }
  scare(position: Position) {
    if (this.scream && this.mixer?.active.has(this.scream)) return;
    this.scream = this.variant('scream', 0.35, position);
    if (this.scream && this.nearListener(position)) this.mixer?.duckMusic(1.4);
  }
  combat(hit: boolean, p: EncounterPosition) {
    this.variant(hit ? 'metal' : 'exposed', hit ? 0.3 : 0.12, {
      ...p,
      y: terrainHeight(p.x, p.z) + 1.3,
    });
  }
  moveEncounter(p: EncounterPosition) {
    const position = { ...p, y: terrainHeight(p.x, p.z) + 1.5 };
    for (const sound of this.encounterSounds) this.mixer?.move(sound, position);
  }
  endEncounter() {
    if (this.encounterSounds.length) this.mixer?.restoreMusic();
    this.encounterSounds.forEach((sound) => sound.stop());
    this.encounterSounds = [];
  }
  encounter(cue: EncounterCue, p: EncounterPosition) {
    if (this.mode !== 'street') return;
    const position = { ...p, y: terrainHeight(p.x, p.z) + 1.5 };
    this.encounterSounds = this.encounterSounds.filter((s) =>
      this.mixer?.active.has(s),
    );
    const sound =
      cue === 'impact'
        ? this.jump(position)
        : this.variant('growl', cue === 'behind' ? 0.22 : 0.28, position);
    if (sound) this.encounterSounds.push(sound);
    this.nextGrowl = performance.now() + 16000;
  }
  worldView(position: Position, yaw: number, moving: boolean) {
    if (this.mode !== 'street' || !this.mixer) return;
    this.mixer.view(
      position,
      { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) },
      0,
    );
    if (this.outdoorSteps.advance(position, moving)) {
      const surface = outdoorSurface(position);
      this.variant(
        surface,
        surface === 'leaves' || surface === 'exposed'
          ? 0.085
          : surface === 'mud'
            ? 0.12
            : 0.2,
      );
    }
    this.changeWind(windZone(position), 0.24);
    const now = performance.now();
    if (now > this.nextGrowl) {
      const creature = OUTDOOR_GROWLS.find(
        (p) => Math.hypot(p.x - position.x, p.z - position.z) < 13,
      );
      if (creature) {
        this.variant('growl', 0.23, {
          x: creature.x,
          y: terrainHeight(creature.x, creature.z) + creature.y + 1,
          z: creature.z,
        });
        this.nextGrowl = now + 16000;
      }
    }
    if (now > this.nextAmbient) {
      this.nextAmbient = now + 27000;
      if (windZone(position) === 4)
        this.play('bell', 0.22, {
          x: 110,
          y: terrainHeight(110, 381) + 15,
          z: 381,
        });
      else
        this.variant('door', 0.14, {
          x: position.x + Math.cos(yaw) * 12,
          y: position.y,
          z: position.z + Math.sin(yaw) * 12,
        });
    }
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.stopAll();
    this.library?.dispose();
    this.mixer?.dispose();
    void this.context?.close().catch(() => {});
  }
}
export const hollowAudio = new HollowAudio();

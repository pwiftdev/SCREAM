import type { Settings } from './settings';
import type { Snapshot, PublicPlayer } from '../../shared/types';
import { AudioMixer, type SoundHandle } from './audio-mixer';
import {
  FootstepMeter,
  SOUND_FILES,
  footSurface,
  houseBlend,
  type SoundPosition,
} from './soundscape';
export class GameAudio {
  context?: AudioContext;
  mixer?: AudioMixer;
  ready?: Promise<void>;
  buffers = new Map<string, AudioBuffer>();
  loops = new Map<string, SoundHandle>();
  seen = new Set<string>();
  snapshot?: Snapshot;
  private abort?: AbortController;
  private steps = new FootstepMeter();
  private variation = 0;
  private lastBeat = 0;
  private lastTool = 0;
  private lastView = -1;
  private nextCreak = 9;
  private attackEnd = 0;
  private duckUntil = 0;
  start(settings: Settings) {
    if (this.context) {
      void this.context.resume().catch(() => {});
      return;
    }
    const context = new AudioContext();
    this.context = context;
    this.mixer = new AudioMixer(context);
    this.mixer.configure(settings);
    this.abort = new AbortController();
    this.ready = this.load(context, this.abort.signal);
    void context.resume().catch(() => {});
  }
  private async load(context: AudioContext, signal: AbortSignal) {
    const files = Object.entries(SOUND_FILES).map(([id, file]) => [
      id,
      `/audio/world/${file}`,
    ]);
    for (let i = 0; i < 30; i++) {
      const id = `${Math.floor(i / 6)}-${i % 6}`;
      files.push([`voice-${id}`, `/audio/voices/${id}.wav`]);
    }
    await Promise.all(
      files.map(async ([id, url]) => {
        try {
          const response = await fetch(url, { signal });
          if (!response.ok) return;
          const buffer = await context.decodeAudioData(
            await response.arrayBuffer(),
          );
          if (!signal.aborted) this.buffers.set(id, buffer);
        } catch {
          /* Audio is optional when an individual asset cannot load. */
        }
      }),
    );
  }
  configure(s: Settings) {
    this.mixer?.configure(s);
  }
  private play(
    id: string,
    volume: number,
    position?: SoundPosition,
    voice = false,
    rate = 1,
  ) {
    const buffer = this.buffers.get(id);
    if (buffer)
      return this.mixer?.play(
        buffer,
        volume,
        voice ? 'voices' : 'effects',
        position,
        false,
        rate,
      );
  }
  private loop(
    id: string,
    sound: string,
    volume: number,
    music = false,
    position?: SoundPosition,
  ) {
    if (!this.mixer) return;
    let handle = this.loops.get(id);
    const buffer = this.buffers.get(sound);
    if (!handle && buffer) {
      handle = this.mixer.play(
        buffer,
        0,
        music ? 'music' : 'effects',
        position,
        true,
      );
      if (handle) this.loops.set(id, handle);
    }
    handle?.gain.gain.setTargetAtTime(
      volume,
      this.mixer.context.currentTime,
      0.6,
    );
  }
  view(position: SoundPosition, forward: SoundPosition) {
    const c = this.context;
    if (!c || c.state !== 'running' || c.currentTime - this.lastView < 0.05)
      return;
    this.lastView = c.currentTime;
    const indoor = houseBlend(position),
      s = this.snapshot,
      active = s?.phase === 'playing';
    this.mixer?.view(position, forward, indoor);
    const duck = c.currentTime < this.duckUntil ? 0.22 : 1;
    this.loop('forest', 'forest', 0.2 * (1 - indoor * 0.85));
    this.loop(
      'score',
      'caverns',
      (active ? (s.chase ? 0.22 : s.dawnAt ? 0.14 : 0.065) : 0.085) * duck,
      true,
    );
    this.loop('carousel', 'piano', 0.27 * duck, true, { x: 0, y: 2.5, z: 0 });
    this.loop('campfire', 'fire', 0.7, false, { x: -4, y: 0.4, z: 30 });
    this.generators(active ? s : undefined, position);
    if (c.currentTime > this.nextCreak) {
      const house = indoor > 0.2;
      this.play(
        house ? 'wood-hit-2' : 'metal-2',
        0.07,
        house ? { x: -12, y: 5, z: -27 } : { x: 30, y: 4, z: -31 },
        false,
        0.48,
      );
      this.nextCreak = c.currentTime + 17 + (this.variation++ % 4) * 5;
    }
  }
  update(s: Snapshot) {
    if (this.snapshot?.id !== s.id) this.reset();
    const previous = this.snapshot;
    this.snapshot = s;
    if (!this.context || s.phase !== 'playing') return;
    const self = s.players.find((p) => p.id === s.self);
    for (const e of s.events) {
      if (this.seen.has(e.id)) continue;
      this.seen.add(e.id);
      if (e.at < s.now - 700 || e.kind === 'scratch' || e.kind === 'blood')
        continue;
      const actor = s.players.find((p) => p.id === e.player);
      if (e.kind === 'scream' || e.kind === 'together') {
        const variant =
          e.kind === 'together'
            ? 4
            : actor?.health === 'downed'
              ? 1
              : actor?.health === 'carried'
                ? 2
                : actor?.health === 'caged'
                  ? 3
                  : Math.floor(e.at) % 2
                    ? 0
                    : 5;
        this.play(`voice-${actor?.character ?? 0}-${variant}`, 0.8, e, true);
        this.duckUntil = this.context.currentTime + 1.6;
      } else if (e.kind === 'hit') {
        this.play(`hit-${this.variation++ % 2}`, 0.75, e);
        this.duckUntil = this.context.currentTime + 0.6;
      } else if (e.kind === 'bell' || e.kind === 'power' || e.kind === 'escape')
        this.play(
          'bell-0',
          e.kind === 'bell' ? 0.4 : 0.24,
          e.kind === 'bell' ? undefined : e,
          false,
          e.kind === 'power' ? 0.7 : 1,
        );
      else this.play(`metal-${this.variation++ % 3}`, 0.18, e, false, 0.8);
    }
    if (this.seen.size > 500) this.seen = new Set(s.events.map((e) => e.id));
    if (s.dread && s.now - this.lastBeat > 1300 - s.dread * 900) {
      this.play('heartbeat', s.dread * 0.55);
      this.lastBeat = s.now;
    }
    if (self?.x !== undefined && self.z !== undefined)
      this.playerSounds(self, s);
    if (previous)
      for (const pallet of s.pallets) {
        const old = previous.pallets.find((p) => p.id === pallet.id);
        if (old && old.state !== pallet.state)
          this.play(
            `wood-hit-${this.variation++ % 3}`,
            0.6,
            pallet,
            false,
            pallet.state === 'broken' ? 0.65 : 0.9,
          );
      }
  }
  private playerSounds(self: PublicPlayer, s: Snapshot) {
    const pos = { x: self.x!, y: self.y, z: self.z! };
    if (
      this.steps.advance(
        pos,
        ['healthy', 'injured', 'downed'].includes(self.health) && !self.hidden,
      )
    )
      this.play(
        `${footSurface(pos)}-${this.variation++ % 4}`,
        self.health === 'downed' ? 0.07 : self.role === 'killer' ? 0.27 : 0.2,
        undefined,
        false,
        0.93 + (this.variation % 4) * 0.035,
      );
    if (
      (self.attackUntil ?? 0) > s.now &&
      self.attackUntil !== this.attackEnd
    ) {
      this.attackEnd = self.attackUntil!;
      this.play('swing', 0.7, undefined, false, 0.85);
    }
    if (
      self.task &&
      ['repair', 'gate', 'kick', 'search'].includes(self.task.kind) &&
      s.now - this.lastTool > 680
    ) {
      this.play(
        `tool-${this.variation++ % 2}`,
        0.15,
        undefined,
        false,
        self.task.kind === 'repair' ? 1 : 0.6,
      );
      this.lastTool = s.now;
    }
  }
  private generators(s: Snapshot | undefined, position: SoundPosition) {
    const nearest = (s?.generators ?? [])
      .filter(
        (g) =>
          g.progress > 0 && Math.hypot(g.x - position.x, g.z - position.z) < 18,
      )
      .sort(
        (a, b) =>
          Math.hypot(a.x - position.x, a.z - position.z) -
          Math.hypot(b.x - position.x, b.z - position.z),
      )
      .slice(0, 3);
    for (const [id, loop] of this.loops)
      if (id.startsWith('gen:') && !nearest.some((g) => `gen:${g.id}` === id)) {
        loop.stop();
        this.loops.delete(id);
      }
    for (const g of nearest)
      this.loop(`gen:${g.id}`, 'engine', 0.25 + g.progress * 0.2, false, g);
  }
  reset() {
    this.snapshot = undefined;
    this.seen.clear();
    this.steps.reset();
    this.attackEnd = 0;
    this.lastBeat = 0;
    this.lastTool = 0;
    this.duckUntil = 0;
    for (const sound of this.mixer?.active ?? []) if (!sound.loop) sound.stop();
    for (const [id, loop] of this.loops)
      if (id.startsWith('gen:')) {
        loop.stop();
        this.loops.delete(id);
      }
  }
  dispose() {
    this.abort?.abort();
    this.mixer?.dispose();
    this.loops.clear();
    this.buffers.clear();
    this.reset();
    void this.context?.close().catch(() => {});
    this.context = undefined;
    this.mixer = undefined;
    this.lastView = -1;
  }
}

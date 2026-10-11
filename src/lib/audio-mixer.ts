import type { Settings } from './settings';
import { soundOccluded, type SoundPosition } from './soundscape';
import { seeded } from '../../shared/maps/rotten-hollow';
type Bus = 'music' | 'effects' | 'voices';
export interface SoundHandle {
  source: AudioBufferSourceNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  panner?: PannerNode;
  position?: SoundPosition;
  loop: boolean;
  stop: () => void;
}
export class AudioMixer {
  readonly master: GainNode;
  readonly buses: Record<Bus, GainNode>;
  readonly active = new Set<SoundHandle>();
  readonly reverb: ConvolverNode;
  readonly wet: GainNode;
  readonly limiter: DynamicsCompressorNode;
  readonly musicEnvelope: GainNode;
  private duckUntil = 0;
  listener: SoundPosition = { x: 0, y: 1.7, z: 0 };
  disposed = false;
  constructor(
    readonly context: BaseAudioContext,
    private occluded = soundOccluded,
  ) {
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -8;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.18;
    this.master.connect(this.limiter).connect(context.destination);
    this.buses = {
      music: context.createGain(),
      effects: context.createGain(),
      voices: context.createGain(),
    };
    this.musicEnvelope = context.createGain();
    this.musicEnvelope.connect(this.master);
    Object.entries(this.buses).forEach(([name, b]) => {
      b.gain.value = 0;
      b.connect(name === 'music' ? this.musicEnvelope : this.master);
    });
    this.reverb = context.createConvolver();
    this.wet = context.createGain();
    this.wet.gain.value = 0.02;
    const impulse = context.createBuffer(
        2,
        Math.floor(context.sampleRate * 1.3),
        context.sampleRate,
      ),
      random = seeded(580);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++)
        data[i] = (random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.25;
    }
    this.reverb.buffer = impulse;
    this.buses.effects.connect(this.reverb);
    this.buses.voices.connect(this.reverb);
    this.reverb.connect(this.wet).connect(this.master);
  }
  configure(s: Pick<Settings, 'master' | Bus>) {
    this.master.gain.setTargetAtTime(s.master, this.context.currentTime, 0.08);
    for (const bus of ['music', 'effects', 'voices'] as const)
      this.buses[bus].gain.setTargetAtTime(
        s[bus],
        this.context.currentTime,
        0.08,
      );
  }
  duckMusic(seconds: number) {
    if (this.disposed) return;
    const now = this.context.currentTime,
      gain = this.musicEnvelope.gain;
    this.duckUntil = Math.max(this.duckUntil, now + seconds);
    gain.cancelAndHoldAtTime(now);
    gain.linearRampToValueAtTime(0.3, now + 0.08);
    gain.setValueAtTime(0.3, this.duckUntil);
    gain.linearRampToValueAtTime(1, this.duckUntil + 1.8);
  }
  restoreMusic() {
    this.duckUntil = 0;
    const gain = this.musicEnvelope.gain,
      now = this.context.currentTime;
    gain.cancelAndHoldAtTime(now);
    gain.linearRampToValueAtTime(1, now + 0.2);
  }
  play(
    buffer: AudioBuffer,
    volume: number,
    bus: Bus = 'effects',
    position?: SoundPosition,
    loop = false,
    rate = 1,
  ) {
    if (this.disposed) return;
    if (this.active.size >= 40) {
      const oldest = [...this.active].find((s) => !s.loop);
      if (!oldest) return;
      oldest.stop();
    }
    const c = this.context,
      source = c.createBufferSource(),
      gain = c.createGain(),
      filter = c.createBiquadFilter();
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    filter.type = 'lowpass';
    filter.frequency.value = 18000;
    source.connect(filter).connect(gain);
    const panner = position ? c.createPanner() : undefined;
    if (panner && position) {
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = bus === 'voices' ? 7 : 3;
      panner.maxDistance = 65;
      panner.rolloffFactor = 1.7;
      panner.positionX.value = position.x;
      panner.positionY.value = position.y ?? 1;
      panner.positionZ.value = position.z;
      gain.connect(panner).connect(this.buses[bus]);
    } else gain.connect(this.buses[bus]);
    let stopped = false;
    const cleanup = () => {
      source.disconnect();
      gain.disconnect();
      filter.disconnect();
      panner?.disconnect();
      this.active.delete(handle);
    };
    const handle: SoundHandle = {
      source,
      gain,
      filter,
      panner,
      position,
      loop,
      stop: () => {
        if (stopped) return;
        stopped = true;
        source.stop();
        cleanup();
      },
    };
    source.onended = () => {
      stopped = true;
      cleanup();
    };
    this.active.add(handle);
    if (position && this.occluded(this.listener, position))
      filter.frequency.value = 850;
    source.start();
    return handle;
  }
  move(sound: SoundHandle, position: SoundPosition) {
    if (!this.active.has(sound) || !sound.panner) return;
    sound.position = position;
    const now = this.context.currentTime;
    sound.panner.positionX.setTargetAtTime(position.x, now, 0.03);
    sound.panner.positionY.setTargetAtTime(position.y ?? 1, now, 0.03);
    sound.panner.positionZ.setTargetAtTime(position.z, now, 0.03);
  }
  view(position: SoundPosition, forward: SoundPosition, indoor: number) {
    this.listener = position;
    const l = this.context.listener;
    l.positionX.value = position.x;
    l.positionY.value = position.y ?? 1.7;
    l.positionZ.value = position.z;
    l.forwardX.value = forward.x;
    l.forwardY.value = forward.y ?? 0;
    l.forwardZ.value = forward.z;
    l.upX.value = 0;
    l.upY.value = 1;
    l.upZ.value = 0;
    this.wet.gain.setTargetAtTime(
      0.02 + indoor * 0.16,
      this.context.currentTime,
      0.5,
    );
    for (const sound of this.active)
      if (sound.position)
        sound.filter.frequency.setTargetAtTime(
          this.occluded(position, sound.position) ? 850 : 18000,
          this.context.currentTime,
          0.2,
        );
  }
  dispose() {
    this.disposed = true;
    for (const sound of [...this.active]) sound.stop();
    Object.values(this.buses).forEach((b) => b.disconnect());
    this.reverb.disconnect();
    this.wet.disconnect();
    this.master.disconnect();
    this.musicEnvelope.disconnect();
    this.limiter.disconnect();
  }
}

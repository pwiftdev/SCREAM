function wav(buffer: AudioBuffer) {
  const n = buffer.length,
    bytes = new ArrayBuffer(44 + n * 2),
    view = new DataView(bytes),
    write = (offset: number, s: string) => {
      for (let i = 0; i < s.length; i++)
        view.setUint8(offset + i, s.charCodeAt(i));
    };
  write(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, n * 2, true);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < n; i++)
    view.setInt16(
      44 + i * 2,
      Math.max(-1, Math.min(1, samples[i])) * 32767,
      true,
    );
  let binary = '';
  const data = new Uint8Array(bytes);
  for (let i = 0; i < data.length; i += 16384)
    binary += String.fromCharCode(...data.subarray(i, i + 16384));
  return btoa(binary);
}
export async function voices() {
  const files: { name: string; data: string }[] = [];
  for (let character = 0; character < 5; character++)
    for (let variant = 0; variant < 6; variant++) {
      const duration = [0.55, 0.9, 0.75, 1.1, 1.5, 0.65][variant],
        rate = 22050,
        c = new OfflineAudioContext(1, Math.ceil(duration * rate), rate),
        envelope = c.createGain();
      envelope.gain.setValueAtTime(0, 0);
      envelope.gain.linearRampToValueAtTime(0.5, 0.035);
      envelope.gain.setValueAtTime(0.42, duration * 0.62);
      envelope.gain.exponentialRampToValueAtTime(0.001, duration);
      envelope.connect(c.destination);
      const source = c.createOscillator(),
        vibrato = c.createOscillator(),
        depth = c.createGain(),
        pitch = [390, 215, 310, 455, 270][character] * (1 + variant * 0.025);
      source.type = 'sawtooth';
      source.frequency.setValueAtTime(pitch * 0.7, 0);
      source.frequency.exponentialRampToValueAtTime(
        pitch * 1.4,
        duration * 0.18,
      );
      source.frequency.exponentialRampToValueAtTime(pitch * 0.85, duration);
      vibrato.frequency.value = 6 + variant * 0.65;
      depth.gain.value = 22;
      vibrato.connect(depth).connect(source.frequency);
      for (const formant of [
        850 + character * 70,
        1450 + variant * 45,
        2650 + character * 110,
      ]) {
        const filter = c.createBiquadFilter(),
          gain = c.createGain();
        filter.type = 'bandpass';
        filter.frequency.value = formant;
        filter.Q.value = 5;
        gain.gain.value = 0.65;
        source.connect(filter).connect(gain).connect(envelope);
      }
      source.start();
      vibrato.start();
      source.stop(duration);
      vibrato.stop(duration);
      files.push({
        name: `${character}-${variant}.wav`,
        data: wav(await c.startRendering()),
      });
    }
  return files;
}

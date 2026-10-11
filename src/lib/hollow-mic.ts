import { H } from '../../shared/config';
export class ScreamDetector {
  private context?: AudioContext;
  private stream?: MediaStream;
  private frame = 0;
  private above = 0;
  private cooldown = 0;
  private cancelled = false;
  async start(
    threshold: number,
    onLevel: (n: number) => void,
    onScream: (peak: number) => void,
  ) {
    this.cancelled = false;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
      },
    });
    if (this.cancelled) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    try {
      this.context = new AudioContext();
    } catch (error) {
      this.stop();
      throw error;
    }
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 1024;
    this.context.createMediaStreamSource(stream).connect(analyser);
    const data = new Float32Array(analyser.fftSize);
    let peak = 0;
    const loop = (now: number) => {
      analyser.getFloatTimeDomainData(data);
      const level = Math.sqrt(
        data.reduce((sum, x) => sum + x * x, 0) / data.length,
      );
      onLevel(level);
      if (level >= threshold) {
        if (!this.above) this.above = now;
        peak = Math.max(peak, level);
        if (now - this.above >= H.MIC_HOLD_MS && now >= this.cooldown) {
          onScream(Math.min(1, peak));
          this.cooldown = now + H.MIC_COOLDOWN_MS;
          this.above = 0;
          peak = 0;
        }
      } else {
        this.above = 0;
        peak = 0;
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }
  stop() {
    this.cancelled = true;
    cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close().catch(() => {});
    this.stream = undefined;
    this.context = undefined;
  }
}

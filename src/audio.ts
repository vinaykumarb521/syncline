export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock(): void {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.32;
      this.master.connect(this.ctx.destination);
      const samples = this.ctx.sampleRate * 1;
      this.noise = this.ctx.createBuffer(1, samples, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < samples; i += 1) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.32;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private burst(dur: number, gain: number, freq: number): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = freq;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  kick(): void {
    this.tone(150, 0.15, "sine", 0.55, 48);
  }

  hat(): void {
    this.burst(0.05, 0.08, 4000);
  }

  shift(): void {
    this.tone(540, 0.06, "square", 0.08, 760);
  }

  sync(): void {
    this.tone(660, 0.12, "square", 0.1, 880);
    this.tone(990, 0.14, "triangle", 0.08);
  }

  gem(): void {
    this.tone(880, 0.12, "sine", 0.12, 1320);
  }

  near(): void {
    this.tone(420, 0.08, "triangle", 0.07, 640);
  }

  crash(): void {
    this.tone(110, 0.4, "sawtooth", 0.12, 40);
    this.burst(0.35, 0.28, 300);
  }
}

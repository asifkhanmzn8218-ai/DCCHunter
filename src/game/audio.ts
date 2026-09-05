/**
 * All sounds are synthesized with the Web Audio API — zero assets.
 * Must be unlocked by a user gesture before use (unlock()).
 */
export class AudioBus {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private ambientStarted = false;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem("dcc-cop-muted") === "1";
    } catch {
      /* ignore */
    }
  }

  unlock() {
    if (!this.ac) {
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ac = new Ctor();
        this.master = this.ac.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8;
        this.master.connect(this.ac.destination);
        const len = this.ac.sampleRate * 2;
        this.noiseBuf = this.ac.createBuffer(1, len, this.ac.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.startAmbient();
      } catch {
        this.ac = null;
      }
    }
    if (this.ac && this.ac.state === "suspended") void this.ac.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem("dcc-cop-muted", m ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (this.master && this.ac) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ac.currentTime, 0.02);
    }
  }

  private noise(
    dur: number,
    filterFreq: number,
    endFreq: number,
    vol: number,
    type: BiquadFilterType = "lowpass"
  ) {
    if (!this.ac || !this.master || !this.noiseBuf) return;
    const t = this.ac.currentTime;
    const src = this.ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  private tone(
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    vol: number,
    delay = 0,
    vibrato = 0
  ) {
    if (!this.ac || !this.master) return;
    const t = this.ac.currentTime + delay;
    const o = this.ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    if (vibrato > 0) {
      const lfo = this.ac.createOscillator();
      lfo.frequency.value = vibrato;
      const lg = this.ac.createGain();
      lg.gain.value = f0 * 0.06;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
    }
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** snappy rifle crack, one per correct letter */
  shoot() {
    this.noise(0.07, 3200, 900, 0.32, "highpass");
    this.tone("square", 760, 160, 0.08, 0.16);
  }

  /** wrong key — dull jam click */
  jam() {
    this.tone("square", 110, 70, 0.07, 0.13);
    this.noise(0.05, 500, 200, 0.1);
  }

  /** ghost destroyed — boom + dying wail */
  kill(big: boolean) {
    this.noise(big ? 0.5 : 0.32, 420, 60, big ? 0.5 : 0.34);
    this.tone("sawtooth", big ? 380 : 520, 60, big ? 0.7 : 0.45, 0.2, 0, 9);
    this.tone("sine", 130, 40, 0.4, 0.3);
  }

  /** ghost slipped past the line */
  escaped() {
    this.tone("sawtooth", 170, 900, 0.6, 0.24, 0, 12);
    this.tone("sawtooth", 226, 1260, 0.5, 0.1, 0.05, 14);
    this.noise(0.5, 800, 200, 0.16);
  }

  lifeUp() {
    this.tone("sine", 660, 990, 0.16, 0.2);
    this.tone("sine", 990, 1480, 0.2, 0.18, 0.09);
  }

  nightBell() {
    this.tone("sine", 196, 190, 1.1, 0.26);
    this.tone("sine", 392, 388, 0.9, 0.08);
    this.tone("sine", 98, 96, 1.2, 0.2);
  }

  thunder() {
    this.noise(1.9, 950, 90, 0.4);
    this.noise(0.5, 2400, 400, 0.12);
  }

  heartbeat() {
    this.tone("sine", 62, 44, 0.14, 0.42);
    this.tone("sine", 56, 40, 0.16, 0.34, 0.19);
  }

  gameOver() {
    const notes = [220, 174.6, 146.8, 110];
    notes.forEach((n, i) => this.tone("triangle", n, n * 0.985, 0.62, 0.22, i * 0.34));
    this.noise(2.4, 500, 60, 0.22);
  }

  uiClick() {
    this.tone("square", 520, 300, 0.05, 0.1);
  }

  /** magazine out → in → charging handle */
  reload() {
    this.noise(0.06, 2600, 800, 0.16, "highpass");
    this.tone("square", 300, 180, 0.05, 0.1, 0.02);
    this.noise(0.07, 1800, 500, 0.2, "highpass");
    this.tone("square", 220, 120, 0.07, 0.14, 0.28);
    this.noise(0.09, 3000, 700, 0.22, "highpass");
    this.tone("square", 420, 160, 0.09, 0.16, 0.52);
  }

  reloadDone() {
    this.tone("square", 900, 1300, 0.06, 0.12);
  }

  /** boot on stone, alternating pitch */
  step(right: boolean) {
    this.noise(0.11, right ? 900 : 760, 130, 0.13);
    this.tone("sine", right ? 92 : 78, 48, 0.09, 0.1);
  }

  /** heavy metal door / level transition */
  doorSlam() {
    this.noise(0.7, 700, 60, 0.4);
    this.tone("sine", 90, 38, 0.7, 0.3);
  }

  hitLetter() {
    this.tone("sine", 1150, 900, 0.05, 0.08);
  }

  private startAmbient() {
    if (!this.ac || !this.master || this.ambientStarted) return;
    this.ambientStarted = true;
    const mk = (freq: number, detune: number) => {
      const o = this.ac!.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = detune;
      const f = this.ac!.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 170;
      const g = this.ac!.createGain();
      g.gain.value = 0.028;
      o.connect(f).connect(g).connect(this.master!);
      o.start();
    };
    mk(55, 0);
    mk(55, 9);
    mk(27.5, -6);
    // slow mournful pad sweep
    const lfo = this.ac.createOscillator();
    lfo.frequency.value = 0.06;
    const lg = this.ac.createGain();
    lg.gain.value = 70;
    lfo.connect(lg);
    lfo.start();
  }
}

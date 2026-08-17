// Original, procedurally-synthesized audio — a jazzy casino/chiptune loop and
// a set of card-game SFX, all generated at runtime with the Web Audio API.
// No external audio files are used.

const NOTE = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  Cs2: 69.3, Ds2: 77.78, Fs2: 92.5, Gs2: 103.83, As2: 116.54,
  Cs3: 138.59, Ds3: 155.56, Fs3: 185.0, Gs3: 207.65, As3: 233.08,
  Cs4: 277.18, Ds4: 311.13, Fs4: 369.99, Gs4: 415.3, As4: 466.16,
};

// A minor-key lounge swing progression: i - iv - V7 - i (A minor)
const PROGRESSION = [
  { bass: NOTE.A2, chord: [NOTE.A3, NOTE.C4, NOTE.E4] },
  { bass: NOTE.D2, chord: [NOTE.D3, NOTE.F3, NOTE.A3] },
  { bass: NOTE.E2, chord: [NOTE.E3, NOTE.Gs3, NOTE.B3, NOTE.D4] },
  { bass: NOTE.A2, chord: [NOTE.A3, NOTE.C4, NOTE.E4] },
];

const ARPEGGIO_OFFSETS = [0, 1, 2, 1]; // index into chord tones per bar's off-beats

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.noiseBuffer = null;
    this.running = false;
    this.muted = { music: false, sfx: false };

    this.tempo = 118; // BPM
    this.stepDur = 60 / this.tempo / 2; // eighth-note step
    this.stepsPerBar = 8;
    this.nextStepTime = 0;
    this.stepIndex = 0;
    this.timerId = null;
    this.lookahead = 25; // ms
    this.scheduleAhead = 0.12; // seconds
  }

  ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.35;
    this.musicGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.ctx.destination);

    this.noiseBuffer = this.makeNoiseBuffer();
  }

  async resume() {
    this.ensureContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  makeNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setMusicVolume(v) {
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  toggleMusic(on) {
    this.muted.music = !on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  // ---- Background music: lookahead step-sequencer loop ----

  startMusic() {
    if (this.muted.music) return;
    this.ensureContext();
    if (this.running) return;
    this.running = true;
    this.stepIndex = 0;
    this.barIndex = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.timerId = setInterval(() => this.scheduler(), this.lookahead);
  }

  stopMusic() {
    this.running = false;
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
  }

  scheduler() {
    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAhead) {
      this.scheduleStep(this.stepIndex, this.nextStepTime);
      this.nextStepTime += this.stepDur;
      this.stepIndex++;
      if (this.stepIndex >= this.stepsPerBar) {
        this.stepIndex = 0;
        this.barIndex = (this.barIndex + 1) % PROGRESSION.length;
      }
    }
  }

  scheduleStep(step, time) {
    const bar = PROGRESSION[this.barIndex];
    const swing = step % 2 === 1 ? this.stepDur * 0.15 : 0;
    const t = time + swing;

    // Walking bass on beats 0, 2, 4, 6 (quarter notes)
    if (step % 2 === 0) {
      this.pluck(bar.bass, t, 0.28, 'triangle', 0.22);
    }
    // Off-beat comping chord stab (swing feel) on steps 1, 5
    if (step === 1 || step === 5) {
      this.chordStab(bar.chord, t, 0.16, 0.1);
    }
    // Light arpeggiated lead sparkle on steps 3, 7
    if (step === 3 || step === 7) {
      const tone = bar.chord[ARPEGGIO_OFFSETS[(step === 3 ? 0 : 1) % ARPEGGIO_OFFSETS.length]];
      this.pluck(tone * 2, t, 0.18, 'square', 0.07);
    }
    // Brushed hi-hat every step, softer on off-beats
    this.hat(t, step % 2 === 0 ? 0.05 : 0.03);
    // Rim/clap accent on step 4 (backbeat)
    if (step === 4) this.rim(t);
  }

  pluck(freq, time, dur, type, gainVal) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(gainVal, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  chordStab(freqs, time, dur, gainVal) {
    freqs.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(gainVal, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      osc.connect(filter).connect(gain).connect(this.musicGain);
      osc.start(time);
      osc.stop(time + dur + 0.02);
    });
  }

  hat(time, gainVal) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    src.connect(filter).connect(gain).connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.05);
  }

  rim(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.06);
  }

  // ---- One-shot SFX ----

  sfx(fn) {
    if (this.muted.sfx) return;
    this.ensureContext();
    fn(this.ctx, this.sfxGain, this.ctx.currentTime);
  }

  cardDeal() {
    this.sfx((ctx, out, t) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 0.09);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      src.connect(filter).connect(gain).connect(out);
      src.start(t);
      src.stop(t + 0.12);
    });
  }

  cardFlip() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(300, t + 0.06);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  cardPlace() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.05);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  trickWin() {
    this.sfx((ctx, out, t) => {
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = f;
        const start = t + i * 0.06;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
        osc.connect(gain).connect(out);
        osc.start(start);
        osc.stop(start + 0.16);
      });
    });
  }

  trumpChosen() {
    this.sfx((ctx, out, t) => {
      [220, 277.18, 329.63, 440].forEach((f) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2200;
        osc.connect(filter).connect(gain).connect(out);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    });
  }

  handWin() {
    this.sfx((ctx, out, t) => {
      const melody = [523.25, 523.25, 659.25, 783.99, 1046.5];
      melody.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = f;
        const start = t + i * 0.11;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
        osc.connect(gain).connect(out);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    });
  }

  matchWin() {
    this.sfx((ctx, out, t) => {
      const melody = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
      melody.forEach((f, i) => {
        [f, f * 1.5].forEach((freq, layer) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = layer === 0 ? 'square' : 'triangle';
          osc.frequency.value = freq;
          const start = t + i * 0.14;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(layer === 0 ? 0.16 : 0.08, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
          osc.connect(gain).connect(out);
          osc.start(start);
          osc.stop(start + 0.4);
        });
      });
    });
  }

  buttonHover() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 700;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.06);
    });
  }

  buttonClick() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.05);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  invalidMove() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.16);
    });
  }
}

export const audio = new AudioEngine();

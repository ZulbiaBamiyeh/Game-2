// Original score and sound effects, synthesized live with the Web Audio API.
// No audio files are shipped or downloaded — every voice below is built from
// oscillators and shaped noise at runtime.
//
// The music is a slow lounge-jazz arrangement over an eight-bar ii-V-I cycle:
// an upright walking bass, a vibraphone comping part, brushed ride and snare,
// a soft kick, and a lead melody that drops in and out between cycles.

const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// Eight-bar changes in A minor. Each bar carries a bass root and a rootless
// upper voicing so the two parts never collide in the same register.
const CHANGES = [
  { name: 'Am9',    root: 45, voicing: [60, 64, 67, 71] },
  { name: 'Dm7',    root: 38, voicing: [62, 65, 69, 72] },
  { name: 'G9',     root: 43, voicing: [59, 62, 65, 69] },
  { name: 'Cmaj9',  root: 48, voicing: [64, 67, 71, 74] },
  { name: 'Fmaj7',  root: 41, voicing: [64, 65, 69, 72] },
  { name: 'Bm7b5',  root: 47, voicing: [59, 62, 65, 69] },
  { name: 'E7#9',   root: 40, voicing: [68, 71, 74, 75] },
  { name: 'Am9',    root: 45, voicing: [60, 64, 67, 71] },
];

// Comping rhythms, in eighth-note steps. One is picked per bar so the
// vibraphone never settles into an obvious one-bar loop.
const COMP_PATTERNS = [
  [1, 4],
  [0, 3, 6],
  [2, 5],
  [1, 5, 7],
  [3, 6],
  [0, 4],
];

// A written head, one entry per phrase note: [bar, step, midi, durationSteps].
const MELODY = [
  [0, 4, 76, 2], [0, 6, 79, 2],
  [1, 0, 81, 3], [1, 4, 77, 2],
  [2, 2, 74, 2], [2, 5, 71, 3],
  [3, 0, 72, 6],
  [4, 4, 69, 2], [4, 6, 72, 2],
  [5, 0, 74, 3], [5, 3, 77, 3],
  [6, 0, 79, 2], [6, 2, 77, 2], [6, 4, 74, 3],
  [7, 0, 76, 7],
];

const STEPS_PER_BAR = 8; // eighth notes
const SWING = 0.22; // fraction of an eighth that off-beats are pushed late

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.running = false;
    this.muted = { music: false, sfx: false };

    this.tempo = 92;
    this.stepDur = 60 / this.tempo / 2;
    this.nextStepTime = 0;
    this.step = 0;
    this.bar = 0;
    this.cycle = 0;
    this.timerId = null;
    this.lookahead = 25;
    this.scheduleAhead = 0.15;

    this.musicVolume = 0.5;
    this.sfxVolume = 0.55;
  }

  // ---- graph setup ----

  ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;

    // Gentle bus compression keeps the mix glued as parts stack up.
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -20;
    this.comp.knee.value = 24;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.006;
    this.comp.release.value = 0.22;

    this.master.connect(this.comp).connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.master);

    // Shared plate-ish reverb, fed by sends from the melodic voices.
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.1, 2.6);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = 0.9;
    this.reverb.connect(this.reverbGain).connect(this.master);

    this.noiseBuffer = this.makeNoiseBuffer();
  }

  makeNoiseBuffer() {
    const len = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /** Exponentially-decaying stereo noise burst, used as a reverb impulse. */
  makeImpulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const impulse = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // Slight lowpass-by-averaging darkens the tail so it sits behind the mix.
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
      for (let i = 1; i < len; i++) data[i] = (data[i] + data[i - 1]) * 0.5;
    }
    return impulse;
  }

  async resume() {
    this.ensureContext();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  toggleMusic(on) {
    this.muted.music = !on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  /** Duck the music briefly so a win stinger cuts through. */
  duck(amount = 0.4, seconds = 0.9) {
    if (!this.musicGain) return;
    const t = this.ctx.currentTime;
    const g = this.musicGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(this.musicVolume * amount, t + 0.06);
    g.linearRampToValueAtTime(this.musicVolume, t + seconds);
  }

  // ---- transport ----

  startMusic() {
    if (this.muted.music) return;
    this.ensureContext();
    if (this.running) return;
    this.running = true;
    this.step = 0;
    this.bar = 0;
    this.cycle = 0;
    this.nextStepTime = this.ctx.currentTime + 0.08;
    this.timerId = setInterval(() => this.scheduler(), this.lookahead);
  }

  stopMusic() {
    this.running = false;
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
  }

  scheduler() {
    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAhead) {
      this.scheduleStep(this.step, this.bar, this.nextStepTime);
      this.nextStepTime += this.stepDur;
      this.step++;
      if (this.step >= STEPS_PER_BAR) {
        this.step = 0;
        this.bar++;
        if (this.bar >= CHANGES.length) {
          this.bar = 0;
          this.cycle++;
        }
      }
    }
  }

  scheduleStep(step, bar, time) {
    const chord = CHANGES[bar];
    const next = CHANGES[(bar + 1) % CHANGES.length];
    // Off-beat eighths land late, which is what gives the groove its swing.
    const t = time + (step % 2 === 1 ? this.stepDur * SWING : 0);

    if (step % 2 === 0) {
      const beat = step / 2;
      this.bass(this.walkingNote(chord, next, beat), t, beat === 0 ? 0.3 : 0.24);
    }

    const pattern = COMP_PATTERNS[(bar + this.cycle) % COMP_PATTERNS.length];
    if (pattern.includes(step)) {
      this.vibes(chord.voicing, t);
    }

    this.ride(t, step);

    if (step === 2 || step === 6) this.brush(t, 0.055);
    else if (step === 7 && bar % 2 === 1) this.brush(t, 0.03);

    if (step === 0) this.kick(t, 0.28);
    else if (step === 5 && bar % 4 === 2) this.kick(t, 0.16);

    // The head sits out every other cycle, leaving room for the rhythm section.
    if (this.cycle % 2 === 0) {
      for (const [mBar, mStep, midi, dur] of MELODY) {
        if (mBar === bar && mStep === step) {
          this.lead(mtof(midi), t, dur * this.stepDur * 0.9);
        }
      }
    }
  }

  /**
   * Pick this beat's bass note: root on one, chord tones through the middle,
   * and a chromatic approach into the next bar's root on beat four.
   */
  walkingNote(chord, next, beat) {
    const root = chord.root;
    if (beat === 0) return mtof(root);
    if (beat === 3) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      return mtof(next.root + dir);
    }
    // Chord tones relative to the root, kept in the bass register.
    const tones = [root + 7, root + 12, root + 3, root + 5];
    return mtof(tones[Math.floor(Math.random() * tones.length)]);
  }

  // ---- instruments ----

  bass(freq, time, dur) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    sub.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.01, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.04);
    sub.frequency.value = freq / 2;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(320, time + dur * 0.8);
    filter.Q.value = 1.2;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.5, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    osc.connect(filter);
    sub.connect(subGain).connect(filter);
    filter.connect(gain).connect(this.musicGain);

    osc.start(time); sub.start(time);
    osc.stop(time + dur + 0.05); sub.stop(time + dur + 0.05);

    // Finger-noise transient gives the upright its attack.
    this.noiseHit(time, 0.03, 'bandpass', 1600, 0.05, this.musicGain);
  }

  vibes(voicing, time) {
    const ctx = this.ctx;
    voicing.forEach((midi, i) => {
      const freq = mtof(midi);
      const osc = ctx.createOscillator();
      const bell = ctx.createOscillator();
      const gain = ctx.createGain();
      const bellGain = ctx.createGain();
      const trem = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      bell.type = 'sine';
      bell.frequency.value = freq * 4.01; // inharmonic partial = metallic sheen
      bellGain.gain.value = 0.06;

      // Vibraphone tremolo.
      lfo.type = 'sine';
      lfo.frequency.value = 4.6;
      lfoGain.gain.value = 0.28;
      trem.gain.value = 0.72;
      lfo.connect(lfoGain).connect(trem.gain);

      const dur = 1.5;
      const peak = 0.1 - i * 0.012; // roll the voicing off toward the top
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peak, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(trem);
      bell.connect(bellGain).connect(trem);
      trem.connect(gain).connect(this.musicGain);

      const send = ctx.createGain();
      send.gain.value = 0.3;
      gain.connect(send).connect(this.reverb);

      osc.start(time); bell.start(time); lfo.start(time);
      osc.stop(time + dur + 0.05);
      bell.stop(time + dur + 0.05);
      lfo.stop(time + dur + 0.05);
    });
  }

  lead(freq, time, dur) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const vib = ctx.createOscillator();
    const vibGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    // A slow, shallow vibrato that fades in over the note.
    vib.type = 'sine';
    vib.frequency.value = 5.2;
    vibGain.gain.setValueAtTime(0, time);
    vibGain.gain.linearRampToValueAtTime(freq * 0.008, time + dur * 0.5);
    vib.connect(vibGain).connect(osc.frequency);

    filter.type = 'lowpass';
    filter.frequency.value = 2600;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
    gain.gain.setValueAtTime(0.15, time + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    osc.connect(filter).connect(gain).connect(this.musicGain);

    const send = ctx.createGain();
    send.gain.value = 0.35;
    gain.connect(send).connect(this.reverb);

    osc.start(time); vib.start(time);
    osc.stop(time + dur + 0.06);
    vib.stop(time + dur + 0.06);
  }

  ride(time, step) {
    // "Spang-a-lang": quarters plus a swung eighth on beats two and four.
    const accent = step === 0 || step === 4;
    const swung = step === 3 || step === 7;
    if (step % 2 === 1 && !swung) return;
    const level = accent ? 0.035 : swung ? 0.022 : 0.026;
    this.noiseHit(time, 0.32, 'highpass', 7200, level, this.musicGain, 0.22);
  }

  brush(time, level) {
    this.noiseHit(time, 0.13, 'bandpass', 2400, level, this.musicGain, 0.5);
  }

  kick(time, level) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(115, time);
    osc.frequency.exponentialRampToValueAtTime(44, time + 0.13);
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    osc.connect(gain).connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  /** Shared helper for all the noise-based percussion and transients. */
  noiseHit(time, dur, filterType, freq, level, out, reverbSend = 0) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    src.connect(filter).connect(gain).connect(out);

    if (reverbSend > 0 && this.reverb) {
      const send = ctx.createGain();
      send.gain.value = reverbSend * 0.25;
      gain.connect(send).connect(this.reverb);
    }

    src.start(time);
    src.stop(time + dur + 0.05);
  }

  // ---- one-shot sound effects ----

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
      filter.Q.value = 1.4;
      filter.frequency.setValueAtTime(2600, t);
      filter.frequency.exponentialRampToValueAtTime(700, t + 0.085);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
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
      osc.frequency.setValueAtTime(1000, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.06);
      gain.gain.setValueAtTime(0.16, t);
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
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.06);
      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.09);

      // Paper slap on top of the thud.
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 3000;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.14, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(hp).connect(ng).connect(out);
      src.start(t);
      src.stop(t + 0.06);
    });
  }

  trickWin() {
    this.sfx((ctx, out, t) => {
      // Bright major triad arpeggio with a bell-like partial.
      [659.25, 830.61, 987.77].forEach((f, i) => {
        const start = t + i * 0.055;
        const osc = ctx.createOscillator();
        const bell = ctx.createOscillator();
        const gain = ctx.createGain();
        const bellGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        bell.type = 'sine';
        bell.frequency.value = f * 3.01;
        bellGain.gain.value = 0.14;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
        osc.connect(gain);
        bell.connect(bellGain).connect(gain);
        gain.connect(out);
        if (this.reverb) {
          const send = ctx.createGain();
          send.gain.value = 0.28;
          gain.connect(send).connect(this.reverb);
        }
        osc.start(start); bell.start(start);
        osc.stop(start + 0.45); bell.stop(start + 0.45);
      });
    });
  }

  trumpChosen() {
    this.duck(0.5, 1.2);
    this.sfx((ctx, out, t) => {
      // Rising swell that resolves onto a bright chord.
      const swell = ctx.createOscillator();
      const swellGain = ctx.createGain();
      const swellFilter = ctx.createBiquadFilter();
      swell.type = 'sawtooth';
      swell.frequency.setValueAtTime(110, t);
      swell.frequency.exponentialRampToValueAtTime(220, t + 0.45);
      swellFilter.type = 'lowpass';
      swellFilter.frequency.setValueAtTime(400, t);
      swellFilter.frequency.exponentialRampToValueAtTime(3000, t + 0.45);
      swellGain.gain.setValueAtTime(0.0001, t);
      swellGain.gain.linearRampToValueAtTime(0.12, t + 0.35);
      swellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      swell.connect(swellFilter).connect(swellGain).connect(out);
      swell.start(t);
      swell.stop(t + 0.75);

      [440, 554.37, 659.25, 880].forEach((f) => {
        const start = t + 0.42;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.13, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
        osc.connect(gain).connect(out);
        if (this.reverb) {
          const send = ctx.createGain();
          send.gain.value = 0.4;
          gain.connect(send).connect(this.reverb);
        }
        osc.start(start);
        osc.stop(start + 0.95);
      });
    });
  }

  handWin() {
    this.duck(0.35, 1.6);
    this.sfx((ctx, out, t) => {
      const melody = [523.25, 659.25, 783.99, 1046.5];
      melody.forEach((f, i) => {
        const start = t + i * 0.1;
        [f, f * 2].forEach((freq, layer) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = layer === 0 ? 'triangle' : 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(layer === 0 ? 0.19 : 0.07, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
          osc.connect(gain).connect(out);
          if (this.reverb) {
            const send = ctx.createGain();
            send.gain.value = 0.35;
            gain.connect(send).connect(this.reverb);
          }
          osc.start(start);
          osc.stop(start + 0.55);
        });
      });
    });
  }

  matchWin() {
    this.duck(0.25, 2.6);
    this.sfx((ctx, out, t) => {
      const melody = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      melody.forEach((f, i) => {
        const start = t + i * 0.13;
        [f, f * 1.5, f * 2].forEach((freq, layer) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = layer === 0 ? 'triangle' : 'sine';
          osc.frequency.value = freq;
          const peak = [0.18, 0.08, 0.05][layer];
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.linearRampToValueAtTime(peak, start + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
          osc.connect(gain).connect(out);
          if (this.reverb) {
            const send = ctx.createGain();
            send.gain.value = 0.45;
            gain.connect(send).connect(this.reverb);
          }
          osc.start(start);
          osc.stop(start + 0.75);
        });
      });
    });
  }

  buttonHover() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.07);
    });
  }

  buttonClick() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(1040, t + 0.05);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }

  invalidMove() {
    this.sfx((ctx, out, t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(filter).connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  }
}

export const audio = new AudioEngine();

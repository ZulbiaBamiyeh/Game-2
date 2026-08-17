// Original score and sound effects, synthesized live with the Web Audio API.
// No audio files are shipped or downloaded — every voice below is built from
// oscillators and shaped noise at runtime.
//
// The music is a sixteen-bar lounge-funk loop built around a recurring hook,
// with a syncopated bass, vibraphone comping, brushed kit and shaker, and an
// A A B A structure so the groove develops instead of merely repeating.

const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

// ---------------------------------------------------------------------------
// The score
//
// A sixteen-bar loop in A minor with a swung-sixteenth lounge-funk groove:
// A A B A, where A vamps on a two-chord figure and B lifts before falling back.
// The point of difference from a generic jazz bed is the HOOK — a fixed
// syncopated riff that returns every A section so the tune is recognisable
// rather than merely pleasant.
// ---------------------------------------------------------------------------

const STEPS_PER_BAR = 16; // sixteenth notes
const SWING = 0.16;       // how late the off-sixteenths land

// Each bar: a bass root plus a rootless upper voicing, kept clear of the bass.
const A1 = { root: 33, voicing: [60, 64, 67, 71] }; // Am9
const A2 = { root: 33, voicing: [60, 64, 67, 71] };
const D1 = { root: 38, voicing: [60, 65, 69, 72] }; // Dm11
const E1 = { root: 40, voicing: [68, 71, 74, 75] }; // E7#9  — the tension chord
const F1 = { root: 41, voicing: [60, 64, 65, 69] }; // Fmaj7
const EM = { root: 40, voicing: [59, 62, 67, 71] }; // Em7
const C1 = { root: 36, voicing: [59, 64, 67, 71] }; // Cmaj7

//                bar: 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
const CHANGES = [ A1, A2, D1, E1,  A1, A2, D1, E1,  F1, EM, D1, E1,  A1, A2, D1, E1 ];

// Bars 8-11 are the B section: brighter comping, busier hats, hook sits out.
const isB = (bar) => bar >= 8 && bar <= 11;

// The hook, as [barWithinPhrase, step, midi, durationSteps]. Repeats over each
// four-bar A block, so it lands three times per loop.
const HOOK = [
  [0,  0, 69, 3], [0,  4, 72, 2], [0,  7, 76, 3], [0, 12, 74, 2], [0, 14, 72, 2],
  [1,  0, 76, 4], [1,  6, 79, 2], [1,  9, 81, 5],
  [2,  0, 77, 3], [2,  4, 76, 2], [2,  7, 74, 3], [2, 12, 69, 3],
  [3,  0, 79, 2], [3,  3, 77, 2], [3,  6, 76, 4], [3, 12, 71, 3],
];

// A counter-melody for the B section, an octave-ish above the vamp.
const B_LINE = [
  [8,  0, 84, 4], [8,  6, 81, 3], [8, 10, 77, 4],
  [9,  0, 79, 4], [9,  6, 76, 3], [9, 10, 74, 4],
  [10, 0, 77, 3], [10, 4, 74, 3], [10, 8, 72, 6],
  [11, 0, 75, 4], [11, 6, 71, 3], [11, 10, 68, 5],
];

// Syncopated bass: [step, scaleOffsetFromRoot]. The gaps are the groove.
const BASS_PATTERNS = [
  [[0, 0], [3, 0], [6, 12], [8, 7], [11, 0], [14, 10]],
  [[0, 0], [4, 7], [6, 0], [10, 12], [13, 0]],
  [[0, 0], [3, 12], [6, 7], [8, 0], [12, 5], [14, 7]],
  [[0, 0], [2, 0], [5, 7], [8, 12], [11, 7], [14, 3]],
];

// Off-beat comping stabs, in sixteenths.
const COMP_PATTERNS = [
  [2, 7, 10],
  [3, 6, 11, 14],
  [2, 6, 9, 13],
  [4, 7, 12],
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.running = false;
    this.muted = { music: false, sfx: false };

    this.tempo = 104;
    this.stepDur = 60 / this.tempo / 4; // sixteenth notes
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
    // Off-beat sixteenths land late — this is what makes the groove swing.
    const t = time + (step % 2 === 1 ? this.stepDur * SWING : 0);
    const inB = isB(bar);

    // Syncopated bass. The rests matter as much as the notes.
    for (const [s, off] of BASS_PATTERNS[bar % BASS_PATTERNS.length]) {
      if (s === step) this.bass(mtof(chord.root + off), t, step === 0 ? 0.34 : 0.26);
    }

    // Comping stabs, opened up a little through the B section.
    if (COMP_PATTERNS[bar % COMP_PATTERNS.length].includes(step)) {
      this.vibes(chord.voicing, t, inB ? 1.2 : 1);
    }

    // Kit: kick on the downbeat with a pushed second hit, backbeat brush on
    // 2 and 4, quarter-note ride, and a sixteenth shaker carrying the pulse.
    if (step === 0) this.kick(t, 0.3);
    else if (step === 10) this.kick(t, 0.19);
    if (step === 4 || step === 12) this.brush(t, 0.07);
    if (step % 4 === 0) this.ride(t, step === 0);
    if (step % 2 === 0) this.shaker(t, step % 4 === 0 ? 0.03 : 0.019);
    else if (inB) this.shaker(t, 0.014);

    // Melody. The hook states in full over the first and last A blocks, and
    // thins to just its long notes in the middle one so it breathes.
    if (inB) {
      for (const [b, s, midi, dur] of B_LINE) {
        if (b === bar && s === step) this.lead(mtof(midi), t, dur * this.stepDur * 0.92);
      }
    } else {
      const sparse = bar >= 4 && bar <= 7;
      const phraseBar = bar % 4;
      for (const [b, s, midi, dur] of HOOK) {
        if (b === phraseBar && s === step && !(sparse && dur < 3)) {
          this.lead(mtof(midi), t, dur * this.stepDur * 0.92);
        }
      }
    }
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

  vibes(voicing, time, gainMul = 1) {
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
      const peak = (0.1 - i * 0.012) * gainMul; // roll off toward the top
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

  ride(time, accent) {
    this.noiseHit(time, 0.3, 'highpass', 7200, accent ? 0.034 : 0.024, this.musicGain, 0.22);
  }

  /** Tight sixteenth-note shaker — the thing that makes the groove move. */
  shaker(time, level) {
    this.noiseHit(time, 0.05, 'highpass', 9500, level, this.musicGain, 0.08);
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

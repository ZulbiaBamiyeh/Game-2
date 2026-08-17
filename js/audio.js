// Game audio. The soundtrack is a bundled audio file; every sound effect is
// still synthesized at runtime from oscillators and shaped noise, so the two
// share one mixer: a music bus, an SFX bus, a generated convolution reverb and
// a bus compressor, with the music ducking underneath the bigger stingers.

const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const MUSIC_URL = 'audio/hokm-theme.mp3';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.running = false;
    this.muted = { music: false, sfx: false };

    this.musicEl = null;
    this.musicSource = null;

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

  // ---- music playback ----
  //
  // The soundtrack is an audio file rather than a generated score. It is routed
  // through the same musicGain node the synth used, so the mute toggle, the
  // volume control and the ducking under win stingers all keep working.

  ensureMusicElement() {
    if (this.musicEl) return;
    const el = new Audio(MUSIC_URL);
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    this.musicEl = el;
    // Routing through the graph means the element's own volume is bypassed.
    this.musicSource = this.ctx.createMediaElementSource(el);
    this.musicSource.connect(this.musicGain);
  }

  startMusic() {
    if (this.muted.music) return;
    this.ensureContext();
    this.ensureMusicElement();
    this.running = true;
    // play() rejects if it is called before a user gesture; the caller starts
    // music from the deal button, so surface anything else as a warning only.
    const p = this.musicEl.play();
    if (p && p.catch) p.catch((err) => console.warn('Music could not start:', err.message));
  }

  stopMusic() {
    this.running = false;
    if (this.musicEl) this.musicEl.pause();
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

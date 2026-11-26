// Lightweight Web Audio API & Speech feedback synthesizer for playful robot exploration,
// discovery chimes, tactile clicks, and spoken voice greetings. Works 100% offline.

class SoundFeedback {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.05,
    delay = 0,
    slideToFreq?: number,
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration * 0.9);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public tap() {
    this.playTone(540, 0.055, 'triangle', 0.03, 0, 620);
  }

  // Playful, excited robot exploration & discovery sound ("chirp-boop-wheee-sparkle!")
  public exploreDiscovery() {
    // Playful ascending robotic glide
    this.playTone(520, 0.11, 'sine', 0.045, 0, 780);
    this.playTone(680, 0.09, 'triangle', 0.038, 0.09, 980);
    // Excited playful swoop
    this.playTone(880, 0.14, 'sine', 0.048, 0.17, 1320);
    // Twinkling discovery sparkle notes
    this.playTone(1046.5, 0.18, 'sine', 0.04, 0.29);
    this.playTone(1318.5, 0.22, 'sine', 0.04, 0.36);
    this.playTone(1567.98, 0.28, 'triangle', 0.035, 0.43);
  }

  public openNote() {
    this.exploreDiscovery();
  }

  public danceBeat() {
    this.playTone(440, 0.09, 'triangle', 0.045, 0, 520);
    this.playTone(587.33, 0.09, 'sine', 0.045, 0.09, 659.25);
    this.playTone(783.99, 0.12, 'triangle', 0.045, 0.18, 880);
    this.playTone(1046.5, 0.16, 'sine', 0.045, 0.27);
  }

  public sitChime() {
    this.playTone(659.25, 0.12, 'sine', 0.04, 0, 523.25);
    this.playTone(523.25, 0.18, 'triangle', 0.038, 0.11, 440);
  }

  public correct() {
    this.playTone(523.25, 0.14, 'sine', 0.05, 0);
    this.playTone(659.25, 0.18, 'sine', 0.055, 0.07);
    this.playTone(783.99, 0.26, 'sine', 0.055, 0.14, 987.77);
  }

  public incorrect() {
    this.playTone(290, 0.14, 'triangle', 0.035, 0, 230);
    this.playTone(230, 0.18, 'triangle', 0.03, 0.09, 195);
  }

  public celebrate() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.26, 'sine', 0.05, idx * 0.075);
    });
  }

  public speak(text: string, callbacks?: {onStart?: () => void; onEnd?: () => void}) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      callbacks?.onStart?.();
      setTimeout(() => callbacks?.onEnd?.(), 1600);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            /female|samantha|victoria|karen|zira|aria|jenny|google us english/i.test(v.name),
        ) ?? voices.find((v) => v.lang.startsWith('en'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 1.05;
      utterance.pitch = 1.26;
      utterance.onstart = () => callbacks?.onStart?.();
      utterance.onend = () => callbacks?.onEnd?.();
      utterance.onerror = () => callbacks?.onEnd?.();
      window.speechSynthesis.speak(utterance);
    } catch {
      callbacks?.onEnd?.();
    }
  }

  public stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }
}

export const soundFx = new SoundFeedback();

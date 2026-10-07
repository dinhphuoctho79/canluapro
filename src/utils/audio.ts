// Web Audio API Synthesizer and Web Speech API Announcer for outdoor field weighing

class AudioManager {
  private ctx: AudioContext | null = null;
  private voiceEnabled: boolean = true;
  private soundEnabled: boolean = true;
  private isSpeaking: boolean = false;
  private onSpeakingChangeCallbacks: ((isSpeaking: boolean) => void)[] = [];

  constructor() {
    // Lazy audio context initialization
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public subscribeSpeaking(callback: (isSpeaking: boolean) => void) {
    this.onSpeakingChangeCallbacks.push(callback);
    return () => {
      this.onSpeakingChangeCallbacks = this.onSpeakingChangeCallbacks.filter(c => c !== callback);
    };
  }

  private setSpeakingState(speaking: boolean) {
    this.isSpeaking = speaking;
    this.onSpeakingChangeCallbacks.forEach(cb => cb(speaking));
  }

  // Crisp mechanical tactile click sound for numpad
  public playKeyClick() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Ignore
    }
  }

  // Confirmation sound when saving a bag
  public playSubmitChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880.00, now + 0.08); // A5

      osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  // Celebration fanfare sound when finishing a sheet (10 or 20 bags)
  public playSheetFinishChime() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  // Warning siren sound for abnormal weight
  public playWarningAlert() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.15);
      osc.frequency.linearRampToValueAtTime(440, now + 0.3);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignore
    }
  }

  // Haptic feedback for touch devices
  public triggerHaptic(duration = 25) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Ignore
      }
    }
  }

  public toggleVoice(): boolean {
    this.voiceEnabled = !this.voiceEnabled;
    return this.voiceEnabled;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setVoiceEnabled(val: boolean) {
    this.voiceEnabled = val;
  }

  // Convert decimal number to Vietnamese speech words according to Mekong Delta colloquial counting
  // e.g., 50.4 -> "Năm mươi phẩy tư", 51.5 -> "Năm mươi mốt phẩy năm", 49.8 -> "Bốn mươi chín phẩy tám"
  public numberToVietnameseWords(num: number): string {
    const rounded = Math.round(num * 10) / 10;
    const parts = rounded.toString().split('.');
    const integerPart = parseInt(parts[0], 10);
    const decimalPart = parts[1] ? parseInt(parts[1], 10) : null;

    const units = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

    const readTens = (n: number): string => {
      if (n < 10) return units[n];
      if (n === 10) return 'mười';
      if (n < 20) {
        const u = n % 10;
        return `mười ${u === 5 ? 'lăm' : units[u]}`;
      }
      const tens = Math.floor(n / 10);
      const u = n % 10;
      let tensWord = `${units[tens]} mươi`;
      if (tens === 2) tensWord = 'hai mươi';
      if (tens === 4) tensWord = 'bốn mươi';
      if (tens === 5) tensWord = 'năm mươi';

      if (u === 0) return tensWord;
      if (u === 1) return `${tensWord} mốt`;
      if (u === 4) return `${tensWord} tư`; // Mekong Delta style
      if (u === 5) return `${tensWord} lăm`;
      return `${tensWord} ${units[u]}`;
    };

    let result = '';
    if (integerPart < 100) {
      result = readTens(integerPart);
    } else {
      // 3 or 4 digits for sheet summaries e.g. 504 -> năm trăm lẻ bốn
      const hundreds = Math.floor(integerPart / 100);
      const remainder = integerPart % 100;
      result = `${units[hundreds]} trăm`;
      if (remainder > 0) {
        if (remainder < 10) {
          const remUnit = remainder === 4 ? 'tư' : units[remainder];
          result += ` lẻ ${remUnit}`;
        } else {
          result += ` ${readTens(remainder)}`;
        }
      }
    }

    if (decimalPart !== null && decimalPart > 0) {
      // Decimal digit reading: 4 -> "tư", 5 -> "năm", 1 -> "mốt" / "một"
      let decWord = units[decimalPart];
      if (decimalPart === 4) decWord = 'tư'; // Mekong Delta: "phẩy tư"
      if (decimalPart === 5) decWord = 'năm';
      result += ` phẩy ${decWord}`;
    }

    return result;
  }

  private speakText(phrase: string, rate = 1.15) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop prior queue

      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'vi-VN';
      utterance.rate = rate; // Fast responsive rate suitable for busy field work
      utterance.pitch = 1.0;

      // Select Vietnamese voice if available
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.startsWith('vi') || v.lang.includes('VIE'));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      this.setSpeakingState(true);
      utterance.onend = () => {
        this.setSpeakingState(false);
      };
      utterance.onerror = () => {
        this.setSpeakingState(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.setSpeakingState(false);
    }
  }

  // 1. Speak individual bag weight in colloquial Mekong Delta Vietnamese
  public speakWeight(weight: number, bagIndex?: number) {
    const vietnameseText = this.numberToVietnameseWords(weight);
    const phrase = bagIndex ? `Bao ${bagIndex}: ${vietnameseText}` : `${vietnameseText} ký`;
    this.speakText(phrase, 1.18);
  }

  // 2. Announce completed sheet summary (e.g. 10 or 20 bags)
  // e.g.: "Tờ một đủ mười bao, năm trăm lẻ bốn ký"
  public speakSheetSummary(sheetIndex: number, totalBagsInSheet: number, sheetWeight: number) {
    this.playSheetFinishChime();

    const sheetNames = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];
    const sheetWord = sheetNames[sheetIndex] || sheetIndex.toString();
    const bagCountWord = totalBagsInSheet === 10 ? 'mười' : totalBagsInSheet === 20 ? 'hai mươi' : totalBagsInSheet.toString();
    const weightWords = this.numberToVietnameseWords(sheetWeight);

    const announcement = `Tờ ${sheetWord} đủ ${bagCountWord} bao, ${weightWords} ký.`;

    // Delay slightly so the chime plays first
    setTimeout(() => {
      this.speakText(announcement, 1.1);
    }, 400);
  }
}

export const audioManager = new AudioManager();

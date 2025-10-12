// Sound Manager using Web Audio API for programmatic sound generation
class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  
  constructor() {
    // Check localStorage for saved preferences
    const savedMute = localStorage.getItem('game-sound-muted');
    const savedVolume = localStorage.getItem('game-sound-volume');
    
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
  }

  private getContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volumeMultiplier: number = 1) {
    if (this.isMuted) return;

    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const finalVolume = this.volume * volumeMultiplier;
    gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  // Ball throw whoosh sound
  playThrow() {
    if (this.isMuted) return;
    
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  // Ball impact sound (hit on curb)
  playImpact() {
    if (this.isMuted) return;
    
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  // Success sound (successful catch)
  playSuccess() {
    if (this.isMuted) return;
    
    // Play ascending notes
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'sine', 0.4);
      }, index * 80);
    });
  }

  // Fail sound (miss)
  playFail() {
    if (this.isMuted) return;
    
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
    
    gainNode.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }

  // Level up fanfare
  playLevelUp() {
    if (this.isMuted) return;
    
    const notes = [523.25, 587.33, 659.25, 783.99, 1046.50]; // C5, D5, E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'triangle', 0.5);
      }, index * 100);
    });
  }

  // Button click sound
  playClick() {
    this.playTone(800, 0.05, 'square', 0.2);
  }

  // Charging sound (looping while charging)
  playCharging() {
    this.playTone(440, 0.1, 'sine', 0.15);
  }

  // Win sound
  playWin() {
    if (this.isMuted) return;
    
    // Play triumphant ascending scale
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.3, 'triangle', 0.6);
      }, index * 120);
    });
  }

  // Mute/unmute toggle
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('game-sound-muted', this.isMuted.toString());
    return this.isMuted;
  }

  // Get mute status
  getMuted() {
    return this.isMuted;
  }

  // Set volume (0-1)
  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('game-sound-volume', this.volume.toString());
  }

  // Get volume
  getVolume() {
    return this.volume;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

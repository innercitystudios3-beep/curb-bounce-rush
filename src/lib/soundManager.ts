// Sound Manager using Web Audio API for programmatic sound generation
class SoundManager {
  private audioContext: AudioContext | null = null;
  private isMuted: boolean = false;
  private isMusicMuted: boolean = false;
  private volume: number = 0.5;
  private musicVolume: number = 0.3;
  private musicOscillator: OscillatorNode | null = null;
  private musicGain: GainNode | null = null;
  private musicPlaying: boolean = false;
  private musicInterval: number | null = null;
  
  constructor() {
    // Check localStorage for saved preferences
    const savedMute = localStorage.getItem('game-sound-muted');
    const savedMusicMute = localStorage.getItem('game-music-muted');
    const savedVolume = localStorage.getItem('game-sound-volume');
    const savedMusicVolume = localStorage.getItem('game-music-volume');
    
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
    if (savedMusicMute !== null) {
      this.isMusicMuted = savedMusicMute === 'true';
    }
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
    if (savedMusicVolume !== null) {
      this.musicVolume = parseFloat(savedMusicVolume);
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

  // Background music - chill lo-fi style beat
  startBackgroundMusic() {
    if (this.isMusicMuted || this.musicPlaying) return;
    
    this.musicPlaying = true;
    const ctx = this.getContext();
    
    // Create a simple looping melody pattern
    const bassNotes = [130.81, 146.83, 164.81, 146.83]; // C3, D3, E3, D3
    const melodyNotes = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33]; // C5, D5, E5, G5, E5, D5
    
    let bassIndex = 0;
    let melodyIndex = 0;
    let beatCount = 0;
    
    const playBeat = () => {
      if (this.isMusicMuted || !this.musicPlaying) return;
      
      // Bass on every beat
      this.playMusicNote(bassNotes[bassIndex % bassNotes.length], 0.4, 'triangle', 0.3);
      bassIndex++;
      
      // Melody every other beat
      if (beatCount % 2 === 0) {
        setTimeout(() => {
          if (!this.isMusicMuted && this.musicPlaying) {
            this.playMusicNote(melodyNotes[melodyIndex % melodyNotes.length], 0.3, 'sine', 0.15);
            melodyIndex++;
          }
        }, 100);
      }
      
      // Hi-hat pattern
      if (beatCount % 4 === 0 || beatCount % 4 === 2) {
        this.playMusicNoise(0.05, 0.08);
      }
      
      beatCount++;
    };
    
    // Start the beat loop (120 BPM = 500ms per beat)
    playBeat();
    this.musicInterval = window.setInterval(playBeat, 500);
  }
  
  stopBackgroundMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
  
  private playMusicNote(frequency: number, duration: number, type: OscillatorType, volumeMultiplier: number) {
    if (this.isMusicMuted) return;
    
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    const finalVolume = this.musicVolume * volumeMultiplier;
    gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }
  
  private playMusicNoise(duration: number, volume: number) {
    if (this.isMusicMuted) return;
    
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.setValueAtTime(this.musicVolume * volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + duration);
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

  // Coin collection sound
  playCoinCollect() {
    if (this.isMuted) return;
    
    // Play cheerful ascending notes
    const notes = [659.25, 783.99, 1046.50]; // E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.12, 'sine', 0.5);
      }, index * 60);
    });
  }

  // Achievement unlock celebration sound
  playAchievement() {
    if (this.isMuted) return;
    
    // Play triumphant fanfare with multiple notes
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1568.00]; // C5, E5, G5, C6, E6, G6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'triangle', 0.6);
      }, index * 100);
    });
  }

  // Milestone celebration sound (for 100 points)
  playMilestone() {
    if (this.isMuted) return;
    
    // Play exciting ascending arpeggio
    const notes = [783.99, 987.77, 1174.66, 1567.98]; // G5, B5, D6, G6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playTone(freq, 0.2, 'sine', 0.7);
      }, index * 80);
    });
  }

  // Mute/unmute SFX toggle
  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('game-sound-muted', this.isMuted.toString());
    return this.isMuted;
  }

  // Get SFX mute status
  getMuted() {
    return this.isMuted;
  }
  
  // Mute/unmute Music toggle
  toggleMusicMute() {
    this.isMusicMuted = !this.isMusicMuted;
    localStorage.setItem('game-music-muted', this.isMusicMuted.toString());
    
    if (this.isMusicMuted) {
      this.stopBackgroundMusic();
    } else if (this.musicPlaying === false) {
      this.startBackgroundMusic();
    }
    
    return this.isMusicMuted;
  }
  
  // Get Music mute status
  getMusicMuted() {
    return this.isMusicMuted;
  }

  // Set SFX volume (0-1)
  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('game-sound-volume', this.volume.toString());
  }

  // Get SFX volume
  getVolume() {
    return this.volume;
  }
  
  // Set Music volume (0-1)
  setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('game-music-volume', this.musicVolume.toString());
  }
  
  // Get Music volume
  getMusicVolume() {
    return this.musicVolume;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

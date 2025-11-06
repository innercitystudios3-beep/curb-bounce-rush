/**
 * Facebook Instant Games SDK Manager
 * Handles all FBInstant API interactions with graceful fallbacks
 */

declare global {
  interface Window {
    FBInstant?: any;
  }
}

class FBInstantManager {
  private isSupported: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && !!window.FBInstant;
  }

  /**
   * Check if running in Facebook Instant Games environment
   */
  isFBInstant(): boolean {
    return this.isSupported;
  }

  /**
   * Initialize the FBInstant SDK
   */
  async initializeAsync(): Promise<void> {
    if (!this.isSupported) {
      console.log('FBInstant not available - running in web mode');
      return;
    }

    try {
      await window.FBInstant.initializeAsync();
      this.isInitialized = true;
      console.log('FBInstant initialized successfully');
    } catch (error) {
      console.error('Failed to initialize FBInstant:', error);
      throw error;
    }
  }

  /**
   * Set loading progress (0-100)
   */
  setLoadingProgress(progress: number): void {
    if (!this.isSupported || !this.isInitialized) return;
    
    try {
      window.FBInstant.setLoadingProgress(Math.min(100, Math.max(0, progress)));
    } catch (error) {
      console.error('Failed to set loading progress:', error);
    }
  }

  /**
   * Start the game - must be called before game is playable
   */
  async startGameAsync(): Promise<void> {
    if (!this.isSupported || !this.isInitialized) {
      console.log('Skipping FBInstant.startGameAsync - not in Facebook environment');
      return;
    }

    try {
      await window.FBInstant.startGameAsync();
      console.log('Game started successfully');
    } catch (error) {
      console.error('Failed to start game:', error);
      throw error;
    }
  }

  /**
   * Get player data
   */
  async getPlayerDataAsync(keys: string[]): Promise<any> {
    if (!this.isSupported || !this.isInitialized) {
      return {};
    }

    try {
      return await window.FBInstant.player.getDataAsync(keys);
    } catch (error) {
      console.error('Failed to get player data:', error);
      return {};
    }
  }

  /**
   * Save player data
   */
  async setPlayerDataAsync(data: Record<string, any>): Promise<void> {
    if (!this.isSupported || !this.isInitialized) {
      return;
    }

    try {
      await window.FBInstant.player.setDataAsync(data);
      console.log('Player data saved successfully');
    } catch (error) {
      console.error('Failed to save player data:', error);
    }
  }

  /**
   * Get player name
   */
  getPlayerName(): string {
    if (!this.isSupported || !this.isInitialized) {
      return 'Player';
    }

    try {
      return window.FBInstant.player.getName() || 'Player';
    } catch (error) {
      console.error('Failed to get player name:', error);
      return 'Player';
    }
  }

  /**
   * Get player photo
   */
  getPlayerPhoto(): string {
    if (!this.isSupported || !this.isInitialized) {
      return '';
    }

    try {
      return window.FBInstant.player.getPhoto() || '';
    } catch (error) {
      console.error('Failed to get player photo:', error);
      return '';
    }
  }

  /**
   * Share game with custom message
   */
  async shareAsync(payload: {
    intent: 'SHARE' | 'REQUEST' | 'CHALLENGE' | 'INVITE';
    text?: string;
    image?: string;
    data?: any;
  }): Promise<void> {
    if (!this.isSupported || !this.isInitialized) {
      console.log('Share not available in web mode');
      return;
    }

    try {
      await window.FBInstant.shareAsync(payload);
      console.log('Share successful');
    } catch (error) {
      console.error('Failed to share:', error);
    }
  }

  /**
   * Get or create a leaderboard
   */
  async getLeaderboardAsync(name: string): Promise<any> {
    if (!this.isSupported || !this.isInitialized) {
      return null;
    }

    try {
      return await window.FBInstant.getLeaderboardAsync(name);
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      return null;
    }
  }

  /**
   * Set score on leaderboard
   */
  async setLeaderboardScore(leaderboardName: string, score: number): Promise<void> {
    if (!this.isSupported || !this.isInitialized) {
      return;
    }

    try {
      const leaderboard = await this.getLeaderboardAsync(leaderboardName);
      if (leaderboard) {
        await leaderboard.setScoreAsync(score);
        console.log('Score updated on leaderboard');
      }
    } catch (error) {
      console.error('Failed to set leaderboard score:', error);
    }
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboardEntries(leaderboardName: string, count: number = 10): Promise<any[]> {
    if (!this.isSupported || !this.isInitialized) {
      return [];
    }

    try {
      const leaderboard = await this.getLeaderboardAsync(leaderboardName);
      if (leaderboard) {
        const entries = await leaderboard.getEntriesAsync(count, 0);
        return entries || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get leaderboard entries:', error);
      return [];
    }
  }

  /**
   * Get context (playing with friends)
   */
  getContextID(): string | null {
    if (!this.isSupported || !this.isInitialized) {
      return null;
    }

    try {
      return window.FBInstant.context.getID();
    } catch (error) {
      console.error('Failed to get context ID:', error);
      return null;
    }
  }

  /**
   * Get players in current context
   */
  async getPlayersInContext(): Promise<any[]> {
    if (!this.isSupported || !this.isInitialized) {
      return [];
    }

    try {
      const players = await window.FBInstant.context.getPlayersAsync();
      return players || [];
    } catch (error) {
      console.error('Failed to get context players:', error);
      return [];
    }
  }

  /**
   * Load and show rewarded video ad
   */
  async showRewardedVideoAsync(): Promise<boolean> {
    if (!this.isSupported || !this.isInitialized) {
      console.log('Rewarded video not available in web mode');
      return false;
    }

    try {
      const rewardedVideo = await window.FBInstant.getRewardedVideoAsync(
        'YOUR_REWARDED_VIDEO_PLACEMENT_ID'
      );
      
      await rewardedVideo.loadAsync();
      await rewardedVideo.showAsync();
      
      console.log('Rewarded video shown successfully');
      return true;
    } catch (error) {
      console.error('Failed to show rewarded video:', error);
      return false;
    }
  }

  /**
   * Load and show interstitial ad
   */
  async showInterstitialAdAsync(): Promise<boolean> {
    if (!this.isSupported || !this.isInitialized) {
      console.log('Interstitial ad not available in web mode');
      return false;
    }

    try {
      const interstitial = await window.FBInstant.getInterstitialAdAsync(
        'YOUR_INTERSTITIAL_PLACEMENT_ID'
      );
      
      await interstitial.loadAsync();
      await interstitial.showAsync();
      
      console.log('Interstitial ad shown successfully');
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  /**
   * Preload interstitial ad for later use
   */
  async preloadInterstitialAdAsync(): Promise<any> {
    if (!this.isSupported || !this.isInitialized) {
      return null;
    }

    try {
      const interstitial = await window.FBInstant.getInterstitialAdAsync(
        'YOUR_INTERSTITIAL_PLACEMENT_ID'
      );
      await interstitial.loadAsync();
      console.log('Interstitial ad preloaded');
      return interstitial;
    } catch (error) {
      console.error('Failed to preload interstitial ad:', error);
      return null;
    }
  }
}

// Export singleton instance
export const fbInstant = new FBInstantManager();

import { ref } from 'vue';

import { invalidateYTMStreamCache } from '@/api/ytmusic';
import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { isDesktop } from '@/utils/env';
import { getImgUrl } from '@/utils/thumbnail';

class AudioService {
  private currentTrack: SongResult | null = null;

  private bypass = false;

  private playbackRate = 1.0;
  private currentSinkId: string = 'default';
  private _isLoading = ref(false);
  private _isBuffering = ref(false);
  private _isPlayingNative = ref(false);
  private _isSeeking: boolean = false;
  private _targetSeekTime: number | null = null;
  private _seekTimestamp: number = 0;
  private currentUrl: string | null = null;
  private _currentNativeDuration: number | null = null;
  private isTransitioningTrack = false;

  private operationLock = false;
  private operationLockTimer: ReturnType<typeof setTimeout> | null = null;
  private currentPlaySessionToken = 0;
  private pendingLoadCleanup: (() => void) | null = null;

  private defaultEQSettings: { [key: string]: number } = {
    '31': 0,
    '62': 0,
    '125': 0,
    '250': 0,
    '500': 0,
    '1000': 0,
    '2000': 0,
    '4000': 0,
    '8000': 0,
    '16000': 0
  };

  private callbacks: { [key: string]: Function[] } = {};
  private endWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private hasEmittedEndForCurrentSong = false;

  constructor() {
    this.bindAudioEvents();

    if ('mediaSession' in navigator) {
      this.initMediaSession();
    }

    const bypassState = localStorage.getItem('eqBypass');
    this.bypass = bypassState ? JSON.parse(bypassState) : false;

    this.forceResetOperationLock();
    if (isDesktop()) {
      this.restoreSavedAudioDevice();
    }
    window.addEventListener('beforeunload', () => this.forceResetOperationLock());
  }

  private bindAudioEvents() {
    if (!isDesktop() || !window?.api?.onPlaybackProgress) return;
    window.api.onPlaybackProgress((timeSecs: number) => {
      this._isPlayingNative.value = true;
      if (this._isBuffering.value) {
        this._isBuffering.value = false;
        this.emit('buffering', false);
      }
      if (this._isLoading.value) {
        this._isLoading.value = false;
      }
      this.emit('timeupdate', timeSecs);

      const duration = this.getDuration();
      if (
        this._isPlayingNative.value &&
        !this.hasEmittedEndForCurrentSong &&
        duration > 3 &&
        timeSecs >= duration - 0.5
      ) {
        console.log('[audioService] Playback reached end boundary via progress, triggering end');
        this.triggerPlaybackEnded();
      }
    });

    window.api.onPlaybackEnded(() => {
      console.log('[audioService] Native playback-ended event received');
      this.triggerPlaybackEnded();
    });

    if (window.api.onPlaybackBuffering) {
      window.api.onPlaybackBuffering((isBuffering: boolean) => {
        this._isBuffering.value = isBuffering;
        this.emit('buffering', isBuffering);
      });
    }

    if (window.api.onPlaybackStateChanged) {
      window.api.onPlaybackStateChanged((isPlaying: boolean) => {
        this._isPlayingNative.value = isPlaying;
        if (isPlaying) {
          this._isBuffering.value = false;
          this._isLoading.value = false;
          this.emit('buffering', false);
          this.emit('play');
        } else {
          if (!this.isTransitioningTrack) {
            this.emit('pause');
          }
        }
      });
    }
  }

  public triggerPlaybackEnded() {
    if (this.hasEmittedEndForCurrentSong) return;
    this.hasEmittedEndForCurrentSong = true;
    if (this.endWatchdogTimer) {
      clearTimeout(this.endWatchdogTimer);
      this.endWatchdogTimer = null;
    }
    this._isPlayingNative.value = false;
    this._isBuffering.value = false;
    this._isLoading.value = false;
    this.emit('end');
  }

  private initMediaSession() {
    navigator.mediaSession.setActionHandler('play', () => {
      window.api.audioResume();
      this._isPlayingNative.value = true;
      this._isBuffering.value = false;
      this._isLoading.value = false;
      this.updateMediaSessionState(true);
      this.emit('buffering', false);
      this.emit('play');
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.pause();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      this.stop();
    });

    navigator.mediaSession.setActionHandler('seekto', (event) => {
      if (event.seekTime !== undefined) {
        this.seek(event.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', async (event) => {
      try {
        const currentTime = await window.api.audioGetTime();
        const offset = event.seekOffset || 10;
        this.seek(Math.max(0, currentTime - offset));
      } catch (err) {
        console.error('Error seeking backward:', err);
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', async (event) => {
      try {
        const currentTime = await window.api.audioGetTime();
        const offset = event.seekOffset || 10;
        const duration = this.getDuration();
        this.seek(Math.min(duration, currentTime + offset));
      } catch (err) {
        console.error('Error seeking forward:', err);
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.emit('previoustrack');
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.emit('nexttrack');
    });
  }

  private updateMediaSessionMetadata(track: SongResult) {
    try {
      if (!('mediaSession' in navigator)) return;

      const artists = track.ar ? track.ar.map((a) => a.name) : track.artists?.map((a) => a.name);
      const album = track.al ? track.al.name : track.album;

      const artwork = ['96', '128', '192', '256', '384', '512', '1024'].map((size) => ({
        src: getImgUrl(track.picUrl, `${size}y${size}`),
        type: 'image/jpg',
        sizes: `${size}x${size}`
      }));

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.name || '',
        artist: artists ? artists.join(',') : '',
        album: album || '',
        artwork
      });
    } catch (error) {
      console.error('Error updating media session metadata:', error);
    }
  }

  private updateMediaSessionState(isPlaying: boolean) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    this.updateMediaSessionPositionState();
  }

  private async updateMediaSessionPositionState() {
    try {
      if (!('mediaSession' in navigator)) return;
      if ('setPositionState' in navigator.mediaSession) {
        const position = await window.api.audioGetTime();
        const duration = this.getDuration();

        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: this.playbackRate,
          position: Math.max(0, Math.min(position, duration))
        });
      }
    } catch (error) {
      console.error('Error updating media session location status:', error);
    }
  }

  private emit(event: string, ...args: any[]) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => callback(...args));
    }
  }

  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event: string, callback: Function) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      this.callbacks[event] = eventCallbacks.filter((cb) => cb !== callback);
    }
  }

  clearAllListeners() {
    this.callbacks = {};
  }

  private setupEQ() {
    this.bypass = false;
    window.api.audioSetEqBypass(this.bypass);
  }

  private applyBypassState() {
    window.api.audioSetEqBypass(this.bypass);
  }

  public isEQEnabled(): boolean {
    return !this.bypass;
  }

  public setEQEnabled(enabled: boolean) {
    this.bypass = !enabled;
    localStorage.setItem('eqBypass', JSON.stringify(this.bypass));
  }

  public setEQFrequencyGain(frequency: string, gain: number) {
    this.saveEQSettings(frequency, gain);
    window.api.audioSetEqBand(parseFloat(frequency), gain);
  }

  public resetEQ() {
    localStorage.removeItem('eqSettings');
  }

  public getAllEQSettings(): { [key: string]: number } {
    return this.loadEQSettings();
  }

  public getCurrentPreset(): string | null {
    return localStorage.getItem('currentPreset');
  }

  public setCurrentPreset(preset: string): void {
    localStorage.setItem('currentPreset', preset);
  }

  private saveEQSettings(frequency: string, gain: number) {
    const settings = this.loadEQSettings();
    settings[frequency] = gain;
    localStorage.setItem('eqSettings', JSON.stringify(settings));
  }

  private loadEQSettings(): { [key: string]: number } {
    const savedSettings = localStorage.getItem('eqSettings');
    return savedSettings ? JSON.parse(savedSettings) : { ...this.defaultEQSettings };
  }

  private setOperationLock(): boolean {
    if (this.operationLock) {
      return false;
    }
    this.operationLock = true;

    if (this.operationLockTimer) clearTimeout(this.operationLockTimer);
    this.operationLockTimer = setTimeout(() => {
      console.warn('Automatic release of operation lock upon timeout');
      this.releaseOperationLock();
    }, 10000);

    return true;
  }

  public releaseOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  public forceResetOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  public play(
    url: string,
    track: SongResult,
    isPlay: boolean = true,
    seekTime: number = 0,
    _existingSound?: HTMLAudioElement
  ): Promise<void> {
    if (this.currentUrl && !url && !track) {
      window.api.audioResume();
      this._isPlayingNative.value = true;
      this._isBuffering.value = false;
      this._isLoading.value = false;
      this.updateMediaSessionState(true);
      this.emit('buffering', false);
      this.emit('play');
      return Promise.resolve();
    }

    this.forceResetOperationLock();
    this.hasEmittedEndForCurrentSong = false;
    if (this.endWatchdogTimer) {
      clearTimeout(this.endWatchdogTimer);
      this.endWatchdogTimer = null;
    }
    this.setOperationLock();

    if (!url || !track) {
      this.releaseOperationLock();
      return Promise.reject(new Error('Missing required parameters: urlandtrack'));
    }

    const isSameUrl = this.currentUrl === url;

    if (isSameUrl && seekTime <= 0) {
      this.currentTrack = track;
      if (isPlay) {
        window.api.audioResume();
        this._isPlayingNative.value = true;
        this._isBuffering.value = false;
        this._isLoading.value = false;
        this.updateMediaSessionState(true);
        this.emit('buffering', false);
        this.emit('play');
      }
      this.updateMediaSessionMetadata(track);
      this.releaseOperationLock();
      return Promise.resolve();
    }

    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }

    const sessionToken = ++this.currentPlaySessionToken;

    return new Promise<void>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 1;

      const tryPlay = async () => {
        if (sessionToken !== this.currentPlaySessionToken) {
          console.log(`[audioService] Play session #${sessionToken} superseded before starting`);
          this.releaseOperationLock();
          resolve(undefined as any);
          return;
        }

        if (!this._isBuffering.value) {
          this._isLoading.value = true;
          this._isBuffering.value = true;
          this.emit('buffering', true);
        }
        this.currentTrack = track;
        this.hasEmittedEndForCurrentSong = false;

        try {
          if (isPlay) {
            const rawDur = track.dt || track.duration || 0;
            const durationMs = rawDur > 1000 ? rawDur : rawDur * 1000;
            const container = track.mimeType || undefined;
            const userAgent = track.streamUserAgent || undefined;
            await window.api.audioPlay(
              url,
              undefined,
              durationMs || undefined,
              container,
              userAgent,
              seekTime > 0 ? seekTime : undefined
            );

            if (sessionToken !== this.currentPlaySessionToken) {
              console.log(`[audioService] Play session #${sessionToken} superseded after audioPlay`);
              this.releaseOperationLock();
              resolve(undefined as any);
              return;
            }

            this._isPlayingNative.value = true;
            this._isLoading.value = false;
            this._isBuffering.value = false;
            this.emit('buffering', false);
            try {
              this._currentNativeDuration = await window.api.audioGetDuration();
            } catch (e) {
              console.warn('Failed to get native duration', e);
            }
            this.updateMediaSessionState(true);
          }

          if (sessionToken !== this.currentPlaySessionToken) {
            console.log(`[audioService] Play session #${sessionToken} superseded before finalize`);
            this.releaseOperationLock();
            resolve(undefined as any);
            return;
          }

          this._isLoading.value = false;
          this._isBuffering.value = false;

          const savedVolume = localStorage.getItem('volume');
          this.applyVolume(savedVolume ? parseFloat(savedVolume) : 1);

          this.currentUrl = url;

          this.updateMediaSessionMetadata(track);
          this.emit('play');
          this.emit('buffering', false);
          this.releaseOperationLock();
          resolve(undefined as any);
        } catch (err) {
          this._isLoading.value = false;
          this._isBuffering.value = false;
          this.emit('buffering', false);

          if (sessionToken !== this.currentPlaySessionToken) {
            console.log(`[audioService] Play session #${sessionToken} superseded, ignoring error silently`);
            this.releaseOperationLock();
            resolve(undefined as any);
            return;
          }

          console.error('Audio play failed:', err);
          this.emit('playerror', { track, error: err });

          const message = err instanceof Error ? err.message : String(err ?? '');
          const isNetworkOrDecodeError =
            /status 40[13]|403 Forbidden|429 Too Many|Failed to fetch|ERR_CONNECTION_REFUSED|Decode error|Stream request error/i.test(
              message
            );

          const isLosslessTrack = Boolean(
            (track as any).qualityBadge ||
            track.mimeType === 'audio/flac' ||
            (url && url.includes('.flac'))
          );

          if (isLosslessTrack) {
            console.warn(
              '[audioService] Lossless stream failed to play; marking failed and falling back to YouTube audio:',
              message
            );
            if (track?.id) {
              invalidateYTMStreamCache(track.id);
            }
            (track as any).losslessAttemptFailed = true;
            (track as any).qualityBadge = undefined;
            track.playMusicUrl = undefined;
            this.releaseOperationLock();
            this.emit('url_expired', track);
            reject(new Error('Lossless stream failed, falling back to YouTube audio'));
            return;
          }

          if (isNetworkOrDecodeError) {
            console.warn(
              '[audioService] resolved URL failed or was refused; skipping retry and re-resolving'
            );

            const rejected = this.markUrlRejected(track);
            this.emit('url_expired', rejected);
            this.releaseOperationLock();
            reject(new Error('Stream URL failed, re-resolving'));
            return;
          }

          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
            setTimeout(tryPlay, 1000 * retryCount);
          } else {
            const rejected = this.markUrlRejected(track);
            this.emit('url_expired', rejected);
            this.releaseOperationLock();
            reject(new Error('Audio loading failed, please try switching to other songs'));
          }
        }
      };

      tryPlay();
    }).finally(() => {
      this.releaseOperationLock();
    });
  }

  private markUrlRejected(track: SongResult): SongResult {
    if (track?.id) {
      invalidateYTMStreamCache(track.id);
    }
    const rejected = { ...track, urlRejectedAt: Date.now() };
    this.currentTrack = rejected;

    void (async () => {
      try {
        const { usePlayerCoreStore } = await import('@/store/modules/playerCore');
        const playerCore = usePlayerCoreStore();

        if (playerCore.playMusic?.id !== track.id) return;

        playerCore.playMusic.urlRejectedAt = rejected.urlRejectedAt;
        playerCore.playMusic.playMusicUrl = undefined;
        playerCore.playMusic.mimeType = undefined;
        playerCore.playMusic.streamUserAgent = undefined;
        playerCore.playMusicUrl = '';
      } catch (error) {
        console.warn('[audioService] could not record the rejected URL:', error);
      }
    })();
  }

  public async pause(): Promise<void> {
    this.currentPlaySessionToken++;
    this.forceResetOperationLock();
    try {
      await window.api.audioPause();
      this._isPlayingNative.value = false;
      this._isBuffering.value = false;
      this._isLoading.value = false;
      this.updateMediaSessionState(false);
      this.emit('buffering', false);
      this.emit('pause');
    } catch (error) {
      console.error('Failed to pause audio:', error);
    }
  }

  public async resume(): Promise<void> {
    this.forceResetOperationLock();
    try {
      await window.api.audioResume();
      this._isPlayingNative.value = true;
      this._isBuffering.value = false;
      this._isLoading.value = false;
      this.updateMediaSessionState(true);
      this.emit('buffering', false);
      this.emit('play');
    } catch (error) {
      console.error('Failed to resume audio:', error);
    }
  }

  public async prepareNextTrack(): Promise<void> {
    this.currentPlaySessionToken++;
    this.forceResetOperationLock();
    this.hasEmittedEndForCurrentSong = false;
    this._currentNativeDuration = null;
    this.clearSeeking();
    if (this.endWatchdogTimer) {
      clearTimeout(this.endWatchdogTimer);
      this.endWatchdogTimer = null;
    }

    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }
    this._isPlayingNative.value = false;
    this._isBuffering.value = true;
    this._isLoading.value = true;
    this.currentUrl = null;
    this.currentTrack = null;
    this.emit('buffering', true);
    this.emit('timeupdate', 0);
    this.isTransitioningTrack = true;
    try {
      await window.api.audioStop();
    } catch (error) {
      console.error('Failed to prepare next track audio:', error);
    } finally {
      setTimeout(() => {
        this.isTransitioningTrack = false;
      }, 400);
    }
  }

  public async stop(): Promise<void> {
    this.currentPlaySessionToken++;
    this.forceResetOperationLock();
    this.hasEmittedEndForCurrentSong = false;
    this._currentNativeDuration = null;
    this.clearSeeking();
    if (this.endWatchdogTimer) {
      clearTimeout(this.endWatchdogTimer);
      this.endWatchdogTimer = null;
    }

    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }
    try {
      await window.api.audioStop();
      this._isPlayingNative.value = false;
      this._isBuffering.value = false;
      this._isLoading.value = false;
      this.updateMediaSessionState(false);
      this.emit('buffering', false);
      this.emit('stop');
      this.currentUrl = null;
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
    this.currentTrack = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  public isSeeking(): boolean {
    if (!this._isSeeking) return false;
    if (Date.now() - this._seekTimestamp > 1500) {
      this._isSeeking = false;
      this._targetSeekTime = null;
      return false;
    }
    return true;
  }

  public getTargetSeekTime(): number | null {
    if (!this.isSeeking()) return null;
    return this._targetSeekTime;
  }

  public clearSeeking(): void {
    this._isSeeking = false;
    this._targetSeekTime = null;
    this._seekTimestamp = 0;
  }

  public async seek(time: number): Promise<void> {
    this.forceResetOperationLock();
    this.hasEmittedEndForCurrentSong = false;
    if (this.endWatchdogTimer) {
      clearTimeout(this.endWatchdogTimer);
      this.endWatchdogTimer = null;
    }

    const duration = this.getDuration();
    if (duration > 2 && time >= duration - 0.8) {
      console.log('[audioService] Seeked directly to end of track, triggering playback end');
      this.triggerPlaybackEnded();
      return;
    }

    this._isSeeking = true;
    this._targetSeekTime = time;
    this._seekTimestamp = Date.now();

    try {
      this.emit('seek_start', time);
      await window.api.audioSeek(time);
      this.emit('seek', time);
      this.updateMediaSessionPositionState();
    } catch (error) {
      this.clearSeeking();
      console.warn('[audioService] SeekOperation non-fatal warning:', error);
    }
  }

  public setVolume(volume: number) {
    this.applyVolume(volume);
  }

  private applyVolume(volume: number) {
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    window.api.audioSetVolume(normalizedVolume);

    localStorage.setItem('volume', normalizedVolume.toString());
  }

  public setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    window.api.audioSetPlaybackRate(rate).catch((err: unknown) => {
      console.error('[audioService] Failed to set native playback rate:', err);
    });
    this.updateMediaSessionPositionState();
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  getDuration(): number {
    if (this._currentNativeDuration) return this._currentNativeDuration;
    if (!this.currentTrack) return 0;
    const rawDur = this.currentTrack.dt || this.currentTrack.duration || 0;
    return rawDur > 1000 ? rawDur / 1000 : rawDur;
  }

  getCurrentTrack(): SongResult | null {
    return this.currentTrack;
  }

  public setBuffering(buffering: boolean): void {
    this._isBuffering.value = buffering;
    this.emit('buffering', buffering);
  }

  public setLoading(loading: boolean): void {
    this._isLoading.value = loading;
    if (loading) {
      this.emit('buffering', true);
    } else if (!this._isBuffering.value) {
      this.emit('buffering', false);
    }
  }

  isLoading(): boolean {
    return this._isLoading.value;
  }

  isBuffering(): boolean {
    if (this._isPlayingNative.value && !this._isBuffering.value) {
      return false;
    }
    return this._isBuffering.value || this._isLoading.value;
  }

  isActuallyPlaying(): boolean {
    if (!this.currentUrl && !this.currentTrack) return false;
    try {
      return this._isPlayingNative.value;
    } catch (error) {
      console.error('Error checking playback status:', error);
      return false;
    }
  }

  public async getAudioOutputDevices(): Promise<AudioOutputDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      return audioOutputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Speaker ${index + 1}`,
        isDefault: device.deviceId === 'default' || device.deviceId === ''
      }));
    } catch (error) {
      console.error('Failed to enumerate audio devices:', error);
      return [{ deviceId: 'default', label: 'Default', isDefault: true }];
    }
  }

  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      this.currentSinkId = deviceId;
      localStorage.setItem('audioOutputDeviceId', deviceId);
      return true;
    } catch (error) {
      console.error('Failed to set audio output device:', error);
      return false;
    }
  }

  public getCurrentSinkId(): string {
    return this.currentSinkId;
  }

  private async restoreSavedAudioDevice(): Promise<void> {
    const savedDeviceId = localStorage.getItem('audioOutputDeviceId');
    if (savedDeviceId && savedDeviceId !== 'default') {
      try {
        await this.setAudioOutputDevice(savedDeviceId);
      } catch (error) {
        console.warn(
          'Failed to restore audio output device and fell back to default device:',
          error
        );
        localStorage.removeItem('audioOutputDeviceId');
        this.currentSinkId = 'default';
      }
    }
  }
}

export const audioService = new AudioService();

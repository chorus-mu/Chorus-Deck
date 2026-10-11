export class WebAudioEngine {
  private audio: HTMLAudioElement | null = null;
  private progressListeners = new Set<(timeSecs: number) => void>();
  private endedListeners = new Set<() => void>();
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private currentVolume: number = 1;
  private playbackRate: number = 1;
  private fallbackDuration: number | null = null;
  private currentUrl: string | null = null;
  private isEndedEmitted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.getOrCreateAudio();
    }
  }

  private getOrCreateAudio(): HTMLAudioElement {
    if (!this.audio && typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';

      this.audio.addEventListener('timeupdate', () => {
        if (!this.audio) return;
        this.emitProgress(this.audio.currentTime);
      });

      this.audio.addEventListener('ended', () => {
        this.emitEnded();
      });

      this.audio.addEventListener('pause', () => {
        this.stopProgressInterval();
      });

      this.audio.addEventListener('play', () => {
        this.startProgressInterval();
      });

      this.audio.addEventListener('error', () => {
        const err = this.audio?.error;
        console.warn('[WebAudioEngine] HTMLAudioElement error event:', err?.code, err?.message);
      });
    }
    return this.audio!;
  }

  private startProgressInterval(): void {
    this.stopProgressInterval();
    this.progressInterval = setInterval(() => {
      if (this.audio && !this.audio.paused) {
        this.emitProgress(this.audio.currentTime);
      }
    }, 200);
  }

  private stopProgressInterval(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private emitProgress(currentTime: number): void {
    for (const listener of this.progressListeners) {
      try {
        listener(currentTime);
      } catch (err) {
        console.error('[WebAudioEngine] progress listener error:', err);
      }
    }
  }

  private emitEnded(): void {
    if (this.isEndedEmitted) return;
    this.isEndedEmitted = true;
    this.stopProgressInterval();
    for (const listener of this.endedListeners) {
      try {
        listener();
      } catch (err) {
        console.error('[WebAudioEngine] ended listener error:', err);
      }
    }
  }

  public async play(
    url: string,
    _cookie?: string,
    durationMs?: number,
    _container?: string,
    _userAgent?: string
  ): Promise<void> {
    const audio = this.getOrCreateAudio();
    this.isEndedEmitted = false;
    this.fallbackDuration = durationMs ? durationMs / 1000 : null;

    const streamTarget = url.includes('googlevideo.com')
      ? `/__audio_stream?url=${encodeURIComponent(url)}&ua=${encodeURIComponent(_userAgent || '')}`
      : url;

    if (this.currentUrl !== streamTarget) {
      this.currentUrl = streamTarget;
      audio.src = streamTarget;
    }

    audio.volume = this.currentVolume;
    audio.playbackRate = this.playbackRate;

    try {
      await audio.play();
      this.startProgressInterval();
    } catch (err: any) {
      console.warn('[WebAudioEngine] audio.play() rejected:', err);
      throw err;
    }
  }

  public pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    this.stopProgressInterval();
  }

  public async resume(): Promise<void> {
    if (!this.audio) return;
    this.isEndedEmitted = false;
    try {
      await this.audio.play();
      this.startProgressInterval();
    } catch (err) {
      console.warn('[WebAudioEngine] resume rejected:', err);
      throw err;
    }
  }

  public stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.currentUrl = null;
    this.isEndedEmitted = false;
    this.stopProgressInterval();
  }

  public setVolume(vol: number): void {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.audio) {
      this.audio.volume = this.currentVolume;
    }
  }

  public seek(timeSecs: number): void {
    if (!this.audio) return;
    this.isEndedEmitted = false;
    const dur = this.getDuration();
    if (dur && dur > 5 && timeSecs >= dur - 0.5) {
      this.audio.currentTime = Math.max(0, dur - 0.1);
      this.emitEnded();
      return;
    }
    this.audio.currentTime = Math.max(0, timeSecs);
    this.emitProgress(this.audio.currentTime);
  }

  public getTime(): number {
    return this.audio?.currentTime ?? 0;
  }

  public getDuration(): number | null {
    if (this.audio && Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      return this.audio.duration;
    }
    return this.fallbackDuration;
  }

  public setPlaybackRate(rate: number): void {
    this.playbackRate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
  }

  public onProgress(cb: (timeSecs: number) => void): () => void {
    this.progressListeners.add(cb);
    return () => {
      this.progressListeners.delete(cb);
    };
  }

  public onEnded(cb: () => void): () => void {
    this.endedListeners.add(cb);
    return () => {
      this.endedListeners.delete(cb);
    };
  }
}

export const webAudio = new WebAudioEngine();

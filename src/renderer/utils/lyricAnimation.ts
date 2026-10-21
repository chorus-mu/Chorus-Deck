import type { LyricAnimationStyle, LyricConfig } from '@/types/lyric';

export interface LyricLineStyleOptions {
  index: number;
  nowIndex: number;
  style?: LyricAnimationStyle | string;
  alignment?: 'left' | 'center' | 'right';
  focusEnabled?: boolean;
  activeGrowth?: number;
  morphState?: 'collapsed' | 'expanding' | 'morphing' | 'settling' | 'normal' | 'collapsing';
}

export interface ContinuousScrollSpringConfig {
  initial?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  precision?: number;
  snapThreshold?: number;
  style?: LyricAnimationStyle | string;
}

export class ContinuousScrollSpring {
  private current: number;
  private target: number;
  private velocity: number;
  private stiffness: number;
  private damping: number;
  private mass: number;
  private precision: number;
  private snapThreshold: number;

  constructor(options: ContinuousScrollSpringConfig = {}) {
    this.current = options.initial ?? 0;
    this.target = options.initial ?? 0;
    this.velocity = 0;
    this.mass = options.mass ?? 1.0;
    this.precision = options.precision ?? 0.25;
    this.snapThreshold = options.snapThreshold ?? 500;

    if (options.style === 'chorus_bouncy') {
      this.stiffness = options.stiffness ?? 85;
      this.damping = options.damping ?? 15.0;
    } else {
      this.stiffness = options.stiffness ?? 55;
      this.damping = options.damping ?? 14.5;
    }
  }

  public setStyle(style: LyricAnimationStyle | string): void {
    if (style === 'chorus_bouncy') {
      this.stiffness = 85;
      this.damping = 15.0;
    } else {
      this.stiffness = 55;
      this.damping = 14.5;
    }
  }

  public setTarget(newTarget: number, snap = false): void {
    const delta = Math.abs(newTarget - this.current);
    if (snap || delta > this.snapThreshold) {
      this.current = newTarget;
      this.target = newTarget;
      this.velocity = 0;
      return;
    }
    this.target = newTarget;
  }

  public setPosition(pos: number): void {
    this.current = pos;
    this.velocity = 0;
  }

  public getCurrent(): number {
    return this.current;
  }

  public getTarget(): number {
    return this.target;
  }

  public getVelocity(): number {
    return this.velocity;
  }

  public isSettled(): boolean {
    return (
      Math.abs(this.current - this.target) < this.precision &&
      Math.abs(this.velocity) < this.precision
    );
  }

  public reset(): void {
    this.velocity = 0;
  }

  public step(dt: number): { current: number; settled: boolean } {
    const safeDt = Math.min(Math.max(dt, 0.0005), 0.032);
    const subSteps = safeDt > 0.016 ? 2 : 1;
    const subDt = safeDt / subSteps;

    for (let i = 0; i < subSteps; i++) {
      const displacement = this.current - this.target;
      const springForce = -this.stiffness * displacement;
      const dampingForce = -this.damping * this.velocity;
      const acceleration = (springForce + dampingForce) / this.mass;

      this.velocity += acceleration * subDt;
      this.current += this.velocity * subDt;
    }

    if (this.isSettled()) {
      this.current = this.target;
      this.velocity = 0;
      return { current: this.current, settled: true };
    }

    return { current: this.current, settled: false };
  }
}

export interface LyricLineLayout {
  index: number;
  top: number;
  height: number;
}

export class LyricLayoutCache {
  private cache: Map<number, LyricLineLayout> = new Map();

  public set(index: number, top: number, height: number): void {
    this.cache.set(index, { index, top, height });
  }

  public get(index: number): LyricLineLayout | undefined {
    return this.cache.get(index);
  }

  public has(index: number): boolean {
    return this.cache.has(index);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export interface WordSweepOptions {
  lineIndex: number;
  nowIndex: number;
  currentTime: number;
  word: {
    text: string;
    startTime: number;
    duration: number;
  };
  isTailWord?: boolean;
  activeClr: string;
  inactiveClr: string;
  backlitClr?: string;
  config?: Partial<LyricConfig>;
}

export function computeWordSweepStyle(options: WordSweepOptions): Record<string, any> {
  const {
    lineIndex,
    nowIndex,
    currentTime,
    word,
    activeClr,
    inactiveClr,
    backlitClr,
    config = {}
  } = options;

  if (lineIndex !== nowIndex) {
    return {
      color: inactiveClr,
      textShadow: 'none',
      filter: 'none',
      transition: 'color 0.25s ease'
    };
  }

  if (word?.startTime == null || Number.isNaN(Number(word.startTime))) {
    return {
      color: inactiveClr,
      WebkitTextFillColor: 'initial',
      textShadow: 'none',
      filter: 'none',
      transition: 'color 0.25s ease'
    };
  }

  const wordStartTime = Number(word.startTime);
  const duration = Math.max(Number(word.duration) || 0, 1);
  const wordEndTime = wordStartTime + duration;

  const hasGlow = config.lyricsGlowEffect !== false;
  const backlitShadow = backlitClr
    ? `0 0 8px ${backlitClr}, 0 0 20px ${backlitClr}`
    : '0 0 8px var(--lrc-active-backlit), 0 0 20px var(--lrc-active-backlit-halo)';
  const filterGlow = backlitClr
    ? `drop-shadow(0 0 14px ${backlitClr})`
    : 'drop-shadow(0 0 14px var(--lrc-active-backlit, rgba(255, 255, 255, 0.45)))';

  if (currentTime < wordStartTime) {
    return {
      color: inactiveClr,
      WebkitTextFillColor: 'initial',
      textShadow: hasGlow
        ? backlitClr
          ? `0 0 6px ${backlitClr}`
          : '0 0 6px var(--lrc-active-backlit)'
        : 'none',
      filter: 'none',
      transition: 'color 0.25s ease'
    };
  }

  if (currentTime >= wordEndTime) {
    return {
      color: activeClr,
      WebkitTextFillColor: 'initial',
      textShadow: hasGlow ? backlitShadow : 'none',
      filter: hasGlow ? filterGlow : 'none',
      transition: 'none'
    };
  }

  const progress = Math.min(Math.max((currentTime - wordStartTime) / duration, 0), 1);
  const p = progress * 100;

  const feather = 1.5;
  const startStop = Math.max(0, p - feather).toFixed(2);
  const midStop = p.toFixed(2);
  const endStop = Math.min(100, p + feather).toFixed(2);

  return {
    backgroundImage: `linear-gradient(to right, ${activeClr} 0%, ${activeClr} ${startStop}%, color-mix(in srgb, ${activeClr} 65%, ${inactiveClr}) ${midStop}%, ${inactiveClr} ${endStop}%, ${inactiveClr} 100%)`,
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: 'none',
    filter: hasGlow ? filterGlow : 'none',
    transition: 'none'
  };
}

export function computeLyricLineStyle(options: LyricLineStyleOptions): Record<string, any> {
  const { index, nowIndex, alignment = 'left', focusEnabled = true } = options;
  if (!focusEnabled) return {};

  const isCurrent = index === nowIndex;

  const origin =
    alignment === 'center'
      ? 'center center'
      : alignment === 'right'
        ? 'right center'
        : 'left center';

  const springTiming = 'cubic-bezier(0.25, 1, 0.5, 1)';

  if (isCurrent) {
    return {
      opacity: 1,
      transform: 'scale(1)',
      filter: 'blur(0px)',
      transformOrigin: origin,
      willChange: 'opacity, transform, filter',
      transition: `opacity 0.45s ${springTiming}, transform 0.45s ${springTiming}, filter 0.45s ${springTiming}`
    };
  }

  const dist = Math.abs(index - nowIndex);
  let opacity = 0.16;
  let scale = 0.93;
  let blur = 2.2;

  if (dist === 1) {
    opacity = 0.68;
    scale = 0.98;
    blur = 0.6;
  } else if (dist === 2) {
    opacity = 0.44;
    scale = 0.96;
    blur = 1.2;
  } else if (dist === 3) {
    opacity = 0.28;
    scale = 0.94;
    blur = 1.8;
  } else {
    opacity = Math.max(0.12, 0.2 - (dist - 4) * 0.02);
    scale = 0.93;
    blur = Math.min(2.5, 2.2 + (dist - 4) * 0.05);
  }

  return {
    opacity,
    transform: `scale(${scale.toFixed(3)})`,
    filter: `blur(${blur.toFixed(1)}px)`,
    transformOrigin: origin,
    willChange: dist <= 3 ? 'opacity, transform, filter' : 'auto',
    transition: `opacity 0.45s ${springTiming}, transform 0.45s ${springTiming}, filter 0.45s ${springTiming}`
  };
}

export function isIdeographicScript(text: string): boolean {
  if (!text) return false;
  return /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text);
}

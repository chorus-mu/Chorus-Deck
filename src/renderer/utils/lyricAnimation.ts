import type { LyricAnimationStyle } from '@/types/lyric';

export interface LyricLineStyleOptions {
  index: number;
  nowIndex: number;
  style: LyricAnimationStyle | string;
  alignment?: 'left' | 'center' | 'right';
  focusEnabled?: boolean;
}

export function computeLyricLineStyle(options: LyricLineStyleOptions): Record<string, any> {
  const { index, nowIndex, style, alignment = 'left', focusEnabled = true } = options;
  if (!focusEnabled) return {};

  const distance = Math.abs(index - nowIndex);
  const isPast = index < nowIndex;
  const isCurrent = index === nowIndex;
  const isUpcoming = index > nowIndex;

  const origin =
    alignment === 'center'
      ? 'center center'
      : alignment === 'right'
        ? 'right center'
        : 'left center';

  switch (style) {
    case 'apple_spring': {
      let transform = 'translateY(0px) scale(1.05)';
      let opacity = 1;
      let filter = 'none';

      if (isPast) {
        // Smooth logarithmic decay upwards
        const offset = Math.min(distance * 8, 28);
        const scale = Math.max(0.88, 1 - distance * 0.035);
        transform = `translateY(-${offset}px) scale(${scale})`;
        opacity = distance === 1 ? 0.42 : Math.max(0.18, 0.3 - distance * 0.04);
        filter = distance === 1 ? 'blur(0.6px)' : `blur(${Math.min(distance * 0.9, 2.4)}px)`;
      } else if (isUpcoming) {
        // Natural Apple Music bottom-up lead-in
        const offset = Math.min(distance * 10, 36);
        const scale = Math.max(0.9, 1 - distance * 0.03);
        transform = `translateY(${offset}px) scale(${scale})`;
        opacity = distance === 1 ? 0.5 : Math.max(0.2, 0.36 - distance * 0.05);
        filter = distance === 1 ? 'blur(0.5px)' : `blur(${Math.min(distance * 0.8, 2.2)}px)`;
      }

      return {
        opacity,
        filter,
        transform,
        transformOrigin: origin,
        willChange: 'transform, opacity, filter',
        transition:
          'transform 0.65s cubic-bezier(0.2, 0.9, 0.25, 1), opacity 0.5s cubic-bezier(0.2, 0.9, 0.25, 1), filter 0.5s ease'
      };
    }

    case 'bouncy_pop': {
      const scale = isCurrent ? 1.08 : 0.94;
      const opacity = isCurrent ? 1 : distance === 1 ? 0.5 : 0.28;
      return {
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: origin,
        transition:
          'transform 0.48s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease'
      };
    }

    case 'carousel_3d': {
      if (isCurrent) {
        return {
          opacity: 1,
          transform: 'perspective(1200px) rotateX(0deg) translateZ(28px) scale(1.04)',
          transformOrigin: origin,
          transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease'
        };
      }
      const d = Math.min(3, distance);
      const rot = isPast ? Math.min(32, d * 16) : -Math.min(32, d * 16);
      const ty = isPast ? -d * 8 : d * 8;
      const tz = -d * 28;
      const opacity = Math.max(0.18, 0.52 - d * 0.14);
      return {
        opacity,
        transform: `perspective(1200px) rotateX(${rot}deg) translateZ(${tz}px) translateY(${ty}px)`,
        transformOrigin: origin,
        transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease'
      };
    }

    case 'cyberpunk_glow': {
      const scale = isCurrent ? 1.04 : 0.98;
      const opacity = isCurrent ? 1 : distance === 1 ? 0.45 : 0.25;
      return {
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: origin,
        transition:
          'transform 0.35s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.35s ease'
      };
    }

    case 'kinetic_slant': {
      let transform = 'skewX(0deg) translateX(0px) scale(1.05)';
      let opacity = 1;
      if (isPast) {
        transform = 'skewX(2.5deg) translateX(14px) scale(0.96)';
        opacity = 0.35;
      } else if (isUpcoming) {
        transform = 'skewX(-2.5deg) translateX(-14px) scale(0.96)';
        opacity = 0.35;
      }
      return {
        opacity,
        transform,
        transformOrigin: origin,
        transition:
          'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease'
      };
    }

    case 'minimal_fade': {
      return {
        opacity: isCurrent ? 1 : distance === 1 ? 0.5 : 0.25,
        fontWeight: isCurrent ? 700 : 400,
        transform: 'none',
        transition: 'opacity 0.4s ease, font-weight 0.3s ease'
      };
    }

    case 'smooth_fluid':
    case 'chorusmusic_1':
    default: {
      const opacity = isCurrent ? 1 : distance === 1 ? 0.55 : 0.35;
      const scale = isCurrent ? 1.05 : 1;
      return {
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: origin,
        transition:
          'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.45s cubic-bezier(0.25, 1, 0.5, 1)'
      };
    }
  }
}

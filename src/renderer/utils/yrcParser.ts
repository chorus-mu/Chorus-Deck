import {
  parseYrc,
  parseTTML,
  parseLrcLike,
  parseQrc,
  type LyricLine as AmllLyricLine
} from '@applemusic-like-lyrics/lyric';

export interface WordData {
  readonly text: string;
  readonly startTime: number;
  readonly duration: number;
  readonly space?: boolean;
}

export interface LyricLine {
  readonly startTime: number;
  readonly duration: number;
  readonly fullText: string;
  readonly words: readonly WordData[];
}

export interface MetaData {
  readonly time?: number;
  readonly key?: string;
  readonly content: string;
}

export interface ParsedLyrics {
  readonly metadata: readonly MetaData[];
  readonly lyrics: readonly LyricLine[];
  readonly offset: number;
}

export class LyricParseError extends Error {
  constructor(
    message: string,
    public readonly line?: string
  ) {
    super(message);
    this.name = 'LyricParseError';
  }
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: LyricParseError };

export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * Transforms AMLL parsed LyricLine array into Chorus-Deck's LyricLine structure
 */
const convertAmllLines = (amllLines: AmllLyricLine[]): LyricLine[] => {
  const result: LyricLine[] = [];

  for (let i = 0; i < amllLines.length; i++) {
    const line = amllLines[i];
    const startTime = line.startTime ?? 0;
    let duration = line.endTime && line.endTime > startTime ? line.endTime - startTime : 0;

    // Fallback duration if missing
    if (duration <= 0) {
      if (i < amllLines.length - 1 && amllLines[i + 1].startTime > startTime) {
        duration = amllLines[i + 1].startTime - startTime;
      } else {
        duration = 3000;
      }
    }

    const words: WordData[] = [];
    let fullText = '';

    if (line.words && line.words.length > 0) {
      const rawText = line.words.map((w) => w.word).join('');
      fullText = rawText.trim();

      for (let wIdx = 0; wIdx < line.words.length; wIdx++) {
        const w = line.words[wIdx];
        const wDuration =
          w.endTime && w.endTime > w.startTime ? w.endTime - w.startTime : Math.max(duration, 200);

        // Check if next word has leading space or current word trailing space
        const hasSpace =
          w.word.endsWith(' ') ||
          (wIdx < line.words.length - 1 && line.words[wIdx + 1].word.startsWith(' '));

        words.push({
          text: w.word.trim(),
          startTime: w.startTime ?? startTime,
          duration: wDuration,
          space: hasSpace
        });
      }
    } else {
      fullText = (line.romanLyric || line.translatedLyric || '').trim();
    }

    result.push({
      startTime,
      duration,
      fullText,
      words
    });
  }

  return result;
};

/**
 * Parses lyrics using official @applemusic-like-lyrics/lyric parser
 * Supports TTML (XML), YRC (Netease syllable format), QRC, and LRC-like (SPL/enhanced/plain)
 */
export const parseLyrics = (lyricsStr: string): ParseResult<ParsedLyrics> => {
  if (typeof lyricsStr !== 'string') {
    return {
      success: false,
      error: new LyricParseError('Input parameters must be strings')
    };
  }

  const trimmed = lyricsStr.trim();
  if (!trimmed) {
    return {
      success: true,
      data: {
        metadata: [],
        lyrics: [],
        offset: 0
      }
    };
  }

  try {
    let amllLines: AmllLyricLine[] = [];
    const metadata: MetaData[] = [];
    let offset = 0;

    // 1. TTML format check (e.g. <?xml or <tt ...>)
    if (trimmed.startsWith('<?xml') || trimmed.startsWith('<tt') || trimmed.includes('<tt xmlns=')) {
      try {
        const ttmlResult = parseTTML(trimmed);
        amllLines = ttmlResult.lines;
        if (ttmlResult.metadata) {
          for (const [k, v] of ttmlResult.metadata) {
            metadata.push({ key: k, content: v.join(', ') });
          }
        }
      } catch (ttmlErr) {
        console.warn('AMLL TTML parse failed, trying other parsers:', ttmlErr);
      }
    }

    // 2. YRC format check (Netease verbatim [start,dur](start,dur)text)
    if (amllLines.length === 0 && /^\[\d+,\d+\]/m.test(trimmed)) {
      try {
        amllLines = parseYrc(trimmed);
      } catch (yrcErr) {
        console.warn('AMLL YRC parse failed, falling back to LRC-like:', yrcErr);
      }
    }

    // 3. QRC format check (QQ Music xml / syllable format)
    if (amllLines.length === 0 && (trimmed.includes('<?xml') || trimmed.includes('<Lyric_1'))) {
      try {
        amllLines = parseQrc(trimmed);
      } catch (qrcErr) {
        console.warn('AMLL QRC parse failed, falling back to LRC-like:', qrcErr);
      }
    }

    // 4. Fallback to parseLrcLike (supports plain LRC, enhanced LRC, SPL)
    if (amllLines.length === 0) {
      try {
        const lrcResult = parseLrcLike(trimmed);
        amllLines = lrcResult.lines;
        if (lrcResult.metadata) {
          for (const [k, v] of lrcResult.metadata) {
            const val = v.join(', ');
            if (k.toLowerCase() === 'offset') {
              offset = parseInt(val, 10) || 0;
            }
            metadata.push({ key: k, content: val });
          }
        }
      } catch (lrcErr) {
        console.error('AMLL parseLrcLike failed:', lrcErr);
        return {
          success: false,
          error: new LyricParseError(
            `AMLL failed to parse lyrics: ${lrcErr instanceof Error ? lrcErr.message : 'unknown error'}`
          )
        };
      }
    }

    const convertedLyrics = convertAmllLines(amllLines);

    // Sort by startTime
    convertedLyrics.sort((a, b) => a.startTime - b.startTime);

    // Apply offset if any
    const finalLyrics = convertedLyrics.map((line) => {
      const newStartTime = Math.max(0, line.startTime - offset);
      const newWords = line.words.map((w) => ({
        ...w,
        startTime: Math.max(0, w.startTime - offset)
      }));
      return { ...line, startTime: newStartTime, words: newWords };
    });

    return {
      success: true,
      data: {
        metadata,
        lyrics: finalLyrics,
        offset
      }
    };
  } catch (error) {
    return {
      success: false,
      error: new LyricParseError(
        `An error occurred during AMLL parsing: ${error instanceof Error ? error.message : 'unknown error'}`
      )
    };
  }
};

export default parseLyrics;

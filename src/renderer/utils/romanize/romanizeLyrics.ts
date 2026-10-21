import type { ILyric, ILyricText } from '@/types/music';

import { containsKana, romanizeJapaneseLine } from './japaneseRomanizer';

export function containsHangul(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 0xac00 && code <= 0xd7af) || (code >= 0x1100 && code <= 0x11ff)) {
      return true;
    }
  }
  return false;
}

export function isJapaneseLyrics(lyrics: ILyricText[]): boolean {
  return lyrics.some(item => containsKana(item.text));
}

export function applyAutomaticRomanization(lyric: ILyric): ILyric {
  if (!lyric || !lyric.lrcArray || lyric.lrcArray.length === 0) {
    return lyric;
  }

  const isJapanese = isJapaneseLyrics(lyric.lrcArray);

  if (!isJapanese) {
    return lyric;
  }

  for (const item of lyric.lrcArray) {
    if (item.romaText && item.romaText.trim()) {
      continue;
    }

    if (item.text && item.text.trim()) {
      const romanized = romanizeJapaneseLine(item.text);
      if (romanized && romanized !== item.text.trim()) {
        item.romaText = romanized;
      }
    }
  }

  return lyric;
}

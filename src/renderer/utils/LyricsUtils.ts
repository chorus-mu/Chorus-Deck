import { containsKana, romanizeJapaneseLine } from './romanize/japaneseRomanizer';
import { applyAutomaticRomanization } from './romanize/romanizeLyrics';

export class LyricsUtils {
  public static containsKana(text: string): boolean {
    return containsKana(text);
  }

  public static romanizeJapanese(text: string): string {
    return romanizeJapaneseLine(text);
  }

  public static applyRomanization(lyric: any): any {
    return applyAutomaticRomanization(lyric);
  }
}

export default LyricsUtils;

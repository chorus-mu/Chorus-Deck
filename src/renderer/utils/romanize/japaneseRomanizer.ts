const HEPBURN: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', ふゅ: 'fyu',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  しぇ: 'she', じぇ: 'je', ちぇ: 'che',
  つぁ: 'tsa', つぃ: 'tsi', つぇ: 'tse', つぉ: 'tso',
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu'
};

const WORDS: Record<string, string> = {
  は: 'wa',
  へ: 'e',
  を: 'o',
  こんにちは: 'konnichiwa',
  こんばんは: 'konbanwa'
};

const TAILS: [string, string][] = [
  ['では', 'dewa'],
  ['には', 'niwa'],
  ['とは', 'towa']
];

const COMMON_KANJI_READINGS: [string, string][] = [
  ['想定外', 'そうていがい'],
  ['想定', 'そうてい'],
  ['不安定', 'ふあんてい'],
  ['安定', 'あんてい'],
  ['違う', 'ちがう'],
  ['違って', 'ちがって'],
  ['違い', 'ちがい'],
  ['違', 'ちが'],
  ['切なさ', 'せつなさ'],
  ['切ない', 'せつない'],
  ['大切', 'たいせつ'],
  ['抱きしめて', 'だきしめて'],
  ['抱きしめ', 'だきしめ'],
  ['忘れないで', 'わすれないで'],
  ['忘れない', 'わすれない'],
  ['見つめて', 'みつめて'],
  ['信じている', 'しんじている'],
  ['信じて', 'しんじて'],
  ['愛してる', 'あいしてる'],
  ['愛した', 'あいした'],
  ['愛して', 'あいして'],
  ['逢いたい', 'あいたい'],
  ['会いたい', 'あいたい'],
  ['届かない', 'とどかない'],
  ['届けて', 'とどけて'],
  ['届いて', 'とどいて'],
  ['振り向いて', 'ふりむいて'],
  ['立ち止まる', 'たちどまる'],
  ['立ち止まり', 'たちどまり'],
  ['消えぬ', 'きえぬ'],
  ['消えない', 'きえない'],
  ['消えていく', 'きえていく'],
  ['消えて', 'きえて'],
  ['壊して', 'こわして'],
  ['壊れた', 'こわれた'],
  ['溢れる', 'あふれる'],
  ['溢れ', 'あふれ'],
  ['零れ', 'こぼれ'],
  ['揺れる', 'ゆれる'],
  ['悲しみ', 'かなしみ'],
  ['優しさ', 'やさしさ'],
  ['温もり', 'ぬくもり'],
  ['寂しさ', 'さびしさ'],
  ['苦しみ', 'くるしみ'],
  ['一人', 'ひとり'],
  ['二人', 'ふたり'],
  ['片方', 'かたほう'],
  ['両手', 'りょうて'],
  ['恋人', 'こいびと'],
  ['運命', 'うんめい'],
  ['永遠', 'えいえん'],
  ['未来', 'みらい'],
  ['記憶', 'きおく'],
  ['世界', 'せかい'],
  ['奇跡', 'きせき'],
  ['約束', 'やくそく'],
  ['笑顔', 'えがお'],
  ['瞬間', 'しゅんかん'],
  ['時間', 'じかん'],
  ['希望', 'きぼう'],
  ['絶望', 'ぜつぼう'],
  ['孤独', 'こどく'],
  ['痛み', 'いたみ'],
  ['理由', 'りゆう'],
  ['自由', 'じゆう'],
  ['言葉', 'ことば'],
  ['太陽', 'たいよう'],
  ['昨日', 'きのう'],
  ['明日', 'あした'],
  ['今日', 'きょう'],
  ['一緒', 'いっしょ'],
  ['真実', 'しんじつ'],
  ['想い', 'おもい'],
  ['願い', 'ねがい'],
  ['誓い', 'ちかい'],
  ['祈り', 'いのり'],
  ['叫び', 'さけび'],
  ['涙', 'なみだ'],
  ['瞳', 'ひとみ'],
  ['桜', 'さくら'],
  ['風', 'かぜ'],
  ['星空', 'ほしぞら'],
  ['夜空', 'よぞら'],
  ['青空', 'あおぞら'],
  ['星', 'ほし'],
  ['月明かり', 'つきあかり'],
  ['月', 'つき'],
  ['雨音', 'あまおと'],
  ['雨', 'あめ'],
  ['雪', 'ゆき'],
  ['海', 'うみ'],
  ['空', 'そら'],
  ['夜', 'よる'],
  ['朝', 'あさ'],
  ['光', 'ひかり'],
  ['影', 'かげ'],
  ['夢', 'ゆめ'],
  ['歌', 'うた'],
  ['唄', 'うた'],
  ['声', 'こえ'],
  ['音', 'おと'],
  ['手', 'て'],
  ['目', 'め'],
  ['胸', 'むね'],
  ['心', 'こころ'],
  ['身体', 'からだ'],
  ['命', 'いのち'],
  ['花', 'はな'],
  ['道', 'みち'],
  ['君', 'きみ'],
  ['僕', 'ぼく'],
  ['私', 'わたし'],
  ['俺', 'おれ'],
  ['貴方', 'あなた'],
  ['誰', 'だれ'],
  ['人', 'ひと'],
  ['名', 'な'],
  ['日', 'ひ'],
  ['今', 'いま'],
  ['時', 'とき'],
  ['愛', 'あい'],
  ['恋', 'こい'],
  ['闇', 'やみ'],
  ['光', 'ひかり'],
  ['外', 'そと'],
  ['炎', 'ほのお'],
  ['熱', 'ねつ'],
  ['傷', 'きず'],
  ['旅', 'たび'],
  ['扉', 'とびら'],
  ['色', 'いろ'],
  ['白', 'しろ'],
  ['黒', 'くろ'],
  ['赤', 'あか'],
  ['青', 'あお'],
  ['歩', 'ある'],
  ['走', 'はし'],
  ['飛', 'と'],
  ['生', 'い'],
  ['死', 'し'],
  ['見', 'み'],
  ['聞', 'き'],
  ['言', 'い'],
  ['思', 'おも'],
  ['知', 'し'],
  ['感', 'かん'],
  ['強', 'つよ'],
  ['弱', 'よわ'],
  ['遠', 'とお'],
  ['近', 'ちか'],
  ['深', 'ふか'],
  ['高', 'たか'],
  ['消', 'き'],
  ['咲', 'さ'],
  ['散', 'ち'],
  ['響', 'ひび'],
  ['抱', 'だ'],
  ['切', 'せつ']
];

export function isKana(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 0x3040 && code <= 0x309f) || (code >= 0x30a0 && code <= 0x30ff);
}

export function isKanji(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return (code >= 0x4e00 && code <= 0x9faf) || (code >= 0x3400 && code <= 0x4dbf);
}

export function containsKana(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isKana(text[i])) return true;
  }
  return false;
}

export function katakanaToHiragana(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x30a1 && code <= 0x30f6) {
      result += String.fromCharCode(code - 0x60);
    } else {
      result += text[i];
    }
  }
  return result;
}

export function romanizeJapaneseWord(word: string): string {
  if (WORDS[word]) {
    return WORDS[word];
  }

  for (const [tail, romaji] of TAILS) {
    if (word.endsWith(tail) && word.length > tail.length) {
      return `${romanizeJapaneseWord(word.slice(0, -tail.length))} ${romaji}`;
    }
  }

  const chars = Array.from(katakanaToHiragana(word));
  let romaji = '';
  let i = 0;

  while (i < chars.length) {
    const char = chars[i];

    if (char === 'っ') {
      const next = chars[i + 1];
      if (next) {
        const nextTwo = chars.slice(i + 1, i + 3).join('');
        const nextSyllable = HEPBURN[nextTwo] || HEPBURN[next] || '';
        if (nextSyllable.startsWith('ch')) {
          romaji += 't';
        } else if (nextSyllable.length > 0 && !'aiueo'.includes(nextSyllable[0])) {
          romaji += nextSyllable[0];
        }
      }
      i++;
      continue;
    }

    if (char === 'ん') {
      romaji += 'n';
      const next = chars[i + 1];
      if (next && 'aiueoy'.includes(HEPBURN[next]?.[0] || '')) {
        romaji += "'";
      }
      i++;
      continue;
    }

    if (char === 'ー') {
      const last = romaji[romaji.length - 1];
      if (last && 'aiueo'.includes(last)) {
        romaji += last;
      }
      i++;
      continue;
    }

    if (i + 1 < chars.length) {
      const two = chars.slice(i, i + 2).join('');
      if (HEPBURN[two]) {
        romaji += HEPBURN[two];
        i += 2;
        continue;
      }
    }

    if (HEPBURN[char]) {
      romaji += HEPBURN[char];
    } else if (isKanji(char)) {
      // Do not leave raw Kanji characters in romanized text output
      // Skip unresolved ideographs so romaji remains strictly Latin letters
    } else {
      romaji += char;
    }
    i++;
  }

  return romaji;
}

const PARTICLES_COMPOUND = [
  'だから', 'だけど', 'なんだ', 'なんて', 'なんか',
  'から', 'まで', 'より', 'では', 'には', 'とは',
  'ので', 'のに', 'けど', 'です'
];

const PARTICLES_SINGLE = [
  'は', 'が', 'を', 'に', 'へ', 'で', 'と', 'の', 'も', 'よ', 'ね', 'か', 'さ', 'だ'
];

export function segmentJapaneseIntoWords(text: string): string[] {
  if (!text) return [];

  const blocks = text.split(/([ \t\n、。！？!?,"'()「」『』・]+)/).filter(Boolean);
  const words: string[] = [];

  for (const block of blocks) {
    if (/^[ \t\n、。！？!?,"'()「」『』・]+$/.test(block)) {
      continue;
    }

    let current = '';
    let i = 0;
    while (i < block.length) {
      let matchedCompound = '';
      for (const p of PARTICLES_COMPOUND) {
        if (block.startsWith(p, i)) {
          matchedCompound = p;
          break;
        }
      }

      if (matchedCompound) {
        if (current.trim()) {
          words.push(current.trim());
          current = '';
        }
        words.push(matchedCompound);
        i += matchedCompound.length;
        continue;
      }

      const ch = block[i];
      if (current.length >= 1 && PARTICLES_SINGLE.includes(ch)) {
        const nextCh = block[i + 1];
        if (!nextCh || !'ぁぃぅぇぉっゃゅょァィゥェォッャュョー'.includes(nextCh)) {
          words.push(current.trim());
          words.push(ch);
          current = '';
          i++;
          continue;
        }
      }

      current += ch;
      i++;
    }

    if (current.trim()) {
      words.push(current.trim());
    }
  }

  return words;
}

export function romanizeJapaneseLine(line: string): string {
  if (!line || !line.trim()) return '';

  let normalized = line;
  for (const [kanji, reading] of COMMON_KANJI_READINGS) {
    if (normalized.includes(kanji)) {
      normalized = normalized.split(kanji).join(` ${reading} `);
    }
  }

  const words = segmentJapaneseIntoWords(normalized);
  const romanizedWords = words
    .map(token => romanizeJapaneseWord(token))
    .filter(r => r && r.trim().length > 0);

  return romanizedWords
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

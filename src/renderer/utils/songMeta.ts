import { normalizeArtistList } from '@/hooks/MusicHook';

export const stripReleaseYear = (text?: string | null): string => {
  if (!text) return '';
  return text
    .replace(/\s*[•·]\s*\d{4}\b.*$/g, '')
    .replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]$/g, '')
    .trim();
};

export interface CleanSongMeta {
  title: string;
  artist: string;
  album: string;
}

export const extractCleanSongMeta = (song: any): CleanSongMeta => {
  if (!song || !song.name) {
    return { title: '', artist: '', album: '' };
  }

  const rawAlbum =
    song.al?.name ||
    (typeof song.album === 'string' ? song.album : null) ||
    (typeof song.album === 'object' ? song.album?.name : null) ||
    '';
  let album = rawAlbum && !/^\d{4}$/.test(rawAlbum.trim()) ? stripReleaseYear(rawAlbum) : '';

  const rawArtistList = (song.ar || song.artists || []) as any[];
  const normalized = normalizeArtistList(rawArtistList, album);
  let artist = normalized.map((a) => a.name).filter(Boolean).join(', ');
  if (!album) {
    for (const item of rawArtistList) {
      const name = typeof item === 'string' ? item : item?.name;
      if (typeof name === 'string' && /\s+[-–—]\s+/.test(name)) {
        const parts = name.split(/\s+[-–—]\s+/);
        if (parts[1] && parts[1].trim()) {
          album = stripReleaseYear(parts[1].trim());
          break;
        }
      }
    }
  }

  if (!album && typeof song.name === 'string') {
    const match = song.name.match(/\((Live[^)]*|Deluxe[^)]*|Session[^)]*)\)/i);
    if (match && match[1]) {
      album = stripReleaseYear(match[1].trim());
    }
  }

  const title = stripReleaseYear(song.name) || song.name || '';

  return {
    title,
    artist: stripReleaseYear(artist) || 'Unknown Artist',
    album: album || 'Unknown Album'
  };
};

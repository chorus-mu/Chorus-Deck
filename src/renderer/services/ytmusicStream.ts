import { getYTMStream } from '@/api/ytmusic';
import type { SongResult } from '@/types/music';

const VIDEO_ID_PATTERN = /^[\w-]{6,20}$/;

export const isYTMusicTrack = (song: Partial<SongResult> | undefined | null): boolean =>
  song?.source === 'ytmusic';

export const getYTMVideoId = (song: Partial<SongResult>): string => {
  const raw = typeof song?.id === 'string' ? song.id : '';
  return VIDEO_ID_PATTERN.test(raw) ? raw : '';
};

export interface ResolvedYTMStream {
  url: string;
  videoId: string;
  durationMs?: number;
  thumbnail?: string;
  album?: string;
  mimeType: string;
  userAgent: string;
  bitrate: number;
  expiresAt: number;
}

export const resolveYTMusicStream = async (song: SongResult): Promise<ResolvedYTMStream> => {
  const videoId = getYTMVideoId(song);

  if (!videoId) {
    throw new Error('Track does not carry a valid YouTube video id');
  }

  const artistName = (song.ar || song.artists)?.[0]?.name || (song as any).artist || '';
  const stream = await getYTMStream(videoId, undefined, {
    title: song.name,
    artist: artistName
  });

  if (!stream?.url) {
    throw new Error('YouTube did not return a playable stream');
  }

  const durationMs =
    stream.durationSeconds && stream.durationSeconds > 0
      ? stream.durationSeconds * 1000
      : stream.approxDurationMs > 0
        ? stream.approxDurationMs
        : undefined;

  if (durationMs && !song.dt) {
    song.dt = durationMs;
  }

  if (stream.thumbnail && !song.picUrl) {
    song.picUrl = stream.thumbnail;
  }

  if (stream.album && !song.album) {
    song.album = stream.album;
  }

  song.videoId = videoId;
  song.mimeType = stream.mimeType;
  song.streamUserAgent = stream.userAgent;

  return {
    url: stream.url,
    videoId,
    durationMs,
    thumbnail: stream.thumbnail,
    mimeType: stream.mimeType,
    userAgent: stream.userAgent,
    bitrate: stream.bitrate,
    expiresAt: Date.now() + Math.min(stream.expiresInSeconds, 1800) * 1000
  };
};

import { getYTMStream } from '@/api/ytmusic';
import type { SongResult } from '@/types/music';

import { matchLosslessStream } from './losslessService';

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
  qualityBadge?: string;
}

export const resolveYTMusicStream = async (song: SongResult): Promise<ResolvedYTMStream> => {
  const videoId = getYTMVideoId(song);

  if (!videoId) {
    throw new Error('Track does not carry a valid YouTube video id');
  }

  const artistName = (song.ar || song.artists)?.[0]?.name || (song as any).artist || '';
  const forceFresh = Boolean((song as any).urlRejectedAt);

  const ytmStreamPromise = getYTMStream(
    videoId,
    undefined,
    {
      title: song.name,
      artist: artistName
    },
    forceFresh
  ).catch((err) => {
    console.debug('[ytmusicStream] YouTube stream pre-fetch note:', err);
    return null;
  });

  let isLosslessMode = false;
  try {
    const { useSettingsStore } = await import('@/store/modules/settings');
    const settingsStore = useSettingsStore();
    isLosslessMode = settingsStore.setData?.audioQualityMode === 'lossless';
  } catch (err) {
    console.debug('[ytmusicStream] Failed to load settings:', err);
  }

  const allowLossless = isLosslessMode && !(song as any).losslessAttemptFailed;

  if (allowLossless) {
    try {
      const losslessMatch = await matchLosslessStream(song.name, artistName, song.dt);
      if (losslessMatch?.url) {
        song.videoId = videoId;
        song.mimeType = losslessMatch.mimeType;
        (song as any).qualityBadge = losslessMatch.qualityBadge;

        return {
          url: losslessMatch.url,
          videoId,
          durationMs: song.dt,
          thumbnail: song.picUrl,
          album: song.album,
          mimeType: losslessMatch.mimeType,
          userAgent: '',
          bitrate: losslessMatch.bitrate,
          expiresAt: Date.now() + 3600 * 1000,
          qualityBadge: losslessMatch.qualityBadge
        };
      }
    } catch (err) {
      console.debug('[ytmusicStream] Lossless match fallback to YouTube AAC:', err);
    }
  } else {
    (song as any).qualityBadge = undefined;
  }

  const stream =
    (await ytmStreamPromise) ||
    (await getYTMStream(
      videoId,
      undefined,
      {
        title: song.name,
        artist: artistName
      },
      forceFresh
    ));

  if (!stream?.url) {
    throw new Error('YouTube did not return a playable stream');
  }

  const durationMs =
    stream.durationSeconds && stream.durationSeconds > 0
      ? stream.durationSeconds * 1000
      : stream.approxDurationMs > 0
        ? stream.approxDurationMs
        : undefined;

  if (durationMs) {
    if (!song.dt) song.dt = durationMs;
    if (!song.duration) song.duration = Math.round(durationMs / 1000);
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

  (song as any).qualityBadge = undefined;

  return {
    url: stream.url,
    videoId,
    durationMs,
    thumbnail: stream.thumbnail,
    mimeType: stream.mimeType,
    userAgent: stream.userAgent,
    bitrate: stream.bitrate,
    expiresAt: Date.now() + Math.min(stream.expiresInSeconds, 1800) * 1000,
    qualityBadge: undefined
  };
};

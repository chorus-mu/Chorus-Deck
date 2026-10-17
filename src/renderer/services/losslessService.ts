import { filePathToLocalUrl } from '../../shared/localUrl';

export interface LosslessMatchResult {
  url: string;
  bitrate: number;
  mimeType: string;
  container: 'flac' | 'alac' | 'm4a';
  qualityBadge: 'LOSSLESS' | 'HI-RES';
  source: 'local' | 'tidal' | 'unm' | 'archive';
}

const cleanString = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/feat\..*/i, '')
    .replace(/ft\..*/i, '')
    .replace(/official\s*(music\s*)?video/gi, '')
    .replace(/audio/gi, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

async function queryLocalLossless(
  title: string,
  artist: string,
  targetDurationSec?: number
): Promise<LosslessMatchResult | null> {
  try {
    if (typeof window === 'undefined' || !window.api?.dbGetAllLocalMusic) {
      return null;
    }

    const localList = await window.api.dbGetAllLocalMusic();
    if (!Array.isArray(localList) || localList.length === 0) {
      return null;
    }

    const cleanT = cleanString(title);
    const cleanA = cleanString(artist);
    if (!cleanT || cleanT.length < 2) return null;

    const match = localList.find((entry) => {
      const ext = entry.filePath.slice(entry.filePath.lastIndexOf('.')).toLowerCase();
      const isLosslessFormat = ext === '.flac' || ext === '.wav' || ext === '.alac';
      if (!isLosslessFormat) return false;

      const entryTitle = cleanString(entry.title || '');
      const entryArtist = cleanString(entry.artist || '');

      const titleMatches =
        entryTitle === cleanT ||
        (cleanT.length > 4 && entryTitle.includes(cleanT)) ||
        (entryTitle.length > 4 && cleanT.includes(entryTitle));

      if (!titleMatches) return false;

      if (cleanA && entryArtist) {
        const artistMatches =
          entryArtist.includes(cleanA) ||
          cleanA.includes(entryArtist);
        if (!artistMatches) return false;
      }

      if (targetDurationSec && targetDurationSec > 10 && entry.duration > 0) {
        if (Math.abs(entry.duration - targetDurationSec) > 4) return false;
      }

      return true;
    });

    if (match) {
      const ext = match.filePath.slice(match.filePath.lastIndexOf('.')).toLowerCase();
      const container = ext === '.alac' ? 'alac' : 'flac';
      const isHiRes = match.fileSize > 35 * 1024 * 1024; // >35MB usually indicates 24-bit 96k FLAC

      return {
        url: filePathToLocalUrl(match.filePath),
        bitrate: isHiRes ? 2116000 : 1411200,
        mimeType: 'audio/flac',
        container,
        qualityBadge: isHiRes ? 'HI-RES' : 'LOSSLESS',
        source: 'local'
      };
    }
  } catch (err) {
    console.debug('[LosslessService] Local library lookup skipped:', err);
  }
  return null;
}

async function queryTidalHiFi(
  title: string,
  artist: string,
  targetDurationSec?: number
): Promise<LosslessMatchResult | null> {
  try {
    if (typeof window === 'undefined' || !window.api?.invoke) {
      return null;
    }

    const res = await window.api.invoke<any>('lossless:resolve-track', {
      title,
      artist,
      durationSec: targetDurationSec ?? null
    });

    if (res && res.url) {
      return {
        url: res.url,
        bitrate: res.bitrate || 1411200,
        mimeType: res.mimeType || 'audio/flac',
        container: (res.container as 'flac' | 'alac' | 'm4a') || 'flac',
        qualityBadge: (res.qualityBadge as 'LOSSLESS' | 'HI-RES') || 'LOSSLESS',
        source: (res.source as 'local' | 'tidal' | 'unm' | 'archive') || 'tidal'
      };
    }
  } catch (err) {
    console.debug('[LosslessService] Native HiFi resolve error:', err);
  }
  return null;
}

async function queryUNMLossless(
  _title: string,
  _artist: string,
  _targetDurationSec?: number
): Promise<LosslessMatchResult | null> {
  // Public kuwo/migu worker endpoints return 400 or have DNS expiration.
  // Skipped gracefully to keep console completely clean.
  return null;
}

async function queryArchiveLossless(
  title: string,
  artist: string,
  targetDurationSec?: number
): Promise<LosslessMatchResult | null> {
  try {
    const cleanT = cleanString(title);
    const cleanA = cleanString(artist);
    if (!cleanT || cleanT.length < 3) return null;

    const query = encodeURIComponent(`${cleanA} ${cleanT}`.trim());
    const searchUrl = `https://archive.org/advancedsearch.php?q=${query}+AND+mediatype:audio+AND+format:FLAC&fl[]=identifier,title,creator&rows=5&output=json`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const docs = data?.response?.docs;
    if (!Array.isArray(docs) || docs.length === 0) return null;

    for (const doc of docs) {
      if (cleanA && cleanA.length >= 2) {
        const creator = cleanString(doc.creator || '');
        const docTitle = cleanString(doc.title || '');
        const artistInDoc = creator.includes(cleanA) || cleanA.includes(creator) || docTitle.includes(cleanA);
        if (!artistInDoc) {
          continue;
        }
      }

      const id = doc.identifier;
      const metaCtrl = new AbortController();
      const metaTimeout = setTimeout(() => metaCtrl.abort(), 2500);

      const metaRes = await fetch(`https://archive.org/metadata/${id}/files`, { signal: metaCtrl.signal });
      clearTimeout(metaTimeout);

      if (!metaRes.ok) continue;
      const meta = await metaRes.json();
      const files = meta?.result;
      if (!Array.isArray(files)) continue;

      const flacFile = files.find((f: any) => {
        if (!f.name || !f.name.toLowerCase().endsWith('.flac')) return false;

        if (targetDurationSec && targetDurationSec > 10 && f.length) {
          const fileDurationSec = parseFloat(f.length);
          if (!isNaN(fileDurationSec) && fileDurationSec > 0) {
            if (Math.abs(fileDurationSec - targetDurationSec) > 4) {
              return false;
            }
          }
        }

        const fn = cleanString(f.name);
        const fTitle = cleanString(f.title || '');

        const exactMatch = fn === cleanT || fTitle === cleanT;
        const substringMatch =
          cleanT.length >= 5 &&
          (fn.includes(cleanT) || fTitle.includes(cleanT) || (fTitle.length >= 5 && cleanT.includes(fTitle)));

        return exactMatch || substringMatch;
      });

      if (flacFile) {
        const streamUrl = `https://archive.org/download/${id}/${encodeURIComponent(flacFile.name)}`;
        const is24Bit = flacFile.format?.includes('24bit') || Number(flacFile.size) > 35 * 1024 * 1024;
        return {
          url: streamUrl,
          bitrate: is24Bit ? 2116000 : 1411200,
          mimeType: 'audio/flac',
          container: 'flac',
          qualityBadge: is24Bit ? 'HI-RES' : 'LOSSLESS',
          source: 'archive'
        };
      }
    }
  } catch (err) {
    console.debug('[LosslessService] Archive FLAC match skipped:', err);
  }
  return null;
}

export async function matchLosslessStream(
  title: string,
  artist: string,
  targetDurationMs?: number
): Promise<LosslessMatchResult | null> {
  if (!title) return null;

  const durationSec = targetDurationMs && targetDurationMs > 0 ? targetDurationMs / 1000 : undefined;

  const localMatch = await queryLocalLossless(title, artist, durationSec);
  if (localMatch) {
    console.info(`[LosslessService] Match FOUND [Tier 1: Local]: ${localMatch.qualityBadge} for "${title}"`);
    return localMatch;
  }

  const tidalResult = await queryTidalHiFi(title, artist, durationSec);
  if (tidalResult) {
    console.info(`[LosslessService] Match FOUND [Tier 2: Tidal]: ${tidalResult.qualityBadge} for "${title}"`);
    return tidalResult;
  }

  const unmResult = await queryUNMLossless(title, artist, durationSec);
  if (unmResult) {
    console.info(`[LosslessService] Match FOUND [Tier 3: UNM]: ${unmResult.qualityBadge} for "${title}"`);
    return unmResult;
  }

  const archiveResult = await queryArchiveLossless(title, artist, durationSec);
  if (archiveResult) {
    console.info(`[LosslessService] Match FOUND [Tier 3.5: Archive FLAC]: ${archiveResult.qualityBadge} for "${title}"`);
    return archiveResult;
  }

  return null;
}

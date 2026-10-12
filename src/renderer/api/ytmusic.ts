export interface YTMSong {
  id: string;
  title: string;
  artists: { name: string; id?: string }[];
  album?: string;
  duration?: string;
  thumbnail: string;
}

export interface YTMPlaylist {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail: string;
}

export interface YTMBrowseEndpoint {
  browseId: string;
  params?: string;
}

export interface YTMSection {
  title: string;
  items: (YTMSong | YTMPlaylist)[];
}

export interface YTMPlaylistDetail {
  id: string;
  title: string;
  description?: string;
  author?: string;
  thumbnail: string;
  songCount: number;
  songs: YTMSong[];
  songsEndpoint?: YTMBrowseEndpoint;
  related: YTMPlaylist[];
  relatedEndpoint?: YTMBrowseEndpoint;
  relatedAlbums?: YTMPlaylist[];
  relatedAlbumsEndpoint?: YTMBrowseEndpoint;
  relatedPlaylists?: YTMPlaylist[];
  relatedPlaylistsEndpoint?: YTMBrowseEndpoint;
  relatedArtists?: YTMPlaylist[];
  relatedArtistsEndpoint?: YTMBrowseEndpoint;
  year?: string;
  authorAvatar?: string;
  authors?: { name: string; id: string; avatar?: string }[];
}

export interface YTMArtistDetail {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  avatar?: string;
  subscriberCount?: string;
  viewCount?: string;
  songs: YTMSong[];
  songsEndpoint?: YTMBrowseEndpoint;
  albums: YTMPlaylist[];
  albumsEndpoint?: YTMBrowseEndpoint;
  playlists: YTMPlaylist[];
  playlistsEndpoint?: YTMBrowseEndpoint;
  similarArtists: YTMPlaylist[];
  similarArtistsEndpoint?: YTMBrowseEndpoint;
}

export interface YTMHomePage {
  sections: YTMSection[];
}

export interface YTMChartsPage {
  sections: YTMSection[];
}

export interface YTMSearchResult {
  topResult?: YTMSong | YTMPlaylist;
  songs: YTMSong[];
  playlists: YTMPlaylist[];
  albums: YTMPlaylist[];
  artists: YTMPlaylist[];
  videos: YTMSong[];
  total: number;
}

export interface YTMSearchSuggestion {
  query: string;
  fromHistory: boolean;
}

export interface YTMMood {
  id: string;
  title: string;
  params: string;
  thumbnail?: string;
}

export interface YTMStream {
  videoId: string;
  url: string;
  mimeType: string;
  bitrate: number;
  approxDurationMs: number;
  contentLength?: number;
  expiresInSeconds: number;
  title?: string;
  author?: string;
  album?: string;
  thumbnail?: string;
  durationSeconds?: number;
  clientNameId: number;
  userAgent: string;
}

interface YTMStreamFailure {
  clientNameId: number;
  reason: string;
  status?: string;
}

export interface YTMStreamResult {
  success: boolean;
  data?: YTMStream;
  error?: string;
  attempts?: YTMStreamFailure[];
}

async function ytmPost(
  endpoint: string,
  body: object,
  cookie?: string,
  clientOverride?: {
    clientNameId: number;
    clientVersion: string;
    userAgent: string;
    context: any;
  },
  host: 'music' | 'youtube' = 'music'
): Promise<any> {
  if (typeof window === 'undefined' || !window.api) {
    throw new Error('IPC not available (Tauri bridge is not installed)');
  }

  const payload = { ...body };
  if (clientOverride?.context) {
    (payload as any).context = clientOverride.context;
  }

  try {
    const data = await window.api.invoke<any>('ytm:request', {
      args: {
        endpoint,
        body: payload,
        cookie,
        clientNameId: clientOverride?.clientNameId,
        clientVersion: clientOverride?.clientVersion,
        userAgent: clientOverride?.userAgent,
        host
      }
    });
    if (!data) {
      throw new Error('No response data received from YTM request');
    }
    return data;
  } catch (error: any) {
    throw new Error(`YTM API error: ${error?.message || error}`);
  }
}

export interface StreamUrlProbe {
  playable: boolean;
  status: number;
  reason?: string | null;
}

async function validateStreamUrl(
  url: string,
  userAgent?: string
): Promise<StreamUrlProbe> {
  if (typeof window === 'undefined' || !window.api) {
    return { playable: true, status: 0, reason: null };
  }

  try {
    const probe = await window.api.invoke<StreamUrlProbe>('ytm:validate-stream', {
      args: { url, userAgent }
    });
    return probe || { playable: true, status: 200, reason: null };
  } catch (error: any) {
    console.warn('[ytmusic] stream URL probe failed, trusting the URL:', error);
    return { playable: true, status: 0, reason: null };
  }
}

function parseRuns(runs: any[]): string {
  if (!runs) return '';
  return runs.map((r: any) => r.text || '').join('');
}

function parseThumbnail(thumbnails: any[]): string {
  if (!thumbnails?.length) return '';
  return thumbnails[thumbnails.length - 1]?.url || '';
}

export function squareThumbnail(url: string, size: number = 544): string {
  if (!url) return '';
  let clean = url.trim();
  if (clean.startsWith('//')) clean = `https:${clean}`;
  else if (clean.startsWith('http://')) clean = clean.replace('http://', 'https://');
  if (clean.startsWith('data:') || clean.startsWith('local://')) return clean;

  if (clean.includes('googleusercontent.com') || clean.includes('yt3.ggpht.com')) {
    if (clean.includes('=')) {
      const base = clean.split('=')[0];
      return `${base}=w${size}-h${size}-l90-rj`;
    }
    if (/\/(w\d+-h\d+|s\d+)\//.test(clean)) {
      return clean.replace(/\/(w\d+-h\d+|s\d+)\//, `/w${size}-h${size}/`);
    }
    return `${clean}=w${size}-h${size}-l90-rj`;
  }

  if (clean.includes('i.ytimg.com')) {
    return clean.split('?')[0];
  }

  return clean;
}

function parseSongItem(renderer: any): YTMSong | null {
  try {
    const cols = renderer.flexColumns || [];
    const title = parseRuns(cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);
    const subtitle = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

    const isArtistItem = subtitle.some(
      (run: any) =>
        run.text === 'Artist' ||
        run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType === 'MUSIC_PAGE_TYPE_ARTIST_OVERVIEW'
    );
    if (isArtistItem) return null;

    const artists: { name: string; id?: string }[] = [];
    let album: string | undefined;
    let duration: string | undefined;

    for (let c = 1; c < cols.length; c++) {
      const colRuns = cols[c]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      for (let i = 0; i < colRuns.length; i++) {
        const run = colRuns[i];
        if (!run || !run.text) continue;
        const text = run.text.trim();
        if (!text || text === '•' || text === '&' || text === '/') continue;

        const pageType =
          run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
            ?.browseEndpointContextMusicConfig?.pageType;
        const browseId = run.navigationEndpoint?.browseEndpoint?.browseId;

        const isAlbumEndpoint =
          pageType === 'MUSIC_PAGE_TYPE_ALBUM' ||
          browseId?.startsWith('MPREb') ||
          browseId?.startsWith('OLAK5uy_');

        if (isAlbumEndpoint) {
          if (!album) album = text;
        } else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || browseId?.startsWith('UC')) {
          if (!artists.some((a) => a.name.toLowerCase() === text.toLowerCase())) {
            artists.push({ name: text, id: browseId });
          }
        } else if (pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
          if (artists.length === 0) {
            artists.push({ name: text, id: browseId });
          } else {
            const firstArtist = artists[0]?.name?.toLowerCase() || '';
            if (firstArtist && text.toLowerCase().startsWith(firstArtist) && /\s+[-–—]\s+/.test(text)) {
              if (!album) {
                const extracted = text.replace(new RegExp(`^${artists[0].name}\\s*[-–—]\\s*`, 'i'), '').trim();
                album = extracted || text;
              }
            } else if (!album && c >= 2) {
              album = text;
            }
          }
        } else if (!run.navigationEndpoint) {
          if (/^\d+:\d+$/.test(text)) {
            duration = text;
          } else if (
            text !== 'Video' &&
            text !== 'Song' &&
            text !== 'Single' &&
            text !== 'EP' &&
            !/^\d{4}$/.test(text) &&
            !/(plays|views|subscribers|monthly audience)/i.test(text)
          ) {
            if (artists.length === 0 && c === 1 && (i === 0 || i === 2)) {
              artists.push({ name: text });
            } else if (!album && c >= 2) {
              album = text;
            }
          }
        }
      }
    }
    if (artists.length > 1) {
      const primaryArtist = artists[0].name.trim();
      const cleanedArtists: { name: string; id?: string }[] = [artists[0]];
      for (let i = 1; i < artists.length; i++) {
        const a = artists[i];
        if (
          a.name.toLowerCase().startsWith(primaryArtist.toLowerCase() + ' - ') ||
          a.name.toLowerCase().startsWith(primaryArtist.toLowerCase() + ' – ') ||
          a.name.toLowerCase().startsWith(primaryArtist.toLowerCase() + ' — ')
        ) {
          if (!album) {
            album = a.name.replace(new RegExp(`^${primaryArtist}\\s*[-–—]\\s*`, 'i'), '').trim();
          }
          continue;
        }
        if (
          (a.id && (a.id.startsWith('MPREb') || a.id.startsWith('OLAK5uy_'))) ||
          (album && a.name.toLowerCase() === album.toLowerCase())
        ) {
          if (!album && a.name) album = a.name;
          continue;
        }
        cleanedArtists.push(a);
      }
      artists.length = 0;
      artists.push(...cleanedArtists);
    } else if (artists.length === 1) {
      const a = artists[0];
      if (/\s+[-–—]\s+/.test(a.name)) {
        const parts = a.name.split(/\s+[-–—]\s+/);
        if (parts[0] && parts[0].trim()) {
          if (!album && parts[1] && parts[1].trim()) {
            album = parts[1].trim();
          }
          a.name = parts[0].trim();
        }
      }
    }

    const videoId =
      renderer.playlistItemData?.videoId ||
      renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
        ?.playNavigationEndpoint?.watchEndpoint?.videoId;

    const thumbnails =
      renderer.thumbnailRenderer?.musicCroppedThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.musicCroppedThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.thumbnails ||
      renderer.thumbnail?.artistArtRef?.[0]?.thumbnails ||
      renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.thumbnail
        ?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.thumbnail
        ?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.thumbnail
        ?.musicThumbnailRenderer?.thumbnail?.thumbnails;

    if (!videoId || !title) return null;

    let thumb = squareThumbnail(parseThumbnail(thumbnails), 544);
    if (!thumb && videoId && videoId.length === 11) {
      thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return {
      id: videoId,
      title,
      artists,
      album,
      duration,
      thumbnail: thumb
    };
  } catch {
    return null;
  }
}

function parsePlaylistItem(renderer: any): YTMPlaylist | null {
  try {
    const title =
      parseRuns(renderer.title?.runs) ||
      parseRuns(renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs);

    const browseId =
      renderer.navigationEndpoint?.browseEndpoint?.browseId ||
      renderer.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
        ?.playNavigationEndpoint?.watchPlaylistEndpoint?.playlistId;

    const thumbnails =
      renderer.thumbnailRenderer?.musicCroppedThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.musicCroppedThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.thumbnail?.thumbnails ||
      renderer.thumbnail?.artistArtRef?.[0]?.thumbnails ||
      renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.thumbnail
        ?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.thumbnail
        ?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.thumbnail
        ?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    const subtitle =
      renderer.flexColumns
        ?.slice(1)
        .map((fc: any) => parseRuns(fc?.musicResponsiveListItemFlexColumnRenderer?.text?.runs))
        .filter(Boolean)
        .join(' • ') || '';

    if (!title) return null;

    let thumb = squareThumbnail(parseThumbnail(thumbnails || []), 544);
    if (!thumb && browseId && browseId.length === 11) {
      thumb = `https://i.ytimg.com/vi/${browseId}/hqdefault.jpg`;
    }

    return {
      id: browseId || '',
      title,
      subtitle,
      thumbnail: thumb
    };
  } catch {
    return null;
  }
}

function parseMusicShelfSection(shelf: any): YTMSection {
  const title = parseRuns(shelf.title?.runs) || shelf.title?.simpleText || '';
  const items: (YTMSong | YTMPlaylist)[] = [];

  (shelf.contents || []).forEach((c: any) => {
    const renderer = c.musicResponsiveListItemRenderer || c.musicTwoRowItemRenderer;

    if (!renderer) return;

    const song = parseSongItem(renderer);
    if (song) {
      items.push(song);
      return;
    }

    const playlist = parsePlaylistItem(renderer);
    if (playlist) items.push(playlist);
  });

  return { title, items };
}

const BROWSE_ID_PREFIXES = {
  playlist: 'VL',
  album: 'OLAK5uy_',
  channel: 'UC',
  autoPlaylist: 'RDAMVM'
};

function normalizeBrowseId(id: string, kind: keyof typeof BROWSE_ID_PREFIXES): string {
  if (!id) return '';
  if (id.startsWith('VL')) return id;
  if (id.startsWith('OLAK5uy_')) return id;
  if (id.startsWith('MPREb_') || id.startsWith('MPREb')) return id;
  if (id.startsWith('UC')) return id;
  return `${BROWSE_ID_PREFIXES[kind]}${id}`;
}

function collectShelves(data: any): any[] {
  const shelves: any[] = [];

  const walk = (node: any, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 12) return;

    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, depth + 1));
      return;
    }

    if (node.musicShelfRenderer) shelves.push(node.musicShelfRenderer);
    if (node.musicCarouselShelfRenderer) shelves.push(node.musicCarouselShelfRenderer);
    if (node.musicPlaylistShelfRenderer) shelves.push(node.musicPlaylistShelfRenderer);

    for (const key of Object.keys(node)) {
      if (key === 'continuations' || key === 'continuationItems' || key === 'continuation')
        continue;
      const value = node[key];
      if (value && typeof value === 'object') walk(value, depth + 1);
    }
  };

  walk(data);
  return shelves;
}

function getShelfEndpoint(shelf: any): YTMBrowseEndpoint | undefined {
  const header = shelf?.header?.musicCarouselShelfBasicHeaderRenderer || shelf?.header?.musicShelfRenderer;
  const ep = header?.moreContentButton?.buttonRenderer?.navigationEndpoint?.browseEndpoint || shelf?.bottomEndpoint?.browseEndpoint;
  if (ep?.browseId) {
    return { browseId: ep.browseId, params: ep.params };
  }
  return undefined;
}

function collectSongsFromShelves(shelves: any[]): { songs: YTMSong[], endpoint?: YTMBrowseEndpoint } {
  const songs: YTMSong[] = [];
  const seen = new Set<string>();
  let endpoint: YTMBrowseEndpoint | undefined;

  for (const shelf of shelves) {
    let shelfHasSongs = false;
    for (const c of shelf.contents || []) {
      const renderer = c.musicResponsiveListItemRenderer || c.musicTwoRowItemRenderer;
      if (!renderer) continue;
      const song = parseSongItem(renderer);
      if (song && !seen.has(song.id)) {
        seen.add(song.id);
        songs.push(song);
        shelfHasSongs = true;
      }
    }
    if (shelfHasSongs && !endpoint) {
      endpoint = getShelfEndpoint(shelf);
    }
  }

  return { songs, endpoint };
}

function collectRadioSongs(data: any): YTMSong[] {
  const songs: YTMSong[] = [];
  const seen = new Set<string>();

  const walk = (node: any, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 14) return;

    const renderer = node.playlistPanelVideoRenderer;
    if (renderer) {
      const id = renderer.videoId || renderer.navigationEndpoint?.watchEndpoint?.videoId;
      const title = parseRuns(renderer.title?.runs) || renderer.title?.simpleText || '';
      const bylineRuns = renderer.longBylineText?.runs || renderer.shortBylineText?.runs || [];
      const byline = parseRuns(bylineRuns);
      const duration = parseRuns(renderer.lengthText?.runs) || renderer.lengthText?.simpleText;
      const thumbnail = parseThumbnail(renderer.thumbnail?.thumbnails || []);
      const artists: { name: string; id?: string }[] = [];
      let album: string | undefined;

      if (bylineRuns.length > 0) {
        const groups: any[][] = [];
        let curGroup: any[] = [];
        for (const run of bylineRuns) {
          if (run.text?.trim() === '•' || run.text?.trim() === '·') {
            groups.push(curGroup);
            curGroup = [];
          } else {
            curGroup.push(run);
          }
        }
        groups.push(curGroup);

        const artistGroup = groups[0] || [];
        for (const run of artistGroup) {
          const text = run.text?.trim();
          if (!text || text === ',' || text === '&') continue;
          const browseId = run.navigationEndpoint?.browseEndpoint?.browseId;
          const pageType =
            run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
              ?.browseEndpointContextMusicConfig?.pageType;
          if (
            pageType === 'MUSIC_PAGE_TYPE_ALBUM' ||
            browseId?.startsWith('MPREb') ||
            browseId?.startsWith('OLAK5uy_')
          ) {
            if (!album) album = text;
            continue;
          }
          const subNames = text.split(/,\s*|\s*&\s*/).filter(Boolean);
          for (const name of subNames) {
            if (!/^\d{4}$/.test(name) && !/(plays|views)/i.test(name)) {
              artists.push({
                name,
                id: browseId
              });
            }
          }
        }

        if (groups.length > 1) {
          const albumRun = groups[1]?.[0];
          const albumText = albumRun?.text?.trim();
          if (albumText && !/^\d{4}$/.test(albumText) && !/(plays|views)/i.test(albumText)) {
            album = albumText;
          }
        }
      }

      if (artists.length === 0 && byline) {
        const parts = byline.split(' • ').map((name: string) => name.trim()).filter(Boolean);
        if (parts[0]) {
          const names = parts[0].split(/,\s*|\s*&\s*/).filter(Boolean);
          for (const name of names) {
            if (!/^\d{4}$/.test(name) && !/(plays|views)/i.test(name)) {
              artists.push({ name });
            }
          }
        }
        if (parts[1] && !/^\d{4}$/.test(parts[1]) && !/(plays|views)/i.test(parts[1])) {
          album = parts[1];
        }
      }

      if (id && title && !seen.has(id)) {
        seen.add(id);
        songs.push({
          id,
          title,
          artists: artists.length > 0 ? artists : [{ name: 'Unknown Artist' }],
          album,
          duration,
          thumbnail: squareThumbnail(thumbnail)
        });
      }
    }

    for (const value of Object.values(node)) {
      if (value && typeof value === 'object') walk(value, depth + 1);
    }
  };

  walk(data);
  return songs;
}

function parseHeader(data: any) {
  const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs ||
               data?.contents?.twoColumnBrowseResultsRenderer?.tabs;
  const sectionHeader = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer;

  const header =
    data?.header?.musicDetailHeaderRenderer ||
    data?.header?.musicVisualHeaderRenderer ||
    data?.header?.musicImmersiveHeaderRenderer ||
    data?.header?.musicEditablePlaylistDetailHeaderRenderer ||
    data?.header?.musicResponsiveHeaderRenderer ||
    sectionHeader;

  const title =
    parseRuns(header?.title?.runs) ||
    header?.title?.simpleText ||
    parseRuns(header?.straplineTextOne?.runs) ||
    '';

  const thumbnail =
    parseThumbnail(
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
        header?.thumbnail?.musicCroppedThumbnailRenderer?.thumbnail?.thumbnails ||
        header?.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
        header?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        header?.backgroundImage?.sources ||
        data?.background?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        data?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails ||
        []
    ) || '';

  const description =
    parseRuns(header?.description?.runs) ||
    header?.description?.simpleText ||
    parseRuns(header?.secondSubtitle?.runs) ||
    undefined;

  let author: string | undefined;
  let subscriberCount: string | undefined;
  let year: string | undefined;
  let authorAvatar: string | undefined;
  const authors: { name: string; id: string }[] = [];

  for (const run of header?.subtitle?.runs || []) {
    if (/^\d{4}$/.test(run.text.trim())) {
      year = run.text.trim();
    }
    const pageType = run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
      const id = run.navigationEndpoint?.browseEndpoint?.browseId;
      if (id) authors.push({ name: run.text, id });
      author = run.text;
    }
  }
  
  const avatarThumbs = header?.straplineThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || header?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
  if (avatarThumbs) authorAvatar = parseThumbnail(avatarThumbs);


  for (const run of header?.straplineTextTwo?.runs || []) {
    const pageType =
      run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
        ?.browseEndpointContextMusicConfig?.pageType;
    if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
      const id = run.navigationEndpoint?.browseEndpoint?.browseId;
      if (id && !authors.some(a => a.id === id)) authors.push({ name: run.text, id });
      if (!author) author = run.text;
    } else if (/\d/.test(run.text) && /(subscriber|subscribers)/i.test(run.text)) {
      subscriberCount = run.text;
    }
  }

  if (!author) {
    for (const run of header?.straplineTextOne?.runs || []) {
      const pageType = run.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
      if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
        const id = run.navigationEndpoint?.browseEndpoint?.browseId;
        if (id && !authors.some(a => a.id === id)) authors.push({ name: run.text, id });
      }
    }
    author = parseRuns(header?.straplineTextOne?.runs) || undefined;
  }

  const songCountRaw =
    header?.secondSubtitle?.runs?.[0]?.text || header?.straplineTextOne?.runs?.[0]?.text || '';
  const songCount = Number((songCountRaw.match(/[\d,]+/)?.[0] || '0').replace(/,/g, ''));

  return { title, thumbnail, description, author, subscriberCount, songCount, year, authorAvatar, authors };
}

export async function getYTMHome(cookie?: string): Promise<YTMHomePage> {
  const data = await ytmPost('browse', { browseId: 'FEmusic_home' }, cookie);

  const sections: YTMSection[] = [];
  const contents =
    data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents || [];

  for (const content of contents) {
    const shelf =
      content.musicImmersiveCarouselShelfRenderer ||
      content.musicCarouselShelfRenderer ||
      content.musicShelfRenderer ||
      content.musicImmersiveHeaderRenderer;

    if (!shelf) continue;

    const title =
      parseRuns(shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs) ||
      parseRuns(shelf.header?.musicImmersiveCarouselShelfBasicHeaderRenderer?.title?.runs) ||
      parseRuns(shelf.title?.runs) ||
      '';

    const items: (YTMSong | YTMPlaylist)[] = [];

    (shelf.contents || []).forEach((c: any) => {
      const renderer = c.musicTwoRowItemRenderer || c.musicResponsiveListItemRenderer;
      if (!renderer) return;

      const song = parseSongItem(renderer);
      if (song) {
        items.push(song);
        return;
      }

      const playlist = parsePlaylistItem(renderer);
      if (playlist) items.push(playlist);
    });

    if (items.length > 0) {
      sections.push({ title: title || 'Recommended', items });
    }
  }

  return { sections };
}

export async function getYTMCharts(cookie?: string): Promise<YTMChartsPage> {
  const data = await ytmPost('browse', { browseId: 'FEmusic_charts' }, cookie);

  const sections: YTMSection[] = [];
  const contents =
    data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents || [];

  for (const content of contents) {
    const shelf = content.musicShelfRenderer || content.musicCarouselShelfRenderer;
    if (!shelf) continue;
    sections.push(parseMusicShelfSection(shelf));
  }

  return { sections };
}

export async function searchYTM(
  query: string,
  filter?: 'songs' | 'videos' | 'albums' | 'artists' | 'playlists',
  cookie?: string
): Promise<YTMSearchResult> {
  const body: any = { query };

  const filterMap: Record<string, string> = {
    songs: 'EgWKAQIIAWoKEAkQAxAEEAoQBQ==',
    videos: 'EgWKAQIQAWoKEAkQAxAEEAoQBQ==',
    albums: 'EgWKAQIYAWoKEAkQAxAEEAoQBQ==',
    artists: 'EgWKAQIgAWoKEAkQAxAEEAoQBQ==',
    playlists: 'Eg-KAQwIABAAGAAgACgBMABqChAJEAMQBBAKEAU='
  };

  if (filter && filterMap[filter]) {
    body.params = filterMap[filter];
  }

  const data = await ytmPost('search', body, cookie);

  let topResult: YTMSong | YTMPlaylist | undefined;
  const songs: YTMSong[] = [];
  const playlists: YTMPlaylist[] = [];
  const albums: YTMPlaylist[] = [];
  const artists: YTMPlaylist[] = [];
  const videos: YTMSong[] = [];

  const contents: any[] =
    data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer
      ?.contents ||
    data.contents?.sectionListRenderer?.contents ||
    [];

  for (const content of contents) {
    if (content.musicCardShelfRenderer && !topResult) {
      const r = content.musicCardShelfRenderer;
      const title = parseRuns(r.title?.runs);
      const thumbnails =
        r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        r.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        r.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
        r.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
        r.thumbnail?.musicCroppedThumbnailRenderer?.thumbnail?.thumbnails ||
        r.thumbnail?.thumbnails;

      const videoId =
        r.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
        r.onTap?.watchEndpoint?.videoId ||
        r.buttons?.[0]?.buttonRenderer?.command?.watchEndpoint?.videoId ||
        '';

      const browseId =
        r.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
        videoId ||
        '';

      let thumb = squareThumbnail(parseThumbnail(thumbnails || []), 544);
      if (!thumb && (videoId || (browseId && browseId.length === 11))) {
        thumb = `https://i.ytimg.com/vi/${videoId || browseId}/hqdefault.jpg`;
      }

      let subtitle = parseRuns(r.subtitle?.runs);
      const isSongCard = subtitle?.includes('Song');
      const isArtistCard = subtitle?.includes('Artist');
      const isVideoCard = subtitle?.includes('Video');
      const isAlbumCard =
        subtitle?.includes('Album') || subtitle?.includes('Single') || subtitle?.includes('EP');

      const isPlaylistCard = subtitle?.includes('Playlist');
      if (subtitle?.toLowerCase().includes('podcast') || subtitle?.toLowerCase().includes('episode')) continue;

      let resultType = 'Top Result';
      if (isSongCard) resultType = 'Song';
      else if (isVideoCard) resultType = 'Video';
      else if (isArtistCard) resultType = 'Artist';
      else if (isAlbumCard) resultType = 'Album';
      else if (isPlaylistCard) resultType = 'Playlist';

      if (subtitle) {
        const parts = subtitle.split(' • ');
        subtitle = parts
          .filter((part: string) => {
            const lower = part.trim().toLowerCase();
            if (
              lower === 'video' ||
              lower === 'song' ||
              lower === 'artist' ||
              lower === 'album' ||
              lower === 'single' ||
              lower === 'ep'
            )
              return false;
            if (lower.includes('views') || lower.includes('plays')) return false;
            return true;
          })
          .join(' • ');
      }

      if (title && (isSongCard || isArtistCard || isVideoCard || isAlbumCard || isPlaylistCard)) {
        if (isSongCard || isVideoCard) {
          const parts = subtitle.split(' • ').map((name: string) => name.trim()).filter(Boolean);
          const rawArtistStr = parts[0] || '';
          const artistNames = rawArtistStr.split(/,\s*|\s*&\s*/).filter((n: string) => n && !/^\d{4}$/.test(n));
          const artists = artistNames.length > 0 ? artistNames.map((name: string) => ({ name })) : (rawArtistStr ? [{ name: rawArtistStr }] : [{ name: 'Unknown Artist' }]);
          const album = parts[1] && !/^\d{4}$/.test(parts[1]) ? parts[1] : undefined;
          topResult = {
            id: browseId,
            title,
            artists,
            album,
            thumbnail: thumb,
            resultType
          } as any;
        } else {
          topResult = {
            id: browseId,
            title,
            subtitle,
            thumbnail: thumb,
            resultType
          } as any;
        }
      }
    }

    const shelf = content.musicShelfRenderer || content.musicCardShelfRenderer;
    let shelfContents = shelf?.contents || [];

    if (!shelf && content.itemSectionRenderer) {
      shelfContents = content.itemSectionRenderer.contents || [];
    }

    if (!shelfContents.length) continue;

    for (const c of shelfContents) {
      const renderer = c.musicResponsiveListItemRenderer || c.musicTwoRowItemRenderer;
      if (!renderer) continue;

      const song = parseSongItem(renderer);
      if (song) {
        const ep =
          renderer.navigationEndpoint ||
          renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
            ?.playNavigationEndpoint;
        const videoType =
          ep?.watchEndpoint?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig
            ?.musicVideoType;
        const firstRun =
          renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
            ?.text;
        const allRunsText = (
          renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []
        )
          .map((r: any) => r.text)
          .join('');

        const isVideoType =
          videoType?.includes('MUSIC_VIDEO_TYPE_UGC') ||
          videoType?.includes('MUSIC_VIDEO_TYPE_OMV') ||
          firstRun === 'Video';
        const isSongType =
          videoType?.includes('MUSIC_VIDEO_TYPE_ATV') ||
          firstRun === 'Song' ||
          firstRun === 'Audio';

        if (filter === 'videos') {
          videos.push(song);
        } else if (filter === 'songs') {
          songs.push(song);
        } else {
          if (isVideoType) {
            videos.push(song);
          } else if (isSongType) {
            songs.push(song);
          } else {
            if (allRunsText.includes('Video') || !song.album) {
              videos.push(song);
            } else {
              songs.push(song);
            }
          }
        }
        continue;
      }

      const playlist = parsePlaylistItem(renderer);
      if (playlist && !playlist.subtitle?.toLowerCase().includes('podcast') && !playlist.subtitle?.toLowerCase().includes('episode')) {
        if (
          filter === 'albums' ||
          playlist.subtitle?.includes('Album') ||
          playlist.subtitle?.includes('EP') ||
          playlist.subtitle?.includes('Single')
        )
          albums.push(playlist);
        else if (
          filter === 'artists' ||
          playlist.subtitle?.includes('Artist') ||
          playlist.subtitle?.includes('artist')
        )
          artists.push(playlist);
        else playlists.push(playlist);
      }
    }
  }



  return {
    topResult,
    songs,
    playlists,
    albums,
    artists,
    videos,
    total: songs.length + playlists.length + albums.length + artists.length + videos.length
  };
}

export async function getYTMSuggestions(
  query: string,
  cookie?: string
): Promise<YTMSearchSuggestion[]> {
  try {
    const data = await ytmPost('music/get_search_suggestions', { input: query }, cookie);
    const contents = data?.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || [];

    return contents
      .map((c: any) => {
        const runs = c.searchSuggestionRenderer?.suggestion?.runs || [];
        return {
          query: parseRuns(runs),
          fromHistory: false
        };
      })
      .filter((s: YTMSearchSuggestion) => !!s.query);
  } catch (err) {
    console.warn('Failed to get YTM suggestions via API endpoint', err);
    return [];
  }
}

export interface YTMMoodCategory {
  title: string;
  items: YTMMood[];
}

export async function getYTMMoods(cookie?: string): Promise<YTMMoodCategory[]> {
  const data = await ytmPost('browse', { browseId: 'FEmusic_moods_and_genres' }, cookie);

  const categories: YTMMoodCategory[] = [];
  const contents =
    data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents || [];

  for (const content of contents) {
    const shelf = content.gridRenderer || content.musicCarouselShelfRenderer;
    if (!shelf) continue;

    let title = '';
    if (content.gridRenderer?.header?.gridHeaderRenderer?.title?.runs?.[0]?.text) {
      title = content.gridRenderer.header.gridHeaderRenderer.title.runs[0].text;
    } else if (content.musicCarouselShelfRenderer?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text) {
      title = content.musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer.title.runs[0].text;
    } else {
      title = 'More';
    }

    const items: YTMMood[] = [];
    (shelf.items || shelf.contents || []).forEach((c: any) => {
      const r = c.musicNavigationButtonRenderer;
      if (!r) return;
      const id = r.clickCommand?.browseEndpoint?.browseId || '';
      const params = r.clickCommand?.browseEndpoint?.params || '';
      const buttonTitle = parseRuns(r.buttonText?.runs) || r.buttonText?.simpleText || '';
      if (buttonTitle) items.push({ id, title: buttonTitle, params });
    });

    if (items.length > 0) {
      categories.push({ title, items });
    }
  }

  return categories;
}

export interface YTStreamClient {
  clientName: string;
  clientVersion: string;
  clientId: number;
  userAgent: string;
  osName?: string;
  osVersion?: string;
  deviceMake?: string;
  deviceModel?: string;
  androidSdkVersion?: number;
  buildId?: string;
  cronetVersion?: string;
  packageName?: string;
  friendlyName?: string;
  loginSupported: boolean;
  loginRequired: boolean;
  useSignatureTimestamp: boolean;
  useWebPoTokens: boolean;
  isEmbedded: boolean;
}

const USER_AGENT_WEB =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0';

const WEB_REMIX: YTStreamClient = {
  clientName: 'WEB_REMIX',
  clientVersion: '1.20260213.01.00',
  clientId: 67,
  userAgent: USER_AGENT_WEB,
  loginSupported: true,
  loginRequired: false,
  useSignatureTimestamp: true,
  useWebPoTokens: true,
  isEmbedded: false
};

const STREAM_FALLBACK_CLIENTS: YTStreamClient[] = [
  {
    clientName: 'IOS',
    clientVersion: '21.03.3',
    clientId: 5,
    userAgent:
      'com.google.ios.youtube/21.03.3 (iPad7,6; U; CPU iPadOS 17_7_10 like Mac OS X; en-US)',
    osName: 'iPadOS',
    osVersion: '17.7.10.21H450',
    deviceMake: 'Apple',
    deviceModel: 'iPad7,6',
    friendlyName: 'iPadOS',
    packageName: 'com.google.ios.youtube',
    loginSupported: false,
    loginRequired: false,
    useSignatureTimestamp: false,
    useWebPoTokens: false,
    isEmbedded: false
  },
  {
    clientName: 'IOS',
    clientVersion: '21.03.1',
    clientId: 5,
    userAgent:
      'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
    osVersion: '18.2.22C152',
    friendlyName: 'iPhone',
    loginSupported: false,
    loginRequired: false,
    useSignatureTimestamp: false,
    useWebPoTokens: false,
    isEmbedded: false
  },
  {
    clientName: 'ANDROID',
    clientVersion: '21.02.35',
    clientId: 3,
    userAgent: 'com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip',
    osName: 'Android',
    osVersion: '11',
    deviceMake: 'Google',
    deviceModel: 'Pixel 5',
    androidSdkVersion: 30,
    friendlyName: 'Android 21.02',
    loginSupported: false,
    loginRequired: false,
    useSignatureTimestamp: true,
    useWebPoTokens: false,
    isEmbedded: false
  },
  {
    clientName: 'ANDROID_VR',
    clientVersion: '1.43.32',
    clientId: 28,
    userAgent:
      'com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)',
    osName: 'Android',
    osVersion: '12',
    deviceMake: 'Oculus',
    deviceModel: 'Quest 3',
    androidSdkVersion: 32,
    buildId: 'SQ3A.220605.009.A1',
    cronetVersion: '107.0.5284.2',
    packageName: 'com.google.android.apps.youtube.vr.oculus',
    friendlyName: 'Android VR 1.43',
    loginSupported: false,
    loginRequired: false,
    useSignatureTimestamp: false,
    useWebPoTokens: false,
    isEmbedded: false
  },
  {
    clientName: 'ANDROID_VR',
    clientVersion: '1.65.10',
    clientId: 28,
    userAgent:
      'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
    osName: 'Android',
    osVersion: '12L',
    deviceMake: 'Oculus',
    deviceModel: 'Quest 3',
    androidSdkVersion: 32,
    friendlyName: 'Android VR 1.65',
    loginSupported: false,
    loginRequired: false,
    useSignatureTimestamp: false,
    useWebPoTokens: false,
    isEmbedded: false
  },
  {
    clientName: 'VISIONOS',
    clientVersion: '0.1',
    clientId: 101,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    osName: 'visionOS',
    osVersion: '1.3.21O771',
    deviceMake: 'Apple',
    deviceModel: 'RealityDevice14,1',
    friendlyName: 'visionOS',
    loginSupported: false,
    loginRequired: false,
    useSignatureTimestamp: false,
    useWebPoTokens: false,
    isEmbedded: false
  },
  {
    clientName: 'TVHTML5',
    clientVersion: '7.20260213.00.00',
    clientId: 7,
    userAgent:
      'Mozilla/5.0(SMART-TV; Linux; Tizen 4.0.0.2) AppleWebkit/605.1.15 (KHTML, like Gecko) SamsungBrowser/9.2 TV Safari/605.1.15',
    loginSupported: true,
    loginRequired: true,
    useSignatureTimestamp: true,
    useWebPoTokens: true,
    isEmbedded: false
  },
  {
    clientName: 'WEB_CREATOR',
    clientVersion: '1.20260213.00.00',
    clientId: 62,
    userAgent: USER_AGENT_WEB,
    loginSupported: true,
    loginRequired: true,
    useSignatureTimestamp: true,
    useWebPoTokens: true,
    isEmbedded: false
  }
];

const PRIVATE_TRACK_STREAM_START_INDEX =
  STREAM_FALLBACK_CLIENTS.findIndex((c) => c.clientName === 'TVHTML5');

const clientContext = (client: YTStreamClient) => {
  const context: Record<string, unknown> = {
    clientName: client.clientName,
    clientVersion: client.clientVersion,
    hl: 'en',
    gl: 'US',
    osName: client.osName,
    osVersion: client.osVersion,
    deviceMake: client.deviceMake,
    deviceModel: client.deviceModel,
    androidSdkVersion: client.androidSdkVersion,
    buildId: client.buildId,
    cronetVersion: client.cronetVersion,
    packageName: client.packageName
  };

  for (const key of Object.keys(context)) {
    if (context[key] === undefined) delete context[key];
  }

  return { client: context, user: {} };
};

const pickBestAudioFormat = (
  adaptiveFormats: any[] = [],
  progressiveFormats: any[] = []
): any | null => {
  const allFormats = [
    ...(Array.isArray(adaptiveFormats) ? adaptiveFormats : []),
    ...(Array.isArray(progressiveFormats) ? progressiveFormats : [])
  ];
  if (allFormats.length === 0) return null;

  const audioOnlyWithUrl = (Array.isArray(adaptiveFormats) ? adaptiveFormats : []).filter(
    (f) =>
      typeof f?.url === 'string' &&
      f.url.startsWith('http') &&
      f?.width == null &&
      f?.audioTrack?.isAutoDubbed == null
  );
  const mp4Audio = audioOnlyWithUrl.filter((f) => f?.mimeType?.startsWith('audio/mp4'));
  if (mp4Audio.length > 0) {
    return mp4Audio.reduce((best, current) => {
      const bestBitrate = best?.averageBitrate ?? best?.bitrate ?? 0;
      const currentBitrate = current?.averageBitrate ?? current?.bitrate ?? 0;
      return currentBitrate > bestBitrate ? current : best;
    }, mp4Audio[0]);
  }
  const progWithUrl = (Array.isArray(progressiveFormats) ? progressiveFormats : []).filter(
    (f) => typeof f?.url === 'string' && f.url.startsWith('http')
  );
  const itag18 = progWithUrl.find((f) => f.itag === 18);
  if (itag18) {
    return itag18;
  }

  // 3. Any format with direct URL containing audio
  const otherWithUrl = allFormats.filter(
    (f) =>
      typeof f?.url === 'string' &&
      f.url.startsWith('http') &&
      (f?.mimeType?.startsWith('audio/') || f?.mimeType?.includes('video/mp4'))
  );
  if (otherWithUrl.length > 0) {
    return otherWithUrl[0];
  }

  // Fallback to first format if none had direct URL
  return allFormats[0] || null;
};

interface StreamAttempt {
  clientName: string;
  clientId: number;
  outcome: string;
  reason?: string;
  status?: string;
}

function extractAlbumFromPlayerData(data: any): string | undefined {
  const tags: string[] = data?.microformat?.microformatDataRenderer?.tags || [];
  const title = (data?.videoDetails?.title || '').toLowerCase().trim();
  const author = (data?.videoDetails?.author || '').toLowerCase().trim();

  for (const t of tags) {
    const tl = t.toLowerCase().trim();
    if (tl && tl !== title && tl !== author && !tl.includes(author) && !title.includes(tl) && t.length > 1) {
      return t;
    }
  }
  for (const t of tags) {
    const tl = t.toLowerCase().trim();
    if (tl && tl !== title && tl !== author && t.length > 2) {
      return t;
    }
  }
  return undefined;
}

export async function getYTMStream(
  videoId: string,
  cookie?: string,
  songHint?: { title?: string; artist?: string }
): Promise<YTMStream | null> {
  if (!videoId || !/^[\w-]{6,20}$/.test(videoId)) {
    throw new Error('Invalid YouTube video id');
  }

  const isLoggedIn = Boolean(cookie);
  const attempts: StreamAttempt[] = [];

  let sawPrivateTrack = false;

  const tryClient = async (
    client: YTStreamClient,
    targetId: string = videoId,
    host: 'youtube' = 'youtube'
  ): Promise<YTMStream | null> => {
    const playerBody: Record<string, any> = {
      videoId: targetId,
      contentCheckOk: true,
      racyCheckOk: true
    };
    if (client.useSignatureTimestamp || client.clientName === 'ANDROID') {
      playerBody.playbackContext = {
        contentPlaybackContext: {
          html5Preference: 'HTML5_PREF_WANTS',
          signatureTimestamp: 20514
        }
      };
    }

    const data = await ytmPost(
      'player',
      playerBody,
      cookie,
      {
        clientNameId: client.clientId,
        clientVersion: client.clientVersion,
        userAgent: client.userAgent,
        context: clientContext(client)
      },
      host
    );

    const status = data?.playabilityStatus?.status;

    if (data?.videoDetails?.musicVideoType === 'MUSIC_VIDEO_TYPE_OMNI') {
      sawPrivateTrack = true;
    }

    if (status && status !== 'OK') {
      attempts.push({
        clientName: client.clientName,
        clientId: client.clientId,
        outcome: 'STATUS',
        status,
        reason:
          data?.playabilityStatus?.reason ??
          data?.playabilityStatus?.errorScreen?.playerErrorMessageRenderer?.reason?.simpleText ??
          'Playback not permitted'
      });
      return null;
    }

    const format = pickBestAudioFormat(
      data?.streamingData?.adaptiveFormats ?? [],
      data?.streamingData?.formats ?? []
    );

    if (!format) {
      attempts.push({
        clientName: client.clientName,
        clientId: client.clientId,
        outcome: 'NO_FORMAT',
        status,
        reason: 'No audio-only original format in player response'
      });
      return null;
    }

    const url = typeof format.url === 'string' && format.url.startsWith('http') ? format.url : '';
    if (!url) {
      const ciphered = Boolean(format.signatureCipher || format.cipher);
      attempts.push({
        clientName: client.clientName,
        clientId: client.clientId,
        outcome: 'NO_URL',
        status,
        reason: ciphered
          ? 'Format returned signatureCipher only (no deciphering available)'
          : 'Format carried no URL'
      });
      return null;
    }

    const durationSeconds = data?.videoDetails?.lengthSeconds
      ? Number(data.videoDetails.lengthSeconds)
      : undefined;
    const approxDurationMs =
      Number(format.approxDurationMs) || (durationSeconds ? durationSeconds * 1000 : 0);

    return {
      videoId: targetId,
      url,
      mimeType: format.mimeType,
      bitrate: format.averageBitrate ?? format.bitrate ?? 128000,
      approxDurationMs,
      contentLength: Number(format.contentLength) || undefined,
      expiresInSeconds: data?.streamingData?.expiresInSeconds ?? 21600,
      title: data?.videoDetails?.title,
      author: data?.videoDetails?.author,
      album: extractAlbumFromPlayerData(data),
      thumbnail:
        data?.videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url ??
        `https://i.ytimg.com/vi/${targetId}/mqdefault.jpg`,
      durationSeconds,
      clientNameId: client.clientId,
      userAgent: client.userAgent
    };
  };

  const runCascade = async (
    startIndex: number,
    targetId: string = videoId,
    host: 'youtube' = 'youtube'
  ): Promise<YTMStream | null> => {
    for (let i = startIndex; i < STREAM_FALLBACK_CLIENTS.length; i++) {
      const client = STREAM_FALLBACK_CLIENTS[i];

      if (client.loginRequired && !isLoggedIn) {
        attempts.push({
          clientName: client.clientName,
          clientId: client.clientId,
          outcome: 'SKIP',
          reason: 'loginRequiredButAnonymous'
        });
        continue;
      }

      try {
        const stream = await tryClient(client, targetId, host);
        if (!stream) continue;
        const probe = await validateStreamUrl(stream.url, client.userAgent);

        if (!probe.playable) {
          attempts.push({
            clientName: client.clientName,
            clientId: client.clientId,
            outcome: 'CDN_REJECTED',
            status: 'OK',
            reason: `Resolved URL was refused on download (HTTP ${probe.status})${
              probe.reason ? `: ${probe.reason}` : ''
            }`
          });
          continue;
        }

        return stream;
      } catch (e: any) {
        attempts.push({
          clientName: client.clientName,
          clientId: client.clientId,
          outcome: 'ERROR',
          reason: e?.message ?? String(e)
        });
      }
    }
    return null;
  };

  let stream = await runCascade(0, videoId, 'youtube');

  if (!stream && sawPrivateTrack && PRIVATE_TRACK_STREAM_START_INDEX >= 0) {
    stream = await runCascade(PRIVATE_TRACK_STREAM_START_INDEX, videoId, 'youtube');
  }

  if (stream) {
    return stream;
  }

  if (songHint?.title) {
    try {
      const query = `${songHint.title} ${songHint.artist || ''}`.trim();
      console.info(`[YTM stream] Original videoId ${videoId} unplayable, searching YouTube fallback: "${query}"`);
      const searchData = await ytmPost('search', { query }, cookie, undefined, 'youtube');

      const parseDurationSeconds = (text?: string): number => {
        if (!text || typeof text !== 'string') return 0;
        const parts = text.split(':').map((p) => parseInt(p.trim(), 10));
        if (parts.some((n) => isNaN(n))) return 0;
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 1) return parts[0];
        return 0;
      };

      interface FallbackCandidate {
        videoId: string;
        title: string;
        durationSec: number;
      }
      const candidateList: FallbackCandidate[] = [];
      const seen = new Set<string>();

      const extractVideos = (node: any, depth = 0) => {
        if (!node || typeof node !== 'object' || depth > 25) return;
        if (node.videoRenderer && typeof node.videoRenderer.videoId === 'string') {
          const vr = node.videoRenderer;
          const id = vr.videoId;
          if (id !== videoId && !seen.has(id)) {
            seen.add(id);
            const lenText =
              vr.lengthText?.simpleText ||
              vr.lengthText?.runs?.[0]?.text ||
              '';
            const dur = parseDurationSeconds(lenText);
            const title =
              vr.title?.runs?.[0]?.text ||
              vr.title?.simpleText ||
              '';
            candidateList.push({ videoId: id, title, durationSec: dur });
          }
        }
        for (const k of Object.keys(node)) {
          extractVideos(node[k], depth + 1);
        }
      };
      extractVideos(searchData);

      // Exclude Shorts/clips: songs are virtually always >= 90s
      const validCandidates = candidateList.filter((c) => {
        if (c.durationSec > 0 && c.durationSec < 90) {
          console.info(
            `[YTM stream] Rejecting short/clip candidate: ${c.videoId} (${c.durationSec}s) "${c.title}"`
          );
          return false;
        }
        return true;
      });

      for (const candidate of validCandidates.slice(0, 10)) {
        console.info(
          `[YTM stream] Evaluating YouTube candidate: ${candidate.videoId} (${candidate.durationSec}s) "${candidate.title}"`
        );
        const candidateStream = await runCascade(0, candidate.videoId, 'youtube');
        if (candidateStream) {
          console.info(`[YTM stream] Using working fallback YouTube stream: ${candidate.videoId}`);
          return candidateStream;
        }
      }
    } catch (searchErr) {
      console.warn('[YTM stream] Fallback YouTube search failed:', searchErr);
    }
  }

  console.warn('[YTM stream] cascade exhausted:', attempts);

  const isLoginRequired = attempts.some((a) => a.status === 'LOGIN_REQUIRED');
  if (isLoginRequired) {
    throw new Error('YouTube sign-in is required for this track');
  }

  throw new Error(`Unable to resolve a YouTube stream. Attempts: ${JSON.stringify(attempts)}`);
}

export async function getYTMPlaylist(
  playlistId: string,
  cookie?: string
): Promise<YTMPlaylistDetail> {
  const browseId = normalizeBrowseId(playlistId, 'playlist');
  if (!browseId) throw new Error('Invalid playlist id');

  const data = await ytmPost('browse', { browseId }, cookie);
  const header = parseHeader(data);
  const shelves = collectShelves(data);
  const { songs, endpoint: songsEndpoint } = collectSongsFromShelves(shelves);

  const playlistThumbnail = header.thumbnail;
  const isAlbumBrowse =
    browseId.startsWith('MPREb_') ||
    browseId.startsWith('OLAK5uy_') ||
    playlistId.startsWith('MPREb_') ||
    playlistId.startsWith('OLAK5uy_');

  songs.forEach((song) => {
    if (
      !song.thumbnail ||
      song.thumbnail.includes('hqdefault.jpg') ||
      song.thumbnail.includes('mqdefault.jpg')
    ) {
      if (playlistThumbnail) song.thumbnail = playlistThumbnail;
    }
    if ((isAlbumBrowse || !song.album) && header.title) {
      song.album = song.album || header.title;
    }
    if ((!song.artists || song.artists.length === 0) && header.author) {
      song.artists = [{ name: header.author }];
    }
  });

  const related: YTMPlaylist[] = [];
  const relatedAlbums: YTMPlaylist[] = [];
  const relatedPlaylists: YTMPlaylist[] = [];
  const relatedArtists: YTMPlaylist[] = [];

  let relatedEndpoint: YTMBrowseEndpoint | undefined;
  let relatedAlbumsEndpoint: YTMBrowseEndpoint | undefined;
  let relatedPlaylistsEndpoint: YTMBrowseEndpoint | undefined;
  let relatedArtistsEndpoint: YTMBrowseEndpoint | undefined;
  
  for (const shelf of shelves) {
    let hasAlbum = false, hasArtist = false, hasPlaylist = false;
    for (const c of shelf.contents || []) {
      const renderer = c.musicTwoRowItemRenderer;
      if (!renderer) continue;
      const item = parsePlaylistItem(renderer);
      if (!item?.id) continue;
      
      const pageType =
        renderer.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType;
          
      if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
        relatedAlbums.push(item);
        hasAlbum = true;
      }
      else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
        relatedArtists.push(item);
        hasArtist = true;
      }
      else {
        relatedPlaylists.push(item);
        hasPlaylist = true;
      }
      
      related.push(item);
    }
    
    const ep = getShelfEndpoint(shelf);
    if (ep) {
      if (!relatedEndpoint) relatedEndpoint = ep;
      if (hasAlbum && !relatedAlbumsEndpoint) relatedAlbumsEndpoint = ep;
      if (hasArtist && !relatedArtistsEndpoint) relatedArtistsEndpoint = ep;
      if (hasPlaylist && !relatedPlaylistsEndpoint) relatedPlaylistsEndpoint = ep;
    }
  }

  return {
    id: playlistId,
    title: header.title || 'Playlist',
    description: header.description,
    author: header.author,
    year: header.year,
    authorAvatar: header.authorAvatar,
    thumbnail: playlistThumbnail,
    songCount: header.songCount || songs.length,
    songs,
    songsEndpoint,
    related,
    relatedEndpoint,
    relatedAlbums,
    relatedAlbumsEndpoint,
    relatedPlaylists,
    relatedPlaylistsEndpoint,
    relatedArtists,
    relatedArtistsEndpoint,
    authors: header.authors
  };
}

export async function getYTMArtist(artistId: string, cookie?: string): Promise<YTMArtistDetail> {
  const browseId = normalizeBrowseId(artistId, 'channel');
  if (!browseId) throw new Error('Invalid artist id');

  const data = await ytmPost('browse', { browseId }, cookie);
  const header = parseHeader(data);
  const shelves = collectShelves(data);
  const { songs, endpoint: songsEndpoint } = collectSongsFromShelves(shelves);

  songs.forEach((song) => {
    if (!song.thumbnail && header.thumbnail) song.thumbnail = header.thumbnail;
    if ((!song.artists || song.artists.length === 0) && header.title) {
      song.artists = [{ name: header.title, id: artistId }];
    }
  });

  const albums: YTMPlaylist[] = [];
  const playlists: YTMPlaylist[] = [];
  const similarArtists: YTMPlaylist[] = [];

  let albumsEndpoint: YTMBrowseEndpoint | undefined;
  let playlistsEndpoint: YTMBrowseEndpoint | undefined;
  let similarArtistsEndpoint: YTMBrowseEndpoint | undefined;

  for (const shelf of shelves) {
    let hasAlbum = false, hasArtist = false, hasPlaylist = false;
    for (const c of shelf.contents || []) {
      const renderer = c.musicTwoRowItemRenderer;
      if (!renderer) continue;
      const item = parsePlaylistItem(renderer);
      if (!item?.id) continue;

      const pageType =
        renderer.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType;

      if (pageType === 'MUSIC_PAGE_TYPE_ALBUM') {
        albums.push(item);
        hasAlbum = true;
      }
      else if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL') {
        similarArtists.push(item);
        hasArtist = true;
      }
      else {
        playlists.push(item);
        hasPlaylist = true;
      }
    }
    
    const ep = getShelfEndpoint(shelf);
    if (ep) {
      if (hasAlbum && !albumsEndpoint) albumsEndpoint = ep;
      if (hasArtist && !similarArtistsEndpoint) similarArtistsEndpoint = ep;
      if (hasPlaylist && !playlistsEndpoint) playlistsEndpoint = ep;
    }
  }

  return {
    id: artistId,
    title: header.title || 'Artist',
    description: header.description,
    thumbnail: header.thumbnail,
    avatar: header.authorAvatar,
    subscriberCount: header.subscriberCount,
    songs,
    songsEndpoint,
    albums,
    albumsEndpoint,
    playlists,
    playlistsEndpoint,
    similarArtists,
    similarArtistsEndpoint
  };
}

export const getYTMPlaylistDetail = getYTMPlaylist;

export async function getYTMRadio(videoId: string): Promise<YTMSong[]> {
  if (!videoId) return [];

  const endpoints = [
    { videoId },
    { videoId, playlistId: `RDAMVM${videoId}` }
  ];

  for (const body of endpoints) {
    try {
      const data = await ytmPost('next', body);
      const songs = [
        ...collectSongsFromShelves(collectShelves(data)).songs,
        ...collectRadioSongs(data)
      ].filter((song, index, all) => {
        return song.id !== videoId && all.findIndex((candidate) => candidate.id === song.id) === index;
      });
      if (songs.length > 0) return songs;
    } catch (error) {
      console.warn('[YTM radio] endpoint failed:', error);
    }
  }

  return [];
}

export function isYTMSong(item: YTMSong | YTMPlaylist): item is YTMSong {
  return 'artists' in item;
}

export async function getYTMMoodDetail(browseId: string, params: string, cookie?: string): Promise<YTMHomePage> {
  const data = await ytmPost('browse', { browseId, params }, cookie);
  
  const sections: YTMSection[] = [];
  const contents =
    data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
      ?.sectionListRenderer?.contents || [];

  for (const content of contents) {
    const shelf =
      content.musicImmersiveCarouselShelfRenderer ||
      content.musicCarouselShelfRenderer ||
      content.musicShelfRenderer ||
      content.musicImmersiveHeaderRenderer;

    if (!shelf) continue;

    const title =
      parseRuns(shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs) ||
      parseRuns(shelf.header?.musicImmersiveCarouselShelfBasicHeaderRenderer?.title?.runs) ||
      parseRuns(shelf.title?.runs) ||
      '';

    const items: (YTMSong | YTMPlaylist)[] = [];

    (shelf.contents || []).forEach((c: any) => {
      const renderer = c.musicTwoRowItemRenderer || c.musicResponsiveListItemRenderer;
      if (!renderer) return;

      const song = parseSongItem(renderer);
      if (song) {
        items.push(song);
        return;
      }

      const playlist = parsePlaylistItem(renderer);
      if (playlist) items.push(playlist);
    });

    if (items.length > 0) {
      sections.push({ title: title || 'Recommended', items });
    }
  }

  return { sections };
}

function collectAllItems(data: any): (YTMSong | YTMPlaylist)[] {
  const items: (YTMSong | YTMPlaylist)[] = [];
  const seen = new Set<string>();

  const walk = (node: any, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 14) return;

    if (Array.isArray(node)) {
      node.forEach((n) => walk(n, depth + 1));
      return;
    }

    const renderer = node.musicResponsiveListItemRenderer || node.musicTwoRowItemRenderer;
    if (renderer) {
      const song = parseSongItem(renderer);
      if (song && !seen.has(song.id)) {
        seen.add(song.id);
        items.push(song);
      } else {
        const playlist = parsePlaylistItem(renderer);
        if (playlist && !seen.has(playlist.id)) {
          seen.add(playlist.id);
          items.push(playlist);
        }
      }
      return; 
    }

    for (const key of Object.keys(node)) {
      if (key === 'continuations' || key === 'continuationItems' || key === 'continuation')
        continue;
      const value = node[key];
      if (value && typeof value === 'object') walk(value, depth + 1);
    }
  };

  walk(data);
  return items;
}

export interface YTMListResponse {
  title?: string;
  items: (YTMSong | YTMPlaylist)[];
}

export async function getYTMList(browseId: string, params?: string, cookie?: string): Promise<YTMListResponse> {
  const data = await ytmPost('browse', { browseId, params }, cookie);
  const header = parseHeader(data);
  const items = collectAllItems(data);
  return {
    title: header.title,
    items
  };
}

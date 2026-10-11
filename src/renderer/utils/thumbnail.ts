export const getImgUrl = (url: string | undefined, size: string = '') => {
  if (!url) return '';

  let clean = url.trim();
  if (clean.startsWith('//')) {
    clean = `https:${clean}`;
  } else if (clean.startsWith('http://')) {
    clean = clean.replace('http://', 'https://');
  }

  if (clean.startsWith('data:') || clean.startsWith('local://')) return clean;

  if (clean.includes('thumbnail')) {
    return clean.replace(/thumbnail=\d+y\d+(?!.*thumbnail)/, `thumbnail=${size}`);
  }

  if (clean.includes('googleusercontent.com') || clean.includes('yt3.ggpht.com')) {
    const match = size.match(/^(\d+)y(\d+)$/);
    const dim = match ? Math.min(parseInt(match[1]), 800) : 544;
    if (clean.includes('=')) {
      const base = clean.split('=')[0];
      return `${base}=w${dim}-h${dim}-l90-rj`;
    }
    if (/\/(w\d+-h\d+|s\d+)\//.test(clean)) {
      return clean.replace(/\/(w\d+-h\d+|s\d+)\//, `/w${dim}-h${dim}/`);
    }
    return `${clean}=w${dim}-h${dim}-l90-rj`;
  }

  if (clean.includes('i.ytimg.com')) {
    const base = clean.split('?')[0];
    const match = size.match(/^(\d+)y(\d+)$/);
    const dim = match ? parseInt(match[1]) : 544;
    if (dim > 300) {
      return base.replace(/\/(mqdefault|default)\.jpg/, '/hqdefault.jpg');
    }
    return base;
  }

  if (clean.includes('music.126.net')) {
    const base = clean.split('?')[0];
    return size ? `${base}?param=${size}` : base;
  }

  return clean;
};

const PLAYER_SIZE = '1600y1600';

const SEARCH_SIZE = '800y800';
const LIST_SIZE = '100y100';
const TINY_SIZE = '30y30';
export const thumbPlayer = (picUrl: string | undefined | null): string =>
  getImgUrl(picUrl ?? undefined, PLAYER_SIZE);

export const thumbSearch = (picUrl: string | undefined | null): string =>
  getImgUrl(picUrl ?? undefined, SEARCH_SIZE);

export const thumbList = (picUrl: string | undefined | null): string =>
  getImgUrl(picUrl ?? undefined, LIST_SIZE);

export const thumbTiny = (picUrl: string | undefined | null): string =>
  getImgUrl(picUrl ?? undefined, TINY_SIZE);



import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import VueDevTools from 'vite-plugin-vue-devtools';
function audioStreamProxyPlugin() {
  return {
    name: 'vite-audio-stream-proxy',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/__stream_probe')) {
          try {
            const reqUrl = new URL(req.url, 'http://localhost:1420');
            const streamUrl = reqUrl.searchParams.get('url');
            if (!streamUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ playable: false, status: 400, reason: 'Missing url' }));
              return;
            }
            const userAgent =
              reqUrl.searchParams.get('ua') ||
              (streamUrl.includes('c=ANDROID')
                ? 'com.google.android.youtube/21.02.35 (Linux; U; Android 11) gzip'
                : 'com.google.ios.youtube/21.03.3 (iPad7,6; U; CPU iPadOS 17_7_10 like Mac OS X; en-US)');

            const head = await fetch(streamUrl, {
              headers: {
                'User-Agent': userAgent,
                'Range': 'bytes=0-1'
              }
            });

            if (!head.ok && head.status !== 206) {
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  playable: false,
                  status: head.status,
                  reason: `media CDN returned ${head.status}`
                })
              );
              return;
            }

            const contentRange = head.headers.get('content-range');
            let total = 0;
            if (contentRange) {
              const parts = contentRange.split('/');
              if (parts.length > 1) {
                total = parseInt(parts[parts.length - 1].trim(), 10) || 0;
              }
            }

            if (total > 1) {
              const tail = total - 1;
              const tailRes = await fetch(streamUrl, {
                headers: {
                  'User-Agent': userAgent,
                  'Range': `bytes=${tail}-${tail}`
                }
              });

              if (!tailRes.ok && tailRes.status !== 206) {
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    playable: false,
                    status: tailRes.status,
                    reason: `media CDN served head but refused tail byte ${tail} with ${tailRes.status}`
                  })
                );
                return;
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ playable: true, status: head.status, reason: null }));
            return;
          } catch (err: any) {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                playable: false,
                status: 0,
                reason: err?.message || 'Probe error'
              })
            );
            return;
          }
        }

        if (!req.url?.startsWith('/__audio_stream')) {
          return next();
        }
        try {
          const reqUrl = new URL(req.url, 'http://localhost:1420');
          const streamUrl = reqUrl.searchParams.get('url');
          if (!streamUrl) {
            res.statusCode = 400;
            res.end('Missing stream url parameter');
            return;
          }
          const userAgent =
            reqUrl.searchParams.get('ua') ||
            'com.google.ios.youtube/21.03.3 (iPad7,6; U; CPU iPadOS 17_7_10 like Mac OS X; en-US)';

          let start = 0;
          let end: number | null = null;
          const rangeHeader = req.headers['range'] as string | undefined;

          if (rangeHeader) {
            const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
            if (match) {
              start = parseInt(match[1], 10);
              if (match[2]) {
                end = parseInt(match[2], 10);
              }
            }
          }
          const upstreamRange = end !== null ? `bytes=${start}-${end}` : `bytes=${start}-`;

          const controller = new AbortController();
          req.on('close', () => {
            controller.abort();
          });

          const upstream = await fetch(streamUrl, {
            headers: {
              'User-Agent': userAgent,
              'Range': upstreamRange,
              'Accept': '*/*'
            },
            signal: controller.signal
          });

          if (upstream.status === 206 || upstream.status === 200) {
            const headers: Record<string, string> = {
              'Content-Type': upstream.headers.get('content-type') || 'audio/mp4',
              'Accept-Ranges': 'bytes',
              'Access-Control-Allow-Origin': '*'
            };
            if (upstream.headers.has('content-range')) {
              headers['Content-Range'] = upstream.headers.get('content-range')!;
            }
            if (upstream.headers.has('content-length')) {
              headers['Content-Length'] = upstream.headers.get('content-length')!;
            }
            res.writeHead(upstream.status, headers);

            if (upstream.body) {
              const { Readable } = await import('node:stream');
              const nodeStream = Readable.fromWeb(upstream.body as any);
              req.on('close', () => {
                try {
                  nodeStream.destroy();
                } catch {}
              });
              nodeStream.on('error', (err: any) => {
                if (err.name !== 'AbortError' && !res.writableEnded) {
                  try {
                    res.end();
                  } catch {}
                }
              });
              nodeStream.pipe(res);
            } else {
              res.end();
            }
          } else {
            res.writeHead(upstream.status, {
              'Access-Control-Allow-Origin': '*'
            });
            res.end();
          }
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return;
          }
          console.error('[audioStreamProxyPlugin] error:', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Access-Control-Allow-Origin': '*' });
          }
          res.end(err?.message || 'Proxy error');
        }
      });
    }
  };
}

export default defineConfig({
  base: './',
  root: resolve('src/renderer'),
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
      '@renderer': resolve('src/renderer'),
      '@i18n': resolve('src/i18n')
    }
  },
  plugins: [
    vue(),
    viteCompression(),
    VueDevTools(),
    audioStreamProxyPlugin(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
        }
      ]
    }),
    Components({
      resolvers: [NaiveUiResolver()]
    })
  ],
  publicDir: resolve('resources'),
  build: {
    target: 'es2022'
  },
  server: {
    host: '0.0.0.0',
    port: 1420,
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 1420
    },
    proxy: {
      '/__ytm_proxy': {
        target: 'https://music.youtube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__ytm_proxy/, ''),
        headers: {
          Origin: 'https://music.youtube.com',
          Referer: 'https://music.youtube.com/'
        }
      },
      '/__yt_proxy': {
        target: 'https://www.youtube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/__yt_proxy/, ''),
        headers: {
          Origin: 'https://www.youtube.com',
          Referer: 'https://www.youtube.com/'
        }
      }
    }
  }
});

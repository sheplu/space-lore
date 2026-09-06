import { defineConfig } from 'vite';
import { resolve, join } from 'path';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'node:http';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CONTENT_ROOT = join(__dirname, '..', '..', 'content');

function isEnoent(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

function listDir(dirPath: string): Array<{ name: string; path: string; isDirectory: boolean; size: number; modified: string }> {
  const fullPath = join(CONTENT_ROOT, dirPath);
  if (!fullPath.startsWith(CONTENT_ROOT)) throw new Error('Forbidden');
  const entries = readdirSync(fullPath);
  return entries.map((entry) => {
    const fullEntryPath = join(fullPath, entry);
    const stat = statSync(fullEntryPath);
    return {
      name: entry,
      path: join('/', dirPath, entry),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  });
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2024',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('three')) return 'three';
          if (id.includes('gsap') || id.includes('dat.gui')) return 'vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: ['..', '../..', '../../..'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@renderers': resolve(__dirname, 'src/renderers'),
      '@loaders': resolve(__dirname, 'src/loaders'),
      '@controls': resolve(__dirname, 'src/controls'),
      '@shaders': resolve(__dirname, 'src/shaders'),
      '@types': resolve(__dirname, 'src/types'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  optimizeDeps: {
    include: ['three', 'gsap', 'dat.gui'],
  },
  plugins: [
    {
      name: 'serve-content',
      configureServer(server) {
        // API endpoint for directory listing
        server.middlewares.use('/api/content', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url ?? '';
          const dirPath = url.replace(/^\//, '').replace(/\/$/, '').split('?')[0] ?? '';
          try {
            const result = listDir(dirPath);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err) {
            if (isEnoent(err)) {
              res.statusCode = 404;
              res.end('Not found');
            } else if (err instanceof Error && err.message === 'Forbidden') {
              res.statusCode = 403;
              res.end('Forbidden');
            } else {
              next();
            }
          }
        });

        server.middlewares.use('/content', (req: IncomingMessage, res: ServerResponse) => {
          const url = (req.url ?? '').split('?')[0] ?? '';
          const filePath = join(CONTENT_ROOT, url.replace(/^\//, ''));

          // Security: ensure path is within CONTENT_ROOT
          if (!filePath.startsWith(CONTENT_ROOT)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }

          // Set content type based on extension
          const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
          const contentTypes: Record<string, string> = {
            json: 'application/json',
            html: 'text/html',
            js: 'application/javascript',
            css: 'text/css',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
          };
          res.setHeader('Content-Type', contentTypes[ext] ?? 'application/octet-stream');

          void import('node:fs').then((fs) => {
            const readStream = fs.createReadStream(filePath);
            readStream.on('error', () => {
              if (!res.headersSent) res.statusCode = 500;
              res.end('Internal Server Error');
            });
            readStream.pipe(res);
          });
        });
      },
    },
  ],
});
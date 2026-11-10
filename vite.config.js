import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Local Development Serverless Function Middleware
function serverlessApiPlugin() {
  return {
    name: 'serverless-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next();
        }

        try {
          const parsedUrl = new URL(req.url, 'http://localhost:5173');
          const pathname = parsedUrl.pathname;
          req.query = Object.fromEntries(parsedUrl.searchParams.entries());

          // Read body if POST/PUT
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            const buffers = [];
            for await (const chunk of req) {
              buffers.push(chunk);
            }
            const rawBody = Buffer.concat(buffers).toString();
            try {
              req.body = rawBody ? JSON.parse(rawBody) : {};
            } catch (e) {
              req.body = {};
            }
          } else {
            req.body = {};
          }

          // Polyfill res.status and res.json for Express/Vercel compatibility
          res.status = function (statusCode) {
            res.statusCode = statusCode;
            return res;
          };
          res.json = function (data) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          // Route resolution logic
          const cleanPath = pathname.replace(/^\/api\/?/, ''); // e.g. 'auth/login' or 'tournaments' or 'tournaments/6731...'
          const parts = cleanPath.split('/').filter(Boolean);

          let targetFile = null;
          let idParam = null;

          // 1. Direct match: api/auth/login.js
          const directFile = path.resolve(process.cwd(), 'api', ...parts) + '.js';
          // 2. Index match: api/tournaments/index.js
          const indexFile = path.resolve(process.cwd(), 'api', ...parts, 'index.js');
          // 3. Dynamic route match: api/tournaments/[id].js
          let dynamicFile = null;
          if (parts.length >= 2) {
            const parentParts = parts.slice(0, -1);
            idParam = parts[parts.length - 1];
            dynamicFile = path.resolve(process.cwd(), 'api', ...parentParts, '[id].js');
          }

          if (fs.existsSync(directFile)) {
            targetFile = directFile;
          } else if (fs.existsSync(indexFile)) {
            targetFile = indexFile;
          } else if (dynamicFile && fs.existsSync(dynamicFile)) {
            targetFile = dynamicFile;
            req.query.id = idParam;
          }

          if (targetFile) {
            // Dynamic import of the serverless function module
            const module = await server.ssrLoadModule(targetFile);
            if (module.default && typeof module.default === 'function') {
              return await module.default(req, res);
            }
          }

          res.status(404).json({ success: false, message: `API route not found: ${pathname}` });
        } catch (err) {
          console.error('API Error in dev server:', err);
          res.status(500).json({ success: false, message: err.message || 'Internal server error' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serverlessApiPlugin()],
  server: {
    port: 5173,
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();
if (!process.env.MONGODB_URI) {
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath });
  }
}

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
          const apiIndexFile = path.resolve(process.cwd(), 'api', 'index.js');
          const module = await server.ssrLoadModule(apiIndexFile);
          if (module.default && typeof module.default === 'function') {
            return await module.default(req, res);
          }

          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: `API route not found: ${req.url}` }));
        } catch (err) {
          console.error('API Error in dev server:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: err.message || 'Internal server error' }));
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

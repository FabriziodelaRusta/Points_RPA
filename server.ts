import http from 'http';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Default directory requested by user
  const DEFAULT_RPA_DIR = '/home/sabine/Documents/RPA';

  // API endpoint to inspect local RPA directory on Sabine's system
  app.get('/api/rpa/check', (req, res) => {
    const customDir = (req.query.dir as string) || DEFAULT_RPA_DIR;
    const now = new Date();
    const currentYear = now.getFullYear();
    // Nov 1 rule:
    const nov1 = new Date(currentYear, 10, 1, 0, 0, 0, 0);
    const isAfterNov1 = now.getTime() >= nov1.getTime();

    const expectedFiles = isAfterNov1
      ? [`${currentYear}.csv`]
      : [`${currentYear - 1}.csv`, `${currentYear}.csv`];

    const dirExists = fs.existsSync(customDir);
    const filesFound: { name: string; size: number; path: string; modified: string }[] = [];

    if (dirExists) {
      try {
        const dirEntries = fs.readdirSync(customDir);
        for (const entry of dirEntries) {
          if (entry.toLowerCase().endsWith('.csv') || entry.toLowerCase().endsWith('.cvs')) {
            const fullPath = path.join(customDir, entry);
            const stats = fs.statSync(fullPath);
            filesFound.push({
              name: entry,
              size: stats.size,
              path: fullPath,
              modified: stats.mtime.toISOString(),
            });
          }
        }
      } catch (err) {
        console.error('Error reading directory:', err);
      }
    }

    res.json({
      configuredDir: customDir,
      dirExists,
      isAfterNov1,
      currentYear,
      expectedFiles,
      filesFound,
      systemUser: process.env.USER || 'sabine',
    });
  });

  // API endpoint to read CSV files directly from local disk if available
  app.get('/api/rpa/read-files', (req, res) => {
    const customDir = (req.query.dir as string) || DEFAULT_RPA_DIR;
    if (!fs.existsSync(customDir)) {
      return res.status(404).json({
        error: `Le dossier ${customDir} n'existe pas sur cet environnement.`,
      });
    }

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const nov1 = new Date(currentYear, 10, 1, 0, 0, 0, 0);
      const isAfterNov1 = now.getTime() >= nov1.getTime();

      const targetYear = req.query.year ? Number(req.query.year) : currentYear;
      const expectedNames = [
        `${targetYear - 1}.csv`,
        `${targetYear - 1}.cvs`,
        `${targetYear}.csv`,
        `${targetYear}.cvs`,
        `${targetYear + 1}.csv`,
        `${targetYear + 1}.cvs`,
      ];

      const loadedFiles: { filename: string; content: string }[] = [];
      const dirEntries = fs.readdirSync(customDir);

      for (const file of dirEntries) {
        if (expectedNames.some((exp) => exp.toLowerCase() === file.toLowerCase())) {
          const filePath = path.join(customDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          loadedFiles.push({ filename: file, content });
        }
      }

      return res.json({
        success: true,
        loadedFiles,
        dir: customDir,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite development middleware mounting
  const isProd = process.env.NODE_ENV === 'production';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur RPA actif sur le port ${PORT}`);
  });
}

startServer();

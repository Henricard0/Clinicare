import express from 'express';
import path from 'path';
import app from './app';

const PORT = 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const viteModule = 'vite';
      const { createServer: createViteServer } = await import(/* @vite-ignore */ viteModule);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('[Server] Não foi possível iniciar middleware Vite:', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CliniCare SaaS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;

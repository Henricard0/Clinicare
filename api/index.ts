import app from '../server';

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function Crash]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro na função serverless',
        message: err?.message || String(err),
      });
    }
  }
}


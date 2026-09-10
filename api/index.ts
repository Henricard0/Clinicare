import app from '../app';

export default async function handler(req: any, res: any) {
  try {
    if (req.query && (req.query.endpoint || req.query.__endpoint)) {
      const ep = (req.query.endpoint || req.query.__endpoint) as string | string[];
      const cleanEp = Array.isArray(ep) ? ep.join('/') : String(ep);
      req.url = '/api/' + cleanEp.replace(/^\/+/, '');
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function Catch]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro na função serverless',
        message: err?.message || String(err),
      });
    }
  }
}

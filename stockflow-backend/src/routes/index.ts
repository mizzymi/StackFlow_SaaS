import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'API StockFlow funcionando con TypeScript'
  });
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok'
  });
});

export default router;
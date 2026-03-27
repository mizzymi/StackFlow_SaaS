import { Router, Request, Response } from 'express';
import companyRoutes from './companyRoutes';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'API StockFlow funcionando con TypeScript'
  });
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok'
  });
});

router.use('/companies', companyRoutes)

export default router;
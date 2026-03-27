import { Router, Request, Response } from 'express';
import companyRoutes from './companyRoutes';
import userRoutes from './userRoutes';
import authRoutes from './authRoutes';
import productRoutes from './productRoutes';
import categoryRoutes from './categoryRoutes';
import supplierRoutes from './supplierRoutes';
import inventoryMovementRoutes from './inventory-movementRoutes';
import dashboardRoutes from './dashboardRoutes';

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

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/inventory-movements', inventoryMovementRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
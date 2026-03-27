import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get(
    '/',
    verifyToken,
    authorizeRoles('super_admin', 'company_admin', 'employee'),
    getDashboard
);

export default router;
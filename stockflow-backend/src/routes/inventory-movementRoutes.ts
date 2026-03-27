import { Router } from 'express';
import {
    getInventoryMovements,
    createInventoryMovement
} from '../controllers/inventory-movementController';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), getInventoryMovements);
router.post('/', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), createInventoryMovement);

export default router;
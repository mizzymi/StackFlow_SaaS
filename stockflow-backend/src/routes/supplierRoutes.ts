import { Router } from 'express';
import {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} from '../controllers/supplierController';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), getSuppliers);
router.get('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), getSupplierById);
router.post('/', verifyToken, authorizeRoles('super_admin', 'company_admin'), createSupplier);
router.put('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), updateSupplier);
router.delete('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), deleteSupplier);

export default router;
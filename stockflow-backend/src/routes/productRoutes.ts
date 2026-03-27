import { Router } from 'express';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} from '../controllers/productController';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), getProducts);
router.get('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), getProductById);
router.post('/', verifyToken, authorizeRoles('super_admin', 'company_admin'), createProduct);
router.put('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), updateProduct);
router.delete('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), deleteProduct);

export default router;
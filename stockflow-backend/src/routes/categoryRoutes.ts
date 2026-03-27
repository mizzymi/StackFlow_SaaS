import { Router } from 'express';
import {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/categoryController';
import { authorizeRoles, verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), getCategories);
router.get('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin', 'employee'), getCategoryById);
router.post('/', verifyToken, authorizeRoles('super_admin', 'company_admin'), createCategory);
router.put('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), updateCategory);
router.delete('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), deleteCategory);

export default router;
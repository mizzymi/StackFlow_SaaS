import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController';
import { verifyToken, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', verifyToken, getUsers);
router.get('/:id', verifyToken, getUserById);
router.post('/', verifyToken, authorizeRoles('super_admin', 'company_admin'), createUser);
router.put('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), updateUser);
router.delete('/:id', verifyToken, authorizeRoles('super_admin', 'company_admin'), deleteUser);

export default router;
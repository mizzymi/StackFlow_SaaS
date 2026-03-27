import { Router } from 'express';
import { login, profile, register } from '../controllers/authController';
import { verifyToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', verifyToken, profile);

export default router;
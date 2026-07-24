import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { verifyAuth } from '../middlewares/auth.middleware';

const authRoutes = Router();

authRoutes.post('/signup', authController.signUp);
authRoutes.post('/signin', authController.signIn);
authRoutes.post('/signout', authController.signOut);
authRoutes.get('/profile', verifyAuth, authController.getProfile);
authRoutes.patch('/profile', verifyAuth, authController.updateProfile);

export default authRoutes;
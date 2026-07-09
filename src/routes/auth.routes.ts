import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const authRoutes = Router();

authRoutes.post('/signup', authController.signUp);
authRoutes.post('/signin', authController.signIn);
authRoutes.post('/signout', authController.signOut);
authRoutes.get('/profile', authController.getProfile);

export default authRoutes;
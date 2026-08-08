import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { verifyAuth } from '../middlewares/auth.middleware';
import passport from '../config/google.strategy';

const authRoutes = Router();

authRoutes.post('/signup', authController.signUp);
authRoutes.get('/verify-email', authController.verifyEmail);
authRoutes.post('/resend-verification', authController.resendVerification);
authRoutes.post('/signin', authController.signIn);
authRoutes.post('/forgot-password', authController.forgotPassword);
authRoutes.post('/reset-password', authController.resetPassword);

// Google OAuth routes
authRoutes.get('/google', (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

authRoutes.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false, failureRedirect: '/auth?error=google_auth_failed' })(req, res, next);
}, authController.googleCallback);

authRoutes.post('/google/complete', authController.completeGoogleSignup);

authRoutes.post('/refresh', authController.refreshToken);
authRoutes.post('/signout', authController.signOut);
authRoutes.get('/profile', verifyAuth, authController.getProfile);
authRoutes.patch('/profile', verifyAuth, authController.updateProfile);

export default authRoutes;
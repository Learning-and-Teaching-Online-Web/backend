"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const google_strategy_1 = __importDefault(require("../config/google.strategy"));
const authRoutes = (0, express_1.Router)();
authRoutes.post('/signup', auth_controller_1.authController.signUp);
authRoutes.get('/verify-email', auth_controller_1.authController.verifyEmail);
authRoutes.post('/resend-verification', auth_controller_1.authController.resendVerification);
authRoutes.post('/signin', auth_controller_1.authController.signIn);
authRoutes.post('/forgot-password', auth_controller_1.authController.forgotPassword);
authRoutes.post('/reset-password', auth_controller_1.authController.resetPassword);
// Google OAuth routes
authRoutes.get('/google', (req, res, next) => {
    google_strategy_1.default.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});
authRoutes.get('/google/callback', (req, res, next) => {
    google_strategy_1.default.authenticate('google', { session: false, failureRedirect: '/auth?error=google_auth_failed' })(req, res, next);
}, auth_controller_1.authController.googleCallback);
authRoutes.post('/google/complete', auth_controller_1.authController.completeGoogleSignup);
authRoutes.post('/refresh', auth_controller_1.authController.refreshToken);
authRoutes.post('/signout', auth_controller_1.authController.signOut);
authRoutes.get('/profile', auth_middleware_1.verifyAuth, auth_controller_1.authController.getProfile);
authRoutes.patch('/profile', auth_middleware_1.verifyAuth, auth_controller_1.authController.updateProfile);
exports.default = authRoutes;

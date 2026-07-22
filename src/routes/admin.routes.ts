import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const adminRoutes = Router();

// Apply auth protection & role check for all admin routes
adminRoutes.use(verifyAuth);
adminRoutes.use(requireRole('admin'));

// 1. Dashboard statistics
adminRoutes.get('/stats', adminController.getDashboardStats);

// 2. User Management
adminRoutes.get('/users', adminController.getUsers);
adminRoutes.patch('/users/:userId/status', adminController.updateUserStatus);
adminRoutes.patch('/users/:userId/role', adminController.updateUserRole);

// 3. Tutor & Certificate Verification
adminRoutes.get('/tutors', adminController.getTutors);
adminRoutes.patch('/tutors/:tutorId/verify', adminController.updateTutorVerification);
adminRoutes.get('/tutors/:tutorId/certificates', adminController.getTutorCertificates);
adminRoutes.patch('/certificates/:certId/verify', adminController.updateCertificateStatus);

// 4. Course Moderation
adminRoutes.get('/courses', adminController.getCourses);
adminRoutes.patch('/courses/:courseId/status', adminController.updateCourseStatus);

// 5. Payment & Payouts management
adminRoutes.get('/transactions', adminController.getTransactions);
adminRoutes.get('/payouts', adminController.getPayouts);
adminRoutes.patch('/payouts/:payoutId/status', adminController.updatePayoutStatus);

export default adminRoutes;

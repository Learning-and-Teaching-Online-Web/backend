import { Router } from 'express';
import { tutorController } from '../controllers/tutor.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const tutorRoutes = Router();

tutorRoutes.get('/stats', verifyAuth, requireRole('tutor'), tutorController.getStats);
tutorRoutes.get('/my-profile', verifyAuth, requireRole('tutor'), tutorController.getMyProfile);
tutorRoutes.put('/my-profile', verifyAuth, requireRole('tutor'), tutorController.updateMyProfile);
tutorRoutes.post('/certificates', verifyAuth, requireRole('tutor'), tutorController.addCertificate);
tutorRoutes.delete('/certificates/:certId', verifyAuth, requireRole('tutor'), tutorController.deleteCertificate);
tutorRoutes.get('/bookings', verifyAuth, requireRole('tutor'), tutorController.getBookings);
tutorRoutes.patch('/bookings/:id', verifyAuth, requireRole('tutor'), tutorController.updateBookingStatus);
tutorRoutes.get('/class-sessions', verifyAuth, requireRole('tutor'), tutorController.getClassSessions);
tutorRoutes.get('/reviews', verifyAuth, requireRole('tutor'), tutorController.getReviews);
tutorRoutes.get('/wallet', verifyAuth, requireRole('tutor'), tutorController.getWallet);
tutorRoutes.post('/wallet/deposit', verifyAuth, requireRole('tutor'), tutorController.depositToWallet);
tutorRoutes.post('/wallet/withdraw', verifyAuth, requireRole('tutor'), tutorController.withdrawFunds);
tutorRoutes.get('/', tutorController.getAll);
tutorRoutes.get('/:tutorId', tutorController.getById);

export default tutorRoutes;

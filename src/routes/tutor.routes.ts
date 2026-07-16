import { Router } from 'express';
import { tutorController } from '../controllers/tutor.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const tutorRoutes = Router();

// Apply auth protection & role check for all routes in this namespace
tutorRoutes.use(verifyAuth);
tutorRoutes.use(requireRole('tutor'));

tutorRoutes.get('/stats', tutorController.getStats);
tutorRoutes.get('/bookings', tutorController.getBookings);
tutorRoutes.patch('/bookings/:id', tutorController.updateBookingStatus);
tutorRoutes.get('/reviews', tutorController.getReviews);
tutorRoutes.get('/wallet', tutorController.getWallet);
tutorRoutes.post('/wallet/withdraw', tutorController.withdrawFunds);
tutorRoutes.get('/', tutorController.getAll);
tutorRoutes.get('/:tutorId', tutorController.getById);

export default tutorRoutes;

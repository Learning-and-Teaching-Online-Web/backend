import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { verifyAuth, requireRole } from '../middlewares/auth.middleware';

const bookingRoutes = Router();

// Apply authentication middleware globally for booking operations
bookingRoutes.use(verifyAuth);

// Only users with 'student' role can create bookings or list their student bookings
bookingRoutes.post('/', requireRole('student'), bookingController.create);
bookingRoutes.get('/my-bookings', requireRole('student'), bookingController.listMyBookings);

export default bookingRoutes;

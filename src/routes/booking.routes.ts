import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { verifyAuth } from '../middlewares/auth.middleware';

const bookingRoutes = Router();

// Apply authentication middleware globally for booking operations
bookingRoutes.use(verifyAuth);

bookingRoutes.post('/', bookingController.create);
bookingRoutes.get('/my-bookings', bookingController.listMyBookings);

export default bookingRoutes;

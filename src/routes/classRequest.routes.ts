import { Router } from 'express';
import { classRequestController } from '../controllers/classRequest.controller';
import { refundTicketController } from '../controllers/refundTicket.controller';
import { verifyAuth, optionalAuth, requireRole } from '../middlewares/auth.middleware';

const classRequestRoutes = Router();

// Protected routes (MUST be defined before /:id)
classRequestRoutes.get('/my-requests', verifyAuth, classRequestController.getMyRequests);
classRequestRoutes.patch('/my-requests/:id', verifyAuth, classRequestController.updateMyRequest);
classRequestRoutes.get('/tutor-classes', verifyAuth, classRequestController.getTutorClasses);
classRequestRoutes.post('/:id/pay-commission', verifyAuth, classRequestController.payCommission);
classRequestRoutes.post('/:id/pay-tuition', verifyAuth, classRequestController.payStudentTuition);
classRequestRoutes.post('/:id/check-expiration', verifyAuth, requireRole('admin'), classRequestController.handleEscrowExpiration);

classRequestRoutes.get('/refund-tickets/my-tickets', verifyAuth, refundTicketController.getTickets);
classRequestRoutes.post('/offline-classes/:classId/refund-tickets', verifyAuth, refundTicketController.createTicket);

classRequestRoutes.post('/', verifyAuth, classRequestController.create);
classRequestRoutes.post('/:id/apply', verifyAuth, classRequestController.apply);

// Public / General routes
classRequestRoutes.get('/open', classRequestController.getOpenClasses);
classRequestRoutes.get('/:id', optionalAuth, classRequestController.getDetail);

export default classRequestRoutes;


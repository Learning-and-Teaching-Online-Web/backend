"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const classRequest_controller_1 = require("../controllers/classRequest.controller");
const refundTicket_controller_1 = require("../controllers/refundTicket.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const classRequestRoutes = (0, express_1.Router)();
// Protected routes (MUST be defined before /:id)
classRequestRoutes.get('/my-requests', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.getMyRequests);
classRequestRoutes.patch('/my-requests/:id', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.updateMyRequest);
classRequestRoutes.get('/tutor-classes', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.getTutorClasses);
classRequestRoutes.post('/:id/pay-commission', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.payCommission);
classRequestRoutes.post('/:id/pay-tuition', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.payStudentTuition);
classRequestRoutes.post('/:id/check-expiration', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.handleEscrowExpiration);
classRequestRoutes.get('/refund-tickets/my-tickets', auth_middleware_1.verifyAuth, refundTicket_controller_1.refundTicketController.getTickets);
classRequestRoutes.post('/offline-classes/:classId/refund-tickets', auth_middleware_1.verifyAuth, refundTicket_controller_1.refundTicketController.createTicket);
classRequestRoutes.post('/', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.create);
classRequestRoutes.post('/:id/apply', auth_middleware_1.verifyAuth, classRequest_controller_1.classRequestController.apply);
// Public / General routes
classRequestRoutes.get('/open', classRequest_controller_1.classRequestController.getOpenClasses);
classRequestRoutes.get('/:id', auth_middleware_1.optionalAuth, classRequest_controller_1.classRequestController.getDetail);
exports.default = classRequestRoutes;

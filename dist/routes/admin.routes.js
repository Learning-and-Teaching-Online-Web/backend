"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const classRequest_controller_1 = require("../controllers/classRequest.controller");
const refundTicket_controller_1 = require("../controllers/refundTicket.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const adminRoutes = (0, express_1.Router)();
// Apply auth protection & role check for all admin routes
adminRoutes.use(auth_middleware_1.verifyAuth);
adminRoutes.use((0, auth_middleware_1.requireRole)('admin'));
// 1. Dashboard statistics
adminRoutes.get('/stats', admin_controller_1.adminController.getDashboardStats);
// 2. User Management
adminRoutes.get('/users', admin_controller_1.adminController.getUsers);
adminRoutes.patch('/users/:userId/status', admin_controller_1.adminController.updateUserStatus);
adminRoutes.patch('/users/:userId/role', admin_controller_1.adminController.updateUserRole);
// 3. Tutor & Certificate Verification
adminRoutes.get('/tutors', admin_controller_1.adminController.getTutors);
adminRoutes.patch('/tutors/:tutorId/verify', admin_controller_1.adminController.updateTutorVerification);
adminRoutes.get('/tutors/:tutorId/certificates', admin_controller_1.adminController.getTutorCertificates);
adminRoutes.patch('/certificates/:certId/verify', admin_controller_1.adminController.updateCertificateStatus);
// 4. Course Moderation
adminRoutes.get('/courses', admin_controller_1.adminController.getCourses);
adminRoutes.patch('/courses/:courseId/status', admin_controller_1.adminController.updateCourseStatus);
// 5. Payment & Payouts management
adminRoutes.get('/transactions', admin_controller_1.adminController.getTransactions);
adminRoutes.get('/payouts', admin_controller_1.adminController.getPayouts);
adminRoutes.patch('/payouts/:payoutId/status', admin_controller_1.adminController.updatePayoutStatus);
// 6. Offline Class Requests management
adminRoutes.get('/class-requests', classRequest_controller_1.classRequestController.adminGetAll);
adminRoutes.patch('/class-requests/:id/approve-open', classRequest_controller_1.classRequestController.adminApproveOpen);
adminRoutes.patch('/class-requests/:id/assign-tutor', classRequest_controller_1.classRequestController.adminAssignTutor);
adminRoutes.put('/class-requests/:id', classRequest_controller_1.classRequestController.adminUpdateClassRequest);
// 7. Refund Tickets management
adminRoutes.get('/refund-tickets', refundTicket_controller_1.refundTicketController.getTickets);
adminRoutes.patch('/refund-tickets/:ticketId/process', refundTicket_controller_1.refundTicketController.adminProcessTicket);
exports.default = adminRoutes;

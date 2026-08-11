"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const bookingRoutes = (0, express_1.Router)();
// Apply authentication middleware globally for booking operations
bookingRoutes.use(auth_middleware_1.verifyAuth);
// Only users with 'student' role can create bookings or list their student bookings
bookingRoutes.post('/', (0, auth_middleware_1.requireRole)('student'), booking_controller_1.bookingController.create);
bookingRoutes.get('/my-bookings', (0, auth_middleware_1.requireRole)('student'), booking_controller_1.bookingController.listMyBookings);
bookingRoutes.get('/student/wallet', (0, auth_middleware_1.requireRole)('student'), booking_controller_1.bookingController.getStudentWallet);
bookingRoutes.post('/student/wallet/deposit', (0, auth_middleware_1.requireRole)('student'), booking_controller_1.bookingController.depositStudentWallet);
bookingRoutes.post('/:id/pay', (0, auth_middleware_1.requireRole)('student'), booking_controller_1.bookingController.payBooking);
exports.default = bookingRoutes;

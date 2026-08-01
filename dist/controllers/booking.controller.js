"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingController = void 0;
const booking_service_1 = require("../services/booking.service");
exports.bookingController = {
    // Create a new booking
    async create(req, res) {
        try {
            const userId = req.user?.id;
            const { courseId, scheduleId, notes } = req.body;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            if (!courseId) {
                res.status(400).json({ success: false, error: 'Thiếu thông tin khóa học' });
                return;
            }
            const result = await booking_service_1.bookingService.createBooking(userId, courseId, scheduleId, notes);
            res.status(201).json({ success: true, message: 'Đăng ký khóa học thành công', data: result });
        }
        catch (error) {
            console.error('Error in createBooking controller:', error);
            res.status(400).json({ success: false, error: error.message || error });
        }
    },
    // List student bookings
    async listMyBookings(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ success: false, error: 'Xác thực tài khoản thất bại' });
                return;
            }
            const result = await booking_service_1.bookingService.getMyBookings(userId);
            res.status(200).json({ success: true, data: result });
        }
        catch (error) {
            console.error('Error in listMyBookings controller:', error);
            res.status(500).json({ success: false, error: error.message || error });
        }
    }
};

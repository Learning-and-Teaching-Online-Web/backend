"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tutorService = void 0;
const tutor_repository_1 = require("../repositories/tutor.repository");
const booking_service_1 = require("./booking.service");
exports.tutorService = {
    // Get dashboard statistics for the logged-in tutor
    async getStats(userId) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại hoặc tài khoản chưa đăng ký làm gia sư');
        }
        return await tutor_repository_1.tutorRepository.getStats(tutor.tutor_id);
    },
    // Get student class bookings for this tutor
    async getBookings(userId) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        return await tutor_repository_1.tutorRepository.getBookings(tutor.tutor_id);
    },
    // Approve or Reject booking request
    async updateBookingStatus(userId, bookingId, status) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        const updated = await tutor_repository_1.tutorRepository.updateBookingStatus(bookingId, status);
        // Auto-generate class sessions if booking is approved
        if (status === 'confirmed') {
            try {
                await booking_service_1.bookingService.generateClassSessionsForBooking(bookingId);
            }
            catch (e) {
                console.error("Failed to generate class sessions upon approval:", e);
            }
        }
        return updated;
    },
    // Get student reviews for this tutor
    async getReviews(userId) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        return await tutor_repository_1.tutorRepository.getReviews(tutor.tutor_id);
    },
    // Get wallet details and history
    async getWallet(userId) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        return await tutor_repository_1.tutorRepository.getWallet(userId, tutor.tutor_id);
    },
    // Request bank payout withdrawal
    async withdrawFunds(userId, amount, bankName, bankAccount) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        return await tutor_repository_1.tutorRepository.withdrawFunds(userId, tutor.tutor_id, amount, bankName, bankAccount);
    },
    // Get tutor profile with certificates
    async getMyProfile(userId) {
        return await tutor_repository_1.tutorRepository.getMyProfile(userId);
    },
    // Update tutor profile
    async updateMyProfile(userId, data) {
        return await tutor_repository_1.tutorRepository.updateMyProfile(userId, data);
    },
    // Add new certificate
    async addCertificate(userId, certData) {
        const tutor = await tutor_repository_1.tutorRepository.getMyProfile(userId);
        return await tutor_repository_1.tutorRepository.addCertificate(tutor.tutor_id, certData);
    },
    // Delete certificate
    async deleteCertificate(userId, certId) {
        const tutor = await tutor_repository_1.tutorRepository.getMyProfile(userId);
        return await tutor_repository_1.tutorRepository.deleteCertificate(tutor.tutor_id, certId);
    },
    // Get ClassSessions for the current tutor
    async getClassSessions(userId) {
        const tutor = await tutor_repository_1.tutorRepository.findByUserId(userId);
        if (!tutor) {
            throw new Error('Hồ sơ gia sư không tồn tại');
        }
        return await tutor_repository_1.tutorRepository.getClassSessions(tutor.tutor_id);
    }
};

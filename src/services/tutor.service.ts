import { tutorRepository } from '../repositories/tutor.repository';

export const tutorService = {
  // Get dashboard statistics for the logged-in tutor
  async getStats(userId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại hoặc tài khoản chưa đăng ký làm gia sư');
    }
    return await tutorRepository.getStats(tutor.tutor_id);
  },

  // Get student class bookings for this tutor
  async getBookings(userId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }
    return await tutorRepository.getBookings(tutor.tutor_id);
  },

  // Approve or Reject booking request
  async updateBookingStatus(userId: string, bookingId: string, status: 'confirmed' | 'cancelled') {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }
    return await tutorRepository.updateBookingStatus(bookingId, status);
  },

  // Get student reviews for this tutor
  async getReviews(userId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }
    return await tutorRepository.getReviews(tutor.tutor_id);
  },

  // Get wallet details and history
  async getWallet(userId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }
    return await tutorRepository.getWallet(userId, tutor.tutor_id);
  },

  // Request bank payout withdrawal
  async withdrawFunds(userId: string, amount: number, bankName: string, bankAccount: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }
    return await tutorRepository.withdrawFunds(userId, tutor.tutor_id, amount, bankName, bankAccount);
  },

  // Get tutor profile with certificates
  async getMyProfile(userId: string) {
    return await tutorRepository.getMyProfile(userId);
  },

  // Update tutor profile
  async updateMyProfile(userId: string, data: any) {
    return await tutorRepository.updateMyProfile(userId, data);
  },

  // Add new certificate
  async addCertificate(userId: string, certData: any) {
    const tutor = await tutorRepository.getMyProfile(userId);
    return await tutorRepository.addCertificate(tutor.tutor_id, certData);
  },

  // Delete certificate
  async deleteCertificate(userId: string, certId: string) {
    const tutor = await tutorRepository.getMyProfile(userId);
    return await tutorRepository.deleteCertificate(tutor.tutor_id, certId);
  },

  // Get ClassSessions for the current tutor
  async getClassSessions(userId: string) {
    const tutor = await tutorRepository.findByUserId(userId);
    if (!tutor) {
      throw new Error('Hồ sơ gia sư không tồn tại');
    }
    return await tutorRepository.getClassSessions(tutor.tutor_id);
  }
};

import nodemailer from 'nodemailer';
import { env } from '../config/env';

const getTransporter = () => {
  if (!env.smtpUser || !env.smtpPass) {
    return null;
  }
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
};

export const emailService = {
  async sendVerificationEmail(toEmail: string, token: string, fullName?: string): Promise<boolean> {
    const verifyLink = `${env.frontendUrl}/verify-email?token=${token}`;
    const subject = 'Kích hoạt tài khoản Gia Sư Online';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2b6cb0; text-align: center;">Xác Minh Địa Chỉ Email</h2>
        <p>Xin chào <strong>${fullName || toEmail}</strong>,</p>
        <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Gia Sư Online</strong>.</p>
        <p>Vui lòng nhấn vào nút bên dưới để kích hoạt tài khoản của bạn. Đường link này sẽ hết hạn sau <strong>24 giờ</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="background-color: #3182ce; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích Hoạt Tài Khoản</a>
        </div>
        <p style="font-size: 13px; color: #718096;">Hoặc bạn có thể sao chép đường dẫn sau vào trình duyệt:</p>
        <p style="font-size: 13px; word-break: break-all; color: #3182ce;">${verifyLink}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
      </div>
    `;

    const transporter = getTransporter();
    if (!transporter) {
      console.log('====================================================');
      console.log(`[SMTP MISSING] Email verification link for ${toEmail}:`);
      console.log(verifyLink);
      console.log('====================================================');
      return true;
    }

    try {
      await transporter.sendMail({
        from: `"${env.smtpFrom || 'Gia Sư Online'}" <${env.smtpUser}>`,
        to: toEmail,
        subject: subject,
        html: htmlContent,
      });
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      // Still log link to dev console if sending failed
      console.log(`[DEV FALLBACK] Verification link: ${verifyLink}`);
      return false;
    }
  },

  async sendPasswordResetEmail(toEmail: string, token: string, fullName?: string): Promise<boolean> {
    const resetLink = `${env.frontendUrl}/reset-password?token=${token}`;
    const subject = 'Yêu cầu đặt lại mật khẩu Gia Sư Online';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #e53e3e; text-align: center;">Đặt Lại Mật Khẩu</h2>
        <p>Xin chào <strong>${fullName || toEmail}</strong>,</p>
        <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email này.</p>
        <p>Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới. Đường link này có hiệu lực trong <strong>2 giờ</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #e53e3e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đặt Lại Mật Khẩu</a>
        </div>
        <p style="font-size: 13px; color: #718096;">Hoặc sao chép đường dẫn sau vào trình duyệt:</p>
        <p style="font-size: 13px; word-break: break-all; color: #e53e3e;">${resetLink}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #a0aec0; text-align: center;">Nếu bạn không yêu cầu đổi mật khẩu, tài khoản của bạn vẫn an toàn và bạn có thể bỏ qua email này.</p>
      </div>
    `;

    const transporter = getTransporter();
    if (!transporter) {
      console.log('====================================================');
      console.log(`[SMTP MISSING] Password reset link for ${toEmail}:`);
      console.log(resetLink);
      console.log('====================================================');
      return true;
    }

    try {
      await transporter.sendMail({
        from: `"${env.smtpFrom || 'Gia Sư Online'}" <${env.smtpUser}>`,
        to: toEmail,
        subject: subject,
        html: htmlContent,
      });
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      console.log(`[DEV FALLBACK] Reset link: ${resetLink}`);
      return false;
    }
  }
};

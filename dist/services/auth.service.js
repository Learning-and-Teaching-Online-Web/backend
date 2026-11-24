"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const user_repository_1 = require("../repositories/user.repository");
const password_util_1 = require("../utils/password.util");
const jwt_util_1 = require("../utils/jwt.util");
const supabase_1 = require("../config/supabase");
const email_service_1 = require("./email.service");
exports.authService = {
    // Logic Đăng ký tài khoản (Tạo user + gửi email xác minh)
    async signUp(body) {
        const { email, password, fullName, phone, gender, dateOfBirth, role } = body;
        if (!email || !password || !fullName) {
            throw new Error('Email, mật khẩu và họ tên là bắt buộc');
        }
        if (role === 'admin') {
            throw new Error('Tài khoản Quản trị viên (Admin) không được đăng ký công khai');
        }
        // Kiểm tra xem email đã tồn tại chưa
        const existingUser = await user_repository_1.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email này đã được sử dụng');
        }
        // Mã hóa mật khẩu
        const hashedPassword = await password_util_1.passwordUtil.hashPassword(password);
        // Tạo User trong CSDL (email_verified mặc định false)
        const user = await user_repository_1.userRepository.createUser({
            email,
            password: hashedPassword,
            full_name: fullName,
            phone,
            gender,
            date_of_birth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            role: role || 'student'
        });
        // Tạo token xác minh email (hết hạn sau 24 giờ)
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user_repository_1.userRepository.updateUserVerificationToken(user.user_id, verificationToken, expiresAt);
        // Gửi email xác minh
        await email_service_1.emailService.sendVerificationEmail(user.email, verificationToken, fullName);
        const { password: _, ...userWithoutPassword } = user;
        return {
            message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra hộp thư email của bạn để kích hoạt tài khoản.',
            email: user.email,
            user: userWithoutPassword
        };
    },
    // Logic Xác minh Email qua Token
    async verifyEmail(token) {
        if (!token) {
            throw new Error('Mã xác minh không được để trống');
        }
        const user = await user_repository_1.userRepository.findByVerificationToken(token);
        if (!user) {
            throw new Error('Mã xác minh không hợp lệ hoặc đã được sử dụng');
        }
        if (user.verification_token_expires && new Date() > new Date(user.verification_token_expires)) {
            throw new Error('Mã xác minh đã hết hạn (24 giờ). Vui lòng yêu cầu gửi lại email xác minh');
        }
        await user_repository_1.userRepository.updateUserEmailVerified(user.user_id, true);
        return {
            success: true,
            message: 'Xác minh email thành công! Bạn có thể đăng nhập ngay bây giờ.'
        };
    },
    // Gửi lại email xác minh
    async resendVerificationEmail(email) {
        if (!email) {
            throw new Error('Email không được để trống');
        }
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Không tìm thấy tài khoản với email này');
        }
        if (user.email_verified) {
            return { message: 'Tài khoản của bạn đã được xác minh trước đó' };
        }
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user_repository_1.userRepository.updateUserVerificationToken(user.user_id, verificationToken, expiresAt);
        await email_service_1.emailService.sendVerificationEmail(user.email, verificationToken, user.full_name);
        return { message: 'Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư của bạn' };
    },
    // Logic Đăng nhập
    async signIn(body) {
        const { email, password } = body;
        if (!email || !password) {
            throw new Error('Email và mật khẩu không được để trống');
        }
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Email hoặc mật khẩu không chính xác');
        }
        // Kiểm tra trạng thái xác minh email
        if (!user.email_verified && user.social_provider !== 'google') {
            throw new Error('Email của bạn chưa được xác minh. Vui lòng kiểm tra email để kích hoạt tài khoản');
        }
        if (!user.password && !user.social_provider) {
            throw new Error('Tài khoản này chưa được thiết lập mật khẩu');
        }
        if (user.password) {
            const isMatch = await password_util_1.passwordUtil.comparePassword(password, user.password);
            if (!isMatch) {
                throw new Error('Email hoặc mật khẩu không chính xác');
            }
        }
        // Tạo cặp token JWT (access_token: 2h, refresh_token: 7d)
        const tokenPayload = { userId: user.user_id, email: user.email, role: user.role, full_name: user.full_name };
        const accessToken = jwt_util_1.jwtUtil.generateAccessToken(tokenPayload);
        const refreshToken = jwt_util_1.jwtUtil.generateRefreshToken(tokenPayload);
        // Lưu Refresh Token vào DB
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await user_repository_1.userRepository.saveRefreshToken(user.user_id, refreshToken, expiresAt);
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            access_token: accessToken,
            refresh_token: refreshToken
        };
    },
    // Logic Quên mật khẩu (Gửi email token reset)
    async forgotPassword(email) {
        if (!email) {
            throw new Error('Vui lòng nhập địa chỉ email');
        }
        const user = await user_repository_1.userRepository.findByEmail(email);
        if (!user) {
            return { message: 'Nếu địa chỉ email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu' };
        }
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
        await user_repository_1.userRepository.updateUserResetToken(user.user_id, resetToken, expiresAt);
        await email_service_1.emailService.sendPasswordResetEmail(user.email, resetToken, user.full_name);
        return { message: 'Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn' };
    },
    // Logic Đặt lại mật khẩu mới từ Token
    async resetPassword(body) {
        const { token, newPassword } = body;
        if (!token || !newPassword) {
            throw new Error('Mã xác thực và mật khẩu mới là bắt buộc');
        }
        if (newPassword.length < 6) {
            throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
        }
        const user = await user_repository_1.userRepository.findByResetToken(token);
        if (!user) {
            throw new Error('Mã đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng');
        }
        if (user.reset_token_expires && new Date() > new Date(user.reset_token_expires)) {
            throw new Error('Mã đặt lại mật khẩu đã hết hạn (2 giờ). Vui lòng thực hiện lại yêu cầu');
        }
        const hashedPassword = await password_util_1.passwordUtil.hashPassword(newPassword);
        await user_repository_1.userRepository.updateUserPassword(user.user_id, hashedPassword);
        await user_repository_1.userRepository.deleteUserRefreshTokens(user.user_id);
        return { success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập với mật khẩu mới' };
    },
    // Xử lý thông tin user từ Google Passport Strategy
    async handleGoogleProfile(googleProfile) {
        const email = googleProfile.emails?.[0]?.value;
        if (!email) {
            throw new Error('Không thể lấy email từ tài khoản Google của bạn');
        }
        const googleId = googleProfile.id;
        const fullName = googleProfile.displayName || email.split('@')[0];
        const existingUser = await user_repository_1.userRepository.findByEmail(email);
        if (existingUser) {
            // Cập nhật social_provider = 'google', social_id và email_verified = true
            await user_repository_1.userRepository.updateSocialInfo(existingUser.user_id, 'google', googleId);
            const tokenPayload = { userId: existingUser.user_id, email: existingUser.email, role: existingUser.role, full_name: existingUser.full_name || fullName };
            const accessToken = jwt_util_1.jwtUtil.generateAccessToken(tokenPayload);
            const refreshToken = jwt_util_1.jwtUtil.generateRefreshToken(tokenPayload);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            await user_repository_1.userRepository.saveRefreshToken(existingUser.user_id, refreshToken, expiresAt);
            const { password: _, ...userWithoutPassword } = existingUser;
            return {
                isNewUser: false,
                user: { ...userWithoutPassword, social_provider: 'google', social_id: googleId, email_verified: true },
                access_token: accessToken,
                refresh_token: refreshToken
            };
        }
        else {
            return {
                isNewUser: true,
                email,
                fullName,
                googleId
            };
        }
    },
    // Hoàn tất đăng ký Google khi chọn role
    async completeGoogleSignup(data) {
        const { email, fullName, role, googleId } = data;
        if (!email || !fullName || !role) {
            throw new Error('Thông tin đăng ký Google chưa đầy đủ');
        }
        const existingUser = await user_repository_1.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email này đã tồn tại trong hệ thống');
        }
        const user = await user_repository_1.userRepository.createUser({
            email,
            full_name: fullName,
            role: role || 'student',
            social_provider: 'google',
            social_id: googleId || undefined
        });
        await user_repository_1.userRepository.updateUserEmailVerified(user.user_id, true);
        if (googleId) {
            await user_repository_1.userRepository.updateSocialInfo(user.user_id, 'google', googleId);
        }
        const tokenPayload = { userId: user.user_id, email: user.email, role: user.role, full_name: user.full_name || fullName };
        const accessToken = jwt_util_1.jwtUtil.generateAccessToken(tokenPayload);
        const refreshToken = jwt_util_1.jwtUtil.generateRefreshToken(tokenPayload);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await user_repository_1.userRepository.saveRefreshToken(user.user_id, refreshToken, expiresAt);
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: { ...userWithoutPassword, social_provider: 'google', social_id: googleId, email_verified: true },
            access_token: accessToken,
            refresh_token: refreshToken
        };
    },
    // Logic Gia hạn Access Token từ Refresh Token
    async refreshAccessToken(refreshTokenInput) {
        if (!refreshTokenInput) {
            throw new Error('Refresh Token không được để trống');
        }
        let decoded;
        try {
            decoded = jwt_util_1.jwtUtil.verifyRefreshToken(refreshTokenInput);
        }
        catch (err) {
            throw new Error('Refresh Token không hợp lệ hoặc đã hết hạn');
        }
        const savedToken = await user_repository_1.userRepository.findRefreshToken(refreshTokenInput);
        if (!savedToken) {
            throw new Error('Refresh Token không tồn tại hoặc đã bị thu hồi');
        }
        if (new Date() > new Date(savedToken.expires_at)) {
            await user_repository_1.userRepository.deleteRefreshToken(refreshTokenInput);
            throw new Error('Refresh Token đã hết hạn, vui lòng đăng nhập lại');
        }
        const newAccessToken = jwt_util_1.jwtUtil.generateAccessToken({
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        });
        return {
            access_token: newAccessToken
        };
    },
    // Logic Đăng xuất (Thu hồi Refresh Token)
    async signOut(refreshTokenInput, userId) {
        if (refreshTokenInput) {
            await user_repository_1.userRepository.deleteRefreshToken(refreshTokenInput);
        }
        else if (userId) {
            await user_repository_1.userRepository.deleteUserRefreshTokens(userId);
        }
    },
    // Logic Lấy Profile của User dựa trên UserId hoặc Token
    async getProfile(userIdOrToken) {
        let userId = userIdOrToken;
        if (userIdOrToken.includes('.')) {
            try {
                const decoded = jwt_util_1.jwtUtil.verifyAccessToken(userIdOrToken);
                userId = decoded.userId;
            }
            catch (err) {
                throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
            }
        }
        const profile = await user_repository_1.userRepository.findById(userId);
        const { password: _, ...profileWithoutPassword } = profile;
        return profileWithoutPassword;
    },
    // Logic Cập nhật thông tin Profile
    async updateProfile(userId, data) {
        const updatePayload = {};
        if (data.fullName !== undefined)
            updatePayload.full_name = data.fullName;
        if (data.phone !== undefined)
            updatePayload.phone = data.phone;
        if (data.gender !== undefined)
            updatePayload.gender = data.gender;
        if (data.dateOfBirth !== undefined)
            updatePayload.date_of_birth = data.dateOfBirth;
        if (data.metadata !== undefined)
            updatePayload.metadata = data.metadata;
        if (data.avatarUrl) {
            let finalAvatarUrl = data.avatarUrl;
            if (data.avatarUrl.startsWith('data:image/')) {
                try {
                    try {
                        await supabase_1.supabaseAdmin.storage.createBucket('avatars', { public: true });
                    }
                    catch (_) { }
                    let base64Data = data.avatarUrl;
                    let contentType = 'image/png';
                    if (base64Data.includes(';base64,')) {
                        const parts = base64Data.split(';base64,');
                        contentType = parts[0].replace('data:', '') || 'image/png';
                        base64Data = parts[1];
                    }
                    const buffer = Buffer.from(base64Data, 'base64');
                    const ext = contentType.split('/')[1] || 'png';
                    const storagePath = `${userId}/avatar_${Date.now()}.${ext}`;
                    const { error: uploadError } = await supabase_1.supabaseAdmin.storage
                        .from('avatars')
                        .upload(storagePath, buffer, { contentType, upsert: true });
                    if (!uploadError) {
                        const { data: urlData } = supabase_1.supabaseAdmin.storage
                            .from('avatars')
                            .getPublicUrl(storagePath);
                        finalAvatarUrl = urlData.publicUrl;
                    }
                    else {
                        console.error('Supabase avatar upload error:', uploadError);
                    }
                }
                catch (err) {
                    console.error('Error uploading avatar image:', err);
                }
            }
            updatePayload.avatar_url = finalAvatarUrl;
        }
        const updatedProfile = await user_repository_1.userRepository.updateById(userId, updatePayload);
        const { password: _, ...result } = updatedProfile;
        return result;
    }
};

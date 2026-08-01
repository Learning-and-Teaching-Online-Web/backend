"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const user_repository_1 = require("../repositories/user.repository");
const password_util_1 = require("../utils/password.util");
const jwt_util_1 = require("../utils/jwt.util");
const supabase_1 = require("../config/supabase");
exports.authService = {
    // Logic Đăng ký tài khoản
    async signUp(body) {
        const { email, password, fullName, phone, gender, dateOfBirth, role } = body;
        if (!email || !password || !fullName) {
            throw new Error('Email, mật khẩu và họ tên là bắt buộc');
        }
        // Kiểm tra xem email đã tồn tại chưa
        const existingUser = await user_repository_1.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('Email này đã được sử dụng');
        }
        // Mã hóa mật khẩu
        const hashedPassword = await password_util_1.passwordUtil.hashPassword(password);
        // Tạo User trong CSDL
        const user = await user_repository_1.userRepository.createUser({
            email,
            password: hashedPassword,
            full_name: fullName,
            phone,
            gender,
            date_of_birth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            role: role || 'student'
        });
        // Tạo cặp token
        const tokenPayload = { userId: user.user_id, email: user.email, role: user.role };
        const accessToken = jwt_util_1.jwtUtil.generateAccessToken(tokenPayload);
        const refreshToken = jwt_util_1.jwtUtil.generateRefreshToken(tokenPayload);
        // Lưu Refresh Token vào CSDL (hết hạn sau 7 ngày)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await user_repository_1.userRepository.saveRefreshToken(user.user_id, refreshToken, expiresAt);
        // Loại bỏ password khỏi response
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            access_token: accessToken,
            refresh_token: refreshToken
        };
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
        if (!user.password) {
            throw new Error('Tài khoản này chưa được thiết lập mật khẩu');
        }
        const isMatch = await password_util_1.passwordUtil.comparePassword(password, user.password);
        if (!isMatch) {
            throw new Error('Email hoặc mật khẩu không chính xác');
        }
        // Tạo cặp token JWT (access_token: 2h, refresh_token: 7d)
        const tokenPayload = { userId: user.user_id, email: user.email, role: user.role };
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
    // Logic Gia hạn Access Token từ Refresh Token
    async refreshAccessToken(refreshTokenInput) {
        if (!refreshTokenInput) {
            throw new Error('Refresh Token không được để trống');
        }
        // Verify token JWT signature
        let decoded;
        try {
            decoded = jwt_util_1.jwtUtil.verifyRefreshToken(refreshTokenInput);
        }
        catch (err) {
            throw new Error('Refresh Token không hợp lệ hoặc đã hết hạn');
        }
        // Kiểm tra token có trong DB không
        const savedToken = await user_repository_1.userRepository.findRefreshToken(refreshTokenInput);
        if (!savedToken) {
            throw new Error('Refresh Token không tồn tại hoặc đã bị thu hồi');
        }
        if (new Date() > new Date(savedToken.expires_at)) {
            await user_repository_1.userRepository.deleteRefreshToken(refreshTokenInput);
            throw new Error('Refresh Token đã hết hạn, vui lòng đăng nhập lại');
        }
        // Tạo Access Token mới (2h)
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
        // Check if passed string is a JWT token
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
        if (data.metadata !== undefined)
            updatePayload.metadata = data.metadata;
        if (data.avatarUrl) {
            let finalAvatarUrl = data.avatarUrl;
            if (data.avatarUrl.startsWith('data:image/')) {
                try {
                    try {
                        await supabase_1.supabaseAdmin.storage.createBucket('avatars', { public: true });
                    }
                    catch (_) {
                        // Ignore if bucket exists
                    }
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

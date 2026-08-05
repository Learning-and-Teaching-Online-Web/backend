"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireApprovedTutor = exports.requireRole = exports.verifyAuth = void 0;
const prisma_1 = require("../config/prisma");
const jwt_util_1 = require("../utils/jwt.util");
const verifyAuth = async (req, res, next) => {
    try {
        const authReq = req;
        const authHeader = authReq.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'Unauthorized: Missing or invalid token format' });
            return;
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
            return;
        }
        // Verify JWT Access Token
        let decoded;
        try {
            decoded = jwt_util_1.jwtUtil.verifyAccessToken(token);
        }
        catch (err) {
            res.status(401).json({ success: false, error: 'Unauthorized: Token expired or invalid' });
            return;
        }
        // Attach user information to request object
        authReq.user = {
            id: decoded.userId,
            userId: decoded.userId,
            user_id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            user_metadata: {
                role: decoded.role,
                full_name: decoded.full_name || (decoded.email ? decoded.email.split('@')[0] : '')
            }
        };
        authReq.token = token;
        next();
    }
    catch (err) {
        console.error('Error in verifyAuth middleware:', err);
        res.status(401).json({ success: false, error: 'Unauthorized: Auth failed' });
    }
};
exports.verifyAuth = verifyAuth;
const requireRole = (...roles) => {
    return (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
            return;
        }
        const userRole = authReq.user.role || authReq.user.user_metadata?.role;
        if (!userRole || !roles.includes(userRole)) {
            res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const requireApprovedTutor = async (req, res, next) => {
    const authReq = req;
    if (!authReq.user) {
        res.status(401).json({ success: false, error: 'Unauthorized: User not authenticated' });
        return;
    }
    const userRole = authReq.user.role || authReq.user.user_metadata?.role;
    // Admin is always allowed
    if (userRole === 'admin') {
        return next();
    }
    if (userRole !== 'tutor') {
        res.status(403).json({ success: false, error: 'Forbidden: Yêu cầu quyền Gia sư hoặc Admin' });
        return;
    }
    try {
        const userId = authReq.user.user_id || authReq.user.id;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized: User ID not found' });
            return;
        }
        const profile = await prisma_1.prisma.tutorProfile.findUnique({
            where: { user_id: userId }
        });
        if (!profile || profile.verified_status !== 'approved') {
            res.status(403).json({
                success: false,
                error: 'Forbidden: Hồ sơ gia sư của bạn chưa được duyệt bởi Quản trị viên'
            });
            return;
        }
        next();
    }
    catch (err) {
        console.error('Error in requireApprovedTutor middleware:', err);
        res.status(500).json({ success: false, error: 'Internal server error while checking tutor verification status' });
    }
};
exports.requireApprovedTutor = requireApprovedTutor;

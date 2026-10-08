"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.requireAuth = void 0;
const authSession_1 = require("../services/authSession");
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.split(' ')[1];
    try {
        req.user = await (0, authSession_1.validateApplicationSession)(token);
        res.setHeader('Cache-Control', 'no-store');
        return next();
    }
    catch (error) {
        const failure = error instanceof authSession_1.SessionError ? error : new authSession_1.SessionError(503, 'Sign-in service is temporarily unavailable.');
        return res.status(failure.status).json({ error: failure.message });
    }
};
exports.requireAuth = requireAuth;
const requireAdmin = async (req, res, next) => {
    return (0, exports.requireAuth)(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admin only.' });
        }
        return next();
    });
};
exports.requireAdmin = requireAdmin;

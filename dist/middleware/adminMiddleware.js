"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const requireAdmin = (req, res, next) => {
    const phone = req.headers['x-phone-number'];
    const adminPhone = '+917032709656';
    if (!phone) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (phone !== adminPhone) {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};
exports.requireAdmin = requireAdmin;

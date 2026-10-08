"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionError = void 0;
exports.issueApplicationSession = issueApplicationSession;
exports.validateApplicationSession = validateApplicationSession;
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongoose_1 = __importDefault(require("mongoose"));
const AuthSession_1 = __importDefault(require("../models/AuthSession"));
const User_1 = __importDefault(require("../models/User"));
const issuer = 'apex-backend';
const audience = 'apex-app';
class SessionError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
exports.SessionError = SessionError;
async function issueApplicationSession(user) {
    const tokenId = (0, crypto_1.randomUUID)();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const token = jsonwebtoken_1.default.sign({ id: String(user._id), authVersion: 3 }, process.env.JWT_SECRET, { algorithm: 'HS256', issuer, audience, jwtid: tokenId, expiresIn: '1h' });
    await AuthSession_1.default.create({ tokenId, userId: user._id, expiresAt });
    return token;
}
async function validateApplicationSession(token) {
    let claims;
    try {
        claims = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer, audience });
        if (claims.authVersion !== 3 || !mongoose_1.default.isValidObjectId(claims.id) || typeof claims.jti !== 'string')
            throw new Error();
    }
    catch {
        throw new SessionError(401, 'Please sign in again.');
    }
    try {
        const session = await AuthSession_1.default.findOne({ tokenId: claims.jti, userId: claims.id, expiresAt: { $gt: new Date() } });
        if (!session)
            throw new SessionError(401, 'Please sign in again.');
        const user = await User_1.default.findById(claims.id);
        if (!user || user.isDisabled)
            throw new SessionError(401, 'Account access is unavailable.');
        return { id: String(user._id), phone: user.phone, role: user.role, tokenId: claims.jti, exp: claims.exp };
    }
    catch (error) {
        if (error instanceof SessionError)
            throw error;
        throw new SessionError(503, 'Sign-in service is temporarily unavailable.');
    }
}

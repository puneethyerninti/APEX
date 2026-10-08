import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import AuthSession from '../models/AuthSession';
import User from '../models/User';

const issuer = 'apex-backend';
const audience = 'apex-app';

export class SessionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function issueApplicationSession(user: any) {
  const tokenId = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = jwt.sign({ id: String(user._id), authVersion: 3 }, process.env.JWT_SECRET as string,
    { algorithm: 'HS256', issuer, audience, jwtid: tokenId, expiresIn: '1h' });
  await AuthSession.create({ tokenId, userId: user._id, expiresAt });
  return token;
}

export async function validateApplicationSession(token: string) {
  let claims: any;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ['HS256'], issuer, audience });
    if (claims.authVersion !== 3 || !mongoose.isValidObjectId(claims.id) || typeof claims.jti !== 'string') throw new Error();
  } catch { throw new SessionError(401, 'Please sign in again.'); }
  try {
    const session = await AuthSession.findOne({ tokenId: claims.jti, userId: claims.id, expiresAt: { $gt: new Date() } });
    if (!session) throw new SessionError(401, 'Please sign in again.');
    const user = await User.findById(claims.id);
    if (!user || user.isDisabled) throw new SessionError(401, 'Account access is unavailable.');
    return { id: String(user._id), phone: user.phone, role: user.role, tokenId: claims.jti, exp: claims.exp };
  } catch (error) {
    if (error instanceof SessionError) throw error;
    throw new SessionError(503, 'Sign-in service is temporarily unavailable.');
  }
}

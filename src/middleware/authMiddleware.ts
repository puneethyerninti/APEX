import { Request, Response, NextFunction } from 'express';
import { SessionError, validateApplicationSession } from '../services/authSession';

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = await validateApplicationSession(token);
    res.setHeader('Cache-Control', 'no-store');
    return next();
  } catch (error) {
    const failure = error instanceof SessionError ? error : new SessionError(503, 'Sign-in service is temporarily unavailable.');
    return res.status(failure.status).json({ error: failure.message });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    
    return next();
  });
};

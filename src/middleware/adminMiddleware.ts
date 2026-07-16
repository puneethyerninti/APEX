import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const phone = req.headers['x-phone-number'] as string;
  const adminPhone = process.env.ADMIN_PHONE_NUMBER;

  if (!phone) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!adminPhone) {
    console.error('CRITICAL: ADMIN_PHONE_NUMBER environment variable is not set!');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (phone !== adminPhone) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  next();
};

import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const phone = req.headers['x-phone-number'] as string;
  const adminPhone = '+917032709656';

  if (!phone) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (phone !== adminPhone) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }

  next();
};

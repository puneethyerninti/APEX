import { Request, Response } from 'express';
import MatrimonyPhoto from '../models/MatrimonyPhoto';
import MatrimonyProfile from '../models/MatrimonyProfile';
import UserBlock from '../models/UserBlock';
import User from '../models/User';
import { photoPath } from '../services/matrimonyPhotos';

export async function getProfilePhoto(req: Request, res: Response) {
  if (!/^[a-f0-9]{24}$/.test(String(req.params.id))) return res.status(404).json({ error: 'Photo unavailable.' });
  try {
    const photo = await MatrimonyPhoto.findById(req.params.id);
    const viewer = (req as any).user;
    if (!photo) return res.status(404).json({ error: 'Photo unavailable.' });
    if (String(photo.owner) !== viewer.id && viewer.role !== 'admin') {
      const approved = await MatrimonyProfile.exists({ user: photo.owner, ownerVerified: true, status: 'approved', images: photoPath(String(photo._id)) });
      const enabled = await User.exists({ _id: photo.owner, isDisabled: { $ne: true } });
      const blocked = await UserBlock.exists({ $or: [{ user: viewer.id, blocked: photo.owner }, { user: photo.owner, blocked: viewer.id }] });
      if (!approved || !enabled || blocked) return res.status(404).json({ error: 'Photo unavailable.' });
    }
    const content = await MatrimonyPhoto.findById(photo._id).select('+data');
    if (!content?.data) return res.status(404).json({ error: 'Photo unavailable.' });
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.type('image/jpeg').send(Buffer.from(content.data));
  } catch {
    return res.status(503).json({ error: 'Photos are temporarily unavailable. Please retry.' });
  }
}

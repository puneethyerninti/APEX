export const activeStatuses: ('searching' | 'accepted' | 'arrived' | 'in_progress')[] = ['searching', 'accepted', 'arrived', 'in_progress'];

export const validLocation = (location: any): boolean =>
  typeof location?.lat === 'number' && Number.isFinite(location.lat) &&
  typeof location?.lng === 'number' && Number.isFinite(location.lng) &&
  location.lat >= 17.50 && location.lat <= 17.95 &&
  location.lng >= 83.10 && location.lng <= 83.45;

export const faresForDistance = (distance: number) => {
  if (!Number.isFinite(distance) || distance < 100 || distance > 150000) throw new Error('Unsupported route distance');
  return { mini: Math.round(50 + distance / 1000 * 15), xl: Math.round(80 + distance / 1000 * 25) };
};

export const canTransition = (from: string, to: string, assignedDriver: boolean, rider: boolean) => {
  if (to === 'cancelled') return (rider || assignedDriver) && ['searching', 'accepted', 'arrived'].includes(from);
  return assignedDriver && ({ accepted: 'arrived', arrived: 'in_progress', in_progress: 'completed' } as Record<string, string>)[from] === to;
};

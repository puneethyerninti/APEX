"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canTransition = exports.faresForDistance = exports.validLocation = exports.activeStatuses = void 0;
exports.activeStatuses = ['searching', 'accepted', 'arrived', 'in_progress'];
const validLocation = (location) => typeof location?.lat === 'number' && Number.isFinite(location.lat) &&
    typeof location?.lng === 'number' && Number.isFinite(location.lng) &&
    location.lat >= 17.50 && location.lat <= 17.95 &&
    location.lng >= 83.10 && location.lng <= 83.45;
exports.validLocation = validLocation;
const faresForDistance = (distance) => {
    if (!Number.isFinite(distance) || distance < 100 || distance > 150000)
        throw new Error('Unsupported route distance');
    return { mini: Math.round(50 + distance / 1000 * 15), xl: Math.round(80 + distance / 1000 * 25) };
};
exports.faresForDistance = faresForDistance;
const canTransition = (from, to, assignedDriver, rider) => {
    if (to === 'cancelled')
        return (rider || assignedDriver) && ['searching', 'accepted', 'arrived'].includes(from);
    return assignedDriver && { accepted: 'arrived', arrived: 'in_progress', in_progress: 'completed' }[from] === to;
};
exports.canTransition = canTransition;

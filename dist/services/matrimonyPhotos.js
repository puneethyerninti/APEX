"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.photoError = exports.photoId = exports.photoPath = void 0;
exports.preparePhotos = preparePhotos;
exports.saveProfileWithPhotos = saveProfileWithPhotos;
exports.deleteProfileWithPhotos = deleteProfileWithPhotos;
const mongoose_1 = __importDefault(require("mongoose"));
const sharp_1 = __importDefault(require("sharp"));
const MatrimonyPhoto_1 = __importDefault(require("../models/MatrimonyPhoto"));
const MatrimonyProfile_1 = __importDefault(require("../models/MatrimonyProfile"));
const photoPath = (id) => '/matrimony/photos/' + id;
exports.photoPath = photoPath;
const photoId = (value) => /^\/matrimony\/photos\/([a-f0-9]{24})$/.exec(value)?.[1];
exports.photoId = photoId;
const photoError = (httpStatus, message) => Object.assign(new Error(message), { httpStatus });
exports.photoError = photoError;
async function preparePhotos(files) {
    if (files.length > 5)
        throw (0, exports.photoError)(400, 'Choose no more than five profile photos.');
    const prepared = [];
    for (const file of files) {
        if (!file.buffer?.length || file.buffer.length > 5 * 1024 * 1024)
            throw (0, exports.photoError)(413, 'Each uploaded photo must be under 5 MB.');
        try {
            // Decode actual pixels, strip metadata, and normalize orientation; MIME labels alone are not trusted.
            const image = (0, sharp_1.default)(file.buffer, { limitInputPixels: 25000000, failOn: 'warning' });
            const metadata = await image.metadata();
            if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1)
                throw new Error('Unsupported image');
            let data = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 82 }).toBuffer();
            if (data.length > 1024 * 1024)
                data = await (0, sharp_1.default)(data).resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
            if (data.length > 1024 * 1024)
                throw new Error('Image too complex');
            prepared.push({ _id: new mongoose_1.default.Types.ObjectId(), data, contentType: 'image/jpeg' });
        }
        catch {
            throw (0, exports.photoError)(415, 'This photo could not be read. Choose a JPEG, PNG or WebP photo, or export it as JPEG and try again.');
        }
    }
    return prepared;
}
async function saveProfileWithPhotos(userId, fields, files, retainedInput, expectedInput) {
    const expectedVersion = expectedInput === undefined ? undefined : typeof expectedInput === 'string' && /^\d+$/.test(expectedInput) ? Number(expectedInput) : NaN;
    if (expectedVersion !== undefined && !Number.isSafeInteger(expectedVersion))
        throw (0, exports.photoError)(400, 'Refresh your profile before submitting changes.');
    let requested;
    if (retainedInput !== undefined) {
        try {
            const value = typeof retainedInput === 'string' ? JSON.parse(retainedInput) : retainedInput;
            if (!Array.isArray(value) || value.length > 5 || value.some(item => typeof item !== 'string') || new Set(value).size !== value.length)
                throw new Error();
            requested = value;
        }
        catch {
            throw (0, exports.photoError)(400, 'Refresh your profile and choose which existing photos to keep.');
        }
    }
    const prepared = await preparePhotos(files);
    const session = await mongoose_1.default.startSession();
    let saved;
    try {
        await session.withTransaction(async () => {
            const current = await MatrimonyProfile_1.default.findOne({ user: userId, ownerVerified: true }).session(session);
            if (expectedVersion !== undefined && (current?.reviewVersion || 0) !== expectedVersion)
                throw (0, exports.photoError)(409, 'Your profile changed in another session. Close this form and reopen the latest profile before submitting.');
            const previous = current?.images || [];
            // Older clients replace the gallery only when they send new files.
            const retained = requested ?? (prepared.length ? [] : previous);
            if (retained.some(url => !previous.includes(url)))
                throw (0, exports.photoError)(400, 'An existing photo does not belong to your profile. Refresh and try again.');
            if (retained.length + prepared.length > 5)
                throw (0, exports.photoError)(400, 'Keep up to five photos in total. Remove a photo before adding another.');
            if (prepared.length)
                await MatrimonyPhoto_1.default.insertMany(prepared.map(photo => ({ ...photo, owner: userId })), { session, ordered: true });
            const images = [...retained, ...prepared.map(photo => (0, exports.photoPath)(String(photo._id)))];
            saved = await MatrimonyProfile_1.default.findOneAndUpdate({ user: userId, ownerVerified: true }, { $set: { ...fields, images, status: 'pending', ownerVerified: true }, $inc: { reviewVersion: 1 }, $setOnInsert: { user: userId } }, { session, upsert: true, returnDocument: 'after', runValidators: true });
            const removedIds = previous.filter(url => !retained.includes(url)).map(exports.photoId).filter(Boolean);
            if (removedIds.length)
                await MatrimonyPhoto_1.default.deleteMany({ _id: { $in: removedIds }, owner: userId }, { session });
        });
    }
    finally {
        await session.endSession();
    }
    return saved;
}
async function deleteProfileWithPhotos(id) {
    const session = await mongoose_1.default.startSession();
    try {
        await session.withTransaction(async () => {
            const profile = await MatrimonyProfile_1.default.findByIdAndDelete(id, { session });
            if (profile)
                await MatrimonyPhoto_1.default.deleteMany({ owner: profile.user }, { session });
        });
    }
    finally {
        await session.endSession();
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelRideAdmin = exports.configureDriver = exports.reconcileCabPayments = exports.fulfillCabPayment = exports.createCabPaymentOrder = exports.updateDriverStatus = exports.updateRideStatus = exports.getDriverRequests = exports.getAllBookingsAdmin = exports.getUserBookings = exports.getRide = exports.getActiveRide = exports.requestRide = exports.calculateFare = exports.expireSearches = exports.handleTravelBooking = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Ride_1 = __importDefault(require("../models/Ride"));
const CabQuote_1 = __importDefault(require("../models/CabQuote"));
const RideSlot_1 = __importDefault(require("../models/RideSlot"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const financeController_1 = require("./financeController");
const cabPolicy_1 = require("../services/cabPolicy");
const cabRouting_1 = require("../services/cabRouting");
const identity = (req) => req.user.id;
const driverFields = 'name phone vehicleDetails currentLocation';
const fail = (res, error) => res.status(error.code === 11000 ? 409 : error.httpStatus || 503)
    .json({ code: typeof error.code === 'string' ? error.code : undefined, error: error.code === 11000 ? 'Another booking or acceptance is already in progress. Refresh to continue.' : error.message || 'Cab service temporarily unavailable' });
const reject = (message, httpStatus = 409) => { throw Object.assign(new Error(message), { httpStatus }); };
const emitRide = (req, ride) => {
    const io = req.app.get('io');
    io?.to('user_' + ride.userId.toString()).emit('ride_status_update', ride);
    if (ride.driverId)
        io?.to('user_' + (ride.driverId._id || ride.driverId).toString()).emit('ride_status_update', ride);
};
const populateRide = (ride) => ride.populate('driverId', driverFields);
// Old ticket orders must not fabricate a booking or ticket.
const handleTravelBooking = async (_userId, _metadata) => {
    throw new Error('Ticket services are unavailable. Contact support for any previously collected payment.');
};
exports.handleTravelBooking = handleTravelBooking;
const expireSearches = async () => {
    const stale = await Ride_1.default.find({ status: 'searching', $or: [{ expiresAt: { $lte: new Date() } }, { expiresAt: { $exists: false }, createdAt: { $lte: new Date(Date.now() - 5 * 60000) } }] }).limit(100);
    for (const ride of stale) {
        const session = await mongoose_1.default.startSession();
        try {
            await session.withTransaction(async () => {
                const changed = await Ride_1.default.findOneAndUpdate({ _id: ride._id, status: 'searching' }, { $set: { status: 'cancelled' }, $push: { statusHistory: { status: 'cancelled', actor: 'system', at: new Date(), reason: 'No driver accepted before search expired' } } }, { session });
                if (changed)
                    await RideSlot_1.default.deleteMany({ rideId: ride._id }, { session });
            });
        }
        finally {
            await session.endSession();
        }
    }
};
exports.expireSearches = expireSearches;
const calculateFare = async (req, res) => {
    try {
        const { pickup, dropoff } = req.body;
        if (![pickup, dropoff].every(cabPolicy_1.validLocation))
            reject('Select pickup and destination inside Visakhapatnam.', 400);
        if (![pickup, dropoff].every(p => typeof p.address === 'string' && p.address.trim().length >= 3 && p.address.length <= 500))
            reject('Select complete addresses.', 400);
        const route = await (0, cabRouting_1.getCabRoute)(pickup, dropoff);
        const fares = (0, cabPolicy_1.faresForDistance)(route.distance);
        const quote = await CabQuote_1.default.create({
            userId: identity(req), pickup, dropoff, fares, distance: route.distance, duration: route.duration,
            path: route.geometry, expiresAt: new Date(Date.now() + 5 * 60000)
        });
        res.json({ quote });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.calculateFare = calculateFare;
const requestRide = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    try {
        const { quoteId, vehicleType, paymentMethod } = req.body;
        if (!mongoose_1.default.isValidObjectId(quoteId) || !['mini', 'xl'].includes(vehicleType) || !['cash', 'online'].includes(paymentMethod))
            reject('Invalid cab selection.', 400);
        let ride;
        await (0, exports.expireSearches)();
        await session.withTransaction(async () => {
            ride = await Ride_1.default.findOne({ userId: identity(req), quoteId }).session(session);
            if (ride)
                return;
            const quote = await CabQuote_1.default.findOne({ _id: quoteId, userId: identity(req), expiresAt: { $gt: new Date() } }).session(session);
            if (!quote)
                reject('Fare quote expired. Please refresh your route.', 400);
            if (await Ride_1.default.exists({ $or: [{ userId: identity(req) }, { driverId: identity(req) }], status: { $in: cabPolicy_1.activeStatuses } }).session(session))
                reject('You already have an active ride.');
            if (await Ride_1.default.exists({ userId: identity(req), status: 'completed', paymentMethod: 'online', paymentStatus: 'unpaid' }).session(session))
                reject('Please pay your previous trip before booking again.');
            const id = new mongoose_1.default.Types.ObjectId();
            await RideSlot_1.default.create([{ _id: 'account:' + identity(req), rideId: id }], { session });
            [ride] = await Ride_1.default.create([{
                    _id: id, userId: identity(req), quoteId, pickup: quote.pickup, dropoff: quote.dropoff,
                    fare: quote.fares[vehicleType], distance: quote.distance, duration: quote.duration, path: quote.path,
                    vehicleType, paymentMethod, paymentStatus: 'unpaid', status: 'searching', expiresAt: new Date(Date.now() + 5 * 60000),
                    statusHistory: [{ status: 'searching', actor: identity(req), at: new Date() }]
                }], { session });
        });
        res.status(201).json({ ride: await populateRide(ride) });
    }
    catch (error) {
        fail(res, error);
    }
    finally {
        await session.endSession();
    }
};
exports.requestRide = requestRide;
const getActiveRide = async (req, res) => {
    try {
        await (0, exports.expireSearches)();
        const ride = await Ride_1.default.findOne({
            $and: [{ $or: [{ userId: identity(req) }, { driverId: identity(req) }] },
                { $or: [{ status: { $in: cabPolicy_1.activeStatuses } }, { userId: identity(req), status: 'completed', paymentMethod: 'online', paymentStatus: 'unpaid' }] }]
        }).sort({ createdAt: -1 }).populate('driverId', driverFields);
        res.json({ ride });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.getActiveRide = getActiveRide;
const getRide = async (req, res) => {
    try {
        if (!mongoose_1.default.isValidObjectId(req.params.id))
            reject('Invalid ride ID', 400);
        const ride = await Ride_1.default.findOne({ _id: req.params.id, $or: [{ userId: identity(req) }, { driverId: identity(req) }] }).populate('driverId', driverFields);
        if (!ride)
            reject('Ride not found', 404);
        res.json({ ride });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.getRide = getRide;
const getUserBookings = async (req, res) => {
    try {
        if (req.params.userId && req.params.userId !== identity(req))
            reject('Not authorized', 403);
        const bookings = await Ride_1.default.find({ $or: [{ userId: identity(req) }, { driverId: identity(req) }] })
            .sort({ createdAt: -1 }).limit(100).populate('driverId', driverFields);
        res.json({ bookings });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.getUserBookings = getUserBookings;
const getAllBookingsAdmin = async (_req, res) => {
    try {
        const rides = await Ride_1.default.find().sort({ createdAt: -1 }).limit(200).populate('userId', 'name phone').populate('driverId', driverFields);
        res.json({ bookings: rides.map(ride => ({ ...ride.toObject(), user: ride.userId, type: 'cab', amount: ride.fare, origin: ride.pickup.address, destination: ride.dropoff.address })) });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.getAllBookingsAdmin = getAllBookingsAdmin;
const approvedDriver = async (req) => {
    const user = await User_1.default.findById(identity(req));
    if (!user || user.role !== 'driver')
        reject('Approved driver access required', 403);
    if (!user.vehicleDetails?.type || !user.vehicleDetails.plate)
        reject('Support must configure your approved vehicle before you go online.', 403);
    return user;
};
const getDriverRequests = async (req, res) => {
    try {
        const driver = await approvedDriver(req);
        await (0, exports.expireSearches)();
        const fresh = driver.isOnline && driver.currentLocation?.updatedAt && driver.currentLocation.updatedAt.getTime() > Date.now() - 45000;
        const busy = await Ride_1.default.exists({ driverId: driver._id, status: { $in: cabPolicy_1.activeStatuses } });
        const rides = fresh && !busy ? await Ride_1.default.find({ status: 'searching', vehicleType: driver.vehicleDetails?.type, expiresAt: { $gt: new Date() } }).sort({ createdAt: 1 }).limit(50) : [];
        res.json({ rides, isOnline: !!fresh, vehicle: driver.vehicleDetails });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.getDriverRequests = getDriverRequests;
const updateRideStatus = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    try {
        const { status, cashCollected } = req.body;
        if (!mongoose_1.default.isValidObjectId(req.params.id))
            reject('Invalid ride ID', 400);
        let changed;
        await session.withTransaction(async () => {
            const ride = await Ride_1.default.findById(req.params.id).session(session);
            if (!ride)
                reject('Ride not found', 404);
            const trip = ride;
            if (status === 'accepted') {
                const driver = await approvedDriver(req);
                if (trip.userId.toString() === identity(req))
                    reject('You cannot accept your own ride.', 403);
                if (trip.status !== 'searching' || !trip.expiresAt || trip.expiresAt <= new Date())
                    reject('This request is no longer available.');
                if (!driver.isOnline || !driver.currentLocation?.updatedAt || driver.currentLocation.updatedAt.getTime() < Date.now() - 45000)
                    reject('Go online with a current GPS location first.');
                if (trip.vehicleType !== driver.vehicleDetails?.type)
                    reject('This request requires a different vehicle.', 403);
                if (await Ride_1.default.exists({ driverId: driver._id, status: { $in: cabPolicy_1.activeStatuses } }).session(session))
                    reject('Finish your active trip first.');
                await RideSlot_1.default.create([{ _id: 'account:' + identity(req), rideId: trip._id }], { session });
            }
            else if (!(0, cabPolicy_1.canTransition)(trip.status, status, trip.driverId?.toString() === identity(req), trip.userId.toString() === identity(req))) {
                reject('This trip transition is not permitted.', 403);
            }
            if (status === 'completed' && trip.paymentMethod === 'cash' && cashCollected !== true)
                reject('Confirm cash collection before completing this trip.', 400);
            const update = { status };
            if (status === 'accepted')
                update.driverId = identity(req);
            if (status === 'completed' && trip.paymentMethod === 'cash') {
                update.paymentStatus = 'paid';
                const cashId = new mongoose_1.default.Types.ObjectId();
                update.paymentTransactionId = cashId;
                await Transaction_1.default.create([{ _id: cashId, user: trip.userId, amount: trip.fare, type: 'debit', category: 'cab_cash', status: 'completed', referenceId: 'Cab ' + trip._id,
                        metadata: { fulfilled: true, rideId: trip._id.toString(), paymentMethod: 'cash', collectedBy: identity(req), collectedAt: new Date() } }], { session });
            }
            changed = await Ride_1.default.findOneAndUpdate({ _id: trip._id, status: trip.status }, { $set: update, $push: { statusHistory: { status, actor: identity(req), at: new Date() } } }, { session, new: true });
            if (!changed)
                reject('Trip changed. Refresh and try again.');
            if (['completed', 'cancelled'].includes(status))
                await RideSlot_1.default.deleteMany({ rideId: trip._id }, { session });
        });
        await populateRide(changed);
        emitRide(req, changed);
        res.json({ ride: changed });
    }
    catch (error) {
        fail(res, error);
    }
    finally {
        await session.endSession();
    }
};
exports.updateRideStatus = updateRideStatus;
const updateDriverStatus = async (req, res) => {
    try {
        const driver = await approvedDriver(req);
        const { isOnline, lat, lng, heading } = req.body;
        if (typeof isOnline !== 'boolean')
            reject('Specify online status.', 400);
        if (isOnline && !(0, cabPolicy_1.validLocation)({ lat, lng }))
            reject('A current Visakhapatnam GPS location is required.', 400);
        driver.isOnline = isOnline;
        if (isOnline)
            driver.currentLocation = { lat, lng, heading: Number.isFinite(heading) ? heading : 0, updatedAt: new Date() };
        await driver.save();
        const ride = await Ride_1.default.findOne({ driverId: driver._id, status: { $in: ['accepted', 'arrived', 'in_progress'] } });
        if (ride && isOnline)
            req.app.get('io')?.to('user_' + ride.userId).emit('ride_location_update', { rideId: ride._id, lat, lng, heading: driver.currentLocation?.heading });
        res.json({ isOnline: driver.isOnline });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.updateDriverStatus = updateDriverStatus;
const createCabPaymentOrder = async (req, res) => {
    if (!mongoose_1.default.isValidObjectId(req.params.id))
        return res.status(400).json({ error: 'Invalid ride ID' });
    const session = await mongoose_1.default.startSession();
    let transaction;
    let creating = false;
    try {
        const provider = (0, financeController_1.getRazorpay)();
        await session.withTransaction(async () => {
            creating = false;
            const ride = await Ride_1.default.findOne({ _id: req.params.id, userId: identity(req), status: 'completed', paymentMethod: 'online', paymentStatus: 'unpaid' }).session(session);
            if (!ride)
                reject('No payable trip found.', 404);
            if (ride.paymentTransactionId) {
                transaction = await Transaction_1.default.findById(ride.paymentTransactionId).session(session);
                return;
            }
            const id = new mongoose_1.default.Types.ObjectId();
            [transaction] = await Transaction_1.default.create([{ _id: id, user: identity(req), amount: ride.fare, type: 'debit', category: 'cab_payment', status: 'pending', referenceId: 'Cab ' + ride._id, metadata: { rideId: ride._id.toString(), orderCreatingAt: new Date() } }], { session });
            await Ride_1.default.updateOne({ _id: ride._id }, { $set: { paymentTransactionId: id } }, { session });
            creating = true;
        });
        if (!transaction)
            reject('Payment record needs support review.', 409);
        if (!transaction.razorpayOrderId && !creating)
            reject('Payment order is processing or needs support review. Do not pay again.', 409);
        if (creating) {
            const order = await provider.orders.create({ amount: Math.round(transaction.amount * 100), currency: 'INR', receipt: transaction._id.toString(), notes: { rideId: transaction.metadata.rideId } });
            transaction.razorpayOrderId = order.id;
            await transaction.save();
        }
        res.json({ orderId: transaction.razorpayOrderId, amount: Math.round(transaction.amount * 100), currency: 'INR', keyId: process.env.RAZORPAY_KEY_ID });
    }
    catch (error) {
        fail(res, error);
    }
    finally {
        await session.endSession();
    }
};
exports.createCabPaymentOrder = createCabPaymentOrder;
const fulfillCabPayment = async (transaction, io) => {
    const session = await mongoose_1.default.startSession();
    let result;
    try {
        await session.withTransaction(async () => {
            const tx = await Transaction_1.default.findOne({ _id: transaction._id, status: 'completed', category: 'cab_payment' }).session(session);
            if (!tx)
                throw new Error('Captured cab payment required');
            if (tx.metadata?.fulfilled) {
                result = tx.metadata.fulfillmentResult;
                return;
            }
            const ride = await Ride_1.default.findOne({ _id: tx.metadata?.rideId, userId: tx.user, paymentTransactionId: tx._id, status: 'completed', paymentMethod: 'online', fare: tx.amount }).session(session);
            if (!ride)
                throw new Error('Cab payment requires support reconciliation');
            ride.paymentStatus = 'paid';
            await ride.save({ session });
            result = { rideId: ride._id.toString(), paid: true, amount: tx.amount };
            await Transaction_1.default.updateOne({ _id: tx._id }, { $set: { 'metadata.fulfilled': true, 'metadata.fulfilledAt': new Date(), 'metadata.fulfillmentResult': result } }, { session });
        });
    }
    finally {
        await session.endSession();
    }
    io?.to('user_' + transaction.user).emit('cab_payment_update', result);
    return result;
};
exports.fulfillCabPayment = fulfillCabPayment;
const reconcileCabPayments = async (io) => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
        return;
    const transactions = await Transaction_1.default.find({ category: 'cab_payment', status: { $in: ['pending', 'completed'] }, 'metadata.fulfilled': { $ne: true },
        $or: [{ 'metadata.reconcileAfter': { $exists: false } }, { 'metadata.reconcileAfter': { $lte: new Date() } }] }).sort({ createdAt: 1 }).limit(20);
    for (const tx of transactions) {
        try {
            await Transaction_1.default.updateOne({ _id: tx._id }, { $set: { 'metadata.reconcileAfter': new Date(Date.now() + 5 * 60000) } });
            if (!tx.razorpayOrderId) {
                await Transaction_1.default.updateOne({ _id: tx._id }, { $set: { 'metadata.manualReview': true, 'metadata.reviewReason': 'Order creation interrupted. Verify receipt with Razorpay before issuing another order.' } });
                continue;
            }
            if (tx.status === 'pending') {
                const payments = await (0, financeController_1.getRazorpay)().orders.fetchPayments(tx.razorpayOrderId);
                const payment = payments.items?.find((p) => p.status === 'captured' && p.order_id === tx.razorpayOrderId && p.currency === 'INR' && Number(p.amount) === Math.round(tx.amount * 100) && Number(p.amount_refunded || 0) === 0);
                if (!payment)
                    continue;
                const captured = await Transaction_1.default.findOneAndUpdate({ _id: tx._id, status: 'pending' }, { $set: { status: 'completed', razorpayPaymentId: payment.id } }, { new: true });
                if (!captured)
                    continue;
                await (0, exports.fulfillCabPayment)(captured, io);
            }
            else {
                await (0, exports.fulfillCabPayment)(tx, io);
            }
        }
        catch (error) {
            await Transaction_1.default.updateOne({ _id: tx._id }, { $set: { 'metadata.manualReview': true, 'metadata.reviewReason': error.message } });
        }
    }
};
exports.reconcileCabPayments = reconcileCabPayments;
const configureDriver = async (req, res) => {
    try {
        const { type, plate, make, model, color } = req.body;
        if (!['mini', 'xl'].includes(type) || ![plate, make, model].every(v => typeof v === 'string' && v.trim().length >= 2 && v.length <= 80))
            reject('Approved vehicle type, plate, make and model are required.', 400);
        const driver = await User_1.default.findById(req.params.id);
        if (!driver || driver.role === 'admin')
            reject('Eligible driver account not found.', 404);
        if (driver.role !== 'driver' && req.body.approved !== true)
            reject('Confirm driver approval first.', 400);
        if (driver.isOnline)
            reject('Driver must go offline before changing vehicle details.');
        if (await Ride_1.default.exists({ $or: [{ driverId: driver._id }, { userId: driver._id }], status: { $in: cabPolicy_1.activeStatuses } }))
            reject('Finish the active trip before changing vehicle details.');
        driver.vehicleDetails = { type, plate: plate.trim().toUpperCase(), make: make.trim(), model: model.trim(), color: typeof color === 'string' ? color.slice(0, 40) : '' };
        driver.role = 'driver';
        driver.isOnline = false;
        await driver.save();
        res.json({ vehicle: driver.vehicleDetails });
    }
    catch (error) {
        fail(res, error);
    }
};
exports.configureDriver = configureDriver;
const cancelRideAdmin = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    try {
        const { reason } = req.body;
        if (!mongoose_1.default.isValidObjectId(req.params.id) || typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 500)
            reject('A valid ride and cancellation reason are required.', 400);
        let ride;
        await session.withTransaction(async () => {
            ride = await Ride_1.default.findOneAndUpdate({ _id: req.params.id, status: { $in: cabPolicy_1.activeStatuses }, paymentStatus: { $ne: 'paid' } }, { $set: { status: 'cancelled' }, $push: { statusHistory: { status: 'cancelled', actor: identity(req), at: new Date(), reason: reason.trim() } } }, { session, new: true });
            if (!ride)
                reject('Only active unpaid trips can be cancelled by support.');
            await RideSlot_1.default.deleteMany({ rideId: ride._id }, { session });
        });
        emitRide(req, ride);
        res.json({ ride });
    }
    catch (error) {
        fail(res, error);
    }
    finally {
        await session.endSession();
    }
};
exports.cancelRideAdmin = cancelRideAdmin;

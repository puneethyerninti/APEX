const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const express = require('express');
const axios = require('axios').default;
const Ride = require('../dist/models/Ride').default;
const User = require('../dist/models/User').default;
const Quote = require('../dist/models/CabQuote').default;
const Slot = require('../dist/models/RideSlot').default;
const Transaction = require('../dist/models/Transaction').default;
const travel = require('../dist/controllers/travelsController');
const users = require('../dist/controllers/userController');
const policy = require('../dist/services/cabPolicy');
const { requireAuth } = require('../dist/middleware/authMiddleware');
const finance = require('../dist/controllers/financeController');
const restores = [];
const rider = new mongoose.Types.ObjectId();
const driver = new mongoose.Types.ObjectId();
const rideId = new mongoose.Types.ObjectId();
const quoteId = new mongoose.Types.ObjectId();
function stub(obj, key, value) { const old = obj[key]; obj[key] = value; restores.push(() => obj[key] = old); }
afterEach(() => { while (restores.length) restores.pop()(); });
function query(value) { return { session() { return this; }, populate() { return this; }, sort() { return this; }, limit() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; }
function response() { return { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function request(body = {}, id = rider) { return { user: { id: String(id) }, body, params: { id: String(rideId) }, query: {}, headers: {}, app: { get() {} } }; }
function sessionSetup() {
  const session = { async withTransaction(cb) { await cb(); }, async endSession() {} };
  stub(mongoose, 'startSession', async () => session);
  stub(Ride, 'find', () => query([]));
  return session;
}
function trip(status = 'accepted') {
  return { _id: rideId, userId: rider, driverId: driver, status, fare: 100, vehicleType: 'mini', paymentMethod: 'cash', paymentStatus: 'unpaid', expiresAt: new Date(Date.now() + 60000), async populate() { return this; }, async save() {} };
}
test('service area rejects NaN, numeric strings and outside-city locations', () => {
  for (const value of [{ lat: NaN, lng: 83.2 }, { lat: '17.7', lng: 83.2 }, { lat: 28, lng: 77 }, null]) assert.equal(policy.validLocation(value), false);
  assert.equal(policy.validLocation({ lat: 17.7, lng: 83.2 }), true);
});
test('fare policy rejects zero, negative and unrealistic distance', () => {
  for (const value of [0, -1, NaN, 150001]) assert.throws(() => policy.faresForDistance(value));
  assert.deepEqual(policy.faresForDistance(1000), { mini: 65, xl: 105 });
});
test('trip transition graph disallows skips, strangers and terminal reopening', () => {
  assert.equal(policy.canTransition('accepted', 'arrived', true, false), true);
  assert.equal(policy.canTransition('arrived', 'in_progress', true, false), true);
  assert.equal(policy.canTransition('in_progress', 'completed', true, false), true);
  assert.equal(policy.canTransition('searching', 'completed', true, false), false);
  assert.equal(policy.canTransition('cancelled', 'in_progress', true, false), false);
  assert.equal(policy.canTransition('accepted', 'arrived', false, false), false);
  assert.equal(policy.canTransition('in_progress', 'cancelled', false, true), false);
});
test('authentication rejects phone-issued legacy JWTs', async () => {
  process.env.JWT_SECRET = 'test-only-secret';
  const res = response(); let called = false;
  await requireAuth({ headers: { authorization: 'Bearer ' + jwt.sign({ id: rider }, process.env.JWT_SECRET) } }, res, () => called = true);
  assert.equal(res.code, 401); assert.equal(called, false);
});
test('every travels route requires authentication', async () => {
  const app = express(); app.use(express.json());
  app.use('/api/travels', require('../dist/routes/travelsRoutes').default);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const [method, path] of [['POST', '/quotes'], ['POST', '/rides'], ['GET', '/rides/active'], ['GET', '/history'], ['PUT', '/driver/status'], ['GET', '/driver/requests'], ['PUT', '/rides/' + rideId + '/status'], ['POST', '/rides/' + rideId + '/payment/order']]) {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/api/travels' + path, { method });
      assert.equal(response.status, 401, path);
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('profile lookup ignores supplied phone and never issues a token', async () => {
  stub(User, 'findById', async id => { assert.equal(String(id), String(rider)); return { _id: rider, role: 'user', apexPlan: 'Free' }; });
  const req = request(); req.query.phone = '+919999999999';
  const res = response(); await users.getUserProfile(req, res);
  assert.equal(res.code, 200); assert.equal(res.body.token, undefined);
});
test('profile update cannot change phone or role', async () => {
  const user = { role: 'user', phone: '+919999999999', async save() {} };
  stub(User, 'findById', async () => user);
  const res = response(); await users.updateUserProfile(request({ role: 'admin', phone: '+918888888888' }), res);
  assert.equal(user.role, 'user'); assert.equal(user.phone, '+919999999999');
});
test('session exchange rejects missing OTP proof', async () => {
  const res = response(); await users.exchangeFirebaseSession(request({ phone: '+919999999999' }), res);
  assert.equal(res.code, 401);
});
test('old ticket fulfillment never generates fake tickets', async () => {
  await assert.rejects(travel.handleTravelBooking(String(rider), { type: 'Flight' }), /unavailable/);
});
test('legacy ticket orders are rejected before Razorpay creation', async () => {
  stub(User, 'findById', async () => ({ _id: rider }));
  process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture'; process.env.RAZORPAY_KEY_SECRET = 'test-only-secret';
  const res = response(); await finance.createRazorpayOrder(request({ amount: 1, category: 'travel_booking' }), res);
  assert.equal(res.code, 400);
});
test('quote rejects outside service area before calling Mapbox', async () => {
  stub(axios, 'get', () => { throw new Error('Must not call provider'); });
  const res = response(); await travel.calculateFare(request({ pickup: { lat: 28, lng: 77 }, dropoff: { lat: 17.7, lng: 83.2 } }), res);
  assert.equal(res.code, 400);
});
test('quote uses server routing and fare, ignoring supplied fare', async () => {
  process.env.MAPBOX_API_KEY = 'test-map-token';
  stub(axios, 'get', async () => ({ data: { code: 'Ok', routes: [{ distance: 1000, duration: 180, geometry: { type: 'LineString', coordinates: [[83.2,17.7],[83.21,17.71]] } }] } }));
  stub(Quote, 'create', async value => { assert.equal(String(value.userId), String(rider)); return value; });
  const p = { address: 'Selected address', lat: 17.7, lng: 83.2 };
  const res = response(); await travel.calculateFare(request({ pickup: p, dropoff: p, fare: -100 }), res);
  assert.equal(res.code, 200); assert.equal(res.body.quote.fares.mini, 65);
});
test('booking takes identity, fare and locations from stored quote', async () => {
  const session = sessionSetup(); let stored;
  stub(Ride, 'findOne', () => query(null)); stub(Ride, 'exists', () => query(null));
  stub(Quote, 'findOne', filter => { assert.equal(filter.userId, String(rider)); return query({ pickup: { address: 'A', lat: 17.7, lng: 83.2 }, dropoff: { address: 'B', lat: 17.8, lng: 83.3 }, fares: { mini: 65, xl: 105 }, distance: 1000, duration: 180 }); });
  stub(Slot, 'create', async (values, options) => { assert.equal(options.session, session); assert.equal(values[0]._id, 'account:' + rider); });
  stub(Ride, 'create', async (values, options) => { assert.equal(options.session, session); stored = values[0]; return [{ ...stored, async populate() { return this; } }]; });
  const res = response(); await travel.requestRide(request({ quoteId: String(quoteId), vehicleType: 'mini', paymentMethod: 'cash', userId: 'victim', fare: -1 }), res);
  assert.equal(res.code, 201); assert.equal(stored.fare, 65); assert.equal(stored.userId, String(rider));
});
test('duplicate booking reuses same quote ride without another reservation', async () => {
  sessionSetup(); const existing = trip();
  stub(Ride, 'findOne', () => query(existing));
  stub(Slot, 'create', () => { throw new Error('Must not reserve again'); });
  const res = response(); await travel.requestRide(request({ quoteId: String(quoteId), vehicleType: 'mini', paymentMethod: 'cash' }), res);
  assert.equal(res.code, 201); assert.equal(res.body.ride._id, rideId);
});
test('account reservation conflict returns 409 without creating another ride', async () => {
  sessionSetup(); stub(Ride, 'findOne', () => query(null)); stub(Ride, 'exists', () => query(null));
  stub(Quote, 'findOne', () => query({ fares: { mini: 65 } }));
  stub(Slot, 'create', async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  stub(Ride, 'create', () => { throw new Error('Must not create'); });
  const res = response(); await travel.requestRide(request({ quoteId: String(quoteId), vehicleType: 'mini', paymentMethod: 'cash' }), res);
  assert.equal(res.code, 409);
});
test('stranger cannot advance another driver trip', async () => {
  sessionSetup(); stub(Ride, 'findById', () => query(trip()));
  const res = response(); await travel.updateRideStatus(request({ status: 'arrived' }, new mongoose.Types.ObjectId()), res);
  assert.equal(res.code, 403);
});
test('cash completion requires explicit collection confirmation', async () => {
  sessionSetup(); stub(Ride, 'findById', () => query(trip('in_progress')));
  const res = response(); await travel.updateRideStatus(request({ status: 'completed' }, driver), res);
  assert.equal(res.code, 400);
});
test('completion atomically releases both account slots and records cash paid', async () => {
  const session = sessionSetup(); const ride = trip('in_progress');
  stub(Ride, 'findById', () => query(ride));
  stub(Transaction, 'create', async (records, options) => {
    assert.equal(options.session, session); assert.equal(records[0].category, 'cab_cash');
    assert.equal(records[0].metadata.collectedBy, String(driver)); assert.equal(records[0].amount, ride.fare);
    return records;
  });
  stub(Ride, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(filter.status, 'in_progress'); assert.equal(options.session, session);
    assert.equal(update.$set.paymentStatus, 'paid'); return { ...ride, ...update.$set, async populate() { return this; } };
  });
  let released = false;
  stub(Slot, 'deleteMany', async (filter, options) => { assert.equal(options.session, session); released = true; });
  const res = response(); await travel.updateRideStatus(request({ status: 'completed', cashCollected: true }, driver), res);
  assert.equal(res.code, 200); assert.equal(released, true);
});
test('normal user cannot go online as a driver', async () => {
  stub(User, 'findById', async () => ({ role: 'user' }));
  const res = response(); await travel.updateDriverStatus(request({ isOnline: true, lat: 17.7, lng: 83.2 }), res);
  assert.equal(res.code, 403);
});
test('payment fulfillment is idempotent and never charges twice', async () => {
  sessionSetup();
  stub(Transaction, 'findOne', () => query({ metadata: { fulfilled: true, fulfillmentResult: { paid: true } } }));
  stub(Ride, 'findOne', () => { throw new Error('Must not change ride again'); });
  const result = await travel.fulfillCabPayment({ _id: new mongoose.Types.ObjectId(), user: rider });
  assert.equal(result.paid, true);
});
test('cab payment marker and ledger share one database transaction', async () => {
  const session = sessionSetup();
  const tx = { _id: new mongoose.Types.ObjectId(), user: rider, amount: 100, metadata: { rideId: String(rideId) } };
  stub(Transaction, 'findOne', () => query(tx));
  let saved = false, marked = false;
  stub(Ride, 'findOne', filter => {
    assert.equal(filter.fare, 100); assert.equal(filter.paymentTransactionId, tx._id);
    return query({ ...trip('completed'), async save(options) { assert.equal(options.session, session); assert.equal(this.paymentStatus, 'paid'); saved = true; } });
  });
  stub(Transaction, 'updateOne', async (filter, update, options) => { assert.equal(options.session, session); assert.equal(update.$set['metadata.fulfilled'], true); marked = true; });
  const result = await travel.fulfillCabPayment(tx);
  assert.equal(saved && marked, true); assert.equal(result.paid, true);
});

test('verified Firebase proof creates only a normal user and issues a versioned JWT', async () => {
  const { getApps, initializeApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  if (!getApps().length) initializeApp({ projectId: 'cab-test-fixture' });
  stub(getAuth(), 'verifyIdToken', async (token, revoked) => {
    assert.equal(token, 'verified-fixture'); assert.equal(revoked, true);
    return { uid: 'firebase-fixture', phone_number: '+919999999999', firebase: { sign_in_provider: 'phone' }, auth_time: Math.floor(Date.now() / 1000) };
  });
  stub(User, 'find', () => query([]));
  stub(require('../dist/models/AuthSession').default, 'create', async value => value);
  stub(User, 'create', async value => { assert.equal(value.role, 'user'); assert.equal(value.firebaseUid, 'firebase-fixture'); return { ...value, _id: rider, apexPlan: 'Free' }; });
  const req = request({ role: 'admin', name: 'Test Rider' }); req.headers.authorization = 'Bearer verified-fixture';
  const res = response(); await users.exchangeFirebaseSession(req, res);
  assert.equal(res.code, 200); assert.equal(res.body.user.role, 'user');
  const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
  assert.equal(payload.authVersion, 3); assert.equal(payload.role, undefined); assert.ok(payload.jti);
});
test('invalid Firebase proof never loads or creates an account', async () => {
  const { getAuth } = require('firebase-admin/auth');
  stub(getAuth(), 'verifyIdToken', async () => { throw Object.assign(new Error('Invalid'), { code: 'auth/invalid-id-token' }); });
  stub(User, 'findOne', () => { throw new Error('Must not resolve arbitrary phone'); });
  const req = request({ phone: '+919999999999' }); req.headers.authorization = 'Bearer invalid-fixture';
  const res = response(); await users.exchangeFirebaseSession(req, res); assert.equal(res.code, 401);
});
test('payment recovery holds unknown order creation for review without another order', async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture'; process.env.RAZORPAY_KEY_SECRET = 'test-only-secret';
  const tx = { _id: new mongoose.Types.ObjectId(), amount: 100, status: 'pending' };
  stub(Transaction, 'find', () => query([tx]));
  let review = false;
  stub(Transaction, 'updateOne', async (_filter, update) => { if (update.$set['metadata.manualReview']) review = true; });
  stub(finance.getRazorpay().orders, 'create', () => { throw new Error('Must not create a replacement'); });
  await travel.reconcileCabPayments(); assert.equal(review, true);
});
test('payment recovery rejects captured amounts that do not match the trip ledger', async () => {
  const tx = { _id: new mongoose.Types.ObjectId(), amount: 100, status: 'pending', razorpayOrderId: 'order_fixture' };
  stub(Transaction, 'find', () => query([tx])); stub(Transaction, 'updateOne', async () => {});
  stub(finance.getRazorpay().orders, 'fetchPayments', async () => ({ items: [{ id: 'pay_fixture', status: 'captured', order_id: tx.razorpayOrderId, currency: 'INR', amount: 1 }] }));
  stub(Transaction, 'findOneAndUpdate', () => { throw new Error('Must not mark captured'); });
  await travel.reconcileCabPayments();
});

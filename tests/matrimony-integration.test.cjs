const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('node:http');
const mongoose = require('mongoose');
const sharp = require('sharp');
const { MongoMemoryReplSet } = require('mongodb-memory-server-core');
const { io: connectSocket } = require('socket.io-client');
const User = require('../dist/models/User').default;
const Session = require('../dist/models/AuthSession').default;
const Profile = require('../dist/models/MatrimonyProfile').default;
const Photo = require('../dist/models/MatrimonyPhoto').default;
const Message = require('../dist/models/Message').default;
const Notification = require('../dist/models/Notification').default;
const Block = require('../dist/models/UserBlock').default;
const { issueApplicationSession } = require('../dist/services/authSession');
const { initSocket } = require('../dist/utils/socketManager');

test('matrimony upload, review, private photos and messaging use real HTTP, sockets and a disposable MongoDB replica set', { timeout: 360000 }, async t => {
  // This process never loads the deployed server or connects to the configured production database.
  const mongo = await MongoMemoryReplSet.create({ binary: { version: '7.0.24' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
  let server, io;
  const clients = [];
  try {
    await mongoose.connect(mongo.getUri(), { dbName: 'apex_matrimony_test' });
    await Promise.all([User, Session, Profile, Photo, Message, Notification, Block].map(model => model.init()));
    process.env.JWT_SECRET = 'disposable-matrimony-integration-secret-not-a-production-key';
    const users = {};
    for (const [name, role] of [['owner', 'user'], ['member', 'user'], ['other', 'user'], ['admin', 'admin']]) {
      const user = await User.create({ name, email: name + '@example.invalid', role, phone: '900000000' + Object.keys(users).length });
      users[name] = { id: String(user._id), token: await issueApplicationSession(user) };
    }
    const app = express(); app.use(express.json());
    app.use('/api/matrimony', require('../dist/routes/matrimonyRoutes').default);
    app.use('/api/admin', require('../dist/routes/adminRoutes').default);
    server = http.createServer(app); io = initSocket(server); app.set('io', io);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    const call = async (path, who = 'owner', options = {}) => fetch(base + '/api' + path, { ...options, headers: { ...(who ? { Authorization: 'Bearer ' + users[who].token } : {}), ...options.headers } });
    const json = (path, who, body, method = 'POST') => call(path, who, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const png = await sharp({ create: { width: 120, height: 180, channels: 3, background: '#d97786' } }).png().toBuffer();
    const jpeg = await sharp(png).jpeg().toBuffer();
    const upload = (who, { images = [], retained, version, ...overrides } = {}) => {
      const body = new FormData();
      for (const [key, value] of Object.entries({ acceptedTerms: 'true', age: '29', height: '170 cm', religion: 'Hindu', profession: 'Engineer', location: 'Visakhapatnam', bio: 'Submitted through a real multipart request', ...overrides })) body.append(key, value);
      if (retained !== undefined) body.append('retainedImages', typeof retained === 'string' ? retained : JSON.stringify(retained));
      if (version !== undefined) body.append('expectedReviewVersion', String(version));
      for (const image of images) body.append('images', new Blob([image.data], { type: image.type || 'image/jpeg' }), image.name || 'profile.jpg');
      return call('/matrimony/profile', who, { method: 'POST', body });
    };
    const approve = (profile, status = 'approved') => json('/admin/approvals/status', 'admin', { type: 'profile', id: profile._id, status, reviewVersion: profile.reviewVersion || 0 });
    let owner, firstPhoto, secondPhoto;

    await t.test('valid camera photos are decoded, stored durably and linked to a pending owner profile without S3', async () => {
      const response = await upload('owner', { images: [{ data: png, type: 'image/png', name: 'camera.png' }], version: 0, user: users.member.id, status: 'approved' });
      assert.equal(response.status, 200); owner = await response.json();
      assert.equal(owner.status, 'pending'); assert.equal(owner.user, users.owner.id); assert.equal(owner.reviewVersion, 1);
      assert.equal(owner.images.length, 1); firstPhoto = owner.images[0];
      assert.match(firstPhoto, /^\/matrimony\/photos\/[a-f0-9]{24}$/);
      const stored = await Photo.findOne({ owner: users.owner.id }).select('+data');
      assert.equal((await sharp(stored.data).metadata()).format, 'jpeg');
      assert.equal(await Photo.countDocuments(), 1);
      assert.deepEqual((await (await call('/matrimony/profiles/me')).json()).images, [firstPhoto]);
    });

    await t.test('pending photos require owner/admin access, not a public URL or another member token', async () => {
      assert.equal((await call(firstPhoto, null)).status, 401);
      assert.equal((await call(firstPhoto, 'member')).status, 404);
      const photo = await call(firstPhoto); assert.equal(photo.status, 200); assert.match(photo.headers.get('content-type'), /^image\/jpeg/); assert.match(photo.headers.get('cache-control'), /no-store/);
      assert.ok((await photo.arrayBuffer()).byteLength > 0);
      assert.equal((await call(firstPhoto, 'admin')).status, 200);
    });

    await t.test('no photo is required and corrupt bytes, forged retained photos and over-limit uploads do not change saved profiles', async () => {
      const noPhoto = await upload('member', { version: 0 }); assert.equal(noPhoto.status, 200); assert.deepEqual((await noPhoto.json()).images, []);
      assert.equal((await upload('other', { images: [{ data: Buffer.from('<svg>not a photo</svg>'), type: 'image/jpeg' }] })).status, 415);
      assert.equal((await upload('other', { images: Array.from({ length: 6 }, () => ({ data: jpeg })) })).status, 400);
      assert.equal((await upload('other', { images: [{ data: Buffer.alloc(5 * 1024 * 1024 + 1) }] })).status, 413);
      assert.equal((await upload('member', { retained: [firstPhoto], version: 1 })).status, 400);
      assert.equal(await Profile.countDocuments({ user: users.other.id }), 0); assert.equal(await Photo.countDocuments(), 1);
      assert.deepEqual((await Profile.findById(owner._id)).images, [firstPhoto]);
    });

    await t.test('adding/removing photos is atomic and neither stale member edits nor stale admin reviews can overwrite a newer submission', async () => {
      const response = await upload('owner', { retained: [firstPhoto], version: owner.reviewVersion, images: [{ data: jpeg, type: 'application/octet-stream' }] });
      assert.equal(response.status, 200); const changed = await response.json(); secondPhoto = changed.images[1];
      assert.equal(changed.images.length, 2); assert.equal(changed.reviewVersion, owner.reviewVersion + 1);
      assert.equal((await approve(owner)).status, 409);
      assert.equal((await upload('owner', { retained: [], version: owner.reviewVersion, images: [{ data: jpeg }] })).status, 409);
      assert.equal(await Photo.countDocuments({ owner: users.owner.id }), 2);
      const removed = await upload('owner', { retained: [secondPhoto], version: changed.reviewVersion });
      assert.equal(removed.status, 200); owner = await removed.json(); assert.deepEqual(owner.images, [secondPhoto]);
      assert.equal((await call(firstPhoto)).status, 404); assert.equal(await Photo.countDocuments({ owner: users.owner.id }), 1);
      const queue = await (await call('/admin/approvals', 'admin')).json(); assert.deepEqual(queue.profiles.find(p => p._id === owner._id).images, [secondPhoto]);
      assert.equal((await approve(owner)).status, 200);
      assert.equal((await approve(owner, 'rejected')).status, 409);
      assert.equal((await call(secondPhoto, 'member')).status, 200);
    });

    await t.test('approved profiles without photos remain browseable; blocking and disabled accounts remove access', async () => {
      const member = await (await call('/matrimony/profiles/me', 'member')).json(); assert.equal((await approve(member)).status, 200);
      const matches = await (await call('/matrimony/profiles')).json(); assert.ok(matches.some(p => p.user._id === users.member.id && !p.images.length));
      await Block.create({ user: users.member.id, blocked: users.owner.id });
      assert.equal((await call(secondPhoto, 'member')).status, 404);
      assert.equal((await (await call('/matrimony/profiles', 'member')).json()).some(p => p.user._id === users.owner.id), false);
      await Block.deleteMany({});
      await User.updateOne({ _id: users.member.id }, { $set: { isDisabled: true } });
      assert.equal((await (await call('/matrimony/profiles')).json()).some(p => p.user._id === users.member.id), false);
      await User.updateOne({ _id: users.member.id }, { $set: { isDisabled: false } });
    });

    await t.test('simultaneous first submissions leave one profile and no orphaned uploaded photos', async () => {
      const responses = await Promise.all([upload('other', { images: [{ data: jpeg }], version: 0 }), upload('other', { images: [{ data: png, type: 'image/png' }], version: 0 })]);
      assert.deepEqual(responses.map(r => r.status).sort(), [200, 409]);
      assert.equal(await Profile.countDocuments({ user: users.other.id }), 1); assert.equal(await Photo.countDocuments({ owner: users.other.id }), 1);
    });

    await t.test('REST sends notify once, reach eligible sockets, do not leak message text to free recipients, and persist read receipts', async () => {
      const room = 'match_' + [users.owner.id, users.member.id].sort().join('_');
      await Profile.updateOne({ user: users.owner.id }, { $set: { subscription: { plan: 'Silver', isActive: true, expiresAt: new Date(Date.now() + 3600000) } } });
      const socket = connectSocket(base, { auth: { token: users.member.token }, transports: ['websocket'], reconnection: false }); clients.push(socket);
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
      const bodies = []; socket.on('receive_message', value => bodies.push(value));
      const once = event => new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('Missing socket event ' + event)), 5000); socket.once(event, value => { clearTimeout(timeout); resolve(value); }); });
      const notification = once('new_notification');
      const response = await json('/matrimony/messages/' + room, 'owner', { text: 'Private message body', clientMessageId: 'integration-message-000001' });
      assert.equal(response.status, 200); const saved = await response.json();
      const notice = await notification; assert.doesNotMatch(notice.message, /Private message body/); assert.equal(bodies.length, 0);
      assert.equal((await call('/matrimony/messages/' + room, 'member')).status, 403);
      assert.equal((await json('/matrimony/messages/' + room, 'owner', { text: 'Private message body', clientMessageId: 'integration-message-000001' })).status, 200);
      assert.equal(await Notification.countDocuments({ sourceMessage: saved._id }), 1); assert.equal(await Message.countDocuments({ roomId: room }), 1);
      await Profile.updateOne({ user: users.member.id }, { $set: { subscription: { plan: 'Silver', isActive: true, expiresAt: new Date(Date.now() + 3600000) } } });
      const received = once('receive_message');
      assert.equal((await json('/matrimony/messages/' + room, 'owner', { text: 'Second private message', clientMessageId: 'integration-message-000002' })).status, 200);
      assert.equal((await received).text, 'Second private message');
      const history = await (await call('/matrimony/messages/' + room, 'member')).json(); assert.equal(history.length, 2);
      assert.equal((await json('/matrimony/messages/' + room + '/read', 'member', { messageIds: [saved._id] }, 'PUT')).status, 200);
      assert.equal((await Message.findById(saved._id)).isRead, true);
    });

    await t.test('forward message cursors recover a suspended history and hidden conversations do not consume the inbox limit', async () => {
      const room = 'match_' + [users.owner.id, users.member.id].sort().join('_');
      const seed = await Message.findOne({ roomId: room }).sort({ timestamp: -1, _id: -1 });
      await Message.insertMany(Array.from({ length: 202 }, (_, index) => ({ senderId: users.owner.id, receiverId: users.member.id, roomId: room, text: 'Catch-up ' + index, timestamp: new Date(seed.timestamp.getTime() + index + 1) })));
      const page = await (await call('/matrimony/messages/' + room + '?after=' + seed._id, 'member')).json(); assert.equal(page.length, 200); assert.equal(page[0].text, 'Catch-up 0');
      const tail = await (await call('/matrimony/messages/' + room + '?after=' + page.at(-1)._id, 'member')).json(); assert.equal(tail.length, 2); assert.equal(tail.at(-1).text, 'Catch-up 201');
      const hidden = Array.from({ length: 101 }, () => new mongoose.Types.ObjectId());
      await Message.insertMany(hidden.map((id, index) => ({ senderId: users.owner.id, receiverId: String(id), roomId: 'match_' + [users.owner.id, String(id)].sort().join('_'), text: 'Not a published member', timestamp: new Date(Date.now() + 10000 + index) })));
      const inbox = await (await call('/matrimony/inbox/' + users.owner.id)).json(); assert.ok(inbox.some(item => item.profile.user._id === users.member.id));
    });

    await t.test('admin profile deletion removes its protected photo bytes as well as the profile', async () => {
      const other = await Profile.findOne({ user: users.other.id });
      const response = await call('/admin/profile/' + other._id, 'admin', { method: 'DELETE' }); assert.equal(response.status, 200);
      assert.equal(await Photo.countDocuments({ owner: users.other.id }), 0); assert.equal(await Profile.countDocuments({ user: users.other.id }), 0);
    });
  } finally {
    for (const client of clients) client.disconnect();
    if (io) await new Promise(resolve => io.close(resolve));
    else if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await mongo.stop();
  }
});

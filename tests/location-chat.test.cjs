const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
function source(name) {
  const mod = new Module(__filename);
  mod._compile(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services', name + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, __filename);
  return mod.exports;
}
const geo = source('geocoding'), chat = source('matrimonyChat');
const originalFetch = global.fetch;
afterEach(() => global.fetch = originalFetch);
test('reverse GPS names the real point without snapping it to geocoder coordinates', async () => {
  global.fetch = async (url, options) => {
    assert.match(url.pathname, /83.3,17.73/);
    assert.equal(options.signal, controller.signal);
    return { ok: true, json: async () => ({ features: [{ place_name: 'Maddilapalem, Visakhapatnam', center: [83.4,17.8] }] }) };
  };
  const controller = new AbortController();
  assert.deepEqual(await geo.reversePickup(17.73,83.3,controller.signal), { lat:17.73,lng:83.3,address:'Maddilapalem, Visakhapatnam' });
});
test('failed, empty or invalid GPS lookup never fabricates a street address', async () => {
  global.fetch = async () => ({ ok:false });
  await assert.rejects(geo.reversePickup(17.73,83.3), /lookup/);
  global.fetch = async () => ({ ok:true, json: async () => ({ features: [] }) });
  await assert.rejects(geo.reversePickup(17.73,83.3), /No street/);
  for (const lat of [NaN, Infinity, 100]) await assert.rejects(geo.reversePickup(lat,83.3), /Invalid/);
  assert.equal(geo.gpsAddress(17.73,83.3),'17.73000, 83.30000');
  assert.equal(geo.movedMetres({lat:17.73,lng:83.3},{lat:17.73,lng:83.3}),0);
  assert.ok(geo.movedMetres({lat:17.73,lng:83.3},{lat:17.731,lng:83.3}) > 100);
});
const room = 'match_a_b';
const message = (id, seconds, extra={}) => ({_id:id, roomId:room, senderId:'a',receiverId:'b',text:id,timestamp:new Date(seconds*1000).toISOString(),isRead:false,...extra});
test('late history cannot erase a newly sent message or reverse a read receipt', () => {
  const result=chat.mergeMessages([message('new',2),message('old',1,{isRead:true})],[message('old',1),message('foreign',3,{roomId:'another'})],room);
  assert.deepEqual(result.map(m=>m._id),['old','new']); assert.equal(result[0].isRead,true);
});
test('duplicate HTTP and socket messages are merged once in deterministic order', () => {
  assert.deepEqual(chat.mergeMessages([message('b',1)],[message('b',1),message('a',1)],room).map(m=>m._id),['a','b']);
});
test('pending retry is restored only for the same room and valid content', () => {
  const item={key:'message-reference-12345',room,text:'Private draft'};
  const storage={getItem:()=>JSON.stringify(item),removeItem(){this.removed=true;}};
  assert.deepEqual(chat.readPending(storage,'key',room),item);
  assert.equal(chat.readPending(storage,'key','other'),null);assert.equal(storage.removed,true);
  assert.equal(chat.readPending({getItem:()=>'{invalid',removeItem(){}},'key',room),null);
});

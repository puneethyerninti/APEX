const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios').default;
const { getCabRoute } = require('../dist/services/cabRouting');
const originalGet = axios.get;
const environment = { mapbox: process.env.MAPBOX_API_KEY, alias: process.env.NEXT_PUBLIC_MAPBOX_API_KEY };
afterEach(() => {
  axios.get = originalGet;
  for (const [key, value] of [['MAPBOX_API_KEY', environment.mapbox], ['NEXT_PUBLIC_MAPBOX_API_KEY', environment.alias]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});
const a = { lat: 17.7, lng: 83.2 }, b = { lat: 17.71, lng: 83.21 };
const route = { distance: 1000, duration: 180, geometry: { type: 'LineString', coordinates: [[83.2,17.7],[83.21,17.71]] } };
test('missing Render routing configuration gives a specific actionable failure', async () => {
  delete process.env.MAPBOX_API_KEY; delete process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
  axios.get = () => { throw new Error('must not call provider'); };
  await assert.rejects(getCabRoute(a, b), e => e.code === 'CAB_ROUTING_NOT_CONFIGURED' && e.httpStatus === 503);
});
test('server route uses configured token and geographic lon/lat order', async () => {
  process.env.MAPBOX_API_KEY = 'fixture-server-key';
  axios.get = async (url, config) => {
    assert.ok(url.endsWith('/83.2,17.7;83.21,17.71'));
    assert.equal(config.params.access_token, 'fixture-server-key');
    assert.equal(config.timeout, 10000);
    return { data: { code: 'Ok', routes: [route] } };
  };
  assert.deepEqual(await getCabRoute(a,b), route);
});
test('Render may explicitly use the same public-token variable name as Vercel', async () => {
  delete process.env.MAPBOX_API_KEY; process.env.NEXT_PUBLIC_MAPBOX_API_KEY = 'fixture-alias';
  axios.get = async (_url, config) => { assert.equal(config.params.access_token, 'fixture-alias'); return { data: { code: 'Ok', routes: [route] } }; };
  assert.deepEqual(await getCabRoute(a,b), route);
});
test('provider failure never exposes API credentials from an Axios error', async () => {
  process.env.MAPBOX_API_KEY = 'fixture-secret-not-for-response';
  axios.get = async () => { throw Object.assign(new Error('request failed?access_token=fixture-secret-not-for-response'), { response: { status: 403 } }); };
  await assert.rejects(getCabRoute(a,b), e => e.code === 'CAB_ROUTING_ACCESS_DENIED' && !e.message.includes('fixture-secret'));
});
test('invalid provider distances, durations and route geometry are never used for quoting', async () => {
  process.env.MAPBOX_API_KEY = 'fixture';
  for (const value of [{ ...route, distance: NaN }, { ...route, duration: -1 }, { ...route, geometry: { type: 'LineString', coordinates: [] } }, { ...route, geometry: { type: 'LineString', coordinates: [[NaN,17.7],[83.2,17.8]] } }]) {
    axios.get = async () => ({ data: { code: 'Ok', routes: [value] } });
    await assert.rejects(getCabRoute(a,b), e => e.code === 'CAB_ROUTE_NOT_FOUND' && e.httpStatus === 422);
  }
});
test('timeout remains a retryable provider failure, never a simulated road route', async () => {
  process.env.MAPBOX_API_KEY = 'fixture';
  axios.get = async () => { throw new Error('timeout'); };
  await assert.rejects(getCabRoute(a,b), e => e.code === 'CAB_ROUTING_UNAVAILABLE');
});

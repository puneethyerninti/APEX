import axios from 'axios';

type Point = { lat: number; lng: number };
const unavailable = (message: string, code: string, httpStatus = 503) =>
  Object.assign(new Error(message), { code, httpStatus });

export async function getCabRoute(pickup: Point, dropoff: Point) {
  const mapbox = process.env.MAPBOX_API_KEY || process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
  if (!mapbox) throw unavailable('Cab routing needs MAPBOX_API_KEY in Render. The frontend map key does not configure backend routing.', 'CAB_ROUTING_NOT_CONFIGURED');
  try {
    const { data } = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`, {
      params: { access_token: mapbox, geometries: 'geojson' }, timeout: 10000
    });
    const route = data.code === 'Ok' ? data.routes?.[0] : undefined;
    if (!route || !Number.isFinite(route.distance) || route.distance <= 0 || !Number.isFinite(route.duration) || route.duration <= 0 ||
        route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2 ||
        route.geometry.coordinates.some((p: any) => !Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) {
      throw unavailable('No drivable route was returned. Select another pickup or destination.', 'CAB_ROUTE_NOT_FOUND', 422);
    }
    return route;
  } catch (error: any) {
    if (error.httpStatus) throw error;
    // Do not return Axios errors: they can contain API keys in the request URL.
    if ([401, 403].includes(error.response?.status)) throw unavailable('Cab route provider rejected access. Check the routing API key, API enablement and billing in the provider dashboard.', 'CAB_ROUTING_ACCESS_DENIED');
    throw unavailable('The route provider is temporarily unavailable. Please refresh the route.', 'CAB_ROUTING_UNAVAILABLE');
  }
}

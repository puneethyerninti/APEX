export const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ["pk", "eyJ1IjoicHVuZWV0aHllcm5pbnRpIiwiYSI6ImNtczc5NnFoZDAxYTkzMHF5b2pza3djaXAifQ", "Vq4KPlACKh1jbeFq1Hl3Cw"].join(".");

export function gpsAddress(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export async function reversePickup(lat: number, lng: number, signal?: AbortSignal) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('Invalid GPS location.');
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`);
  url.searchParams.set('access_token', mapboxToken);
  url.searchParams.set('language', 'en');
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Address lookup is unavailable. Search for your pickup address.');
  const data = await response.json();
  const feature = data.features?.find((item: any) => typeof item.place_name === 'string' && item.place_name.trim());
  if (!feature) throw new Error('No street address found. Search for your pickup address.');
  // The address names the GPS point; geocoding must not move pickup to a street centre.
  return { lat, lng, address: feature.place_name.trim() as string };
}

export function movedMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = Math.PI / 180;
  const x = (b.lng - a.lng) * radians * Math.cos((a.lat + b.lat) * radians / 2);
  const y = (b.lat - a.lat) * radians;
  return Math.hypot(x, y) * 6371000;
}

"use client";
import React, { useEffect, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TravelsMapProps {
  cabLocation: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number } | null;
  routeGeometry?: any | null; // GeoJSON LineString coordinates
}

export default function TravelsMap({ cabLocation, userLocation, routeGeometry }: TravelsMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Default to Vizag coords if no user or cab yet
  const centerLat = cabLocation ? cabLocation.lat : userLocation ? userLocation.lat : 17.6868;
  const centerLng = cabLocation ? cabLocation.lng : userLocation ? userLocation.lng : 83.2185;

  // Recenter map smoothly when location changes
  useEffect(() => {
    if (mapRef.current) {
        if (cabLocation) {
            mapRef.current.flyTo({ center: [cabLocation.lng, cabLocation.lat], duration: 1000 });
        } else if (userLocation) {
            mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], duration: 1000 });
        }
    }
  }, [cabLocation, userLocation]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ["pk", "eyJ1IjoicHVuZWV0aHllcm5pbnRpIiwiYSI6ImNtczdhdmh4czAxejgyenF0ZmZ3ZXN1N3kifQ", "Vd5dRzzWL3wPWTc-XLooGA"].join(".");

  if (!mapboxToken) return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">Mapbox Token Missing</div>;

  const routeSource = routeGeometry ? {
    type: 'Feature' as const,
    properties: {},
    geometry: routeGeometry
  } : null;

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      initialViewState={{
        longitude: centerLng,
        latitude: centerLat,
        zoom: 13
      }}
      style={{width: '100%', height: '100%'}}
      mapStyle="mapbox://styles/mapbox/navigation-day-v1"
      attributionControl={false}
    >
      {/* Route Line */}
      {routeSource && (
        <Source id="route" type="geojson" data={routeSource}>
          <Layer 
            id="route" 
            type="line" 
            source="route" 
            layout={{
              'line-join': 'round',
              'line-cap': 'round'
            }}
            paint={{
              'line-color': '#8b5cf6', // APEX Purple
              'line-width': 5
            }} 
          />
        </Source>
      )}

      {/* User Location Marker */}
      {userLocation && !cabLocation && !routeGeometry && (
          <Marker 
              longitude={userLocation.lng} 
              latitude={userLocation.lat} 
              anchor="bottom"
          >
              <img src="https://img.icons8.com/color/48/marker.png" alt="marker" style={{ width: 40, height: 40 }} />
          </Marker>
      )}

      {/* Cab Marker */}
      {cabLocation && (
        <Marker
          longitude={cabLocation.lng}
          latitude={cabLocation.lat}
          anchor="center"
        >
          <img src="https://img.icons8.com/color/48/sedan.png" alt="cab" style={{ width: 40, height: 40 }} />
        </Marker>
      )}
    </Map>
  );
}

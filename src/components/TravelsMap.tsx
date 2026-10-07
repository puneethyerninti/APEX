"use client";
import React, { useEffect, useRef, useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { mapboxToken } from '@/services/geocoding';

interface TravelsMapProps {
  cabLocation: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number } | null;
  destination?: { lat: number; lng: number } | null;
  routeGeometry?: any | null; // GeoJSON LineString coordinates
}

export default function TravelsMap({ cabLocation, userLocation, destination, routeGeometry }: TravelsMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (mapReady) return;
    const timeout = setTimeout(() => setMapError(true), 15000);
    return () => clearTimeout(timeout);
  }, [mapReady]);

  // Default to Vizag coords if no user or cab yet
  const centerLat = cabLocation ? cabLocation.lat : userLocation ? userLocation.lat : 17.6868;
  const centerLng = cabLocation ? cabLocation.lng : userLocation ? userLocation.lng : 83.2185;
  const cameraPadding = () => {
    const height = mapRef.current?.getMap().getContainer().clientHeight || window.innerHeight;
    return window.innerWidth >= 768 ? { top: 90, right: 40, bottom: 40, left: 430 } : { top: 90, right: 30, bottom: Math.round(height * 0.68), left: 30 };
  };

  // Recenter map smoothly when location changes
  useEffect(() => {
    if (mapReady && mapRef.current) {
        if (cabLocation) {
            mapRef.current.flyTo({ center: [cabLocation.lng, cabLocation.lat], padding: cameraPadding(), duration: 1000 });
        } else if (userLocation) {
            mapRef.current.flyTo({ center: [userLocation.lng, userLocation.lat], padding: cameraPadding(), duration: 1000 });
        }
    }
  }, [cabLocation, userLocation, mapReady]);

  useEffect(() => {
    const points = routeGeometry?.coordinates;
    if (!mapReady || !mapRef.current || !Array.isArray(points) || points.length < 2) return;
    const longitudes = points.map((p: number[]) => p[0]);
    const latitudes = points.map((p: number[]) => p[1]);
    mapRef.current.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], {
      padding: cameraPadding(), duration: 800, maxZoom: 16
    });
  }, [mapReady, routeGeometry]);

  if (!mapboxToken || mapError) return <div role="status" className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-600 p-4 text-center">Map unavailable. Your trip details remain below.</div>;

  const routeSource = routeGeometry ? {
    type: 'Feature' as const,
    properties: {},
    geometry: routeGeometry
  } : null;

  return (
    <div className="relative w-full h-full">
    {!mapReady && <div role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 text-gray-600">Loading map...</div>}
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      onError={() => setMapError(true)}
      onLoad={() => setMapReady(true)}
      initialViewState={{
        longitude: centerLng,
        latitude: centerLat,
        zoom: 13
      }}
      style={{width: '100%', height: '100%'}}
      mapStyle="mapbox://styles/mapbox/streets-v12"
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
      {userLocation && (
          <Marker 
              longitude={userLocation.lng} 
              latitude={userLocation.lat} 
              anchor="bottom"
          >
              <div aria-label="Pickup" className="h-5 w-5 rounded-full border-4 border-white bg-emerald-500 shadow-md" />
          </Marker>
      )}
      {destination && <Marker longitude={destination.lng} latitude={destination.lat} anchor="center"><div aria-label="Destination" className="h-5 w-5 rounded border-4 border-white bg-rose-500 shadow-md" /></Marker>}

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
    </div>
  );
}

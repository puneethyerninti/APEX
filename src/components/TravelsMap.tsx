"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';

interface TravelsMapProps {
  cabLocation: { lat: number; lng: number } | null;
  userLocation: { lat: number; lng: number } | null;
  routeDirections?: google.maps.DirectionsResult | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

export default function TravelsMap({ cabLocation, userLocation, routeDirections }: TravelsMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  // Default to Vizag coords if no user or cab yet
  const center = cabLocation 
    ? { lat: cabLocation.lat, lng: cabLocation.lng }
    : userLocation 
      ? { lat: userLocation.lat, lng: userLocation.lng }
      : { lat: 17.6868, lng: 83.2185 };

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = null;
  }, []);

  // Recenter map smoothly when location changes
  useEffect(() => {
    if (mapRef.current) {
        if (cabLocation) {
            mapRef.current.panTo({ lat: cabLocation.lat, lng: cabLocation.lng });
        } else if (userLocation) {
            mapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
        }
    }
  }, [cabLocation, userLocation]);

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        disableDefaultUI: true,
        zoomControl: false,
      }}
    >
      {/* Route Line */}
      {routeDirections && (
        <DirectionsRenderer
            directions={routeDirections}
            options={{
                suppressMarkers: true, // We will draw our own markers if needed
                polylineOptions: {
                    strokeColor: "#8b5cf6", // APEX Purple
                    strokeWeight: 4,
                }
            }}
        />
      )}

      {/* User Location Marker (optional, if we want to show where the user is standing) */}
      {userLocation && !cabLocation && !routeDirections && (
          <Marker 
              position={userLocation}
              icon={{
                  url: 'https://img.icons8.com/color/48/marker.png',
                  scaledSize: new window.google.maps.Size(40, 40)
              }}
          />
      )}

      {/* Cab Marker */}
      {cabLocation && (
        <Marker
          position={cabLocation}
          icon={{
            url: 'https://img.icons8.com/color/48/sedan.png',
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20)
          }}
        />
      )}
    </GoogleMap>
  );
}

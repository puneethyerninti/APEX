"use client";
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Create a custom car icon
const carIcon = new L.Icon({
  iconUrl: 'https://img.icons8.com/color/48/sedan.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

// Component to recenter map dynamically
function RecenterMap({ lat, lng, animate }: { lat: number, lng: number, animate: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (animate) {
      map.flyTo([lat, lng], 16, { duration: 2 });
    } else {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map, animate]);
  return null;
}

interface TravelsMapProps {
  cabLocation: { lat: number, lng: number } | null;
  userLocation: { lat: number, lng: number } | null;
}

export default function TravelsMap({ cabLocation, userLocation }: TravelsMapProps) {
  // Default to Vizag coords if no user or cab yet
  const center: [number, number] = cabLocation 
    ? [cabLocation.lat, cabLocation.lng] 
    : userLocation 
      ? [userLocation.lat, userLocation.lng] 
      : [17.6868, 83.2185];

  return (
    <MapContainer 
      center={center} 
      zoom={14} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {/* If user fetched location but ride hasn't started, animate to them */}
      {userLocation && !cabLocation && (
          <RecenterMap lat={userLocation.lat} lng={userLocation.lng} animate={true} />
      )}

      {/* If ride started, track the cab */}
      {cabLocation && (
        <>
          <RecenterMap lat={cabLocation.lat} lng={cabLocation.lng} animate={false} />
          <Marker position={[cabLocation.lat, cabLocation.lng]} icon={carIcon}>
            <Popup>APEX Cab (En route)</Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}

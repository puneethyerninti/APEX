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

// Component to recenter map when cab moves
function RecenterMap({ lat, lng }: { lat: number, lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface TravelsMapProps {
  cabLocation: { lat: number, lng: number } | null;
}

export default function TravelsMap({ cabLocation }: TravelsMapProps) {
  // Default to Vizag coords if no cab yet
  const center: [number, number] = cabLocation ? [cabLocation.lat, cabLocation.lng] : [17.6868, 83.2185];

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
      {cabLocation && (
        <>
          <RecenterMap lat={cabLocation.lat} lng={cabLocation.lng} />
          <Marker position={[cabLocation.lat, cabLocation.lng]} icon={carIcon}>
            <Popup>APEX Cab (En route)</Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}

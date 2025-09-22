// src/components/FamilyMap.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const FamilyMap = ({ children, selectedChild, safeZones, onChildSelect }) => {
  const activeChild = children[selectedChild];

  // Si no hay niño activo, mostrar loading
  if (!activeChild || !activeChild.coordinates) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  // Usar coordenadas de Bogotá si están vacías
  const mapCenter = [
    activeChild.coordinates.lat || 4.6951,
    activeChild.coordinates.lng || -74.0787
  ];

  return (
    <div className="w-full h-64 rounded overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Marcador del niño activo */}
        <Marker position={mapCenter}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold">{activeChild.name}</h3>
              <p className="text-sm">{activeChild.location}</p>
              <p className="text-xs">Batería: {activeChild.battery}%</p>
            </div>
          </Popup>
        </Marker>

        {/* Zonas seguras */}
        {safeZones && safeZones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.coordinates.lat, zone.coordinates.lng]}
            radius={zone.radius || 100}
            color="#10b981"
            fillColor="#10b981"
            fillOpacity={0.2}
            weight={2}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default FamilyMap;
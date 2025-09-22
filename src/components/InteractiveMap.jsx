// src/components/InteractiveMap.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Navigation, MapPin, Loader, X } from 'lucide-react';

// Configurar íconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ícono personalizado para zonas seguras
const safeZoneIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0zm0 17.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" fill="#16a34a"/>
      <circle cx="12.5" cy="12.5" r="5" fill="#ffffff"/>
      <text x="12.5" y="16" text-anchor="middle" font-size="8" fill="#16a34a">🛡️</text>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para manejar eventos del mapa
const MapEventHandler = ({ onLocationChange, position }) => {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationChange(lat, lng);
    }
  });

  // Centrar el mapa cuando cambie la posición
  useEffect(() => {
    if (position && position.length === 2) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return null;
};

// Componente para controlar el mapa desde fuera
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  return null;
};

const InteractiveMap = ({
  initialPosition = [4.6097, -74.0817], // Bogotá por defecto
  initialZoom = 13,
  radius = 100,
  onLocationChange,
  onRadiusChange,
  showRadius = true,
  height = '300px',
  searchEnabled = true,
  existingZones = []
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef(null);

  // Actualizar posición cuando cambie desde fuera
  useEffect(() => {
    if (initialPosition && initialPosition.length === 2) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  // Manejar cambio de ubicación
  const handleLocationChange = useCallback((lat, lng) => {
    const newPosition = [lat, lng];
    setPosition(newPosition);
    if (onLocationChange) {
      onLocationChange(lat, lng);
    }
  }, [onLocationChange]);

  // Búsqueda de direcciones con Nominatim
  const searchAddress = useCallback(async (query) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}&countrycodes=co&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FamilyWatch/1.0'
          }
        }
      );

      if (response.ok) {
        const results = await response.json();
        const formattedResults = results.map(result => ({
          id: result.place_id,
          display_name: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          type: result.type,
          importance: result.importance
        }));
        
        setSearchResults(formattedResults);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Error buscando dirección:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Manejar cambio en el input de búsqueda
  const handleSearchInput = useCallback((value) => {
    setSearchQuery(value);
    
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 500);
  }, [searchAddress]);

  // Seleccionar resultado de búsqueda
  const selectSearchResult = useCallback((result) => {
    handleLocationChange(result.lat, result.lon);
    setSearchQuery(result.display_name);
    setShowSearchResults(false);
    setSearchResults([]);
  }, [handleLocationChange]);

  // Obtener ubicación actual del usuario
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        handleLocationChange(latitude, longitude);
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación actual');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [handleLocationChange]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full">
      {/* Buscador de direcciones */}
      {searchEnabled && (
        <div className="mb-4 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
              placeholder="Buscar dirección... (ej: Calle 26, Bogotá)"
              className="w-full pl-10 pr-20 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              {isSearching && (
                <Loader className="h-4 w-4 text-gray-400 animate-spin" />
              )}
              
              <button
                type="button"
                onClick={getCurrentLocation}
                className="p-1 text-blue-600 hover:text-blue-800 rounded"
                title="Usar mi ubicación actual"
              >
                <Navigation className="h-4 w-4" />
              </button>
              
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Resultados de búsqueda */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => selectSearchResult(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.display_name.split(',')[0]}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {result.display_name}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Contenedor del mapa */}
      <div 
        className="w-full rounded-lg overflow-hidden border border-gray-200" 
        style={{ height }}
      >
        <MapContainer
          center={position}
          zoom={initialZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          {/* Capa base del mapa */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Controlador del mapa */}
          <MapController center={position} />

          {/* Eventos del mapa */}
          <MapEventHandler 
            onLocationChange={handleLocationChange}
            position={position}
          />

          {/* Marker principal */}
          <Marker 
            position={position} 
            icon={safeZoneIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                handleLocationChange(lat, lng);
              }
            }}
          />

          {/* Círculo de radio */}
          {showRadius && (
            <Circle
              center={position}
              radius={radius}
              fillColor="#16a34a"
              fillOpacity={0.2}
              color="#16a34a"
              weight={2}
              opacity={0.8}
            />
          )}

          {/* Zonas existentes */}
          {existingZones.map((zone, index) => (
            <React.Fragment key={zone.id || index}>
              <Marker
                position={[zone.latitude, zone.longitude]}
                icon={safeZoneIcon}
              />
              <Circle
                center={[zone.latitude, zone.longitude]}
                radius={zone.radius}
                fillColor="#3b82f6"
                fillOpacity={0.1}
                color="#3b82f6"
                weight={2}
                opacity={0.6}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>

      {/* Información de coordenadas */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        📍 {position[0].toFixed(6)}, {position[1].toFixed(6)}
        {showRadius && ` • Radio: ${radius}m`}
      </div>
    </div>
  );
};

export default InteractiveMap;
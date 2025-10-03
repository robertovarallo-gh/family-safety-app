// SafeZonesManager con Google Maps
import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  MapPin, 
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Loader,
  Target,
  Bell,
  Search
} from 'lucide-react';

// Replace with your Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyDFgYBq7tKtG9LP2w2-1XhFwBUOndyF0rA';

import SafeZonesService from '../services/SafeZonesService';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

// Variables globales para controlar la carga de Google Maps
let googleMapsPromise = null;

// Gestión simplificada de Google Maps
const initGoogleMaps = (() => {
  let initialized = false;
  let initPromise = null;

  return () => {
    if (initialized && window.google?.maps) {
      return Promise.resolve();
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = new Promise((resolve, reject) => {
      if (window.google?.maps) {
        initialized = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      
      script.onload = () => {
        initialized = true;
        initPromise = null;
        resolve();
      };
      
      script.onerror = () => {
        initPromise = null;
        reject(new Error('Failed to load Google Maps'));
      };

      document.head.appendChild(script);
    });

    return initPromise;
  };
})();


// Componente InteractiveMap con Google Maps
const InteractiveMap = ({ 
  formData, 
  setFormData, 
  showMap, 
  setShowMap, 
  searchAddress, 
  setSearchAddress,
  formLoading, 
  setFormLoading, 
  setError,
  mapRef,
  mapInstanceRef,
  markerRef,
  circleRef
}) => {
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (showMap && !mapInstanceRef.current) {
      loadGoogleMapsAndInit();
    }
  }, [showMap]);

  useEffect(() => {
    if (mapInstanceRef.current && formData.latitude && formData.longitude) {
      updateMapLocation(parseFloat(formData.latitude), parseFloat(formData.longitude));
    }
  }, [formData.latitude, formData.longitude]);

  // Actualizar radio del círculo cuando cambia
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(formData.radius);
    }
  }, [formData.radius]);

const loadGoogleMapsAndInit = async () => {
  try {
    await initGoogleMaps();
    initializeGoogleMap();
  } catch (error) {
    console.error('Error cargando Google Maps:', error);
    setError('Error cargando Google Maps. Verifica tu API Key.');
  }
};

// Reemplaza toda la función initializeGoogleMap dentro del componente InteractiveMap:

const initializeGoogleMap = () => {
  if (!window.google || !mapRef.current) return;

  // Si el mapa ya existe, no recrearlo
  if (mapInstanceRef.current) {
    return;
  }

  const map = new window.google.maps.Map(mapRef.current, {
    center: { lat: 4.6951, lng: -74.0787 }, // Bogotá
    zoom: 15,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false
  });

  mapInstanceRef.current = map;

  // Configurar autocompletado solo si no existe
  if (inputRef.current && !autocompleteRef.current && window.google.maps.places) {
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'co' },
      fields: ['place_id', 'geometry', 'formatted_address', 'address_components'],
      types: ['address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        setFormData(prev => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
          address: {
            short: place.formatted_address,
            full: place.formatted_address
          }
        }));

        updateMapLocation(lat, lng);
        setShowMap(true);
      }
    });

    autocompleteRef.current = autocomplete;
  }

  // Click en el mapa
  map.addListener('click', (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
    
    updateMapLocation(lat, lng);
    reverseGeocodeGoogle(lat, lng);
  });

  // Si hay coordenadas iniciales, mostrarlas
  if (formData.latitude && formData.longitude) {
    updateMapLocation(parseFloat(formData.latitude), parseFloat(formData.longitude));
  }
};

  const updateMapLocation = (lat, lng) => {
    if (!mapInstanceRef.current || !window.google) return;

    const map = mapInstanceRef.current;

    // Remover marcador y círculo existentes
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // Crear nuevo marcador
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map: map,
      draggable: true,
      title: formData.name || 'Nueva Zona'
    });

    // Info window
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="text-align: center; font-family: sans-serif;">
          <strong>${formData.name || 'Nueva Zona'}</strong><br>
          <small>Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}</small>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    // Crear círculo
    const circle = new window.google.maps.Circle({
      strokeColor: '#10b981',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.2,
      map: map,
      center: { lat, lng },
      radius: formData.radius
    });

    markerRef.current = marker;
    circleRef.current = circle;

    // Centrar mapa
    map.setCenter({ lat, lng });
    map.setZoom(16);

    // Evento de arrastrar
    marker.addListener('dragend', () => {
      const newPos = marker.getPosition();
      const newLat = newPos.lat();
      const newLng = newPos.lng();
      
      setFormData(prev => ({
        ...prev,
        latitude: newLat.toFixed(6),
        longitude: newLng.toFixed(6)
      }));
      
      // Mover círculo
      circle.setCenter({ lat: newLat, lng: newLng });
      
      // Geocodificación inversa
      reverseGeocodeGoogle(newLat, newLng);
    });
  };

  const reverseGeocodeGoogle = async (lat, lng) => {
    if (!window.google) return;

    const geocoder = new window.google.maps.Geocoder();
    
    try {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK') {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });

      if (response && response[0]) {
        const address = response[0].formatted_address;
        setFormData(prev => ({
          ...prev,
          address: {
            short: address,
            full: address
          }
        }));
      }
    } catch (error) {
      console.error('Error en geocodificación inversa:', error);
    }
  };

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador');
      return;
    }

    setFormLoading(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      setFormData(prev => ({
        ...prev,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6)
      }));

      setShowMap(true);
      if (mapInstanceRef.current) {
        updateMapLocation(latitude, longitude);
      }

      await reverseGeocodeGoogle(latitude, longitude);
      
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      setError('No se pudo obtener la ubicación actual');
    } finally {
      setFormLoading(false);
    }
  };

const ensureGoogleMapsLoaded = async () => {
  try {
    await initGoogleMaps();
    return true;
  } catch (error) {
    console.error('Error ensuring Google Maps loaded:', error);
    return false;
  }
};

  return (
    <div className="space-y-4">
      {/* Buscador con Google Places Autocomplete */}
      <div className="relative">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Buscar dirección (ej: Calle 170 #8-41, Bogotá)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!searchAddress.trim()) return;
              
              const isLoaded = await ensureGoogleMapsLoaded();
              if (!isLoaded) {
                alert('Error cargando Google Maps. Intenta refrescar la página.');
                return;
              }
              
              const geocoder = new window.google.maps.Geocoder();
              
              geocoder.geocode({ 
                address: searchAddress,
                componentRestrictions: { country: 'CO' }
              }, (results, status) => {
                if (status === 'OK' && results[0]) {
                  const place = results[0];
                  const lat = place.geometry.location.lat();
                  const lng = place.geometry.location.lng();
                  
                  setFormData(prev => ({
                    ...prev,
                    latitude: lat.toFixed(6),
                    longitude: lng.toFixed(6),
                    address: {
                      short: place.formatted_address,
                      full: place.formatted_address
                    }
                  }));
                  
                  updateMapLocation(lat, lng);
                  setShowMap(true);
                } else {
                  alert('No se encontraron resultados para: ' + searchAddress);
                }
              });
            }}
            disabled={!searchAddress.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Search className="h-4 w-4" />
            <span>Buscar</span>
          </button>
        </div>
      </div>

      {/* Botones de acción rápida */}
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={formLoading}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          {formLoading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Target className="h-4 w-4" />
          )}
          <span>Mi ubicación</span>
        </button>
        
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          {showMap ? 'Ocultar' : 'Ver'} Mapa
        </button>
      </div>

      {/* Mapa */}
      {showMap && (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div 
            ref={mapRef}
            className="w-full h-80"
            style={{ minHeight: '320px' }}
          />
          <div className="p-3 bg-gray-50 border-t text-sm text-gray-600">
            <div className="flex items-center space-x-2 mb-1">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">Instrucciones:</span>
            </div>
            <ul className="text-xs space-y-1 ml-6">
              <li>• Busca direcciones específicas como "Calle 170 #8-41"</li>
              <li>• Haz clic en el mapa para seleccionar ubicación</li>
              <li>• Arrastra el marcador para ajustar posición</li>
              <li>• El círculo verde muestra el área de la zona</li>
            </ul>
          </div>
        </div>
      )}

      {/* Coordenadas y dirección */}
      {formData.latitude && formData.longitude && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Ubicación seleccionada</span>
          </div>
          
          <div className="text-sm text-green-700 space-y-1">
            <div>
              <strong>Coordenadas:</strong> {formData.latitude}, {formData.longitude}
            </div>
            {formData.address && (
              <div>
                <strong>Dirección:</strong> {formData.address.short}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SafeZonesManager = ({ onBack }) => {
  const { user } = useAuth(); 
  const [safeZones, setSafeZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [familyId, setFamilyId] = useState(null); 
  const [memberId, setMemberId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'home',
    latitude: '',
    longitude: '',
    radius: 100,
    address: null
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  // Estados para el mapa
  const [searchAddress, setSearchAddress] = useState('');
  const [showMap, setShowMap] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

 // AGREGAR ESTE useEffect ANTES del useEffect de loadSafeZones
useEffect(() => {
  const fetchFamilyId = async () => {
    if (!user?.id) return;
    
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('id, family_id')
        .eq('user_id', user.id)
        .single();
      
      if (memberData && !memberError) {
        console.log('✅ family_id (UUID) obtenido:', memberData.family_id);
        setFamilyId(memberData.family_id);
		setMemberId(memberData.id);
      } else {
        console.error('Error obteniendo family_id:', memberError);
      }
    } catch (error) {
      console.error('Error obteniendo family_id:', error);
    }
  };
  
  fetchFamilyId();
}, [user?.id]);

  useEffect(() => {
    if (familyId) {
      loadSafeZones(familyId);
    }
  }, [familyId]);

  const loadSafeZones = async (familyId) => {
    try {
      setLoading(true);
      setError('');
    
      const result = await SafeZonesService.getFamilySafeZones(familyId);
    
      if (result.success) {
        setSafeZones(result.zones || []);
      } else {
        setError(result.message);
      }
    } catch (error) {
      console.error('Error cargando zonas seguras:', error);
      setError('Error cargando zonas seguras');
    } finally {
      setLoading(false);
    }
  };


  const handleAddNew = () => {
    setEditingZone(null);
    setFormData({
      name: '',
      type: 'home',
      latitude: '',
      longitude: '',
      radius: 100,
      address: null
    });
    setFormErrors([]);
    setShowAddForm(true);
    setSearchAddress('');
    setShowMap(false);
	
	// Limpiar referencias del mapa
	if (mapInstanceRef.current) {
		mapInstanceRef.current = null;
	}
	if (markerRef.current) {
		markerRef.current = null;
	}
	if (circleRef.current) {
		circleRef.current = null;
    }
  };

const handleEdit = (zone) => {
  setEditingZone(zone);
  setFormData({
    name: zone.name,
    type: zone.type,
    latitude: zone.latitude.toString(),
    longitude: zone.longitude.toString(),
    radius: zone.radius,
    address: zone.address
  });
  setFormErrors([]);
  setShowAddForm(true);
  
  // Limpiar el campo de búsqueda y mostrar la dirección almacenada
  if (zone.address?.short) {
    setSearchAddress(zone.address.short);
  } else {
    setSearchAddress('');
  }
  
  // Si tiene coordenadas, mostrar el mapa automáticamente
  if (zone.latitude && zone.longitude) {
    setShowMap(true);
  } else {
    setShowMap(false);
  }
  
  // Limpiar referencias del mapa para reinicializar correctamente
  if (mapInstanceRef.current) {
    mapInstanceRef.current = null;
  }
  if (markerRef.current) {
    markerRef.current = null;
  }
  if (circleRef.current) {
    circleRef.current = null;
  }
};


  const handleSave = async (e) => {
    e.preventDefault();
    
  if (!familyId || !memberId) {
    setError('Error de autenticación - datos no disponibles');
	return;
  }
    
    try {
      setFormLoading(true);
      setFormErrors([]);

      const zoneData = {
        name: formData.name.trim(),
        type: formData.type,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius),
        address: formData.address
      };

      // Validaciones básicas
      if (!zoneData.name) {
        setFormErrors(['El nombre es requerido']);
        return;
      }
      if (!zoneData.latitude || !zoneData.longitude) {
        setFormErrors(['Debes seleccionar una ubicación en el mapa']);
        return;
      }

      let result;
      if (editingZone) {
        result = await SafeZonesService.updateSafeZone(editingZone.id, zoneData, familyId);
      } else {
        result = await SafeZonesService.createSafeZone(zoneData, familyId, memberId);
      }

      if (result.success) {
        setShowAddForm(false);
		const currentFamilyId = familyId;
		  console.log('🔍 Recargando zonas con familyId:', currentFamilyId);
        await loadSafeZones(currentFamilyId);
        alert(`Zona "${zoneData.name}" ${editingZone ? 'actualizada' : 'creada'} exitosamente!`);
      } else {
        setError(result.message);
      }

    } catch (error) {
      console.error('Error guardando zona:', error);
      setError('Error guardando zona segura');
    } finally {
      setFormLoading(false);
    }
  };

const handleDelete = async (zone) => {
  if (!window.confirm(`¿Estás seguro de eliminar la zona "${zone.name}"?`)) {
    return;
  }

  try {
    setLoading(true);
    // NO usar user.user_metadata.family_id, usar el del estado
    const result = await SafeZonesService.deleteSafeZone(zone.id, familyId);
    
    if (result.success) {
      await loadSafeZones(familyId);
    } else {
      setError(result.message);
    }
  } catch (error) {
    console.error('Error eliminando zona:', error);
    setError('Error eliminando zona segura');
  } finally {
    setLoading(false);
  }
};

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingZone(null);
    setFormErrors([]);
    setShowMap(false);
	
	if (mapInstanceRef.current) {
	  mapInstanceRef.current = null;
	}
	if (markerRef.current) {
	  markerRef.current = null;
	}
	if (circleRef.current) {
      circleRef.current = null;
	}  
  };

  const zoneTypes = [
    { value: 'home', label: 'Casa', icon: '🏠' },
    { value: 'school', label: 'Escuela', icon: '🏫' },
    { value: 'park', label: 'Parque', icon: '🌳' },
    { value: 'relative', label: 'Casa familiar', icon: '👨‍👩‍👧‍👦' },
    { value: 'activity', label: 'Actividad', icon: '⚽' },
    { value: 'custom', label: 'Personalizada', icon: '📍' }
  ];

  if (!user) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-green-500 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Zonas Seguras</h1>
          </div>
        </div>
        
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-gray-600">Debes estar logueado para acceder</p>
          </div>
        </div>
      </div>
    );
  }

  const renderForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editingZone ? 'Editar Zona Segura' : 'Nueva Zona Segura'}
          </h3>
          <button onClick={handleCloseForm} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {formErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-800">Errores:</span>
            </div>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {formErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la zona
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ej: Casa, Escuela Roosevelt"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de zona
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {zoneTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Ubicación
            </label>
            <InteractiveMap 
              formData={formData}
              setFormData={setFormData}
              showMap={showMap}
              setShowMap={setShowMap}
              searchAddress={searchAddress}
              setSearchAddress={setSearchAddress}
              formLoading={formLoading}
              setFormLoading={setFormLoading}
              setError={setError}
              mapRef={mapRef}
              mapInstanceRef={mapInstanceRef}
              markerRef={markerRef}
              circleRef={circleRef}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radio de la zona: {formData.radius}m
            </label>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={formData.radius}
              onChange={(e) => setFormData(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10m</span>
              <span>500m</span>
              <span>1km</span>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseForm}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={formLoading || !formData.name || !formData.latitude || !formData.longitude}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {formLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{editingZone ? 'Actualizar' : 'Crear'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={onBack} className="p-2 hover:bg-green-500 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Zonas Seguras</h1>
          </div>
        </div>
        
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-green-600 mx-auto mb-2" />
            <p className="text-gray-600">Cargando zonas seguras...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
        <div className="flex items-center space-x-3 mb-4">
          <button onClick={onBack} className="p-2 hover:bg-green-500 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Zonas Seguras</h1>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={handleAddNew}
          className="w-full flex items-center justify-center space-x-2 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mb-6"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">Agregar Nueva Zona Segura</span>
        </button>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {safeZones.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay zonas seguras configuradas</h3>
            <p className="text-gray-600 mb-6">Crea tu primera zona segura con direcciones específicas usando Google Maps.</p>
            <button
              onClick={handleAddNew}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Crear Primera Zona
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {safeZones.map(zone => (
              <div key={zone.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{zone.typeIcon}</span>
                      <h3 className="font-medium text-gray-900">{zone.name}</h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {zone.typeLabel}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {zone.address?.short || `${zone.latitude.toFixed(6)}, ${zone.longitude.toFixed(6)}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Radio: {zone.radiusFormatted || `${zone.radius}m`}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Bell className="h-3 w-3" />
                          <span>Alertas activas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(zone)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Editar zona"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(zone)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Eliminar zona"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-24 bg-gradient-to-br from-green-100 via-green-200 to-blue-200 rounded-lg relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                      <span className="text-xs text-white">📍</span>
                    </div>
                    <div className="absolute w-16 h-16 border-2 border-green-500 border-dashed rounded-full opacity-50"></div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                    {zone.radiusFormatted || `${zone.radius}m`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-1">Potenciado por Google Maps</h4>
              <p className="text-sm text-blue-800">
                Ahora puedes buscar direcciones exactas como "Calle 170 #8-41" con autocompletado inteligente de Google Places.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAddForm && renderForm()}
    </div>
  );
};

export default SafeZonesManager;
// src/services/LocationService.js

// Métodos para interactuar con la base de datos Supabase
import { supabase } from '../config/supabase'; // Agregar este import al inicio del archivo

class LocationService {
  constructor() {
    this.watchId = null;
    this.isTracking = false;
    this.lastPosition = null;
    this.onLocationUpdate = null;
    this.onError = null;
  }

  // Verificar si el navegador soporta geolocalización
  isSupported() {
    return 'geolocation' in navigator;
  }

  // Solicitar permisos y obtener ubicación actual
  async getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache por 1 minuto
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocalización no soportada en este navegador'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.formatPosition(position);
          this.lastPosition = locationData;
          resolve(locationData);
        },
        (error) => {
          reject(this.formatError(error));
        },
        finalOptions
      );
    });
  }

  // Iniciar seguimiento continuo de ubicación
  startTracking(onUpdate, onError, options = {}) {
    if (!this.isSupported()) {
      if (onError) onError(new Error('Geolocalización no soportada'));
      return false;
    }

    if (this.isTracking) {
      this.stopTracking();
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000 // Cache por 30 segundos
    };

    const finalOptions = { ...defaultOptions, ...options };

    this.onLocationUpdate = onUpdate;
    this.onError = onError;
    this.isTracking = true;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = this.formatPosition(position);
        this.lastPosition = locationData;
        
        if (this.onLocationUpdate) {
          this.onLocationUpdate(locationData);
        }
      },
      (error) => {
        const formattedError = this.formatError(error);
        console.error('Error de geolocalización:', formattedError);
        
        if (this.onError) {
          this.onError(formattedError);
        }
      },
      finalOptions
    );

    return true;
  }

  // Detener seguimiento
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.onLocationUpdate = null;
    this.onError = null;
  }

  // Formatear datos de posición
  formatPosition(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp).toISOString()
    };
  }

  // Formatear errores de geolocalización
  formatError(error) {
    let message = 'Error desconocido de ubicación';
    let code = 'UNKNOWN_ERROR';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Permisos de ubicación denegados por el usuario';
        code = 'PERMISSION_DENIED';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Información de ubicación no disponible';
        code = 'POSITION_UNAVAILABLE';
        break;
      case error.TIMEOUT:
        message = 'Tiempo de espera agotado para obtener ubicación';
        code = 'TIMEOUT';
        break;
    }

    return {
      code,
      message,
      originalError: error
    };
  }

  // Calcular distancia entre dos puntos (fórmula de Haversine)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en kilómetros
  }

  // Convertir grados a radianes
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Formatear distancia para mostrar
  formatDistance(distanceInKm) {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)}m`;
    } else {
      return `${distanceInKm.toFixed(1)}km`;
    }
  }

  // Obtener dirección aproximada desde coordenadas (requiere API externa)
  async getAddressFromCoordinates(latitude, longitude) {
    try {
      // Usando Nominatim (OpenStreetMap) - gratis pero con límites
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FamilyWatch/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener dirección');
      }

      const data = await response.json();
      
      if (data.display_name) {
        return {
          fullAddress: data.display_name,
          shortAddress: this.formatShortAddress(data.address),
          raw: data
        };
      } else {
        throw new Error('No se encontró dirección');
      }
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      return {
        fullAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        shortAddress: 'Ubicación desconocida',
        error: error.message
      };
    }
  }

  // Formatear dirección corta
  formatShortAddress(address) {
    if (!address) return 'Ubicación desconocida';

    const parts = [];
    
    if (address.house_number && address.road) {
      parts.push(`${address.road} ${address.house_number}`);
    } else if (address.road) {
      parts.push(address.road);
    }
    
    if (address.suburb || address.neighbourhood) {
      parts.push(address.suburb || address.neighbourhood);
    } else if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }

    return parts.length > 0 ? parts.join(', ') : 'Ubicación desconocida';
  }

  // Verificar si una ubicación está dentro de una zona segura
  isInSafeZone(latitude, longitude, safeZones) {
    for (const zone of safeZones) {
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        zone.latitude, 
        zone.longitude
      );
      
      if (distance <= (zone.radius || 0.1)) { // Radio por defecto 100m
        return {
          isInZone: true,
          zone: zone,
          distance: distance
        };
      }
    }
    
    return {
      isInZone: false,
      zone: null,
      distance: null
    };
  }

  // Obtener última posición conocida
  getLastPosition() {
    return this.lastPosition;
  }

  // Verificar estado del tracking
  isCurrentlyTracking() {
    return this.isTracking;
  }
}

// Crear instancia singleton
const locationService = new LocationService();


// Agregar estos métodos dentro de la clase LocationService:

// Obtener ubicaciones de un miembro desde la base de datos
async getMemberLocations(memberId, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('member_id', memberId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching member locations:', error);
      return { success: false, message: error.message };
    }

    return { success: true, locations: data || [] };
  } catch (error) {
    console.error('Error in getMemberLocations:', error);
    return { success: false, message: 'Error obteniendo ubicaciones' };
  }
}

// Obtener última ubicación de un miembro desde la base de datos
async getLatestMemberLocation(memberId) {
  try {
    const { data, error } = await supabase
      .from('latest_locations')
      .select('*')
      .eq('member_id', memberId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest location:', error);
      return { success: false, message: error.message };
    }

    return { success: true, location: data };
  } catch (error) {
    console.error('Error in getLatestMemberLocation:', error);
    return { success: false, message: 'Error obteniendo última ubicación' };
  }
}

// Obtener ubicaciones de toda la familia
async getFamilyLocations(familyId) {
  try {
    const { data, error } = await supabase
      .from('latest_locations')
      .select('*')
      .eq('family_id', familyId);

    if (error) {
      console.error('Error fetching family locations:', error);
      return { success: false, message: error.message };
    }

    return { success: true, locations: data || [] };
  } catch (error) {
    console.error('Error in getFamilyLocations:', error);
    return { success: false, message: 'Error obteniendo ubicaciones familiares' };
  }
}

// Guardar ubicación en la base de datos
async saveMemberLocation(memberId, familyId, locationData) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        member_id: memberId,
        family_id: familyId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        altitude: locationData.altitude,
        altitude_accuracy: locationData.altitudeAccuracy,
        heading: locationData.heading,
        speed: locationData.speed,
        timestamp: locationData.timestamp,
        battery: locationData.battery || null,
        is_online: true
      });

    if (error) {
      console.error('Error saving location:', error);
      return { success: false, message: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in saveMemberLocation:', error);
    return { success: false, message: 'Error guardando ubicación' };
  }
}

export default locationService;
// src/services/GeolocationService.js
// Módulo independiente para manejo de geolocalización GPS

class GeolocationService {
  constructor() {
    this.watchId = null;
    this.lastKnownPosition = null;
    this.isWatching = false;
  }

  /**
   * Verificar si geolocalización está disponible en el navegador
   * @returns {boolean} true si está disponible
   */
  isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Solicitar permisos de geolocalización
   * @returns {Promise<string>} 'granted', 'denied', 'prompt'
   */
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Geolocalización no soportada en este navegador');
    }

    try {
      // En algunos navegadores, los permisos se verifican automáticamente
      // al llamar getCurrentPosition, pero podemos intentar verificar explícitamente
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state; // 'granted', 'denied', 'prompt'
      }
      
      // Fallback para navegadores que no soportan permissions API
      return 'prompt';
    } catch (error) {
      console.warn('No se puede verificar permisos de geolocalización:', error);
      return 'prompt';
    }
  }

  /**
   * Obtener ubicación actual una sola vez
   * @param {Object} options - Opciones de geolocalización
   * @returns {Promise<Object>} Datos de ubicación
   */
  async getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache por 1 minuto
    };

    const finalOptions = { ...defaultOptions, ...options };

    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.formatPositionData(position);
          this.lastKnownPosition = locationData;
          resolve(locationData);
        },
        (error) => {
          reject(this.handleGeolocationError(error));
        },
        finalOptions
      );
    });
  }

  /**
   * Iniciar tracking continuo de ubicación
   * @param {Function} onLocationUpdate - Callback para actualizaciones
   * @param {Object} options - Opciones de geolocalización
   * @returns {Promise<number>} ID del watcher
   */
  startWatching(onLocationUpdate, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      if (this.isWatching) {
        this.stopWatching();
      }

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000 // Cache por 30 segundos para tracking continuo
      };

      const finalOptions = { ...defaultOptions, ...options };

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const locationData = this.formatPositionData(position);
          this.lastKnownPosition = locationData;
          
          if (typeof onLocationUpdate === 'function') {
            onLocationUpdate(locationData);
          }
        },
        (error) => {
          const geoError = this.handleGeolocationError(error);
          console.error('Error en tracking continuo:', geoError);
          
          if (typeof onLocationUpdate === 'function') {
            onLocationUpdate(null, geoError);
          }
        },
        finalOptions
      );

      this.isWatching = true;
      resolve(this.watchId);
    });
  }

  /**
   * Detener tracking continuo
   */
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  /**
   * Obtener última ubicación conocida sin hacer nueva consulta GPS
   * @returns {Object|null} Última ubicación o null
   */
  getLastKnownPosition() {
    return this.lastKnownPosition;
  }

  /**
   * Formatear datos de posición del navegador
   * @param {Position} position - Objeto Position del navegador
   * @returns {Object} Datos formateados
   */
  formatPositionData(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp),
      // Información adicional útil
      coords: {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      },
      // Estimación de precisión
      precision: this.getPrecisionLevel(position.coords.accuracy),
      // Información del dispositivo si está disponible
      battery: this.getBatteryLevel(),
      isManual: true // Por defecto, las solicitudes son manuales
    };
  }

  /**
   * Determinar nivel de precisión basado en accuracy
   * @param {number} accuracy - Precisión en metros
   * @returns {string} Nivel de precisión
   */
  getPrecisionLevel(accuracy) {
    if (accuracy <= 10) return 'high';      // Muy preciso
    if (accuracy <= 50) return 'medium';    // Precisión media
    if (accuracy <= 100) return 'low';      // Baja precisión
    return 'very_low';                      // Muy baja precisión
  }

  /**
   * Obtener nivel de batería si está disponible
   * @returns {Promise<number|null>} Nivel de batería o null
   */
  async getBatteryLevel() {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Manejo de errores de geolocalización
   * @param {GeolocationPositionError} error - Error del navegador
   * @returns {Error} Error formateado
   */
  handleGeolocationError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('El usuario denegó el acceso a la ubicación. Por favor, habilita los permisos de ubicación en tu navegador.');
      
      case error.POSITION_UNAVAILABLE:
        return new Error('La información de ubicación no está disponible. Verifica tu conexión GPS.');
      
      case error.TIMEOUT:
        return new Error('La solicitud de ubicación tardó demasiado tiempo. Intenta de nuevo.');
      
      default:
        return new Error(`Error desconocido al obtener ubicación: ${error.message}`);
    }
  }

  /**
   * Calcular distancia entre dos puntos usando fórmula Haversine
   * @param {number} lat1 - Latitud punto 1
   * @param {number} lon1 - Longitud punto 1
   * @param {number} lat2 - Latitud punto 2
   * @param {number} lon2 - Longitud punto 2
   * @returns {number} Distancia en metros
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  }

  /**
   * Verificar si un punto está dentro de una zona circular
   * @param {number} pointLat - Latitud del punto
   * @param {number} pointLon - Longitud del punto
   * @param {number} zoneLat - Latitud del centro de la zona
   * @param {number} zoneLon - Longitud del centro de la zona
   * @param {number} radius - Radio de la zona en metros
   * @returns {boolean} true si está dentro de la zona
   */
  isInSafeZone(pointLat, pointLon, zoneLat, zoneLon, radius) {
    const distance = this.calculateDistance(pointLat, pointLon, zoneLat, zoneLon);
    return distance <= radius;
  }

  /**
   * Obtener información de estado del servicio
   * @returns {Object} Estado actual del servicio
   */
  getStatus() {
    return {
      supported: this.isSupported(),
      watching: this.isWatching,
      watchId: this.watchId,
      lastPosition: this.lastKnownPosition,
      lastUpdate: this.lastKnownPosition?.timestamp || null
    };
  }

  /**
   * Limpiar recursos y detener tracking
   */
  destroy() {
    this.stopWatching();
    this.lastKnownPosition = null;
  }
}

// Crear instancia singleton
const geolocationService = new GeolocationService();

export default geolocationService;
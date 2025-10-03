// src/services/GPSTrackingService.js
import geolocationService from './GeolocationService';
import locationStorageService from './LocationStorageService';
import zoneDetectionService from './ZoneDetectionService';

class GPSTrackingService {
  constructor() {
    this.isTracking = false;
    this.trackingInterval = null;
    this.watchId = null;
    this.updateIntervalMs = 30000; // 30 segundos por defecto
    this.onLocationUpdate = null;
    this.onError = null;
	this.familyId = null;
    this.onZoneChange = null;
  }

  // Iniciar tracking automático
  startTracking(memberId, options = {}) {
    if (this.isTracking) {
      console.log('Tracking ya está activo');
      return;
    }

    const {
      intervalMs = 30000, // 30 segundos
      onLocationUpdate = null,
      onError = null,
	  onZoneChange = null
    } = options;

	this.onZoneChange = onZoneChange;
    this.updateIntervalMs = intervalMs;
    this.onLocationUpdate = onLocationUpdate;
    this.onError = onError;
    this.isTracking = true;

    console.log(`Iniciando GPS tracking automático cada ${intervalMs / 1000}s`);

    // Primera actualización inmediata
    this.updateLocation(memberId);

    // Configurar actualizaciones periódicas
    this.trackingInterval = setInterval(() => {
      this.updateLocation(memberId);
    }, this.updateIntervalMs);

    // También usar watchPosition para actualizaciones en tiempo real
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.handlePositionUpdate(position, memberId);
        },
        (error) => {
          this.handleError(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 15000
        }
      );
    }
  }

  // Detener tracking
  stopTracking() {
    if (!this.isTracking) {
      console.log('Tracking no está activo');
      return;
    }

    console.log('Deteniendo GPS tracking');

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
  }

  // Actualizar ubicación
  async updateLocation(memberId) {
    try {
      console.log('Obteniendo ubicación GPS...');
      
      const locationData = await geolocationService.getCurrentPosition();
      
      // Guardar en base de datos
      const saveResult = await locationStorageService.saveLocation(
        memberId,
        locationData,
        { isAutomatic: true }
      );

      if (saveResult.success) {
        console.log('Ubicación guardada automáticamente:', locationData);
        
	    const zoneDetection = await zoneDetectionService.detectZoneChanges(
          memberId,
          locationData.latitude,
          locationData.longitude,
          familyId
        );

      if (zoneDetection.success && zoneDetection.hasChanges) {
        console.log('Cambios de zona detectados:', zoneDetection);	
		
		// Callback para notificaciones
        if (this.onZoneChange) {
          this.onZoneChange(zoneDetection);
        }
      }
		
        // Callback si existe
        if (this.onLocationUpdate) {
          this.onLocationUpdate(locationData);
        }
      }
    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      this.handleError(error);
    }
  }

  // Manejar actualización de watchPosition
  async handlePositionUpdate(position, memberId) {
    const locationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp).toISOString()
    };

    // Solo guardar si la precisión es razonable (< 100m)
    if (locationData.accuracy < 100) {
      await locationStorageService.saveLocation(
        memberId,
        locationData,
        { isAutomatic: true, fromWatch: true }
      );

      if (this.onLocationUpdate) {
        this.onLocationUpdate(locationData);
      }
    }
  }

  // Manejar errores
  handleError(error) {
    console.error('Error en GPS tracking:', error);
    
    if (this.onError) {
      this.onError(error);
    }
  }

  // Cambiar intervalo de actualización
  setUpdateInterval(intervalMs) {
    this.updateIntervalMs = intervalMs;
    
    if (this.isTracking && this.trackingInterval) {
      // Reiniciar con nuevo intervalo
      clearInterval(this.trackingInterval);
      const memberId = this.currentMemberId; // Necesitarás guardar esto
      this.trackingInterval = setInterval(() => {
        this.updateLocation(memberId);
      }, this.updateIntervalMs);
    }
  }

  // Verificar estado
  getStatus() {
    return {
      isTracking: this.isTracking,
      updateInterval: this.updateIntervalMs,
      hasWatchPosition: this.watchId !== null
    };
  }
}

// Crear instancia singleton
const gpsTrackingService = new GPSTrackingService();

export default gpsTrackingService;
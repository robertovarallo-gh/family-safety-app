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
	  familyId = null,
      onLocationUpdate = null,
      onError = null,
	  onZoneChange = null
    } = options;

	this.familyId = familyId;
    this.updateIntervalMs = intervalMs;
    this.onLocationUpdate = onLocationUpdate;
    this.onError = onError;
	this.onZoneChange = onZoneChange;
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
      
      // Verificar que familyId existe antes de usarlo
      /* 
	    if (this.familyId) {
        // Detectar cambios de zonas
        const zoneDetection = await zoneDetectionService.detectZoneChanges(
          memberId,
          locationData.latitude,
          locationData.longitude,
          this.familyId
        );

        if (zoneDetection.success && zoneDetection.hasChanges) {
          console.log('Cambios de zona detectados:', zoneDetection);
          
          if (this.onZoneChange) {
            this.onZoneChange(zoneDetection);
          }
        }
      } 
	  */
      
      // Callback de ubicación
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
  
  // Obtener batería igual que en getCurrentPosition
  let batteryLevel = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (!isIOS && 'getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      batteryLevel = Math.round(battery.level * 100);
      console.log('Batería en watchPosition:', batteryLevel);
    } catch (error) {
      console.log('Error obteniendo batería en watch:', error);
    }
  }
  
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

  if (locationData.accuracy < 100) {
    await locationStorageService.saveLocation(
      memberId,
      locationData,
      { isAutomatic: true, fromWatch: true }
    );

    if (this.onLocationUpdate) {
      this.onLocationUpdate(locationData); // ← SIN zoneDetection
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
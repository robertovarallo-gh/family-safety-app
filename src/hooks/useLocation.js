// src/hooks/useLocation.js
import { useState, useEffect, useCallback, useRef } from 'react';
import locationService from '../services/LocationService';

export const useLocation = (options = {}) => {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown'); // 'granted', 'denied', 'prompt', 'unknown'

  const trackingIntervalRef = useRef(null);
  const lastUpdateRef = useRef(null);

  // Configuración por defecto
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
    trackingInterval: 30000, // Actualizar cada 30 segundos
    enableBackground: false,
    ...options
  };

  // Verificar permisos de geolocalización
  const checkPermissions = useCallback(async () => {
    if (!navigator.permissions) {
      setPermissionStatus('unknown');
      return 'unknown';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setPermissionStatus(permission.state);
      
      // Escuchar cambios en permisos
      permission.onchange = () => {
        setPermissionStatus(permission.state);
      };

      return permission.state;
    } catch (error) {
      console.warn('No se pudieron verificar permisos:', error);
      setPermissionStatus('unknown');
      return 'unknown';
    }
  }, []);

  // Solicitar permisos explícitamente
  const requestPermissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const position = await locationService.getCurrentPosition(defaultOptions);
      setLocation(position);
      setPermissionStatus('granted');
      return position;
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      setError(error);
      
      if (error.code === 'PERMISSION_DENIED') {
        setPermissionStatus('denied');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Obtener ubicación actual una vez
  const getCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const position = await locationService.getCurrentPosition(defaultOptions);
      setLocation(position);
      return position;
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Iniciar seguimiento continuo
  const startTracking = useCallback(() => {
    if (isTracking) {
      console.warn('El tracking ya está activo');
      return;
    }

    setIsLoading(true);
    setError(null);

    const success = locationService.startTracking(
      (position) => {
        setLocation(position);
        setIsLoading(false);
        lastUpdateRef.current = Date.now();
        
        // Callback personalizado si se proporciona
        if (options.onLocationUpdate) {
          options.onLocationUpdate(position);
        }
      },
      (error) => {
        console.error('Error en tracking:', error);
        setError(error);
        setIsLoading(false);
        
        // Callback personalizado si se proporciona
        if (options.onError) {
          options.onError(error);
        }
      },
      defaultOptions
    );

    if (success) {
      setIsTracking(true);
      
      // Configurar intervalo adicional para verificar actualizaciones
      if (defaultOptions.trackingInterval) {
        trackingIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const timeSinceLastUpdate = now - (lastUpdateRef.current || 0);
          
          // Si no hay actualizaciones recientes, intentar obtener ubicación manualmente
          if (timeSinceLastUpdate > defaultOptions.trackingInterval * 2) {
            getCurrentLocation().catch(console.error);
          }
        }, defaultOptions.trackingInterval);
      }
    } else {
      setIsLoading(false);
      setError(new Error('No se pudo iniciar el tracking'));
    }
  }, [isTracking, getCurrentLocation, options]);

  // Detener seguimiento
  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);
    
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }
  }, []);

  // Limpiar recursos al desmontar componente
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Verificar permisos al montar
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Obtener dirección desde coordenadas
  const getAddress = useCallback(async (latitude, longitude) => {
    try {
      return await locationService.getAddressFromCoordinates(latitude, longitude);
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      throw error;
    }
  }, []);

  // Calcular distancia entre dos puntos
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    return locationService.calculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  // Verificar zonas seguras
  const checkSafeZones = useCallback((safeZones) => {
    if (!location || !safeZones) return null;
    
    return locationService.isInSafeZone(
      location.latitude, 
      location.longitude, 
      safeZones
    );
  }, [location]);

  // Estado de soporte del navegador
  const isSupported = locationService.isSupported();

  return {
    // Estado
    location,
    isLoading,
    error,
    isTracking,
    permissionStatus,
    isSupported,
    
    // Métodos
    getCurrentLocation,
    startTracking,
    stopTracking,
    requestPermissions,
    getAddress,
    calculateDistance,
    checkSafeZones,
    
    // Utilidades
    lastUpdate: lastUpdateRef.current
  };
};
// src/services/LocationStorageService.js
// Módulo independiente para almacenar y recuperar ubicaciones en Supabase

import { supabase } from './supabaseClient.js';

class LocationStorageService {
  constructor() {
    this.lastStoredLocation = null;
    this.batchQueue = [];
    this.batchTimer = null;
  }

  /**
   * Guardar ubicación individual en la base de datos
   * @param {string} userId - ID del miembro familiar
   * @param {Object} locationData - Datos de ubicación del GeolocationService
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Resultado de la operación
   */
  async saveLocation(userId, locationData, options = {}) {
    try {
      // Validar datos requeridos
      if (!userId || !locationData) {
        throw new Error('userId y locationData son requeridos');
      }

      if (!locationData.latitude || !locationData.longitude) {
        throw new Error('Coordenadas de latitud y longitud son requeridas');
      }

      // Preparar datos para inserción
      const locationRecord = {
        user_id: userId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy || null,
        battery_level: await this.getBatteryLevel() || locationData.battery || null,
        is_manual: options.isManual !== undefined ? options.isManual : true,
        address: options.address || null,
        // timestamp se genera automáticamente en la DB
      };

      console.log('Guardando ubicación:', locationRecord);

      const { data, error } = await supabase
        .from('user_locations')
        .insert([locationRecord])
        .select()
        .single();

      if (error) {
        console.error('Error guardando ubicación:', error);
        return { success: false, error: error.message };
      }

      this.lastStoredLocation = data;
      
      console.log('Ubicación guardada exitosamente:', data);
      
      return { 
        success: true, 
        location: data,
        message: 'Ubicación guardada correctamente'
      };

    } catch (error) {
      console.error('Error en saveLocation:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Obtener la ubicación más reciente de un usuario
   * @param {string} userId - ID del miembro familiar
   * @returns {Promise<Object>} Última ubicación o null
   */
  async getLatestLocation(userId) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No hay registros
          return { success: true, location: null };
        }
        throw error;
      }

      return { 
        success: true, 
        location: data 
      };

    } catch (error) {
      console.error('Error obteniendo última ubicación:', error);
      return { 
        success: false, 
        error: error.message,
        location: null
      };
    }
  }

  /**
   * Obtener historial de ubicaciones de un usuario
   * @param {string} userId - ID del miembro familiar
   * @param {Object} options - Filtros y opciones
   * @returns {Promise<Array>} Array de ubicaciones
   */
  async getLocationHistory(userId, options = {}) {
    try {
      if (!userId) {
        throw new Error('userId es requerido');
      }

      const {
        limit = 100,
        fromDate = null,
        toDate = null,
        onlyManual = false
      } = options;

      let query = supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      // Filtros opcionales
      if (fromDate) {
        query = query.gte('timestamp', fromDate);
      }

      if (toDate) {
        query = query.lte('timestamp', toDate);
      }

      if (onlyManual) {
        query = query.eq('is_manual', true);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        locations: data || [],
        count: data?.length || 0
      };

    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return { 
        success: false, 
        error: error.message,
        locations: []
      };
    }
  }

  /**
   * Obtener ubicaciones de toda la familia
   * @param {string} familyId - ID de la familia
   * @param {Object} options - Opciones
   * @returns {Promise<Array>} Ubicaciones de todos los miembros
   */
  async getFamilyLocations(familyId, options = {}) {
    try {
      if (!familyId) {
        throw new Error('familyId es requerido');
      }

      const { includeHistory = false, limit = 1 } = options;

      // Primero obtener miembros de la familia
      const { data: familyMembers, error: membersError } = await supabase
        .from('family_members')
        .select('id, first_name, last_name, role')
        .eq('family_id', familyId);

      if (membersError) {
        throw membersError;
      }

      if (!familyMembers || familyMembers.length === 0) {
        return { success: true, familyLocations: [] };
      }

      // Obtener ubicaciones para cada miembro
      const familyLocations = [];

      for (const member of familyMembers) {
        let query = supabase
          .from('user_locations')
          .select('*')
          .eq('user_id', member.id)
          .order('timestamp', { ascending: false });

        if (!includeHistory) {
          query = query.limit(limit);
        }

        const { data: locations, error: locError } = await query;

        if (locError) {
          console.warn(`Error obteniendo ubicaciones para ${member.first_name}:`, locError);
          continue;
        }

        familyLocations.push({
          member: member,
          locations: locations || [],
          lastLocation: locations?.[0] || null
        });
      }

      return { 
        success: true, 
        familyLocations: familyLocations 
      };

    } catch (error) {
      console.error('Error obteniendo ubicaciones familiares:', error);
      return { 
        success: false, 
        error: error.message,
        familyLocations: []
      };
    }
  }

  /**
   * Actualizar dirección de una ubicación usando geocoding reverso
   * @param {string} locationId - ID de la ubicación
   * @param {string} address - Dirección obtenida
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateLocationAddress(locationId, address) {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .update({ address: address })
        .eq('id', locationId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, location: data };

    } catch (error) {
      console.error('Error actualizando dirección:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Eliminar ubicaciones antiguas para limpieza de datos
   * @param {string} userId - ID del usuario
   * @param {Date} olderThan - Eliminar registros anteriores a esta fecha
   * @returns {Promise<Object>} Resultado de la operación
   */
  async cleanupOldLocations(userId, olderThan) {
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .delete()
        .eq('user_id', userId)
        .lt('timestamp', olderThan.toISOString());

      if (error) {
        throw error;
      }

      return { 
        success: true, 
        deletedCount: data?.length || 0,
        message: `Se eliminaron ${data?.length || 0} ubicaciones antiguas`
      };

    } catch (error) {
      console.error('Error limpiando ubicaciones antiguas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar si una ubicación ha cambiado significativamente
   * @param {Object} newLocation - Nueva ubicación
   * @param {Object} lastLocation - Última ubicación guardada
   * @param {number} threshold - Umbral en metros (por defecto 10m)
   * @returns {boolean} true si la ubicación cambió significativamente
   */
  hasLocationChanged(newLocation, lastLocation, threshold = 10) {
    if (!lastLocation) return true;

    const distance = this.calculateDistance(
      newLocation.latitude,
      newLocation.longitude,
      lastLocation.latitude,
      lastLocation.longitude
    );

    return distance > threshold;
  }

  /**
   * Calcular distancia entre dos puntos (reutilizado de GeolocationService)
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

    return R * c;
  }

  /**
   * Obtener estadísticas de ubicaciones de un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de período
   * @returns {Promise<Object>} Estadísticas
   */
  async getLocationStats(userId, options = {}) {
    try {
      const { days = 7 } = options;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);

      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', fromDate.toISOString());

      if (error) {
        throw error;
      }

      const stats = {
        totalLocations: data?.length || 0,
        manualUpdates: data?.filter(loc => loc.is_manual).length || 0,
        automaticUpdates: data?.filter(loc => !loc.is_manual).length || 0,
        averageAccuracy: 0,
        period: `${days} días`,
        firstLocation: data?.[data.length - 1] || null,
        lastLocation: data?.[0] || null
      };

      if (data && data.length > 0) {
        const accuracies = data.filter(loc => loc.accuracy).map(loc => loc.accuracy);
        stats.averageAccuracy = accuracies.length > 0 
          ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
          : 0;
      }

      return { success: true, stats };

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener nivel de batería actual del dispositivo
   * @returns {Promise<number|null>} Nivel de batería
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
   * Obtener información de estado del servicio
   * @returns {Object} Estado del servicio
   */
  getStatus() {
    return {
      lastStoredLocation: this.lastStoredLocation,
      batchQueueSize: this.batchQueue.length,
      connected: !!supabase
    };
  }
}

// Crear instancia singleton
const locationStorageService = new LocationStorageService();

export default locationStorageService;
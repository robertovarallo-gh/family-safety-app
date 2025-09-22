// src/services/SupabaseLocationService.js
import { supabase } from './supabaseClient';

class SupabaseLocationService {
  // Actualizar ubicación de un niño
  async updateLocation(locationData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener family_id del usuario
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Verificar que el niño pertenece a la familia
      const { data: child, error: childError } = await supabase
        .from('children')
        .select('id, family_id')
        .eq('id', locationData.childId)
        .eq('family_id', userData.family_id)
        .single();

      if (childError || !child) {
        throw new Error('Niño no encontrado o sin permisos');
      }

      // Insertar nueva ubicación
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .insert({
          child_id: locationData.childId,
          family_id: userData.family_id,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          altitude: locationData.altitude,
          altitude_accuracy: locationData.altitudeAccuracy,
          heading: locationData.heading,
          speed: locationData.speed,
          address_full: locationData.address?.full,
          address_short: locationData.address?.short,
          timestamp: locationData.timestamp || new Date().toISOString(),
          user_agent: navigator.userAgent,
          battery: locationData.deviceInfo?.battery,
          is_online: navigator.onLine,
          platform: this.detectPlatform()
        })
        .select()
        .single();

      if (locationError) throw locationError;

      console.log('✅ Ubicación guardada en Supabase:', location);

      return {
        success: true,
        message: 'Ubicación actualizada correctamente',
        location: {
          id: location.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp
        }
      };

    } catch (error) {
      console.error('❌ Error actualizando ubicación:', error);
      return {
        success: false,
        message: error.message || 'Error actualizando ubicación'
      };
    }
  }

  // Obtener ubicación actual de un niño
  async getCurrentLocation(childId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar permisos
      const { data: child, error: childError } = await supabase
        .from('children')
        .select(`
          id, 
          family_id,
          first_name,
          last_name,
          current_latitude,
          current_longitude,
          current_accuracy,
          last_location_update,
          current_address
        `)
        .eq('id', childId)
        .single();

      if (childError || !child) {
        throw new Error('Niño no encontrado');
      }

      // Verificar que pertenece a la familia del usuario
      const { data: userData } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', user.id)
        .single();

      if (child.family_id !== userData?.family_id) {
        throw new Error('Sin permisos para ver este niño');
      }

      // Obtener la ubicación más reciente de la tabla locations
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('*')
        .eq('child_id', childId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (locationError && locationError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw locationError;
      }

      const result = {
        success: true,
        location: location ? {
          id: location.id,
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          accuracy: location.accuracy ? parseFloat(location.accuracy) : null,
          address: {
            full: location.address_full,
            short: location.address_short
          },
          timestamp: location.timestamp,
          age: Date.now() - new Date(location.timestamp).getTime()
        } : null,
        message: location ? 'Ubicación encontrada' : 'No hay ubicaciones registradas'
      };

      return result;

    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      return {
        success: false,
        message: error.message || 'Error obteniendo ubicación'
      };
    }
  }

  // Obtener historial de ubicaciones
  async getLocationHistory(childId, options = {}) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const {
        limit = 50,
        offset = 0,
        startDate,
        endDate,
        includeAddress = false
      } = options;

      // Verificar permisos
      const { data: userData } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', user.id)
        .single();

      const { data: child } = await supabase
        .from('children')
        .select('family_id')
        .eq('id', childId)
        .eq('family_id', userData?.family_id)
        .single();

      if (!child) {
        throw new Error('Niño no encontrado o sin permisos');
      }

      // Construir consulta
      let query = supabase
        .from('locations')
        .select(includeAddress ? 
          'id, latitude, longitude, accuracy, timestamp, address_full, address_short' :
          'id, latitude, longitude, accuracy, timestamp'
        )
        .eq('child_id', childId)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      // Filtros de fecha
      if (startDate) query = query.gte('timestamp', startDate);
      if (endDate) query = query.lte('timestamp', endDate);

      const { data: locations, error, count } = await query;

      if (error) throw error;

      // Obtener total para paginación
      let totalQuery = supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('child_id', childId);

      if (startDate) totalQuery = totalQuery.gte('timestamp', startDate);
      if (endDate) totalQuery = totalQuery.lte('timestamp', endDate);

      const { count: total } = await totalQuery;

      return {
        success: true,
        locations: locations.map(loc => ({
          ...loc,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null
        })),
        pagination: {
          total: total || 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < (total || 0)
        }
      };

    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return {
        success: false,
        message: error.message || 'Error obteniendo historial'
      };
    }
  }

  // Obtener ubicaciones de toda la familia
  async getFamilyLocations() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Obtener family_id
      const { data: userData } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', user.id)
        .single();

      if (!userData?.family_id) {
        return {
          success: true,
          locations: [],
          message: 'Usuario no pertenece a ninguna familia'
        };
      }

      // Obtener todos los niños de la familia
      const { data: children, error: childrenError } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('family_id', userData.family_id);

      if (childrenError) throw childrenError;

      if (children.length === 0) {
        return {
          success: true,
          locations: [],
          message: 'No hay niños en la familia'
        };
      }

      // Obtener última ubicación de cada niño usando la vista
      const { data: locations, error: locationsError } = await supabase
        .from('latest_locations')
        .select('*')
        .in('child_id', children.map(c => c.id));

      if (locationsError) throw locationsError;

      const result = locations.map(loc => ({
        childId: loc.child_id,
        childName: `${loc.first_name} ${loc.last_name}`,
        location: {
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
          address: {
            full: loc.address_full,
            short: loc.address_short
          },
          timestamp: loc.timestamp,
          age: loc.age_seconds * 1000 // Convertir a milliseconds
        }
      }));

      return {
        success: true,
        locations: result
      };

    } catch (error) {
      console.error('Error obteniendo ubicaciones familiares:', error);
      return {
        success: false,
        message: error.message || 'Error obteniendo ubicaciones familiares'
      };
    }
  }

  // Verificar zonas seguras
  async checkSafeZones(childId, latitude, longitude) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar permisos
      const { data: userData } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', user.id)
        .single();

      const { data: child } = await supabase
        .from('children')
        .select('family_id')
        .eq('id', childId)
        .eq('family_id', userData?.family_id)
        .single();

      if (!child) {
        throw new Error('Niño no encontrado o sin permisos');
      }

      // Obtener zonas seguras reales de la tabla safe_zones
      const { data: safeZones, error: zonesError } = await supabase
        .from('safe_zones')
        .select('*')
        .eq('family_id', userData.family_id);

      if (zonesError) {
        console.warn('Error obteniendo zonas seguras:', zonesError);
        // Usar zonas de ejemplo si hay error
        return this.getExampleSafeZones(latitude, longitude);
      }

      if (!safeZones || safeZones.length === 0) {
        // Si no hay zonas seguras configuradas, usar ejemplos
        return this.getExampleSafeZones(latitude, longitude);
      }

      const results = safeZones.map(zone => {
        const distance = this.calculateDistance(
          latitude, longitude, 
          parseFloat(zone.latitude), parseFloat(zone.longitude)
        );
        
        return {
          zone: {
            id: zone.id,
            name: zone.name,
            latitude: parseFloat(zone.latitude),
            longitude: parseFloat(zone.longitude),
            radius: parseFloat(zone.radius || 0.1)
          },
          distance: distance,
          isInside: distance <= parseFloat(zone.radius || 0.1),
          distanceToEdge: Math.max(0, distance - parseFloat(zone.radius || 0.1))
        };
      });

      const isInAnySafeZone = results.some(result => result.isInside);
      const currentZone = results.find(result => result.isInside);

      return {
        success: true,
        isInSafeZone: isInAnySafeZone,
        currentZone: currentZone?.zone || null,
        allZones: results,
        location: { latitude, longitude }
      };

    } catch (error) {
      console.error('Error verificando zonas seguras:', error);
      return {
        success: false,
        message: error.message || 'Error verificando zonas seguras'
      };
    }
  }

  // Zonas de ejemplo cuando no hay configuradas
  getExampleSafeZones(latitude, longitude) {
    const safeZones = [
      {
        id: 'home-example',
        name: 'Casa (ejemplo)',
        latitude: latitude + 0.001,
        longitude: longitude + 0.001,
        radius: 0.1 // 100 metros
      },
      {
        id: 'school-example',
        name: 'Escuela (ejemplo)',
        latitude: latitude + 0.002,
        longitude: longitude + 0.002,
        radius: 0.2 // 200 metros
      }
    ];

    const results = safeZones.map(zone => {
      const distance = this.calculateDistance(
        latitude, longitude, 
        zone.latitude, zone.longitude
      );
      
      return {
        zone,
        distance: distance,
        isInside: distance <= zone.radius,
        distanceToEdge: Math.max(0, distance - zone.radius)
      };
    });

    const isInAnySafeZone = results.some(result => result.isInside);
    const currentZone = results.find(result => result.isInside);

    return {
      success: true,
      isInSafeZone: isInAnySafeZone,
      currentZone: currentZone?.zone || null,
      allZones: results,
      location: { latitude, longitude }
    };
  }

  // Obtener estadísticas
  async getLocationStats(childId, period = '24h') {
    try {
      const { data, error } = await supabase
        .rpc('get_location_stats', {
          p_child_id: childId,
          p_period: period
        });

      if (error) throw error;

      return {
        success: true,
        stats: data
      };

    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return {
        success: false,
        message: error.message || 'Error obteniendo estadísticas'
      };
    }
  }

  // Limpiar historial
  async cleanupHistory(childId, olderThan) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Verificar permisos
      const { data: userData } = await supabase
        .from('users')
        .select('family_id')
        .eq('id', user.id)
        .single();

      const { data: child } = await supabase
        .from('children')
        .select('family_id')
        .eq('id', childId)
        .eq('family_id', userData?.family_id)
        .single();

      if (!child) {
        throw new Error('Niño no encontrado o sin permisos');
      }

      let query = supabase
        .from('locations')
        .delete()
        .eq('child_id', childId);

      if (olderThan) {
        query = query.lt('timestamp', olderThan);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        message: `Historial limpiado correctamente`,
        deletedCount: data?.length || 0
      };

    } catch (error) {
      console.error('Error limpiando historial:', error);
      return {
        success: false,
        message: error.message || 'Error limpiando historial'
      };
    }
  }

  // Utilidades
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  }

  formatDistance(distanceInKm) {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)}m`;
    } else {
      return `${distanceInKm.toFixed(1)}km`;
    }
  }
}

// Crear instancia singleton
const supabaseLocationService = new SupabaseLocationService();

export default supabaseLocationService;
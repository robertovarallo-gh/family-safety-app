// src/services/SafeZonesService.js
import { supabase } from './supabaseClient';

class SafeZonesService {
  // Obtener todas las zonas seguras de la familia
  async getFamilySafeZones(familyId) {
    try {
      if (!familyId) throw new Error('Family ID requerido');

      // Obtener zonas seguras de la familia
      const { data: safeZones, error: zonesError } = await supabase
        .from('safe_zones')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (zonesError) throw zonesError;

      return {
        success: true,
        zones: (safeZones || []).map(zone => this.formatZoneForUI(zone))
      };

    } catch (error) {
      console.error('Error obteniendo zonas seguras:', error);
      return {
        success: false,
        message: error.message || 'Error obteniendo zonas seguras'
      };
    }
  }

  // Crear nueva zona segura
  async createSafeZone(zoneData, familyId, userId) {
    try {
      if (!familyId) throw new Error('Family ID requerido');
      if (!userId) throw new Error('User ID requerido');

      // Formatear coordenadas según tu estructura JSONB
      const coordinates = {
        latitude: zoneData.latitude,
        longitude: zoneData.longitude,
        radius: zoneData.radius || 100 // metros por defecto
      };

      // Preparar datos para insertar
      const newZone = {
        name: zoneData.name,
        type: zoneData.type,
        family_id: familyId,
        created_by: userId,
        coordinates: coordinates,
        address: zoneData.address ? {
          full: zoneData.address.full,
          short: zoneData.address.short,
          formatted: zoneData.address.formatted
        } : null,
        schedule: zoneData.schedule || {
          enabled: false,
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          start_time: '08:00',
          end_time: '18:00'
        },
        alert_settings: zoneData.alert_settings || {
          notify_on_enter: true,
          notify_on_exit: true,
          notification_message: `Zona segura: ${zoneData.name}`
        }
      };

      console.log('🔍 Datos a enviar a Supabase:', newZone);

      const { data: createdZone, error: createError } = await supabase
        .from('safe_zones')
        .insert(newZone)
        .select()
        .single();

      if (createError) throw createError;

      return {
        success: true,
        zone: this.formatZoneForUI(createdZone),
        message: 'Zona segura creada exitosamente'
      };

    } catch (error) {
      console.error('Error creando zona segura:', error);
      return {
        success: false,
        message: error.message || 'Error creando zona segura'
      };
    }
  }

  // Actualizar zona segura existente
  async updateSafeZone(zoneId, zoneData, familyId) {
    try {
      if (!familyId) throw new Error('Family ID requerido');

      // Preparar datos para actualizar
      const updateData = {
        name: zoneData.name,
        type: zoneData.type,
        coordinates: {
          latitude: zoneData.latitude,
          longitude: zoneData.longitude,
          radius: zoneData.radius || 100
        },
        address: zoneData.address,
        schedule: zoneData.schedule,
        alert_settings: zoneData.alert_settings,
        updated_at: new Date().toISOString()
      };

      const { data: updatedZone, error: updateError } = await supabase
        .from('safe_zones')
        .update(updateData)
        .eq('id', zoneId)
        .eq('family_id', familyId) // Solo zonas de la familia
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        success: true,
        zone: this.formatZoneForUI(updatedZone),
        message: 'Zona segura actualizada exitosamente'
      };

    } catch (error) {
      console.error('Error actualizando zona segura:', error);
      return {
        success: false,
        message: error.message || 'Error actualizando zona segura'
      };
    }
  }

  // Eliminar zona segura
async deleteSafeZone(zoneId, familyId) {
  try {
    if (!familyId) throw new Error('Family ID requerido');

    console.log('??? Eliminando zona:');
    console.log('Zone ID:', zoneId);
    console.log('Family ID:', familyId);

    const { error: deleteError } = await supabase
      .from('safe_zones')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', zoneId)
      .eq('family_id', familyId);

    if (deleteError) throw deleteError;

    return {
      success: true,
      message: 'Zona segura eliminada exitosamente'
    };

  } catch (error) {
      console.error('Error eliminando zona segura:', error);
      return {
        success: false,
        message: error.message || 'Error eliminando zona segura'
      };
    }
}

  // Verificar si una ubicacion esta en alguna zona segura
  async checkLocationInSafeZones(latitude, longitude, familyId) {
    try {
      const zonesResult = await this.getFamilySafeZones(familyId);
      if (!zonesResult.success) throw new Error(zonesResult.message);

      const results = zonesResult.zones.map(zone => {
        const distance = this.calculateDistance(
          latitude, longitude,
          zone.latitude, zone.longitude
        );

        return {
          zone,
          distance: distance * 1000, // convertir a metros
          isInside: (distance * 1000) <= zone.radius,
          distanceToEdge: Math.max(0, (distance * 1000) - zone.radius)
        };
      });

      const isInAnySafeZone = results.some(result => result.isInside);
      const currentZones = results.filter(result => result.isInside);

      return {
        success: true,
        isInSafeZone: isInAnySafeZone,
        currentZones: currentZones,
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

  // Obtener zona segura por ID
  async getSafeZone(zoneId, familyId) {
    try {
      if (!familyId) throw new Error('Family ID requerido');

      const { data: zone, error: zoneError } = await supabase
        .from('safe_zones')
        .select('*')
        .eq('id', zoneId)
        .eq('family_id', familyId)
        .eq('is_active', true)
        .single();

      if (zoneError) throw zoneError;

      return {
        success: true,
        zone: this.formatZoneForUI(zone)
      };

    } catch (error) {
      console.error('Error obteniendo zona segura:', error);
      return {
        success: false,
        message: error.message || 'Error obteniendo zona segura'
      };
    }
  }

  // Obtener dirección desde coordenadas
  async getAddressFromCoordinates(latitude, longitude) {
    try {
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
          success: true,
          address: {
            full: data.display_name,
            short: this.formatShortAddress(data.address),
            formatted: data.display_name,
            components: data.address
          }
        };
      } else {
        throw new Error('No se encontró dirección');
      }
    } catch (error) {
      console.error('Error obteniendo dirección:', error);
      return {
        success: false,
        address: {
          full: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          short: 'Ubicación desconocida',
          formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        }
      };
    }
  }

  // Formatear zona para la UI
  formatZoneForUI(zone) {
    return {
      id: zone.id,
      name: zone.name,
      type: zone.type,
      latitude: zone.coordinates.latitude,
      longitude: zone.coordinates.longitude,
      radius: zone.coordinates.radius || 100,
      address: zone.address,
      schedule: zone.schedule,
      alert_settings: zone.alert_settings,
      is_active: zone.is_active,
      created_at: zone.created_at,
      updated_at: zone.updated_at,
      // Propiedades calculadas
      typeLabel: this.getTypeLabel(zone.type),
      typeIcon: '📍',
      radiusFormatted: this.formatDistance(zone.coordinates.radius || 100)
    };
  }

  // Etiquetas legibles para tipos
  getTypeLabel(type) {
    const labels = {
      'home': 'Casa',
      'school': 'Escuela',
      'park': 'Parque',
      'relative': 'Casa familiar',
      'activity': 'Actividad',
      'custom': 'Personalizada'
    };
    return labels[type] || type;
  }

  // Íconos para tipos
  getTypeIcon(type) {
    return '📍';
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

  // Calcular distancia entre dos puntos
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

  // Formatear distancia
  formatDistance(distanceInMeters) {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)}km`;
    }
  }

  // Validar datos de zona
  validateZoneData(zoneData) {
    const errors = [];

    if (!zoneData.name || zoneData.name.trim().length < 2) {
      errors.push('El nombre debe tener al menos 2 caracteres');
    }

    if (!zoneData.type) {
      errors.push('Debe seleccionar un tipo de zona');
    }

    if (!zoneData.latitude || !zoneData.longitude) {
      errors.push('Las coordenadas son requeridas');
    }

    if (zoneData.latitude < -90 || zoneData.latitude > 90) {
      errors.push('Latitud inválida');
    }

    if (zoneData.longitude < -180 || zoneData.longitude > 180) {
      errors.push('Longitud inválida');
    }

    if (zoneData.radius && (zoneData.radius < 10 || zoneData.radius > 10000)) {
      errors.push('El radio debe estar entre 10m y 10km');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Crear instancia singleton
const safeZonesService = new SafeZonesService();

export default safeZonesService;
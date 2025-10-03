// src/services/ZoneDetectionService.js
import { supabase } from './supabaseClient';
import SafeZonesService from './SafeZonesService';

class ZoneDetectionService {
  constructor() {
    this.lastKnownZones = {}; // memberId: [zoneIds]
  }

  // Calcular distancia entre dos puntos (en metros)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Verificar si ubicación está dentro de una zona
  isInsideZone(latitude, longitude, zone) {
    const distance = this.calculateDistance(
      latitude, 
      longitude,
      zone.latitude,
      zone.longitude
    );
    return distance <= zone.radius;
  }

  // Detectar zonas actuales y cambios
  async detectZoneChanges(memberId, latitude, longitude, familyId) {
    try {
      // Obtener zonas seguras de la familia
      const zonesResult = await SafeZonesService.getFamilySafeZones(familyId);
      
      if (!zonesResult.success) {
        return { success: false, message: zonesResult.message };
      }

      const zones = zonesResult.zones || [];
      
      // Verificar en qué zonas está actualmente
      const currentZones = zones.filter(zone => 
        this.isInsideZone(latitude, longitude, zone)
      );
      
      const currentZoneIds = currentZones.map(z => z.id);
      const previousZoneIds = this.lastKnownZones[memberId] || [];

      // Detectar entradas (zonas nuevas)
      const entered = currentZones.filter(zone => 
        !previousZoneIds.includes(zone.id)
      );

      // Detectar salidas (zonas que ya no está)
      const exited = zones.filter(zone => 
        previousZoneIds.includes(zone.id) && !currentZoneIds.includes(zone.id)
      );

      // Actualizar estado
      this.lastKnownZones[memberId] = currentZoneIds;

      // Guardar eventos si hubo cambios
      const events = [];
      
      for (const zone of entered) {
        const event = await this.logZoneEvent(memberId, zone.id, 'entered', {
          latitude,
          longitude,
          zone_name: zone.name
        });
        events.push({ type: 'entered', zone, event });
      }

      for (const zone of exited) {
        const event = await this.logZoneEvent(memberId, zone.id, 'exited', {
          latitude,
          longitude,
          zone_name: zone.name
        });
        events.push({ type: 'exited', zone, event });
      }

      return {
        success: true,
        currentZones,
        entered,
        exited,
        events,
        hasChanges: entered.length > 0 || exited.length > 0
      };

    } catch (error) {
      console.error('Error detectando zonas:', error);
      return { success: false, message: error.message };
    }
  }

  // Registrar evento de zona en la base de datos
  async logZoneEvent(memberId, zoneId, eventType, metadata = {}) {
    try {
      const { data, error } = await supabase
        .from('zone_events')
        .insert({
          member_id: memberId,
          zone_id: zoneId,
          event_type: eventType,
          timestamp: new Date().toISOString(),
          metadata: metadata
        })
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, event: data };
    } catch (error) {
      console.error('Error guardando evento de zona:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener historial de eventos de un miembro
  async getZoneHistory(memberId, options = {}) {
    try {
      const { limit = 50, startDate, endDate } = options;

      let query = supabase
        .from('zone_events')
        .select(`
          *,
          safe_zones (
            name,
            type
          )
        `)
        .eq('member_id', memberId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        success: true,
        events: data || []
      };
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return { success: false, message: error.message };
    }
  }

  // Limpiar estado (útil al cambiar de usuario)
  clearState() {
    this.lastKnownZones = {};
  }
}

// Instancia singleton
const zoneDetectionService = new ZoneDetectionService();

export default zoneDetectionService;
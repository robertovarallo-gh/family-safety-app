// src/services/RealtimeLocationService.js
import { supabase } from './supabaseClient';

class RealtimeLocationService {
  constructor() {
    this.subscription = null;
    this.isSubscribed = false;
    this.onLocationChange = null;
  }

  // Suscribirse a cambios de ubicaciones de la familia
  subscribe(familyId, callback) {
    if (this.isSubscribed) {
      console.log('Ya existe una suscripción activa');
      return;
    }

    this.onLocationChange = callback;

    console.log('Suscribiéndose a cambios de ubicación para familia:', familyId);

    // Crear canal de realtime
    this.subscription = supabase
      .channel(`location-changes-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_locations'
        },
        (payload) => {
          console.log('Nueva ubicación recibida en tiempo real:', payload.new);
          
          if (this.onLocationChange) {
            this.onLocationChange(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_locations'
        },
        (payload) => {
          console.log('Ubicación actualizada en tiempo real:', payload.new);
          
          if (this.onLocationChange) {
            this.onLocationChange(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción Realtime activa');
          this.isSubscribed = true;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal Realtime');
          this.isSubscribed = false;
        }
      });
  }

  // Desuscribirse
  unsubscribe() {
    if (this.subscription) {
      console.log('Desuscribiendo de cambios de ubicación');
      supabase.removeChannel(this.subscription);
      this.subscription = null;
      this.isSubscribed = false;
      this.onLocationChange = null;
    }
  }

  // Estado de la suscripción
  getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      hasCallback: this.onLocationChange !== null
    };
  }
}

// Instancia singleton
const realtimeLocationService = new RealtimeLocationService();

export default realtimeLocationService;
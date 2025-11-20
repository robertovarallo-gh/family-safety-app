import { supabase } from './supabaseClient';

class SafetyCheckService {
  // Enviar solicitud de check
  async sendCheckRequest(requesterId, targetId, familyId) {
    try {
      const { data, error } = await supabase
        .from('safety_checks')
        .insert({
          requester_id: requesterId,
          target_id: targetId,
          family_id: familyId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error enviando check:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener checks pendientes para un usuario
  async getPendingChecks(targetId) {
    try {
      const { data, error } = await supabase
        .from('safety_checks')
        .select(`
          *,
          requester:family_members!requester_id(first_name, last_name, avatar)
        `)
        .eq('target_id', targetId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error obteniendo checks pendientes:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener checks enviados por un usuario
  async getSentChecks(requesterId) {
    try {
      const { data, error } = await supabase
        .from('safety_checks')
        .select(`
          *,
          target:family_members!target_id(first_name, last_name, avatar)
        `)
        .eq('requester_id', requesterId)
        .order('requested_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error obteniendo checks enviados:', error);
      return { success: false, error: error.message };
    }
  }

  // Validar PIN (debe venir de family_members.settings o families)
  async validatePin(memberId, enteredPin) {
    try {
      // Obtener PIN del miembro
      const { data: member, error } = await supabase
        .from('family_members')
        .select('settings')
        .eq('id', memberId)
        .single();

      if (error) throw error;

      const correctPin = member?.settings?.safety_pin || '1234'; // Default si no existe
      const reversePin = correctPin.split('').reverse().join('');

      if (enteredPin === correctPin) {
        return { success: true, type: 'normal' };
      } else if (enteredPin === reversePin) {
        return { success: true, type: 'reverse' };
      } else {
        return { success: false, type: 'invalid' };
      }
    } catch (error) {
      console.error('Error validando PIN:', error);
      return { success: false, error: error.message };
    }
  }

  // Responder al check
  async respondToCheck(checkId, memberId, pinType) {
    try {
      const updateData = {
        status: 'ok',
        pin_used: pinType,
        responded_at: new Date().toISOString(),
        is_silent_emergency: pinType === 'reverse'
      };

      const { data, error } = await supabase
        .from('safety_checks')
        .update(updateData)
        .eq('id', checkId)
        .eq('target_id', memberId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error respondiendo check:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener alertas de emergencia silenciosa para la familia
  async getSilentEmergencies(familyId) {
    try {
      const { data, error } = await supabase
        .from('safety_checks')
        .select(`
          *,
          target:family_members!target_id(first_name, last_name, avatar)
        `)
        .eq('family_id', familyId)
        .eq('is_silent_emergency', true)
        .gte('responded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
        .order('responded_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error obteniendo emergencias silenciosas:', error);
      return { success: false, error: error.message };
    }
  }

  // Listener para checks pendientes
  subscribeToPendingChecks(targetId, callback) {
    const subscription = supabase
      .channel('pending-checks-realtime')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'safety_checks',
          filter: `target_id=eq.${targetId}`
        },
        (payload) => {
          console.log('📨 Nuevo check recibido:', payload);
          callback(payload.new);
        }
      )
      .subscribe();

    return subscription;
  }

  // Listener para respuestas de checks
  subscribeToCheckResponses(requesterId, callback) {
    const subscription = supabase
      .channel('check-responses-realtime')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'safety_checks',
          filter: `requester_id=eq.${requesterId}`
        },
        (payload) => {
          console.log('✅ Check respondido:', payload);
          callback(payload.new);
        }
      )
      .subscribe();

    return subscription;
  }

  // Listener para emergencias silenciosas
  subscribeToPendingChecks(targetId, callback) {
    console.log('🔔 Suscribiendo a checks para target_id:', targetId);
    
    const subscription = supabase
      .channel('pending-checks-realtime')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'safety_checks',
          filter: `target_id=eq.${targetId}`
        },
        (payload) => {
          console.log('📨 ¡PAYLOAD RECIBIDO EN SERVICIO!:', payload);
          callback(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado suscripción checks:', status);
      });

    return subscription;
  }

  // Listener para emergencias silenciosas
  subscribeToSilentEmergencies(familyId, callback) {
    console.log('🚨 Suscribiendo a emergencias silenciosas para family:', familyId);
    
    const subscription = supabase
      .channel('silent-emergencies-realtime')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'safety_checks',
          filter: `family_id=eq.${familyId}`
        },
        (payload) => {
          if (payload.new.is_silent_emergency) {
            console.log('🚨 EMERGENCIA SILENCIOSA:', payload);
            callback(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado suscripción emergencias:', status);
      });

    return subscription;
  }
}

export default new SafetyCheckService();
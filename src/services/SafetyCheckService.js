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

  // Validar PIN (debe venir de family_members.settings)
  async validatePin(memberId, enteredPin) {
    try {
      const { data: member, error } = await supabase
        .from('family_members')
        .select('settings')
        .eq('id', memberId)
        .single();

      if (error) throw error;

      const correctPin = member?.settings?.safety_pin || '1234';
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
        is_silent_emergency: pinType === 'reverse',
        emergency_type: pinType === 'reverse' ? 'silent' : null  // ← AGREGAR ESTA LÍNEA
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

  // Obtener alertas de emergencia silenciosa
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
        .gte('responded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('responded_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error obteniendo emergencias silenciosas:', error);
      return { success: false, error: error.message };
    }
  }

  // ✨ UN SOLO LISTENER para toda la familia
  subscribeToFamilyChecks(familyId, memberId, callbacks) {
    console.log('🔔 Suscribiendo a checks de familia:', familyId);
    console.log('👤 Member ID:', memberId);
    
    const subscription = supabase
      .channel(`family-checks-${familyId}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'safety_checks'
          // ← SIN FILTRO para probar
        },
        (payload) => {
          console.log('📨 Evento INSERT recibido (sin filtro):', payload.new);
          
          // Filtrar manualmente por familia
          if (payload.new.family_id === familyId) {
            console.log('✅ Es de mi familia');
            console.log('🔍 DEBUG - memberId:', memberId);  // ← AGREGAR
            console.log('🔍 DEBUG - requester_id:', payload.new.requester_id);  // ← AGREGAR
            console.log('🔍 DEBUG - emergency_type:', payload.new.emergency_type);  // ← AGREGAR
            
            // Si el check es para mí
            if (payload.new.target_id === memberId && payload.new.status === 'pending') {
              console.log('📬 Check recibido para mí');
              callbacks.onCheckReceived?.(payload.new);
            }

            // Si es emergencia explícita y NO soy yo quien la activó
            if (payload.new.emergency_type === 'explicit' && payload.new.requester_id !== memberId) {
              console.log('🚨 EMERGENCIA EXPLÍCITA detectada en INSERT');
              
              // Obtener datos del miembro que activó
              supabase
                .from('family_members')
                .select('first_name, last_name, avatar')
                .eq('id', payload.new.requester_id)
                .single()
                .then(({ data: member }) => {
                  console.log('👤 Datos del miembro:', member);
                  callbacks.onExplicitEmergency?.({
                    ...payload.new,
                    member_first_name: member?.first_name,
                    member_last_name: member?.last_name,
                    member_avatar: member?.avatar
                  });
                });  
            }
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'safety_checks'
        },
        (payload) => {
          console.log('✅ Evento UPDATE recibido (sin filtro):', payload.new);
          
          if (payload.new.family_id === familyId) {
            // Si respondieron a mi check
            if (payload.new.requester_id === memberId && !payload.new.emergency_type) {
              console.log('📥 Respuesta a mi check');
              callbacks.onCheckResponse?.(payload.new);
            }
            
            // Si es emergencia silenciosa y NO soy el target
            if (payload.new.emergency_type === 'silent' && payload.new.target_id !== memberId) {
              console.log('🚨 Emergencia silenciosa detectada');
              
              // Obtener datos del miembro
              supabase
                .from('family_members')
                .select('first_name, last_name, avatar')
                .eq('id', payload.new.target_id)
                .single()
                .then(({ data: member }) => {
                  callbacks.onSilentEmergency?.({
                    ...payload.new,
                    member_first_name: member?.first_name,
                    member_last_name: member?.last_name,
                    member_avatar: member?.avatar
                  });
                });  
            }
            
            // Si es emergencia explícita y NO soy yo quien la activó
            if (payload.new.emergency_type === 'explicit' && payload.new.requester_id !== memberId) {
              console.log('🚨 EMERGENCIA EXPLÍCITA detectada');
              // Obtener datos del miembro que activó
              supabase
                .from('family_members')
                .select('first_name, last_name, avatar')
                .eq('id', payload.new.requester_id)
                .single()
                .then(({ data: member }) => {
                  callbacks.onExplicitEmergency?.({
                    ...payload.new,
                    member_first_name: member?.first_name,
                    member_last_name: member?.last_name,
                    member_avatar: member?.avatar
                  });
                }); 
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado canal familia:', status);
      });

    return subscription;
  }

  // Activar emergencia explícita
  async activateEmergency(memberId, familyId) {
    try {
      const { data, error } = await supabase
        .from('safety_checks')
        .insert({
          requester_id: memberId,
          target_id: memberId, // El mismo que activa
          family_id: familyId,
          status: 'ok',
          is_silent_emergency: false,
          emergency_type: 'explicit',
          responded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error activando emergencia:', error);
      return { success: false, error: error.message };
    }
  }

}

export default new SafetyCheckService();
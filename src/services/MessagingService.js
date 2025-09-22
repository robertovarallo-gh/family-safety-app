// services/MessagingService.js
import { supabase } from '../config/supabase';

const MessagingService = {
  // Enviar mensaje a un miembro familiar
  sendMessage: async (senderId, memberId, message, familyId) => {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .insert({
          sender_id: senderId,
          member_id: memberId,
          family_id: familyId,
          message: message,
          is_verified: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { success: false, message: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return { success: false, message: 'Error enviando mensaje' };
    }
  },

  // Obtener mensajes de un miembro
  getMemberMessages: async (memberId, familyId, limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .select('*')
        .eq('member_id', memberId)
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching messages:', error);
        return { success: false, message: error.message };
      }

      return { success: true, messages: data || [] };
    } catch (error) {
      console.error('Error in getMemberMessages:', error);
      return { success: false, message: 'Error obteniendo mensajes' };
    }
  },

  // Verificar mensaje con contraseña
  verifyMessage: async (messageId, familyId) => {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .update({ is_verified: true })
        .eq('id', messageId)
        .eq('family_id', familyId)
        .select()
        .single();

      if (error) {
        console.error('Error verifying message:', error);
        return { success: false, message: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in verifyMessage:', error);
      return { success: false, message: 'Error verificando mensaje' };
    }
  }
};

export default MessagingService;
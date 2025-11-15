import { supabase } from './supabaseClient';

class MessagingService {
  // Enviar mensaje
  async sendMessage(senderId, receiverId, familyId, messageText) {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          family_id: familyId,
          message_text: messageText,
          message_type: 'text',
          read: false
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener conversaciones (lista de contactos con último mensaje)
  async getConversations(userId, familyId) {
    try {
      // Obtener todos los mensajes donde participa el usuario
      const { data: messages, error } = await supabase
        .from('family_messages')
        .select('*')
        .eq('family_id', familyId)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por contacto
      const conversations = new Map();
      
      messages.forEach(msg => {
        const contactId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        
        if (!conversations.has(contactId)) {
          conversations.set(contactId, {
            contactId,
            lastMessage: msg.message_text,
            lastMessageTime: msg.created_at,
            unreadCount: 0
          });
        }
        
        // Contar no leídos
        if (msg.receiver_id === userId && !msg.read) {
          const conv = conversations.get(contactId);
          conv.unreadCount++;
        }
      });

      return { success: true, data: Array.from(conversations.values()) };
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener mensajes de una conversación
  async getMessages(userId, contactId) {
    try {
      const { data, error } = await supabase
        .from('family_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return { success: false, error: error.message };
    }
  }

  // Marcar mensajes como leídos
  async markAsRead(userId, contactId) {
    try {
      const { error } = await supabase
        .from('family_messages')
        .update({ read: true })
        .eq('receiver_id', userId)
        .eq('sender_id', contactId)
        .eq('read', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error marcando como leído:', error);
      return { success: false, error: error.message };
    }
  }

  // Listener de mensajes en tiempo real
  subscribeToMessages(userId, callback) {
    const subscription = supabase
      .channel('messages-realtime')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'family_messages',
          filter: `receiver_id=eq.${userId}`
        },
        (payload) => {
          console.log('📨 Nuevo mensaje recibido:', payload);
          callback(payload.new);
        }
      )
      .subscribe();

    return subscription;
  }
}

export default new MessagingService();
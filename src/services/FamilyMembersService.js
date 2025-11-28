// services/FamilyMembersService.js
import { supabase } from './supabaseClient';

const FamilyMembersService = {
  // Obtener todos los miembros de una familia
  getFamilyMembers: async (familyId) => {
    try {
      // Obtener TODOS primero para debug
      const { data: allData, error: allError } = await supabase
        .from('family_members')
        .select('id, first_name, last_name, is_active, status')
        .eq('family_id', familyId);
      
      console.log('🔍 TODOS los miembros de la familia:', allData);
      
      // Ahora obtener solo los activos
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', familyId)
        .or('is_active.eq.true,is_active.is.null')  // ✅ Acepta true o null
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching family members:', error);
        return { success: false, message: error.message };
      }

      console.log('✅ getFamilyMembers - Miembros encontrados:', data?.length);
      return { success: true, members: data || [] };
    } catch (error) {
      console.error('Error in getFamilyMembers:', error);
      return { success: false, message: 'Error obteniendo miembros familiares' };
    }
  },

  // Crear nuevo miembro familiar
  createFamilyMember: async (memberData, familyId, createdBy) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          family_id: familyId,
          user_id: memberData.user_id,
          email: memberData.email,
          first_name: memberData.firstName,
          last_name: memberData.lastName,
          role: memberData.role,
          relationship: memberData.relationship,
          phone: memberData.phone,
          photo_url: memberData.photoUrl,
          emergency_contact: memberData.emergencyContact || false,
          permissions: memberData.permissions || [],
          status: 'active'  // ✅ AGREGAR: status por defecto
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating family member:', error);
        return { success: false, message: error.message };
      }

      return { success: true, member: data };
    } catch (error) {
      console.error('Error in createFamilyMember:', error);
      return { success: false, message: 'Error creando miembro familiar' };
    }
  },

  // Actualizar miembro familiar
  updateFamilyMember: async (memberId, memberData, familyId) => {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .update({
          first_name: memberData.firstName,
          last_name: memberData.lastName,
          role: memberData.role,
          age: memberData.age,
          relationship: memberData.relationship,
          phone: memberData.phone,
          photo_url: memberData.photoUrl,
          emergency_contact: memberData.emergencyContact,
          permissions: memberData.permissions
        })
        .eq('id', memberId)
        .eq('family_id', familyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating family member:', error);
        return { success: false, message: error.message };
      }

      return { success: true, member: data };
    } catch (error) {
      console.error('Error in updateFamilyMember:', error);
      return { success: false, message: 'Error actualizando miembro familiar' };
    }
  },

  // Eliminar miembro familiar (soft delete)
  deleteFamilyMember: async (memberId, familyId) => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ status: 'inactive' })  // ✅ CORREGIDO: usar 'status' en lugar de 'is_active'
        .eq('id', memberId)
        .eq('family_id', familyId);

      if (error) {
        console.error('Error deleting family member:', error);
        return { success: false, message: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteFamilyMember:', error);
      return { success: false, message: 'Error eliminando miembro familiar' };
    }
  }
};

export default FamilyMembersService;
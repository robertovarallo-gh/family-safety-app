// src/services/api.js - VERSIÓN LIMPIA SOLO SUPABASE AUTH
import { supabase } from './supabaseClient.js';

// Servicios de autenticación - SOLO SUPABASE
export const authService = {
  // Registro
  register: async (userData) => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          family_id: userData.familyId,
          phone: userData.phone
        }
      }
    });
    
    if (error) throw new Error(error.message);
    
    return { 
      success: true, 
      user: data.user, 
      session: data.session 
    };
  },

  // Login
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw new Error(error.message);
    
    return { 
      success: true, 
      user: data.user, 
      session: data.session,
      token: data.session.access_token 
    };
  },

  // Logout
  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('familywatch_token');
    localStorage.removeItem('familywatch_user');
  },

  // Obtener usuario actual
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { success: true, user };
  },

  // Verificar si está autenticado
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  // Reset password
  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
    return { success: true };
  },

  // Crear usuario con invitación
  createUserWithInvite: async (email, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: 'FamilyWatch2024!', // Password temporal
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          family_id: userData.familyId,
          role: userData.role,
          invitation: true
        }
      }
    });
    
    if (error) throw new Error(error.message);
    
    return { 
      success: true, 
      user: data.user 
    };
  }
};

// Servicios de familia - SIN BACKEND PERSONALIZADO
export const familyService = {
  // Solo mantener getSafeZones que ya funciona
  getSafeZones: async () => {
    try {
      // Obtener family_id del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.user_metadata?.family_id) {
        throw new Error('Usuario sin family_id');
      }
      
      const familyId = user.user_metadata.family_id;
      const result = await safeZonesService.getFamilySafeZones(familyId);
      
      if (result.success) {
        return result.zones;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error obteniendo zonas seguras:', error);
      return [];
    }
  }
};

// Importaciones de servicios
import safeZonesService from './SafeZonesService';
import supabaseLocationService from './SupabaseLocationService';

// Servicios de ubicación
export const locationService = {
  updateLocation: async (locationData) => {
    return await supabaseLocationService.updateLocation(locationData);
  },

  getCurrentLocation: async (childId) => {
    return await supabaseLocationService.getCurrentLocation(childId);
  },

  getLocationHistory: async (childId, options = {}) => {
    return await supabaseLocationService.getLocationHistory(childId, options);
  },

  getFamilyLocations: async () => {
    return await supabaseLocationService.getFamilyLocations();
  },

  checkSafeZones: async (childId, latitude, longitude) => {
    return await supabaseLocationService.checkSafeZones(childId, latitude, longitude);
  },

  getLocationStats: async (childId, period = '24h') => {
    return await supabaseLocationService.getLocationStats(childId, period);
  },

  cleanupHistory: async (childId, olderThan) => {
    return await supabaseLocationService.cleanupHistory(childId, olderThan);
  }
};

// Exportar servicios de zonas seguras
export { safeZonesService };
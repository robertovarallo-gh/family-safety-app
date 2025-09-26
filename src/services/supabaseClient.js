// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Variables de entorno para el frontend (diferentes al backend)

 const supabaseUrl = 'https://brqffinwgfyixgatbmgr.supabase.co';
 const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJycWZmaW53Z2Z5aXhnYXRibWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyOTc4NDgsImV4cCI6MjA3Mjg3Mzg0OH0.WVH3XW0JVwLxUK2NFpbEqre50JHT_ebzYe1foda9s2E';

import { createClient } from '@supabase/supabase-js'

// Reemplaza estas URLs con las de tu proyecto Supabase
const supabaseUrl = 'https://tu-proyecto.supabase.co'
const supabaseKey = 'tu-clave-publica-anon'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Prevenir redirects automáticos
    autoRedirectTo: false,
    // No detectar sesión en URL
    detectSessionInUrl: false,
    // Mantener sesión persistente
    persistSession: true,
    // Usar localStorage del navegador
    storage: window.localStorage,
    // Desactivar refresh automático de token
    autoRefreshToken: false,
    // Tipo de flujo implícito
    flowType: 'implicit'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Función helper para verificar si estamos autenticados
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error getting current user:', error)
      return null
    }
    return user
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

// Función helper para obtener la sesión actual
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    return session
  } catch (error) {
    console.error('Error in getCurrentSession:', error)
    return null
  }
}
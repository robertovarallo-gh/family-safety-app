import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabaseClient'

// Crear el contexto
const AuthContext = createContext({})

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Provider del contexto de autenticación
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    console.log('AuthProvider: Initializing...')

    // Función para ocultar elementos UI de Supabase
    const hideSupabaseUI = () => {
      const supabaseSelectors = [
        '[data-supabase]', 
        '.supabase-auth-ui', 
        '.sb-auth-container',
        '.supabase-ui-auth',
        '.sbui-auth',
        '.auth-widget',
        '.sbui-container',
        '.supabase-auth-widget'
      ]
      
      supabaseSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(element => {
          element.style.display = 'none'
          element.style.visibility = 'hidden'
          element.style.opacity = '0'
        })
      })
    }

    // Ejecutar inmediatamente
    hideSupabaseUI()

    // Observer para elementos que se creen dinámicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        hideSupabaseUI()
      })
    })

    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-supabase']
    })

    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: Session error:', error)
        } else {
          console.log('AuthProvider: Initial session:', session)
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('AuthProvider: Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session)
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Ocultar UI de Supabase después de cambios de estado
        setTimeout(hideSupabaseUI, 100)
        setTimeout(hideSupabaseUI, 500)
      }
    )

    // Cleanup
    return () => {
      console.log('AuthProvider: Cleaning up...')
      subscription?.unsubscribe()
      observer.disconnect()
    }
  }, [])

  // Función de login personalizada
  const signIn = async (email, password) => {
    try {
      console.log('AuthProvider: Signing in with email:', email)
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })
      
      if (error) {
        console.error('AuthProvider: Sign in error:', error)
        throw error
      }
      
      console.log('AuthProvider: Sign in successful:', data)
      return { data, error: null }
    } catch (error) {
      console.error('AuthProvider: Sign in catch error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Función de registro personalizada
  const signUp = async (email, password, userData = {}) => {
    try {
      console.log('AuthProvider: Signing up with email:', email)
      setLoading(true)
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: userData.fullName || '',
            role: 'parent', // Por defecto será padre/madre
            ...userData
          }
        }
      })
      
      if (error) {
        console.error('AuthProvider: Sign up error:', error)
        throw error
      }
      
      console.log('AuthProvider: Sign up successful:', data)
      return { data, error: null }
    } catch (error) {
      console.error('AuthProvider: Sign up catch error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Función de logout personalizada
  const signOut = async () => {
    try {
      console.log('AuthProvider: Signing out...')
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('AuthProvider: Sign out error:', error)
        throw error
      }
      
      console.log('AuthProvider: Sign out successful')
    } catch (error) {
      console.error('AuthProvider: Sign out catch error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función de reset de contraseña
  const resetPassword = async (email) => {
    try {
      console.log('AuthProvider: Resetting password for email:', email)
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) {
        console.error('AuthProvider: Password reset error:', error)
        throw error
      }
      
      console.log('AuthProvider: Password reset email sent:', data)
      return { data, error: null }
    } catch (error) {
      console.error('AuthProvider: Password reset catch error:', error)
      return { data: null, error }
    }
  }

  // Función para actualizar perfil de usuario
  const updateProfile = async (updates) => {
    try {
      console.log('AuthProvider: Updating profile:', updates)
      
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      })
      
      if (error) {
        console.error('AuthProvider: Update profile error:', error)
        throw error
      }
      
      console.log('AuthProvider: Profile updated:', data)
      return { data, error: null }
    } catch (error) {
      console.error('AuthProvider: Update profile catch error:', error)
      return { data: null, error }
    }
  }

  // Valores del contexto
  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    // Funciones helper
    isAuthenticated: !!user,
    userRole: user?.user_metadata?.role || 'parent'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
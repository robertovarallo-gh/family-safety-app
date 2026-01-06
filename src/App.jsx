import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import CustomLoginScreen from './components/CustomLoginScreen'
import FamilyTrackingApp from './components/FamilyTrackingApp'
import ResetPasswordPage from './components/ResetPasswordPage'
import FamilyInvitationPage from './components/FamilyInvitationPage'
import PricingPage from './components/PricingPage'
import SubscriptionSuccess from './components/SubscriptionSuccess'
import './styles/supabase-override.css'

const AppContent = () => {
  const { user, loading } = useAuth()
  
  // DEBUG: Agregar esto temporalmente
  console.log('Current pathname:', window.location.pathname)
  console.log('Current URL:', window.location.href)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Cargando FamilyWatch...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="custom-auth-form family-auth-container">
      <Routes>
        {/* Rutas públicas (sin autenticación) */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/family-invitation" element={<FamilyInvitationPage />} />
        
        {/* Rutas protegidas (requieren autenticación) */}
        {user ? (
          <>
            <Route path="/" element={<FamilyTrackingApp />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/subscription-success" element={<SubscriptionSuccess />} />
          </>
        ) : (
          <>
            <Route path="/" element={<CustomLoginScreen />} />
            <Route path="/pricing" element={<CustomLoginScreen />} />
            <Route path="/subscription-success" element={<CustomLoginScreen />} />
          </>
        )}
        
        {/* Ruta catch-all */}
        <Route 
          path="*" 
          element={user ? <FamilyTrackingApp /> : <CustomLoginScreen />} 
        />
      </Routes>
    </div>
  )
}

function App() {
  useEffect(() => {
    console.log('App mounted - Initializing FamilyWatch')

    // Función para ocultar elementos de Supabase que puedan aparecer
    const forceHideSupabaseUI = () => {
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
    forceHideSupabaseUI()

    // Ejecutar cada 100ms durante los primeros 3 segundos para asegurar
    const intervals = []
    for (let i = 0; i < 30; i++) {
      intervals.push(setTimeout(forceHideSupabaseUI, i * 100))
    }

    // Observer para cambios en el DOM
    const observer = new MutationObserver(() => {
      forceHideSupabaseUI()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-supabase', 'style']
    })

    // Cleanup
    return () => {
      intervals.forEach(clearTimeout)
      observer.disconnect()
      console.log('App unmounted - Cleaning up')
    }
  }, [])

  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </div>
  )
}

export default App
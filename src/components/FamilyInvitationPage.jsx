import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'

const FamilyInvitationPage = () => {
  const [invitationData, setInvitationData] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const handleAuthTokens = async () => {
      try {
        // Obtener tokens de la URL
        let accessToken, refreshToken

        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          accessToken = hashParams.get('access_token')
          refreshToken = hashParams.get('refresh_token')
        }

        if (!accessToken) {
          const searchParams = new URLSearchParams(window.location.search)
          accessToken = searchParams.get('access_token')
          refreshToken = searchParams.get('refresh_token')
        }

        if (!accessToken) {
          setError('Enlace de invitacion invalido o expirado')
          return
        }

        // Configurar la sesión en Supabase
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          console.error('Error setting session:', error)
          setError('Error al validar el enlace de invitacion')
        } else {
          console.log('Session set successfully:', data)
          setInvitationData(data.user?.user_metadata)
          setSessionReady(true)
        }

      } catch (error) {
        console.error('Error handling auth tokens:', error)
        setError('Error al procesar el enlace de invitacion')
      }
    }

    handleAuthTokens()
  }, [])

  const handleAcceptInvitation = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (newPassword.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres')
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      // Actualizar status del miembro familiar
      if (invitationData?.family_member_id) {
        const { data: userData } = await supabase.auth.getUser()
        
        await supabase
          .from('family_members')
          .update({ 
            status: 'active',
            user_id: userData.user.id 
          })
          .eq('id', invitationData.family_member_id)
      }

      // Redirigir al dashboard
      setTimeout(() => {
        window.location.href = '/'
      }, 1000)

    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (error && !sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando invitacion...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitacion Familiar</h1>
        {invitationData && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-700">Hola <strong>{invitationData.first_name}</strong>!</p>
            <p className="text-gray-600 text-sm mt-2">Has sido invitado por {invitationData.invited_by} a unirte a la familia.</p>
          </div>
        )}
        
        <form onSubmit={handleAcceptInvitation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Crear Nueva Contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Minimo 6 caracteres"
              required
              minLength="6"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Aceptar Invitacion y Crear Cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default FamilyInvitationPage
import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'

const FamilyInvitationPage = () => {
  const { user } = useAuth()
  const [invitationData, setInvitationData] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Extraer datos de invitación del usuario
    if (user?.user_metadata) {
      setInvitationData(user.user_metadata)
    }
  }, [user])

  const handleAcceptInvitation = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      // Actualizar status del miembro familiar
      if (invitationData?.family_member_id) {
        await supabase
          .from('family_members')
          .update({ 
            status: 'active',
            user_id: user.id 
          })
          .eq('id', invitationData.family_member_id)
      }

      // Redirigir al dashboard
      window.location.href = '/'

    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitacion Familiar</h1>
        {invitationData && (
          <div className="mb-6">
            <p>Hola {invitationData.first_name}!</p>
            <p>Has sido invitado por {invitationData.invited_by} a unirte a la familia.</p>
          </div>
        )}
        
        <form onSubmit={handleAcceptInvitation}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Crear Nueva Contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              required
              minLength="6"
            />
          </div>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            {loading ? 'Procesando...' : 'Aceptar Invitacion'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default FamilyInvitationPage
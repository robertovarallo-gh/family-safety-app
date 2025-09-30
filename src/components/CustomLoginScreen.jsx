import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../services/supabaseClient'

const CustomLoginScreen = () => {
  const { signIn, signUp, resetPassword } = useAuth()
  
  // Estados del formulario
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [relationship, setRelationship] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Estados para reset de contraseña
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  // Manejar envío del formulario principal
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // Login
        console.log('Attempting login with email:', email)
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message || 'Error al iniciar sesión')
        }
      } else {
        // Registro
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden')
          setLoading(false)
          return
        }
        
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres')
          setLoading(false)
          return
        }

        console.log('Attempting signup with email:', email)
        const { error } = await signUp(email, password, {
		  first_name: firstName,
		  last_name: lastName,
		  relationship: relationship,
		  birth_date: birthDate,  
		  phone: phone
		  })
        if (error) {
          setError(error.message || 'Error al crear cuenta')
        } else {
          setError('')
          // Mensaje de éxito para registro
          setSuccessMessage('¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...')
		  
		  // Esperar 10 segundos y cambiar a modo login
		  setTimeout(() => {
			setIsLogin(true)
			setResetMessage('')
			setFirstName('')
			setLastName('')
			setRelationship('')
			setBirthDate('')
			setPhone('')
			setPassword('')
			setConfirmPassword('')
		  }, 10000)
		}
      }
    } catch (err) {
      console.error('Form submission error:', err)
      setError('Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  // Manejar reset de contraseña
  const handleResetPassword = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    console.log('Attempting password reset for email:', resetEmail)
    
    // Usar supabase directamente en lugar de la función del contexto
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) {
      setError(error.message || 'Error al enviar email de recuperación')
    } else {
      setResetMessage('¡Email de recuperación enviado! Revisa tu bandeja de entrada.')
      setShowResetPassword(false)
      setResetEmail('')
    }
  } catch (err) {
    console.error('Password reset error:', err)
    setError('Error al enviar email de recuperación')
  } finally {
    setLoading(false)
  }
}

  // Alternar entre login y registro
  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setResetMessage('')
    setPassword('')
    setConfirmPassword('')
	setFirstName('')
    setLastName('')
	setRelationship('')
    setBirthDate('')
    setPhone('')
  }

  // Mostrar pantalla de reset de contraseña
  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Recuperar Contraseña</h1>
            <p className="text-gray-600">Te enviaremos un link para restablecer tu contraseña</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ingresa tu correo electrónico"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm flex items-center">
                  <span className="mr-2">⚠️</span>
                  {error}
                </p>
              </div>
            )}

			{/* Mensaje de éxito - AGREGAR ESTO */}
			{successMessage && (
			  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
				<p className="text-green-600 text-sm flex items-center">
				  <span className="mr-2">✅</span>
				  {successMessage}
				</p>
			  </div>
			)}

            {resetMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-600 text-sm flex items-center">
                  <span className="mr-2">✅</span>
                  {resetMessage}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !resetEmail.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </span>
              ) : (
                'Enviar Email de Recuperación'
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowResetPassword(false)
                setError('')
                setResetMessage('')
              }}
              className="w-full text-gray-600 py-2 text-sm hover:text-gray-800 transition-colors"
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Pantalla principal de login/registro
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">FamilyWatch</h1>
          <p className="text-gray-600">
            {isLogin ? 'Cuida a tu familia' : 'Crea tu cuenta familiar'}
          </p>
        </div>

{/* Formulario */}
<form onSubmit={handleSubmit} className="space-y-4">
  {/* Nombre separados (solo para registro) */}
  {!isLogin && (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre *
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Tu nombre"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Apellido *
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="Tu apellido"
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ¿Cuál es tu relación con la familia? *
        </label>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">Selecciona tu rol</option>
          <option value="padre">Padre</option>
          <option value="madre">Madre</option>
          <option value="hijo">Hijo</option>
          <option value="hija">Hija</option>
          <option value="abuelo">Abuelo</option>
          <option value="abuela">Abuela</option>
          <option value="tio">Tío</option>
          <option value="tia">Tía</option>
          <option value="hermano">Hermano</option>
          <option value="hermana">Hermana</option>
          <option value="otro">Otro</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Esto ayuda a configurar los permisos correctos en tu familia
        </p>
      </div>
	  
	  {/* Fecha de Nacimiento - AGREGAR ESTO */}
	  <div>
	    <label className="block text-sm font-medium text-gray-700 mb-2">
	  	  Fecha de Nacimiento *
	    </label>
	    <input
		  type="date"
		  value={birthDate}
		  onChange={(e) => setBirthDate(e.target.value)}
		  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
		  max={new Date().toISOString().split('T')[0]}
		  required
		/>
		<p className="text-xs text-gray-500 mt-1">
		  Para calcular tu edad y asignar permisos correctos
		</p>
	  </div>

	  {/* Teléfono - AGREGAR ESTO */}
	  <div>
	    <label className="block text-sm font-medium text-gray-700 mb-2">
	  	  Teléfono Celular *
		</label>
		<input
		  type="tel"
		  value={phone}
		  onChange={(e) => setPhone(e.target.value)}
		  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
		  placeholder="+57 300 123 4567"
		  required
		/>
		<p className="text-xs text-gray-500 mt-1">
		  Para notificaciones de emergencia
		</p>
	  </div>	  
    </div>
  )}


          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="tu@email.com"
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder={isLogin ? "Tu contraseña" : "Mínimo 6 caracteres"}
              required
            />
          </div>

          {/* Confirmar contraseña (solo para registro) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Confirma tu contraseña"
                required
              />
            </div>
          )}

          {/* Mensajes de error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm flex items-center">
                <span className="mr-2">⚠️</span>
                {error}
              </p>
            </div>
          )}

          {/* Mensaje de éxito */}
          {resetMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-600 text-sm flex items-center">
                <span className="mr-2">✅</span>
                {resetMessage}
              </p>
            </div>
          )}

          {/* Botón principal */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isLogin ? 'Iniciando sesión...' : 'Creando cuenta...'}
              </span>
            ) : (
              isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'
            )}
          </button>

          {/* Links de navegación */}
          <div className="flex justify-between items-center text-sm">
            {isLogin && (
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-800 transition-colors ml-auto"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="text-blue-600 hover:underline">Términos</a>
            {' '}y{' '}
            <a href="#" className="text-blue-600 hover:underline">Política de Privacidad</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default CustomLoginScreen
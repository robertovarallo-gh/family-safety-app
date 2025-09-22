// api/auth/login.js
const jwt = require('jsonwebtoken');

// Importa tus servicios (los necesitaremos después)
// const UserService = require('../../services/userService');

// Función para generar JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Función para validar email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export default async function handler(req, res) {
  // Solo permitir método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  try {
    const { email, password } = req.body;

    // Validaciones
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ 
        errors: [{ msg: 'Email inválido' }] 
      });
    }

    if (!password) {
      return res.status(400).json({ 
        errors: [{ msg: 'Password es requerido' }] 
      });
    }

    // POR AHORA - Datos de prueba (después conectaremos la base de datos)
    if (email === 'test@test.com' && password === '123456') {
      const token = generateToken(1);
      
      return res.status(200).json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: 1,
          firstName: 'Usuario',
          lastName: 'Prueba',
          email: 'test@test.com',
          role: 'admin',
          familyId: 1,
          permissions: ['view_all', 'manage_family', 'emergency_contact', 'manage_children']
        }
      });
    }

    return res.status(400).json({ message: 'Credenciales inválidas' });

    // TODO: Conectar con base de datos
    // const user = await UserService.findByEmail(email);
    // if (!user) {
    //   return res.status(400).json({ message: 'Credenciales inválidas' });
    // }
    //
    // const isMatch = await UserService.comparePassword(password, user.password_hash);
    // if (!isMatch) {
    //   return res.status(400).json({ message: 'Credenciales inválidas' });
    // }

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error del servidor' });
  }
}
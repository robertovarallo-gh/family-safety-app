// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Configuración de la API
const API_URL = 'http://localhost:5000/api';

// Servicios de autenticación
const authService = {
  // Login
  login: async (email, password) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error en login');
    }
    
    if (data.token) {
      localStorage.setItem('familywatch_token', data.token);
      localStorage.setItem('familywatch_user', JSON.stringify(data.user));
    }
    
    return data;
  },

  // Registro
  register: async (userData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error en registro');
    }
    
    if (data.token) {
      localStorage.setItem('familywatch_token', data.token);
      localStorage.setItem('familywatch_user', JSON.stringify(data.user));
    }
    
    return data;
  },

  // Logout
  logout: () => {
    localStorage.removeItem('familywatch_token');
    localStorage.removeItem('familywatch_user');
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('familywatch_token');
  },

  // Obtener usuario del localStorage
  getStoredUser: () => {
    const user = localStorage.getItem('familywatch_user');
    return user ? JSON.parse(user) : null;
  },

  // Obtener usuario actual del servidor
  getCurrentUser: async () => {
    const token = localStorage.getItem('familywatch_token');
    if (!token) throw new Error('No token');

    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error obteniendo usuario');
    }
    
    return data;
  }
};

// Crear el contexto
const AuthContext = createContext();

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

// Provider del contexto
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = authService.getStoredUser();
          setUser(storedUser);
          setIsAuthenticated(true);
          
          // Verificar que el token siga siendo válido
          try {
            const currentUser = await authService.getCurrentUser();
            setUser(currentUser.user);
          } catch (error) {
            console.log('Token inválido, limpiando sesión');
            authService.logout();
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Función de login
  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Función de registro
  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Función de logout
  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
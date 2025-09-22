// App.jsx
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import FamilyUserSystem from './components/FamilyUserSystem.jsx';
import FamilyTrackingApp from './components/FamilyTrackingApp.jsx';

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

const MainApp = () => {
  const { isAuthenticated, loading } = useAuth();

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Cargando FamilyWatch...</p>
        </div>
      </div>
    );
  }

  // Si está autenticado, mostrar app principal
  // Si no, mostrar sistema de login/registro
  return isAuthenticated ? <FamilyTrackingApp /> : <FamilyUserSystem />;
};

export default App;
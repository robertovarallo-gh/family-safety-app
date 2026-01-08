// src/components/InfoConfigScreen.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Zap, Users, Shield, Bell, CreditCard, LogOut, ChevronRight } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '../services/supabaseClient';

const InfoConfigScreen = ({ familyId, user }) => {
  const navigate = useNavigate();
  const { currentPlan, planLimits, loading: planLoading } = useSubscription(familyId);
  const [memberCount, setMemberCount] = useState(0);
  const [zoneCount, setZoneCount] = useState(0);

  useEffect(() => {
    if (familyId) {
      loadCounts();
    }
  }, [familyId]);

  const loadCounts = async () => {
    try {
      // Contar miembros
      const { data: members } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', familyId);
      
      // Contar zonas activas
      const { data: zones } = await supabase
        .from('safe_zones')
        .select('id')
        .eq('family_id', familyId)
        .eq('is_active', true);
      
      setMemberCount(members?.length || 0);
      setZoneCount(zones?.length || 0);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('¿Estás seguro que deseas cerrar sesión?');
    if (confirmed) {
      await supabase.auth.signOut();
      window.location.href = '/';
    }
  };

  const getPlanIcon = () => {
    switch (currentPlan) {
      case 'family_premium':
        return <Crown className="h-6 w-6 text-purple-600" />;
      case 'family_plus':
        return <Zap className="h-6 w-6 text-blue-600" />;
      default:
        return <Shield className="h-6 w-6 text-gray-600" />;
    }
  };

  const getPlanColor = () => {
    switch (currentPlan) {
      case 'family_premium':
        return 'from-purple-500 to-pink-500';
      case 'family_plus':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  if (planLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors mb-3"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver</span>
          </button>
          <h1 className="text-2xl font-bold">Info & Configuración</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        
        {/* Plan Actual Card */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className={`bg-gradient-to-r ${getPlanColor()} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  {getPlanIcon()}
                </div>
                <div>
                  <p className="text-sm text-white text-opacity-90 font-medium">Tu plan actual</p>
                  <h2 className="text-2xl font-bold">{planLimits?.plan_name}</h2>
                </div>
              </div>
              {currentPlan === 'family_free' && (
                <button
                  onClick={() => navigate('/pricing')}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>

          {/* Límites y Uso */}
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">Uso del Plan</h3>
            
            {/* Miembros */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">👥 Miembros de familia</span>
                <span className={`font-semibold ${memberCount >= planLimits?.max_members ? 'text-red-600' : 'text-gray-900'}`}>
                  {memberCount} / {planLimits?.max_members}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    memberCount >= planLimits?.max_members ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min((memberCount / planLimits?.max_members) * 100, 100)}%` }}
                />
              </div>
              {memberCount >= planLimits?.max_members && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Has alcanzado el límite de miembros
                </p>
              )}
            </div>

            {/* Zonas */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">🛡️ Zonas seguras</span>
                <span className={`font-semibold ${zoneCount >= planLimits?.max_safe_zones ? 'text-red-600' : 'text-gray-900'}`}>
                  {zoneCount} / {planLimits?.max_safe_zones}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    zoneCount >= planLimits?.max_safe_zones ? 'bg-red-500' : 'bg-purple-600'
                  }`}
                  style={{ width: `${Math.min((zoneCount / planLimits?.max_safe_zones) * 100, 100)}%` }}
                />
              </div>
              {zoneCount >= planLimits?.max_safe_zones && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Has alcanzado el límite de zonas
                </p>
              )}
            </div>

            {/* Tracking */}
            <div className="pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">⏱️ Intervalo de tracking</span>
                <span className="font-semibold text-gray-900">
                  Cada {planLimits?.tracking_interval_seconds}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Features del Plan */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Características del Plan</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">📍 Tracking en tiempo real</span>
              <span className={`text-sm font-semibold ${planLimits?.real_time_tracking ? 'text-green-600' : 'text-gray-400'}`}>
                {planLimits?.real_time_tracking ? '✓ Incluido' : '✗ No incluido'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">🔊 Alertas de audio</span>
              <span className={`text-sm font-semibold ${planLimits?.audio_alerts ? 'text-green-600' : 'text-gray-400'}`}>
                {planLimits?.audio_alerts ? '✓ Incluido' : '✗ No incluido'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">📶 Modo offline</span>
              <span className={`text-sm font-semibold ${planLimits?.offline_mode ? 'text-green-600' : 'text-gray-400'}`}>
                {planLimits?.offline_mode ? '✓ Incluido' : '✗ No incluido'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">🎧 Soporte prioritario</span>
              <span className={`text-sm font-semibold ${planLimits?.priority_support ? 'text-green-600' : 'text-gray-400'}`}>
                {planLimits?.priority_support ? '✓ Incluido' : '✗ No incluido'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">📊 Analytics avanzados</span>
              <span className={`text-sm font-semibold ${planLimits?.advanced_analytics ? 'text-green-600' : 'text-gray-400'}`}>
                {planLimits?.advanced_analytics ? '✓ Incluido' : '✗ No incluido'}
              </span>
            </div>
          </div>
        </div>

        {/* Opciones de Configuración */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <h3 className="font-semibold text-gray-900 p-6 pb-3">Configuración</h3>
          
          {/* Ver todos los planes */}
          <button
            onClick={() => navigate('/pricing')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-t"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-gray-900">Ver todos los planes</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Notificaciones */}
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-t"
            onClick={() => alert('Configuración de notificaciones (próximamente)')}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-gray-900">Notificaciones</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          {/* Cerrar sesión */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors border-t text-red-600"
          >
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Cerrar sesión</span>
            </div>
            <ChevronRight className="h-5 w-5 text-red-400" />
          </button>
        </div>

        {/* Info de la cuenta */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Información de la cuenta</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-900">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cuenta creada:</span>
              <span className="font-medium text-gray-900">
                {new Date(user?.created_at).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 py-4">
          <p>FamilyWatch v1.0</p>
          <p className="mt-1">© 2026 - Protegiendo a las familias</p>
        </div>
      </div>
    </div>
  );
};

export default InfoConfigScreen;
// src/components/SubscriptionSuccess.jsx - VERSIÓN ACTUALIZADA
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import StripeService from '../services/StripeService';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState(null);

  const planType = searchParams.get('plan');

  useEffect(() => {
    processSubscription();
  }, []);

  const processSubscription = async () => {
    try {
      console.log('Processing subscription for plan:', planType);

      // Validar que tengamos el plan
      if (!planType) {
        setError('No se especificó el plan');
        setProcessing(false);
        return;
      }

      // Validar que sea un plan válido
      if (!['family_plus', 'family_premium'].includes(planType)) {
        setError('Plan inválido');
        setProcessing(false);
        return;
      }

      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setError('No se pudo obtener el usuario');
        setProcessing(false);
        return;
      }

      console.log('User ID:', user.id);

      // Obtener family_id del usuario
      const { data: member, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        console.error('Error getting family:', memberError);
        setError('No se pudo obtener la familia del usuario');
        setProcessing(false);
        return;
      }

      const familyId = member.family_id;
      console.log('Family ID:', familyId);

      // Actualizar el plan
      const result = await StripeService.upgradePlanDirect(familyId, planType);

      if (result.success) {
        console.log('Plan upgraded successfully');
        setProcessing(false);
      } else {
        throw new Error('Error al activar la suscripción');
      }

    } catch (err) {
      console.error('Error processing subscription:', err);
      setError(err.message || 'Error desconocido');
      setProcessing(false);
    }
  };

  const getPlanName = () => {
    const plans = {
      family_plus: 'Family Plus',
      family_premium: 'Family Premium'
    };
    return plans[planType] || 'Plan seleccionado';
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Procesando tu suscripción...
          </h2>
          <p className="text-gray-600">
            Por favor espera mientras activamos tu plan
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Error al procesar la suscripción
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Volver a intentar
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Ir al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Icono de éxito */}
        <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          ¡Suscripción Exitosa! 🎉
        </h1>

        {/* Descripción */}
        <p className="text-gray-600 mb-6">
          Tu plan <span className="font-semibold text-blue-600">{getPlanName()}</span> ha sido activado correctamente.
        </p>

        {/* Info adicional */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">¿Qué sigue?</h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Ya puedes agregar más miembros a tu familia</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Configura más zonas seguras</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Disfruta del tracking en tiempo real</span>
            </li>
          </ul>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors"
          >
            Ir al Dashboard
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Ver todos los planes
          </button>
        </div>

        {/* Nota de facturación */}
        <p className="text-xs text-gray-500 mt-6">
          Recibirás un email de confirmación con los detalles de tu suscripción.
          La facturación se realizará mensualmente.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
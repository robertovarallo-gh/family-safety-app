// src/components/PricingPage.jsx
import React, { useState, useEffect } from 'react';
import { Check, X, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import StripeService from '../services/StripeService';

const PricingPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('family_free');
  const [familyId, setFamilyId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }
      setUserId(user.id);

      // Obtener family_id
      const { data: member } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();

      if (member) {
        setFamilyId(member.family_id);
        
        // Obtener plan actual
        const plan = await StripeService.getCurrentPlan(member.family_id);
        setCurrentPlan(plan);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const plans = [
    {
      id: 'family_free',
      name: 'Family Free',
      price: '$0',
      period: 'siempre',
      description: 'Ideal para familias pequeñas',
      features: [
        { text: 'Hasta 3 miembros', included: true },
        { text: 'Tracking cada 5 minutos', included: true },
        { text: '2 zonas seguras', included: true },
        { text: 'Mensajería básica', included: true },
        { text: 'Alertas de zona', included: true },
        { text: 'Tracking en tiempo real', included: false },
        { text: 'Alertas de audio', included: false },
        { text: 'Soporte prioritario', included: false }
      ],
      cta: 'Plan Actual',
      highlighted: false
    },
    {
      id: 'family_plus',
      name: 'Family Plus',
      price: '$6.99',
      period: 'mes',
      description: 'Para familias activas',
      features: [
        { text: 'Hasta 10 miembros', included: true },
        { text: 'Tracking cada 30 segundos', included: true },
        { text: '10 zonas seguras', included: true },
        { text: 'Tracking en tiempo real', included: true },
        { text: 'Alertas de audio', included: true },
        { text: 'Modo offline', included: true },
        { text: 'Safety Check con PIN', included: true },
        { text: 'Soporte prioritario', included: false }
      ],
      cta: 'Suscribirse',
      highlighted: true,
      badge: 'Más Popular'
    },
    {
      id: 'family_premium',
      name: 'Family Premium',
      price: '$14.99',
      period: 'mes',
      description: 'Plan completo para familias grandes',
      features: [
        { text: 'Hasta 30 miembros', included: true },
        { text: 'Tracking cada 10 segundos', included: true },
        { text: '30 zonas seguras', included: true },
        { text: 'Tracking en tiempo real', included: true },
        { text: 'Alertas de audio', included: true },
        { text: 'Soporte prioritario 24/7', included: true },
        { text: 'Analytics avanzados', included: true },
        { text: 'Historial ilimitado', included: true }
      ],
      cta: 'Suscribirse',
      highlighted: false
    }
  ];

  const handleSubscribe = async (planId) => {
    if (planId === 'family_free' || planId === currentPlan) return;
    
    if (!familyId || !userId) {
      alert('Error: No se pudo obtener la información de la familia');
      return;
    }

    setLoading(planId);
    try {
      await StripeService.createCheckoutSession(planId, familyId, userId);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar la suscripción. Por favor, intenta de nuevo.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header con botón volver */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Volver al Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Elige el plan perfecto para tu familia
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Protege a los que más amas con la tecnología adecuada. 
            Cambia o cancela en cualquier momento.
          </p>
          {currentPlan && currentPlan !== 'family_free' && (
            <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
              Plan actual: {plans.find(p => p.id === currentPlan)?.name}
            </div>
          )}
        </div>

        {/* Planes */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all ${
                plan.highlighted 
                  ? 'ring-4 ring-blue-500 transform scale-105 z-10' 
                  : 'hover:shadow-2xl'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-2 font-semibold text-sm">
                  {plan.badge}
                </div>
              )}

              <div className="p-8">
                {/* Nombre y precio */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 text-lg">/{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm ${
                        feature.included ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id || plan.id === currentPlan}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all ${
                    plan.id === currentPlan
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : plan.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } ${loading === plan.id ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Procesando...
                    </span>
                  ) : (
                    plan.id === currentPlan ? 'Plan Actual' : plan.cta
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Info adicional */}
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Preguntas Frecuentes
          </h3>
          <div className="space-y-4 text-gray-700">
            <div>
              <h4 className="font-semibold mb-2">¿Puedo cambiar de plan en cualquier momento?</h4>
              <p className="text-sm">Sí, puedes actualizar o degradar tu plan cuando quieras. Los cambios se aplican inmediatamente.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">¿Cómo funciona la facturación?</h4>
              <p className="text-sm">Se factura mensualmente. Puedes cancelar en cualquier momento y no se te cobrará el próximo mes.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">¿Hay período de prueba?</h4>
              <p className="text-sm">El plan Family Free es completamente gratuito y puedes usarlo todo el tiempo que quieras.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">¿Qué métodos de pago aceptan?</h4>
              <p className="text-sm">Aceptamos todas las tarjetas de crédito y débito principales a través de Stripe.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;

// src/components/UpgradeModal.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Shield, Zap, Crown, ArrowRight, Check } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, limitType, currentPlan, currentLimit, recommendedPlan }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  // Configuración de planes
  const plans = {
    family_free: {
      name: 'Family Free',
      color: 'gray',
      icon: Shield,
      members: 3,
      zones: 2,
      gradient: 'from-gray-400 to-gray-500'
    },
    family_plus: {
      name: 'Family Plus',
      color: 'blue',
      icon: Zap,
      members: 10,
      zones: 10,
      price: '$6.99',
      gradient: 'from-blue-500 to-cyan-500'
    },
    family_premium: {
      name: 'Family Premium',
      color: 'purple',
      icon: Crown,
      members: 30,
      zones: 30,
      price: '$14.99',
      gradient: 'from-purple-500 to-pink-500'
    }
  };

  const current = plans[currentPlan] || plans.family_free;
  const recommended = plans[recommendedPlan] || plans.family_plus;

  const getLimitIcon = () => {
    return limitType === 'members' ? Users : Shield;
  };

  const getLimitText = () => {
    return limitType === 'members' ? 'miembros' : 'zonas seguras';
  };

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform animate-slideUp">
        {/* Header */}
        <div className={`bg-gradient-to-r ${current.gradient} p-6 rounded-t-2xl relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
              {React.createElement(getLimitIcon(), { className: 'h-8 w-8' })}
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Límite Alcanzado!</h2>
            <p className="text-white text-opacity-90">
              Has llegado al límite de {currentLimit} {getLimitText()}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-center mb-6">
            Tu plan <span className="font-semibold text-gray-900">{current.name}</span> permite hasta{' '}
            <span className="font-semibold text-gray-900">{currentLimit}</span> {getLimitText()}.
            Actualiza para agregar más.
          </p>

          {/* Plan Comparison - SOLO 2 COLUMNAS */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Current Plan */}
            <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-gray-300">
              <div className={`text-${current.color}-600 mb-2`}>
                {React.createElement(current.icon, { className: 'h-8 w-8 mx-auto' })}
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-xs text-gray-600 font-semibold">Plan Actual</span>
              </div>
              <div className="font-bold text-gray-900 mb-1">{current.name}</div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {limitType === 'members' ? current.members : current.zones}
              </div>
              <div className="text-sm text-gray-500 mb-2">{getLimitText()}</div>
              {current.price && (
                <div className="text-sm font-semibold text-gray-700">{current.price}/mes</div>
              )}
            </div>

            {/* Recommended Plan */}
            <div className="text-center p-4 rounded-lg border-2 border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg relative">
              {/* Badge Recomendado */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  <span>Recomendado</span>
                </div>
              </div>
              
              <div className="text-purple-600 mb-2 mt-2">
                {React.createElement(recommended.icon, { className: 'h-8 w-8 mx-auto' })}
              </div>
              <div className="font-bold text-gray-900 mb-1">{recommended.name}</div>
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                {limitType === 'members' ? recommended.members : recommended.zones}
              </div>
              <div className="text-sm text-gray-600 mb-2">{getLimitText()}</div>
              <div className="text-sm font-semibold text-purple-700">{recommended.price}/mes</div>
            </div>
          </div>

          {/* Benefits */}
          <div className={`bg-gradient-to-r ${recommended.gradient} bg-opacity-10 rounded-lg p-4 mb-6`}>
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">
              Con {recommended.name} también obtienes:
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-700">Tracking en tiempo real</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-700">Alertas de audio</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-gray-700">Modo offline</span>
              </div>
              {recommendedPlan === 'family_premium' && (
                <>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700">Soporte prioritario 24/7</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700">Analytics avanzados</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className={`w-full bg-gradient-to-r ${recommended.gradient} text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2`}
            >
              <span>Actualizar a {recommended.name}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Ahora no
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Puedes cambiar o cancelar tu plan en cualquier momento
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UpgradeModal;
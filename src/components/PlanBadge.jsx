// src/components/PlanBadge.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { Crown, Zap, ArrowRight } from 'lucide-react';

const PlanBadge = ({ familyId }) => {
  const navigate = useNavigate();
  const { currentPlan, planLimits, loading } = useSubscription(familyId);

  if (loading || !planLimits) {
    return (
      <div className="animate-pulse bg-gray-100 h-10 rounded-lg"></div>
    );
  }

  const getPlanIcon = () => {
    switch (currentPlan) {
      case 'family_premium':
        return <Crown className="h-4 w-4" />;
      case 'family_plus':
        return <Zap className="h-4 w-4" />;
      default:
        return <span className="text-sm">🆓</span>;
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

  const getPlanTextColor = () => {
    switch (currentPlan) {
      case 'family_premium':
        return 'text-purple-700';
      case 'family_plus':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  const isFreePlan = currentPlan === 'family_free';

  return (
    <div 
      onClick={() => navigate('/pricing')}
      className={`
        mt-3 p-3 rounded-lg cursor-pointer transition-all
        ${isFreePlan 
          ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 hover:border-blue-300 hover:shadow-sm' 
          : `bg-gradient-to-r ${getPlanColor()} bg-opacity-10 border-2 border-opacity-20 hover:border-opacity-40 hover:shadow-md`
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center
            ${isFreePlan ? 'bg-gray-200' : `bg-gradient-to-r ${getPlanColor()} text-white`}
          `}>
            {getPlanIcon()}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Plan actual</p>
            <p className={`text-sm font-bold ${isFreePlan ? 'text-gray-700' : getPlanTextColor()}`}>
              {planLimits.plan_name}
            </p>
          </div>
        </div>
        
        {isFreePlan && (
          <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold">
            <span>Upgrade</span>
            <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </div>
      
      {/* Info rápida de límites */}
      <div className="mt-2 pt-2 border-t border-gray-200 border-opacity-50">
        <div className="flex justify-between text-xs text-gray-600">
          <span>👥 {planLimits.max_members} miembros</span>
          <span>🛡️ {planLimits.max_safe_zones} zonas</span>
        </div>
      </div>
    </div>
  );
};

export default PlanBadge;
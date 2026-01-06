// src/hooks/useSubscription.js
import { useState, useEffect } from 'react';
import StripeService from '../services/StripeService';

export const useSubscription = (familyId) => {
  const [planLimits, setPlanLimits] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('family_free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    const loadSubscriptionData = async () => {
      try {
        setLoading(true);

        // Cargar plan actual
        const plan = await StripeService.getCurrentPlan(familyId);
        setCurrentPlan(plan);

        // Cargar límites del plan
        const limits = await StripeService.getPlanLimits(familyId);
        setPlanLimits(limits);

      } catch (error) {
        console.error('Error loading subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptionData();
  }, [familyId]);

  // Verificar si puede agregar miembro
  const canAddMember = async (currentCount) => {
    if (!familyId || !planLimits) return false;
    return await StripeService.canAddMember(familyId, currentCount);
  };

  // Verificar si puede agregar zona
  const canAddZone = async (currentCount) => {
    if (!familyId || !planLimits) return false;
    return await StripeService.canAddZone(familyId, currentCount);
  };

  // Obtener intervalo de tracking en milisegundos
  const getTrackingInterval = () => {
    return (planLimits?.tracking_interval_seconds || 300) * 1000;
  };

  // Verificar si tiene feature específico
  const hasFeature = (featureName) => {
    if (!planLimits) return false;
    
    const featureMap = {
      realtime: planLimits.real_time_tracking,
      audio: planLimits.audio_alerts,
      priority_support: planLimits.priority_support,
      offline: planLimits.offline_mode,
      analytics: planLimits.advanced_analytics
    };

    return featureMap[featureName] || false;
  };

  return {
    // Estado
    planLimits,
    currentPlan,
    loading,
    
    // Métodos
    canAddMember,
    canAddZone,
    getTrackingInterval,
    hasFeature,
    
    // Accesos directos
    maxMembers: planLimits?.max_members || 3,
    maxZones: planLimits?.max_safe_zones || 2,
    hasRealtimeTracking: planLimits?.real_time_tracking || false,
    hasAudioAlerts: planLimits?.audio_alerts || false,
    hasPrioritySupport: planLimits?.priority_support || false,
  };
};

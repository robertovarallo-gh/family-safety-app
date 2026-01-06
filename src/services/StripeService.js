// src/services/StripeService.js
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from './supabaseClient';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const PRICE_IDS = {
  family_plus: import.meta.env.VITE_STRIPE_PRICE_FAMILY_PLUS,
  family_premium: import.meta.env.VITE_STRIPE_PRICE_FAMILY_PREMIUM
};

class StripeService {
  constructor() {
    this.stripePromise = null;
  }

  // Inicializar Stripe
  async getStripe() {
    if (!this.stripePromise) {
      this.stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
    }
    return this.stripePromise;
  }

  // Crear sesión de checkout
  async createCheckoutSession(planType, familyId, userId) {
    try {
      console.log('Creating checkout session:', { planType, familyId, userId });

      if (!PRICE_IDS[planType]) {
        throw new Error(`Price ID not found for plan: ${planType}`);
      }

      // Obtener Stripe instance
      const stripe = await this.getStripe();

      // Crear sesión de checkout directo (sin backend por ahora)
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{
          price: PRICE_IDS[planType],
          quantity: 1,
        }],
        mode: 'subscription',
        successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}&plan=${planType}&family_id=${familyId}`,
        cancelUrl: `${window.location.origin}/pricing`,
        clientReferenceId: familyId,
        customerEmail: (await supabase.auth.getUser()).data.user?.email,
      });

      if (error) {
        console.error('Stripe redirect error:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  // Verificar estado de suscripción
  async getSubscriptionStatus(familyId) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('family_id', familyId)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting subscription:', error);
        throw error;
      }

      return data || null;

    } catch (error) {
      console.error('Error in getSubscriptionStatus:', error);
      return null;
    }
  }

  // Obtener plan actual de la familia
  async getCurrentPlan(familyId) {
    try {
      const { data, error } = await supabase
        .from('families')
        .select('current_plan')
        .eq('id', familyId)
        .single();

      if (error) throw error;

      return data?.current_plan || 'family_free';

    } catch (error) {
      console.error('Error getting current plan:', error);
      return 'family_free';
    }
  }

  // Simular upgrade de plan (para testing sin webhook)
  async upgradePlanDirect(familyId, planType) {
    try {
      console.log('Upgrading plan directly:', { familyId, planType });

      // Actualizar el plan en la tabla families
      const { error: familyError } = await supabase
        .from('families')
        .update({ current_plan: planType })
        .eq('id', familyId);

      if (familyError) throw familyError;

      // Crear registro de suscripción (simulado)
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          family_id: familyId,
          plan_type: planType,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, {
          onConflict: 'family_id,status'
        });

      if (subError) throw subError;

      console.log('Plan upgraded successfully');
      return { success: true };

    } catch (error) {
      console.error('Error upgrading plan:', error);
      return { success: false, error };
    }
  }

  // Obtener límites del plan
  async getPlanLimits(familyId) {
    try {
      const { data, error } = await supabase
        .rpc('get_family_plan_limits', { p_family_id: familyId });

      if (error) throw error;

      return data?.[0] || null;

    } catch (error) {
      console.error('Error getting plan limits:', error);
      return null;
    }
  }

  // Verificar si puede agregar miembro
  async canAddMember(familyId, currentCount) {
    try {
      const { data, error } = await supabase
        .rpc('check_plan_limit', {
          p_family_id: familyId,
          p_limit_type: 'members',
          p_current_count: currentCount
        });

      if (error) throw error;

      return data === true;

    } catch (error) {
      console.error('Error checking member limit:', error);
      return false;
    }
  }

  // Verificar si puede agregar zona
  async canAddZone(familyId, currentCount) {
    try {
      const { data, error } = await supabase
        .rpc('check_plan_limit', {
          p_family_id: familyId,
          p_limit_type: 'zones',
          p_current_count: currentCount
        });

      if (error) throw error;

      return data === true;

    } catch (error) {
      console.error('Error checking zone limit:', error);
      return false;
    }
  }
}

export default new StripeService();

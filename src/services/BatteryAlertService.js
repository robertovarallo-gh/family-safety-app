import { supabase } from './supabaseClient';

class BatteryAlertService {
  lastAlertSent = {}; // memberId: timestamp

  async checkAndAlertLowBattery(memberId, batteryLevel, memberName) {
    // Solo alertar si batería <= 20%
    if (batteryLevel > 20) return { success: true, alerted: false };

    // Evitar spam - solo 1 alerta cada 30 minutos
    const lastAlert = this.lastAlertSent[memberId];
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    if (lastAlert && (now - lastAlert) < thirtyMinutes) {
      return { success: true, alerted: false, message: 'Alerta reciente' };
    }

    try {
      const { data, error } = await supabase
        .from('battery_alerts')
        .insert({
          member_id: memberId,
          battery_level: batteryLevel,
          notified: false
        })
        .select()
        .single();

      if (error) throw error;

      this.lastAlertSent[memberId] = now;
      console.log(`🔋 Alerta de batería baja: ${memberName} - ${batteryLevel}%`);
      
      return { success: true, alerted: true, alert: data };
    } catch (error) {
      console.error('Error guardando alerta de batería:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new BatteryAlertService();
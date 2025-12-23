class SoundAlertService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.defaultVoice = null;
    this.initVoices();
  }

  initVoices() {
    // Cargar voces disponibles
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      
      // Buscar voz en español (prioridad: es-ES, es-MX, es-US)
      this.defaultVoice = voices.find(voice => 
        voice.lang.startsWith('es-') || voice.lang.startsWith('pt-')
      ) || voices[0];
      
      console.log('🗣️ Voz seleccionada:', this.defaultVoice?.name, this.defaultVoice?.lang);
    };

    // Cargar voces (algunos navegadores necesitan evento)
    if (this.synth.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // Anunciar emergencia silenciosa
  announceSilentEmergency(memberName) {
    const message = `Atención. ${memberName} activó una emergencia silenciosa.`;
    this.speak(message, { rate: 1.0, pitch: 1.0, volume: 0.8 });
    this.vibrate([200, 100, 200]);
  }

  // Anunciar emergencia explícita
  announceExplicitEmergency(memberName, emergencyType) {
    const message = `¡Alerta! ${memberName} activó emergencia ${emergencyType}. Requiere ayuda inmediata.`;
    this.speak(message, { rate: 1.1, pitch: 1.1, volume: 1.0 });
    this.vibrate([300, 100, 300, 100, 300]);
    
    // Repetir después de 3 segundos
    setTimeout(() => {
      this.speak(`${memberName} necesita ayuda urgente.`, { rate: 1.1, pitch: 1.1, volume: 1.0 });
    }, 3000);
  }

  // Función base para hablar
  speak(text, options = {}) {
    if (!this.synth) {
      console.warn('Speech API no disponible');
      return;
    }

    // Cancelar cualquier mensaje anterior
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.defaultVoice;
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = this.defaultVoice?.lang || 'es-ES';

    utterance.onerror = (event) => {
      console.error('Error en speech:', event);
    };

    this.synth.speak(utterance);
  }

  // Vibración en móvil
  vibrate(pattern = [200, 100, 200]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }

  // Detener todos los sonidos
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export default new SoundAlertService();
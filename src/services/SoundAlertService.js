class SoundAlertService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.defaultVoice = null;
    this.isInitialized = false; // ← AGREGAR
    this.initVoices();
    this.setupMobileInit(); // ← AGREGAR
  }

  // ← AGREGAR ESTA FUNCIÓN
  setupMobileInit() {
    // Inicializar en el primer toque/click del usuario
    const initAudio = () => {
      if (this.isInitialized) return;
      
      // Reproducir silencio para "despertar" el audio
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      this.synth.speak(utterance);
      
      this.isInitialized = true;
      console.log('✅ Audio inicializado para móvil');
      
      // Remover listeners después de inicializar
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
    
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
  }

  initVoices() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      
      console.log('🗣️ Voces disponibles:', voices.map(v => ({
        name: v.name,
        lang: v.lang,
        default: v.default
      })));
      
      // PRIORIDAD: Español (España o Latinoamérica)
      const spanishVoices = voices.filter(v => 
        v.lang.startsWith('es-')
      );
      
      // Preferir voces MASCULINAS naturales
      this.defaultVoice = 
        spanishVoices.find(v => v.name.includes('Google') && v.name.includes('Male')) ||
        spanishVoices.find(v => v.name.includes('Jorge') || v.name.includes('Diego') || v.name.includes('Carlos')) ||
        spanishVoices.find(v => v.name.includes('Male') || v.name.includes('Man')) ||
        spanishVoices.find(v => !v.name.includes('Female') && !v.name.includes('Woman')) ||
        spanishVoices[0] ||
        voices[0];
      
      console.log('✅ Voz seleccionada:', this.defaultVoice?.name, this.defaultVoice?.lang);
    };

    if (this.synth.getVoices().length > 0) {
      loadVoices();
    } else {
      this.synth.onvoiceschanged = loadVoices;
    }
  }

  // Anunciar emergencia silenciosa
  announceSilentEmergency(memberName) {
    const message = `Atención. ${memberName} activó una emergencia silenciosa.`;
    
    // Intentar speech primero
    this.speak(message, { rate: 0.9, pitch: 0.9, volume: 0.7 });
    
    // Para móviles: vibración suave + audio
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      this.vibrate([200, 100, 200]);
      this.playSilentEmergencySound();
    }
  }

  // Anunciar emergencia explícita
  announceExplicitEmergency(memberName, emergencyType) {
    const message = `¡Alerta! ${memberName} activó emergencia ${emergencyType}. Requiere ayuda inmediata.`;
    
    // Intentar speech primero
    this.speak(message, { rate: 1.0, pitch: 1.1, volume: 1.0 });
    
    // Para móviles: vibración fuerte + notificación
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      this.vibrate([400, 200, 400, 200, 400, 200, 400]);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🚨 EMERGENCIA', {
          body: message,
          requireInteraction: true,
          vibrate: [400, 200, 400]
        });
      }
      
      this.playEmergencySound();
    }
    
    setTimeout(() => {
      this.speak(`${memberName} necesita ayuda urgente.`, { rate: 0.95, pitch: 1.0, volume: 0.9 });
      this.vibrate([300, 100, 300]);
    }, 3500);
  }

  // Función base para hablar
  speak(text, options = {}) {

    alert(`DEBUG: Intentando hablar: ${text.substring(0, 30)}...`); // ← AGREGAR

    console.log('🔊 Intentando hablar:', text);
    console.log('📱 User agent:', navigator.userAgent);
    console.log('🗣️ Synth disponible:', !!this.synth);
    console.log('🎤 Voz seleccionada:', this.defaultVoice?.name);

    if (!this.synth) {
      console.warn('Speech API no disponible');
      return;
    }

    // NO cancelar en Android - causa problemas
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      this.synth.cancel();
    }

    // Si no está inicializado en móvil, intentar inicializar
    if (!this.isInitialized && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      console.warn('⚠️ Audio no inicializado en móvil - requiere interacción del usuario');
      this.isInitialized = true; // Marcar para no bloquear siguientes intentos
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = this.defaultVoice;
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = this.defaultVoice?.lang || 'es-ES';

    utterance.onstart = () => {
      console.log('✅ Speech iniciado');
    };

    utterance.onend = () => {
      console.log('✅ Speech completado');
    };

    utterance.onerror = (event) => {
      console.error('❌ Error en speech:', event.error, event);
    };

    console.log('🎯 Llamando synth.speak...');
    this.synth.speak(utterance);
    console.log('🎯 synth.speak llamado, esperando...');

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

  // Reproducir audio de emergencia
  playEmergencySound() {
    try {
      const audio = new Audio('/sounds/emergency-alert.mp3');
      audio.volume = 1.0;
      
      audio.play().then(() => {
        console.log('✅ Audio de emergencia reproducido');
      }).catch(error => {
        console.error('❌ Error reproduciendo audio:', error);
      });
    } catch (e) {
      console.error('Error creando audio:', e);
    }
  }

  // Reproducir audio de emergencia silenciosa
  playSilentEmergencySound() {
    try {
      const audio = new Audio('/sounds/silent-emergency-alert.mp3');
      audio.volume = 0.7; // Un poco más bajo que emergencia explícita
      
      audio.play().then(() => {
        console.log('✅ Audio de emergencia silenciosa reproducido');
      }).catch(error => {
        console.error('❌ Error reproduciendo audio:', error);
      });
    } catch (e) {
      console.error('Error creando audio:', e);
    }
  }
}

export default new SoundAlertService();
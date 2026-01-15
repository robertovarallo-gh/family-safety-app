 class SoundAlertService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.defaultVoice = null;
    this.isInitialized = false;
    this.initVoices();
    this.setupMobileInit();
  }

  // ← AGREGAR ESTA FUNCIÓN
  setupMobileInit() {
    // Detectar si es iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Inicializar en el primer toque/click del usuario
    const initAudio = () => {
      if (this.isInitialized) return;
      
      console.log('🔊 Inicializando audio para móvil...');
      
      // Para iOS: crear y reproducir audio silencioso
      if (isIOS) {
        // Speech Synthesis
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        utterance.rate = 0.1;
        this.synth.speak(utterance);
        
        // También inicializar Web Audio API
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          gainNode.gain.value = 0; // Silencioso
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start(0);
          oscillator.stop(0.001);
          
          console.log('✅ Web Audio API inicializado');
        } catch (e) {
          console.warn('Web Audio API no disponible:', e);
        }
      } else {
        // Android y otros
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        this.synth.speak(utterance);
      }
      
      this.isInitialized = true;
      console.log('✅ Audio inicializado para móvil');
      
      // Remover listeners después de inicializar
      document.removeEventListener('touchstart', initAudio);
      document.removeEventListener('click', initAudio);
    };
    
    // Listeners para primer toque
    document.addEventListener('touchstart', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });
  }

  initVoices() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      
      console.log('✅ Voz seleccionada:', this.defaultVoice?.name);
      console.log('🌍 Lang:', this.defaultVoice?.lang);
      console.log('🔊 Voice URI:', this.defaultVoice?.voiceURI);
      console.log('🎭 Default:', this.defaultVoice?.default);

      console.log('🗣️ Voces disponibles:', voices.map(v => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
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

    // alert(`DEBUG: Intentando hablar: ${text.substring(0, 30)}...`);

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

    // Si no está inicializado en móvil, mostrar advertencia
    if (!this.isInitialized && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      console.warn('⚠️ Audio no inicializado - las alertas pueden no sonar');
      console.warn('⚠️ El usuario debe interactuar primero con la app');
      // NO marcar como inicializado, mantener la advertencia
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Forzar voz española explícitamente
    const spanishVoice = this.synth.getVoices().find(v => 
      v.name === 'Google español' && v.lang === 'es-ES'
    );

    utterance.voice = this.defaultVoice;
    utterance.rate = options.rate || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = this.defaultVoice?.lang || 'es-ES';

    // ← AGREGAR ESTOS LOGS AQUÍ
    console.log('🎤 VOZ USADA:', {
      name: utterance.voice?.name,
      lang: utterance.voice?.lang,
      voiceURI: utterance.voice?.voiceURI
    });
    console.log('🌍 LANG FORZADO:', utterance.lang);

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
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Para iOS: intentar reproducir inmediatamente
      const audio = new Audio('/sounds/emergency-alert.mp3');
      audio.volume = 1.0;
      
      // iOS requiere cargar el audio explícitamente
      if (isIOS) {
        audio.load();
      }
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Audio de emergencia reproducido');
          })
          .catch(error => {
            console.error('❌ Error reproduciendo audio:', error);
            // Fallback: vibración fuerte
            if ('vibrate' in navigator) {
              navigator.vibrate([1000, 500, 1000, 500, 1000]);
            }
          });
      }
    } catch (e) {
      console.error('Error creando audio:', e);
    }
  }

 
  // Reproducir audio de emergencia silenciosa
  playSilentEmergencySound() {
    try {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      const audio = new Audio('/sounds/silent-emergency-alert.mp3');
      audio.volume = 0.7;
      
      // iOS requiere cargar el audio explícitamente
      if (isIOS) {
        audio.load();
      }
      
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Audio silencioso reproducido');
          })
          .catch(error => {
            console.error('❌ Error reproduciendo audio:', error);
            // Fallback: vibración suave
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }
          });
      }
    } catch (e) {
      console.error('Error creando audio:', e);
    }
  }
}

export default new SoundAlertService();
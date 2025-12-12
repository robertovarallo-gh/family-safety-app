import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Battery, 
  Wifi, 
  MessageCircle, 
  Shield, 
  Settings, 
  Bell, 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Send,
  LogOut,
  Users
} from 'lucide-react';

// Importaciones del dashboard
import DashboardLayout from './DashboardLayout';

// Importaciones de servicios reales
import { familyService } from "../services/api.js";
import SafeZonesManager from "./SafeZonesManager.jsx";
import FamilyMembersService from '../services/FamilyMembersService.js';
import geolocationService from '../services/GeolocationService.js';
import locationStorageService from '../services/LocationStorageService.js';
import { supabase } from '../services/supabaseClient.js';
import gpsTrackingService from '../services/GPSTrackingService';
import SafeZonesService from '../services/SafeZonesService';
import realtimeLocationService from '../services/RealtimeLocationService';
import ZoneDetectionService from '../services/ZoneDetectionService';
import BatteryAlertService from '../services/BatteryAlertService';
import MessagingService from '../services/MessagingService';
import SafetyCheckService from '../services/SafetyCheckService';

//Parte 2 del FamilyTrackingApp.jsx - Estados y funciones principales  

const FamilyTrackingApp = () => {
  console.log('FamilyTrackingApp iniciando...');

  // Estados principales
  const [selectedChild, setSelectedChild] = useState(0);
  const [shouldCenterMap, setShouldCenterMap] = useState(true); // ✨ Control auto-centrado
  const mapInstanceRef = useRef(null); // ✨ Ref del mapa
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [children, setChildren] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isGPSTracking, setIsGPSTracking] = useState(false);
  const [lastGPSUpdate, setLastGPSUpdate] = useState(null);
  const [gpsError, setGpsError] = useState(null);  
  const markersRef = useRef({});
  const zoneCirclesRef = useRef([]);
  const hasAutoSelectedUser = useRef(false);

  // Estados para funcionalidades
  const [checkStatus, setCheckStatus] = useState('idle');
  const [checkRequestTime, setCheckRequestTime] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordCheck, setPasswordCheck] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showEmergencyConfirmation, setShowEmergencyConfirmation] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [alertStartTime, setAlertStartTime] = useState(null);
  const [batteryAlerts, setBatteryAlerts] = useState([]);

  // Detectar si es iOS
  const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  // Estados para zona detection
  const [zoneAlerts, setZoneAlerts] = useState([]);
  const [showZoneAlert, setShowZoneAlert] = useState(false);
  const [lastZoneStates, setLastZoneStates] = useState({}); // ✨ Para rastrear cambios de zona

  // Estados para agregar miembros
  const [memberFormData, setMemberFormData] = useState({
  first_name: '',
  last_name: '',
  email: '',
  relationship: '',
  birth_date: '',
  phone: '',
  gender: '',
  notes: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // ========== HELPER: OBTENER FAMILY_ID ==========
  
  const getFamilyId = async () => {
    if (user?.user_metadata?.family_id) {
      return user.user_metadata.family_id;
    }
    
    if (!user?.id) return null;
    
    const { data: member } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();
    
    return member?.family_id;
  };

  // Auto-scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [newMessage, setNewMessage] = useState('');

  // Checa Status - Safety Check
  const [sentChecks, setSentChecks] = useState([]);
  const [pendingCheckRequest, setPendingCheckRequest] = useState(null);
  const [showCheckPinModal, setShowCheckPinModal] = useState(false);
  const [checkPin, setCheckPin] = useState('');
  const [checkPinError, setCheckPinError] = useState('');
  const [silentEmergencies, setSilentEmergencies] = useState([]);
  const [explicitEmergencies, setExplicitEmergencies] = useState([]);
  const [activeTabSafety, setActiveTabSafety] = useState('send'); // 'send' o 'history'

  // Log de Alertas
  const [alertsTab, setAlertsTab] = useState('user'); // 'user' o 'all'
  const [selectedAlertUser, setSelectedAlertUser] = useState(null);
  const [userAlerts, setUserAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);

// ✨ Función helper para agregar alertas sin duplicados
const addZoneAlert = (newAlert) => {
  setZoneAlerts(prev => {
    // Verificar si ya existe una alerta similar en los últimos 10 segundos
    const isDuplicate = prev.some(alert => {
      const timeDiff = Math.abs(new Date() - alert.timestamp);
      return (
        alert.memberName === newAlert.memberName &&
        alert.zoneName === newAlert.zoneName &&
        alert.type === newAlert.type &&
        timeDiff < 10000 // 10 segundos
      );
    });

    if (isDuplicate) {
      console.log('⚠️ Alerta duplicada detectada, ignorando:', newAlert);
      return prev;
    }

    console.log('✅ Nueva alerta agregada:', newAlert);
    return [newAlert, ...prev].slice(0, 5);
  });
};
  
// Parte 3 del FamilyTrackingApp.jsx - useEffect hooks y carga de datos

// Autenticacion real con Supabase
// Reemplaza tu useEffect de autenticacion con este:
useEffect(() => {
  const checkAuth = async () => {
    setLoading(true);
    try {
      console.log('Verificando autenticacion...');
      
      // Limpiar tokens corruptos si hay error
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('Error de sesion, limpiando tokens:', error.message);
        await supabase.auth.signOut(); // Esto limpia los tokens corruptos
        setCurrentScreen('login');
        return;
      }
      
      if (session?.user) {
        console.log('Usuario autenticado:', session.user.email);

        // ✨ Obtener member_id del usuario logueado
        const { data: memberData } = await supabase
          .from('family_members')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        
        if (memberData) {
          session.user.member_id = memberData.id; // Agregar member_id
          console.log('✅ Member ID obtenido:', memberData.id);
        }

        setUser(session.user);
        await loadAppData(session.user);
        // ✨ FORZAR actualización de estado para activar listeners
        setUser({...session.user}); // ← AGREGAR ESTA LÍNEA

      } else {
        console.log('Sin sesion - mostrando login');
        setCurrentScreen('login');
      }
    } catch (error) {
      console.error('Error verificando auth:', error);
      // Si hay cualquier error, ir a login y limpiar tokens
      await supabase.auth.signOut();
      setCurrentScreen('login');
    } finally {
      setLoading(false);
    }
  };
  
  checkAuth();
}, []);

// 1 AGREGAR ESTE useEffect AQUÍ - GPS tracking automático
useEffect(() => {
  const startAutoTracking = async () => {
    if (!user?.member_id) return;
    
    try {
      const { data: memberData } = await supabase
        .from('family_members')
        .select('id, family_id')
        .eq('user_id', user.id)
        .single();
      
      if (memberData) {
        console.log('Iniciando tracking automático para member:', memberData.id);
        
        gpsTrackingService.familyId = memberData.family_id;
        
        gpsTrackingService.startTracking(memberData.id, {
          intervalMs: 30000,
          familyId: memberData.family_id,
          onLocationUpdate: (location) => {
            setLastGPSUpdate(new Date());
            setGpsError(null);
            loadChildren();
            loadConversations();
          },
          onError: (error) => {
            setGpsError(error.message);
          }
        });
        
        setIsGPSTracking(true);
      }
    } catch (error) {
      console.error('Error iniciando tracking:', error);
    }
  };
  
  startAutoTracking();
  
  return () => {
    gpsTrackingService.stopTracking();
    setIsGPSTracking(false);
  };
}, [user?.id]);

// 2 Suscripción a cambios en tiempo real
useEffect(() => {
  const setupRealtime = async () => {
    if (!user?.id) return;

    try {
      // Obtener family_id
      const { data: memberData } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .single();

      if (memberData?.family_id) {
        console.log('Configurando Realtime para familia:', memberData.family_id);

        // Suscribirse a cambios
        realtimeLocationService.subscribe(memberData.family_id, (newLocation) => {
          console.log('Cambio de ubicación detectado - recargando children');
          loadChildren(); // Recargar cuando alguien actualice ubicación
        });
      }
    } catch (error) {
      console.error('Error configurando Realtime:', error);
    }
  };

  setupRealtime();

  // Cleanup
  return () => {
    realtimeLocationService.unsubscribe();
  };
}, [user?.id]);

// 3 Listener realtime para eventos de zona de TODA la familia
useEffect(() => {
  if (!user?.id) return;

  console.log('🔔 Iniciando listener de eventos de zona...');

  const setupZoneListener = async () => {
    const familyId = await getFamilyId();
    
    if (!familyId) {
      console.error('No se pudo obtener family_id para listener de zonas');
      return null;
    }

    const zoneEventsSubscription = supabase
      .channel('zone-events-realtime')
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zone_events'
        },
        async (payload) => {
          console.log('🔔 Nuevo evento de zona recibido:', payload);
          
          // Obtener info del miembro
          const { data: member } = await supabase
            .from('family_members')
            .select('first_name, last_name, family_id')
            .eq('id', payload.new.member_id)
            .single();
          
          // Solo mostrar si es de la misma familia
          if (member?.family_id === familyId) {
            const memberName = `${member.first_name} ${member.last_name}`;
            const zoneName = payload.new.metadata?.zone_name || 'zona desconocida';
            const eventType = payload.new.event_type;
            
            const newAlert = {
              id: payload.new.id,
              type: 'zone',
              memberName,
              zoneName,
              eventType,
              time: new Date(payload.new.created_at).toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            };
            
            setZoneAlerts(prev => {
              // Evitar duplicados
              if (prev.some(alert => alert.id === newAlert.id)) {
                return prev;
              }
              return [newAlert, ...prev].slice(0, 3);
            });
          }
        }
      )
      .subscribe();
    
    return zoneEventsSubscription;
  };
  
  let subscription = null;
  setupZoneListener().then(sub => { subscription = sub; });
  
  return () => {
    console.log('🔕 Cerrando listener de eventos de zona');
    subscription?.unsubscribe();
  };
}, [user?.id]);

// Listener de mensajes en tiempo real
useEffect(() => {
  if (!user?.member_id) {
    console.log('❌ No hay member_id, saliendo');
    return;
  }  

  const subscription = MessagingService.subscribeToMessages(user.member_id, (newMsg) => {

    // Si estamos en el chat con esa persona, agregar mensaje
    if (selectedContact?.id === newMsg.sender_id) {

      console.log('✅ Agregando mensaje al chat actual');

      setChatMessages(prev => [...prev, newMsg]);
      MessagingService.markAsRead(user.member_id, newMsg.sender_id);
    } else {
      console.log('⚠️ Mensaje no es del contacto actual');
    }
    
    // Actualizar lista de conversaciones
    loadConversations();
  });
  
  return () => {
    subscription.unsubscribe();
  };
}, [user?.member_id, selectedContact?.id]);



// Detectar batería baja
useEffect(() => {
  const checkBatteryLevels = async () => {
    for (const child of children) {
      if (child.location?.battery_level <= 20) {
        const result = await BatteryAlertService.checkAndAlertLowBattery(
          child.id,
          child.location.battery_level,
          child.name
        );

        if (result.alerted) {
          setBatteryAlerts(prev => [{
            id: Date.now(),
            memberName: child.name,
            batteryLevel: child.location.battery_level,
            timestamp: new Date()
          }, ...prev].slice(0, 5));
        }
      }
    }
  };

  if (children.length > 0) {
    checkBatteryLevels();
  }
}, [children.map(c => `${c.id}-${c.location?.battery_level}`).join(',')]);

// ✨ NUEVO: Detectar cambios de zona LOCALMENTE (como en móvil)
useEffect(() => {
  if (!children.length || !safeZones.length) return;

  console.log('🔍 Verificando cambios de zona - Miembros:', children.length, 'Zonas:', safeZones.length);

  const checkZoneChanges = async () => {
    for (const member of children) {
      if (!member.coordinates) continue;

      const previousZone = lastZoneStates[member.id];
      const currentZone = member.safeZone;

      console.log(`👤 ${member.name}: anterior="${previousZone}", actual="${currentZone}"`);

      // Inicializar si es la primera vez
      if (previousZone === undefined) {
        setLastZoneStates(prev => ({
          ...prev,
          [member.id]: currentZone
        }));
        continue;
      }

      // Detectar cambio
      if (previousZone !== currentZone) {
        console.log(`🚨 CAMBIO DETECTADO para ${member.name}`);

        // Salió de zona anterior
        if (previousZone && !currentZone) {
          const prevZone = safeZones.find(z => z.name === previousZone);
          if (prevZone) {
            console.log(`📤 ${member.name} SALIÓ de ${previousZone}`);

            // Guardar evento en BD
            const result = await ZoneDetectionService.logZoneEvent(
              member.id,
              prevZone.id,
              'exited',
              {
                latitude: member.coordinates.lat,
                longitude: member.coordinates.lng,
                zone_name: previousZone,
                member_name: member.name
              }
            );

            if (result.success) {
              console.log('✅ Evento de SALIDA guardado');
            }

            // Mostrar alerta local inmediatamente (con protección anti-duplicados)
            addZoneAlert({
              id: Date.now(),
              type: 'exited',
              memberName: member.name,
              zoneName: previousZone,
              timestamp: new Date()
            });
          }
        }

        // Entró a zona nueva
        if (currentZone && !previousZone) {
          const currZone = safeZones.find(z => z.name === currentZone);
          if (currZone) {
            console.log(`📥 ${member.name} ENTRÓ a ${currentZone}`);

            // Guardar evento en BD
            const result = await ZoneDetectionService.logZoneEvent(
              member.id,
              currZone.id,
              'entered',
              {
                latitude: member.coordinates.lat,
                longitude: member.coordinates.lng,
                zone_name: currentZone,
                member_name: member.name
              }
            );

            if (result.success) {
              console.log('✅ Evento de ENTRADA guardado');
            }

            // Mostrar alerta local inmediatamente (con protección anti-duplicados)
            addZoneAlert({
              id: Date.now(),
              type: 'entered',
              memberName: member.name,
              zoneName: currentZone,
              timestamp: new Date()
            });
          }
        }

        // Actualizar estado
        setLastZoneStates(prev => ({
          ...prev,
          [member.id]: currentZone
        }));
      }
    }
  };

  checkZoneChanges();
}, [children, safeZones]);

// ✨ UN SOLO Listener para toda la familia
useEffect(() => {
  if (!user?.member_id) return;
  
  console.log('🔔 Iniciando listener único de familia');
  
  const setupListener = async () => {
    const familyId = await getFamilyId();
    
    if (!familyId) {
      console.error('No se pudo obtener family_id para listener');
      return null;
    }
    
    const subscription = SafetyCheckService.subscribeToFamilyChecks(
      familyId,
      user.member_id,
      {
        onCheckReceived: (check) => {
          console.log('📬 Check recibido, mostrando modal');
          setPendingCheckRequest(check);
          setShowCheckPinModal(true);
        },
        onCheckResponse: (check) => {
          console.log('📥 Check respondido, recargando lista');
          loadSentChecks();
        },
        onSilentEmergency: (emergency) => {
          console.log('🚨 Emergencia silenciosa, agregando alerta');
          setSilentEmergencies(prev => [emergency, ...prev].slice(0, 3));
        },
        onExplicitEmergency: (emergency) => {
          console.log('🚨 Emergencia explícita, agregando alerta');
          setExplicitEmergencies(prev => [emergency, ...prev].slice(0, 3));
        }
      }
    );
    
    return subscription;
  };
  
  let subscription = null;
  setupListener().then(sub => { subscription = sub; });
  
  return () => {
    console.log('🔌 Desconectando listener de familia');
    subscription?.unsubscribe();
  };
}, [user?.member_id, user?.id]);

const loadAppData = async (userData) => {
  try {
    setLoading(true);
    await loadChildren(userData);
  } catch (error) {
    console.error('Error cargando datos de la aplicación:', error);
  } finally {
    setLoading(false);
  }
};

const checkMemberInZones = (memberCoordinates, zones) => {
  if (!zones || zones.length === 0) return null;
  
  for (const zone of zones) {
    const distance = calculateDistance(
      memberCoordinates.lat,
      memberCoordinates.lng,
      zone.coordinates.lat,
      zone.coordinates.lng
    );
    
    if (distance <= zone.radius) {
      return zone.name;
    }
  }
  
  return null;
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

  const loadChildren = async (userData = user) => {
    try {
      console.log('🔍 === INICIO loadChildren ===');
      console.log('📧 Email del usuario:', userData?.email);
      console.log('👤 User ID:', userData?.id);
      console.log('👨‍👩‍👧 Family ID del metadata:', userData?.user_metadata?.family_id);
	  console.log('🔍 LoadChildren - SafeZones disponibles:', safeZones?.length || 0);
      
// PASO 1: Buscar el family_id REAL del usuario en family_members
  const currentZones = await loadSafeZones();
	console.log('Buscando family_id real del usuario en BD...');
	const { data: currentMember, error: memberError } = await supabase
	  .from('family_members')
	  .select('family_id')
	  .eq('user_id', userData.id)
	  .single();

	let familyId;

	if (currentMember && currentMember.family_id) {
	  // Si existe en family_members, usar ESE family_id
	  familyId = currentMember.family_id;
	  console.log('✅ Family_id encontrado en BD:', familyId);
	} else {
	  // Si no existe, usar el del metadata o crear uno nuevo
	  familyId = userData?.user_metadata?.family_id || userData.id;
	  console.log('⚠️ Family_id tomado del metadata o generado:', familyId);
	}
      
      if (!familyId) {
        console.log('Usuario sin family_id, creando familia automaticamente...');
        
        // Crear family_id basado en el user_id
        familyId = userData.id;
        
        // Actualizar el metadata del usuario en Supabase
        const { error: updateError } = await supabase.auth.updateUser({
          data: { 
            family_id: familyId,
            first_name: userData.user_metadata?.first_name || userData.email.split('@')[0],
            last_name: userData.user_metadata?.last_name || 'Usuario'
          }
        });
        
        if (updateError) {
          console.error('Error actualizando family_id:', updateError);
        } else {
          console.log('Family_id creado exitosamente:', familyId);
          // Actualizar el estado local del usuario
          setUser({...userData, user_metadata: {...userData.user_metadata, family_id: familyId}});
        }
      }
      
      console.log('Usando family_id:', familyId);
      
      // Obtener miembros familiares
      const membersResponse = await FamilyMembersService.getFamilyMembers(familyId);
	    console.log('📊 Respuesta getFamilyMembers:', membersResponse);
      console.log('👥 Cantidad de miembros:', membersResponse.members?.length);
      console.log('📋 Lista de miembros:', membersResponse.members);
      
      if (!membersResponse.success || !membersResponse.members?.length) {
        console.log('No hay miembros familiares registrados');
        
		// PASO 1: NUEVO - Verificar si ya existe
		console.log('Verificando si usuario existe...');
		const { data: existingMember } = await supabase
		    .from('family_members')
			.select('*')
			.eq('email', userData.email.trim().toLowerCase())
			.maybeSingle();

		console.log('Resultado verificación:', existingMember);

		if (existingMember) {
		  console.log('Usuario ya existe como miembro:', existingMember);
		  setChildren([existingMember]);

		  // Cargar los demás miembros de la familia correcta
		  const { data: otherMembers } = await supabase
			.from('family_members')
			.select('*')
			.eq('family_id', existingMember.family_id)  // Usar el family_id del miembro
			.eq('status', 'active');
		
		  setChildren(otherMembers || []);
		  return;  // Termina aquí, no continúa
		}
		
        // Crear automaticamente el primer miembro familiar (el usuario actual)
        console.log('Creando miembro familiar para el usuario actual...');
        
        const createMemberResult = await FamilyMembersService.createFamilyMember({
          firstName: userData.user_metadata?.first_name || userData.email.split('@')[0],
          lastName: userData.user_metadata?.last_name || 'Usuario',
          email: userData.email,
          user_id: userData.id,
          role: 'adulto',
          relationship: 'padre',
          phone: userData.phone || '',
          emergencyContact: true
        }, familyId, userData.id);
        
        if (createMemberResult.success) {
          console.log('Miembro familiar creado exitosamente');
          // Recargar despues de crear el miembro
          setTimeout(() => loadChildren(userData), 1000);
          return;
        } else {
          console.error('Error creando miembro familiar:', createMemberResult);
          setChildren([]);
          return;
        }
      }
      
      console.log('Miembros cargados:', membersResponse.members);
      
      // Para cada miembro, obtener su ultima ubicacion real
      const formattedMembers = [];
      
      for (const member of membersResponse.members) {
        // Obtener ultima ubicacion real de la base de datos
        const locationResult = await locationStorageService.getLatestLocation(member.id);
        
        let coordinates = { lat: 4.6951, lng: -74.0787 }; // Coordenadas por defecto (Bogota)
        let location = "Ubicacion no disponible";
        let lastUpdate = "Sin actualizacion";
        let isConnected = false;
        
        if (locationResult.success && locationResult.location) {
          // Usar ubicacion real de la base de datos
          coordinates = {
            lat: parseFloat(locationResult.location.latitude),
            lng: parseFloat(locationResult.location.longitude)
          };
          
          location = locationResult.location.address || "Ubicacion GPS actualizada";
          
          const updateTime = new Date(locationResult.location.timestamp);
          lastUpdate = updateTime.toLocaleString();
          
          // Considerar "conectado" si la ultima ubicacion es de menos de 1 hora
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);
          isConnected = updateTime > oneHourAgo;
          
          console.log(`Ubicacion real para ${member.first_name}:`, coordinates);
        } else {
          console.log(`Sin ubicacion GPS para ${member.first_name}, usando coordenadas por defecto`);
        }
        
        formattedMembers.push({
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          age: member.age || 0,
          location: location,
          address: member.address || "Bogota, Colombia", 
          lastUpdate: lastUpdate,
          battery: locationResult.location?.battery_level,
          isConnected: isConnected,
          avatar: member.role === 'ni帽o' ? '👦' : member.role === 'adolescente' ? '🧑' : member.role === 'adulto' ? '👨' : '👩',
          photo: member.photo_url || "/api/placeholder/48/48",
          safeZone: checkMemberInZones(coordinates, currentZones),
          messagingStatus: "online",
          coordinates: coordinates, // UBICACION REAL del GPS
          role: member.role, 
          relationship: member.relationship,
          phone: member.phone,
          emergency_contact: member.emergency_contact,
          // Informacion adicional de la ubicacion real
          hasRealLocation: locationResult.success && locationResult.location,
          locationAccuracy: locationResult.location?.accuracy || null,
          messages: [
            { 
              id: 1, 
              sender: 'parent', 
              message: `Hola ${member.first_name}! ¿Como estas?`, 
              timestamp: '14:30', 
              verified: true 
            }
          ]
        });
      }
      
	  console.log('✨ formattedMembers final:', formattedMembers);
      setChildren(formattedMembers);
      console.log('Miembros con ubicaciones reales:', formattedMembers);
      
      // ✨ Seleccionar usuario logueado SOLO la primera vez
      const loggedUserIndex = formattedMembers.findIndex(m => 
        m.id === userData?.id || m.name.includes(userData?.user_metadata?.first_name)
      );
      
      if (loggedUserIndex !== -1 && !hasAutoSelectedUser.current) {
        console.log('👤 Usuario logueado encontrado en índice:', loggedUserIndex);
        setSelectedChild(loggedUserIndex);
        hasAutoSelectedUser.current = true; // ✅ Marcar como seleccionado
      }
      
    } catch (error) {
      console.error('Error cargando miembros familiares:', error);
      setChildren([]);
    }
  };  
  
// Parte 4 del FamilyTrackingApp.jsx - Funciones de configuracion y formularios

const loadSafeZones = async () => {
  try {
    // ✨ Validar que user existe
    if (!user?.id) {
      console.log('⚠️ User no disponible aún');
      setSafeZones([]);
      return [];
    }

    // Obtener family_id del usuario actual
    const { data: memberData } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (!memberData?.family_id) {
      console.log('⚠️ No se encontró family_id para el usuario');
      setSafeZones([]);
      return [];
    }

    console.log('🔍 Cargando zonas para family_id:', memberData.family_id);
    
    // Pasar el family_id correcto
    const zones = await SafeZonesService.getFamilySafeZones(memberData.family_id);
    
    if (zones?.success && zones.zones && Array.isArray(zones.zones) && zones.zones.length > 0) {
      const formattedZones = zones.zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        coordinates: { 
          lat: zone.latitude,
          lng: zone.longitude 
        },
        radius: zone.radius,
        type: zone.type
      }));
      
      console.log('✅ Zonas cargadas:', formattedZones.length);
      setSafeZones(formattedZones);
      return formattedZones;
    } else {
      console.log('⚠️ No hay zonas para esta familia');
      setSafeZones([]);
      return [];
    }
  } catch (error) {
    console.error('Error cargando zonas seguras:', error);
    setSafeZones([]);
    return [];
  }
};

const loadConversations = async () => {
  if (!user?.id) return;
  
  const familyId = await getFamilyId();
  if (!familyId) {
    console.error('No se pudo obtener family_id');
    return;
  }
  
  const result = await MessagingService.getConversations(
    user.member_id, 
    familyId
  );
  
  if (result.success) {
    const conversationsWithInfo = result.data.map(conv => {
      const contact = children.find(c => c.id === conv.contactId);
      return {
        ...conv,
        name: contact?.name || 'Desconocido',
        avatar: contact?.avatar || '👤'
      };
    });
    
    setConversations(conversationsWithInfo);
    const totalUnread = conversationsWithInfo.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    setUnreadCount(totalUnread);
  }
};

// Abrir chat con un contacto
const openChat = async (contact) => {
  setSelectedContact(contact);
  
  // Cargar mensajes
  const result = await MessagingService.getMessages(user.member_id, contact.id);
  if (result.success) {
    setChatMessages(result.data);
  }
  
  // Marcar como leído
  await MessagingService.markAsRead(user.member_id, contact.id);
  
  // Recargar conversaciones para actualizar contador
  loadConversations();
};

// Enviar mensaje
const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedContact) return;
  
  const familyId = await getFamilyId();
  if (!familyId) {
    console.error('No se pudo obtener family_id');
    return;
  }
  
  const result = await MessagingService.sendMessage(
    user.member_id,
    selectedContact.id,
    familyId,
    newMessage.trim()
  );
  
  if (result.success) {
    setChatMessages(prev => [...prev, result.data]);
    setNewMessage('');
  }
};

// ========== FUNCIONES DE SAFETY CHECK ==========

const loadSentChecks = async () => {
  if (!user?.member_id) return;
  
  const result = await SafetyCheckService.getSentChecks(user.member_id);
  if (result.success) {
    setSentChecks(result.data);
  }
};

const sendSafetyCheck = async (targetMember) => {
  const familyId = await getFamilyId();
  if (!familyId) {
    alert('Error: No se pudo obtener el ID de la familia');
    return;
  }
  
  const result = await SafetyCheckService.sendCheckRequest(
    user.member_id,
    targetMember.id,
    familyId
  );
  
  if (result.success) {
    console.log('✅ Check enviado a:', targetMember.name);
    loadSentChecks();
  } else {
    alert('Error enviando check: ' + result.error);
  }
};

const handleCheckPinSubmit = async () => {
  if (!pendingCheckRequest || checkPin.length !== 4) {
    setCheckPinError('PIN debe tener 4 dígitos');
    return;
  }
  
  // Validar PIN
  const validation = await SafetyCheckService.validatePin(user.member_id, checkPin);
  
  if (!validation.success || validation.type === 'invalid') {
    setCheckPinError('PIN incorrecto');
    setCheckPin('');
    return;
  }
  
  // Responder al check
  const result = await SafetyCheckService.respondToCheck(
    pendingCheckRequest.id,
    user.member_id,
    validation.type
  );
  
  if (result.success) {
    console.log('✅ Check respondido:', validation.type);
    setShowCheckPinModal(false);
    setPendingCheckRequest(null);
    setCheckPin('');
    setCheckPinError('');
  } else {
    setCheckPinError('Error respondiendo check');
  }
};  

// ========== FUNCIONES DE LOG DE ALERTAS ==========

const loadUserAlerts = async (userId) => {
  try {
    const alerts = [];
    
    // 1. Alertas de zona
    const { data: zoneEvents } = await supabase
      .from('zone_events')
      .select('*, safe_zones(name)')
      .eq('member_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (zoneEvents) {
      zoneEvents.forEach(event => {
        alerts.push({
          type: 'zone',
          action: event.event_type,
          zoneName: event.safe_zones?.name,
          timestamp: event.created_at,
          icon: event.event_type === 'entered' ? '🟢' : '🔴'
        });
      });
    }
    
    // 2. Alertas de batería
    const { data: batteryEvents } = await supabase
      .from('battery_alerts')
      .select('*')
      .eq('member_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (batteryEvents) {
      batteryEvents.forEach(event => {
        alerts.push({
          type: 'battery',
          batteryLevel: event.battery_level,
          timestamp: event.created_at,
          icon: '🔋'
        });
      });
    }
    
    // 3. Safety Checks
    const { data: checks } = await supabase
      .from('safety_checks')
      .select('*, requester:family_members!requester_id(first_name, last_name), target:family_members!target_id(first_name, last_name)')
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
      .order('requested_at', { ascending: false })
      .limit(50);
    
    if (checks) {
      checks.forEach(check => {
        if (check.emergency_type === 'explicit') {
          alerts.push({
            type: 'emergency_explicit',
            memberName: `${check.requester.first_name} ${check.requester.last_name}`,
            timestamp: check.responded_at,
            icon: '🚨'
          });
        } else if (check.emergency_type === 'silent') {
          alerts.push({
            type: 'emergency_silent',
            memberName: `${check.target.first_name} ${check.target.last_name}`,
            timestamp: check.responded_at,
            icon: '🚨'
          });
        } else if (check.target_id === userId) {
          alerts.push({
            type: 'check_received',
            memberName: `${check.requester.first_name} ${check.requester.last_name}`,
            status: check.status,
            timestamp: check.requested_at,
            icon: '🛡️'
          });
        }
      });
    }
    
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setUserAlerts(alerts);
  } catch (error) {
    console.error('Error cargando alertas de usuario:', error);
  }
};

const loadAllAlerts = async () => {
  try {
    const familyId = await getFamilyId();
    if (!familyId) {
      console.error('No se pudo obtener family_id');
      return;
    }
    
    const alerts = [];
    
    // 1. Alertas de zona
    const { data: zoneEvents } = await supabase
      .from('zone_events')
      .select('*, member:family_members(first_name, last_name, avatar), safe_zones(name)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (zoneEvents) {
      zoneEvents.forEach(event => {
        alerts.push({
          type: 'zone',
          memberName: `${event.member.first_name} ${event.member.last_name}`,
          avatar: event.member.avatar,
          action: event.event_type,
          zoneName: event.safe_zones?.name,
          timestamp: event.created_at,
          icon: event.event_type === 'entered' ? '🟢' : '🔴'
        });
      });
    }
    
    // 2. Alertas de batería
    const { data: batteryEvents } = await supabase
      .from('battery_alerts')
      .select('*, member:family_members(first_name, last_name, avatar)')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (batteryEvents) {
      batteryEvents.forEach(event => {
        alerts.push({
          type: 'battery',
          memberName: `${event.member.first_name} ${event.member.last_name}`,
          avatar: event.member.avatar,
          batteryLevel: event.battery_level,
          timestamp: event.created_at,
          icon: '🔋'
        });
      });
    }
    
    // 3. Emergencias
    const { data: emergencies } = await supabase
      .from('safety_checks')
      .select('*, requester:family_members!requester_id(first_name, last_name, avatar)')
      .eq('family_id', familyId)
      .not('emergency_type', 'is', null)
      .order('responded_at', { ascending: false })
      .limit(100);
    
    if (emergencies) {
      emergencies.forEach(emergency => {
        alerts.push({
          type: emergency.emergency_type === 'explicit' ? 'emergency_explicit' : 'emergency_silent',
          memberName: `${emergency.requester.first_name} ${emergency.requester.last_name}`,
          avatar: emergency.requester.avatar,
          timestamp: emergency.responded_at,
          icon: '🚨'
        });
      });
    }
    
    alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setAllAlerts(alerts);
  } catch (error) {
    console.error('Error cargando todas las alertas:', error);
  }
};
// ========== FUNCIÓN DE EMERGENCIA EXPLÍCITA ==========

const handleExplicitEmergency = async () => {
  if (!window.confirm('🚨 ¿Activar alerta de emergencia?\n\nTodos los miembros de tu familia serán notificados inmediatamente.')) {
    return;
  }
  
  const familyId = await getFamilyId();
  if (!familyId) {
    alert('❌ Error: No se pudo obtener el ID de la familia');
    return;
  }
  
  const result = await SafetyCheckService.activateEmergency(
    user.member_id,
    familyId
  );
  
  if (result.success) {
    alert('✅ Alerta de emergencia enviada a tu familia');
  } else {
    alert('❌ Error activando emergencia');
  }
};

  // Funcion para calcular edad
  const calculateAge = (birthDate) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Función para determinar el role basado en la edad
  const determineRole = (age) => {
    if (age === null) return 'adulto';
    if (age < 13) return 'niño';
    if (age < 18) return 'adolescente';
    if (age >= 65) return 'adulto_mayor';
    return 'adulto';
};

  // Función para asignar permisos automáticamente según parentesco
const getDefaultPermissions = (relationship, role) => {
  const basePermissions = ['view_own_location', 'send_messages'];
  
  if (['padre', 'madre'].includes(relationship)) {
    return ['view_all', 'manage_family', 'emergency_contact', 'manage_settings', 'invite_members'];
  }
  
  if (['abuelo', 'abuela'].includes(relationship)) {
    return [...basePermissions, 'view_family', 'emergency_contact'];
  }
  
  if (['tio', 'tia', 'hermano', 'hermana'].includes(relationship) && role === 'adulto') {
    return [...basePermissions, 'view_family', 'emergency_contact'];
  }
  
  if (['hijo', 'hija'].includes(relationship) && role === 'adulto') {
    return [...basePermissions, 'view_family'];
  }
  
  if (['hijo', 'hija'].includes(relationship)) {
    return basePermissions; // Solo básicos para menores
  }
  
  if (['cuidador'].includes(relationship)) {
    return [...basePermissions, 'view_family', 'emergency_contact'];
  }
  
  return basePermissions; // Default para otros (amigos, primos, etc.)
};

  // 3. FUNCIONES DE MANEJO (AQUÍ VA)
  const handleMemberInputChange = (field, value) => {
    setMemberFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para manejar el envío del formulario
const handleAddMemberSubmit = async (e) => {
  e.preventDefault();
  setFormError('');
  setFormLoading(true);

  try {
    // Validaciones básicas
    if (!memberFormData.first_name.trim() || !memberFormData.last_name.trim()) {
      throw new Error('Nombre y apellido son requeridos');
    }
    
    if (!memberFormData.email.trim()) {
      throw new Error('Email es requerido');
    }
    
    if (!memberFormData.relationship) {
      throw new Error('Parentesco es requerido');
    }
    
    if (!memberFormData.birth_date) {
      throw new Error('Fecha de nacimiento es requerida');
    }

    // Calcular edad, determinar role y asignar permisos
    const age = calculateAge(memberFormData.birth_date);
    const role = determineRole(age);
    const permissions = getDefaultPermissions(memberFormData.relationship, role);

    // Obtener el family_id del usuario actual
    const { data: currentUserData, error: userError } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', user.id)
      .single();

    if (userError || !currentUserData) {
      throw new Error('No se pudo obtener la información de la familia');
    }

    // Crear el nuevo miembro familiar
    const { data, error } = await supabase
      .from('family_members')
      .insert({
        first_name: memberFormData.first_name.trim(),
        last_name: memberFormData.last_name.trim(),
        email: memberFormData.email.trim(),
        relationship: memberFormData.relationship,
        phone: memberFormData.phone.trim() || null,
        birth_date: memberFormData.birth_date,
        role: role,
        family_id: currentUserData.family_id,
        status: 'pending', // Pendiente hasta que se registre
        permissions: permissions, // Permisos automáticos según parentesco
        settings: {
          gender: memberFormData.gender || null,
          notes: memberFormData.notes.trim() || null
        }
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('Miembro familiar creado:', data);
	
	    // Enviar invitación por email usando Supabase Auth
    try {
      // Generar contraseña temporal
      const tempPassword = Math.random().toString(36).slice(-12) + '!' + Math.floor(Math.random() * 100);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: memberFormData.email.trim(),
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/family-invitation`,
          data: {
            first_name: memberFormData.first_name.trim(),
            last_name: memberFormData.last_name.trim(),
            invited_by: user.user_metadata.first_name || user.email,
            temp_password: tempPassword,
            family_member_id: data.id
          }
        }
      });

      if (authError && !authError.message.includes('already been registered')) {
        console.error('Error sending invitation email:', authError);
        throw new Error('Miembro creado pero no se pudo enviar el email de invitación');
      }

      console.log('Email de invitación enviado:', authData);
      
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // No fallar todo el proceso por el email
    }
    
    // Mensaje de éxito
    setFormSuccess(`¡Invitación enviada a ${memberFormData.first_name} ${memberFormData.last_name}!`);
    
    // Limpiar formulario
    setMemberFormData({
      first_name: '',
      last_name: '',
      email: '',
      relationship: '',
      birth_date: '',
      phone: '',
      gender: '',
      notes: ''
    });

    // Regresar al dashboard después de 2 segundos
    setTimeout(() => {
      setCurrentScreen('dashboard');
      setFormSuccess('');
    }, 2000);

  } catch (error) {
    console.error('Error al agregar miembro:', error);
    setFormError(error.message || 'Error al enviar la invitación');
  } finally {
    setFormLoading(false);
  }
};



  const resetAddChildForm = () => {
    setNewChild({
      name: '',
      apellido: '', 
      birthDate: '',
      email: '',
      phone: '',
      gender: '',
      emergency_contact: '',
      notes: ''
    });
    setAddChildError('');
  };

  // Funcion de login real
  const handleLogin = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      setUser(data.user);
      setCurrentScreen('dashboard');
      await loadAppData(data.user);
    } catch (error) {
      alert(`Error de login: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

// Funcion de logout real - CORREGIDA
  const handleLogout = async () => {
    try {
      console.log('Cerrando sesion...');
      setLoading(true);
      
	  // Primero cambiar el screen ANTES del signOut
      setCurrentScreen('login');
	
      // Limpiar sesion de Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error en logout:', error);
        // Aun asi, limpiar estado local
      }
      
      // Limpiar estado local
      setUser(null);
      setChildren([]);
      setSafeZones([]);
      
      console.log('Logout exitoso - redirigiendo a login');
      
    } catch (error) {
      console.error('Error durante logout:', error);
      // Fallback: recargar pagina si falla el logout
      // window.location.reload();
	  setCurrentScreen('login'); // 鈫?AGREGA ESTA L脥NEA
    } finally {
      setLoading(false);
    }
  };

  const activeChild = children[selectedChild] || children[0];
  
// Parte 5 del FamilyTrackingApp.jsx - useEffect adicionales y funciones de mapas

useEffect(() => {
    let interval;
    if (isEmergencyActive) {
      interval = setInterval(() => {
        // Force re-render for timer
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEmergencyActive]);

useEffect(() => {
  // Limpiar referencias del mapa cuando NO estás en dashboard
  if (currentScreen !== 'dashboard') {
    mapInstanceRef.current = null;
    markersRef.current = {};
    return;
  }
  
  // Cargar mapa cuando ENTRAS al dashboard
  if (currentScreen === 'dashboard' && activeChild && activeChild.id) {
    // Solo si NO existe el mapa, crearlo
    if (!mapInstanceRef.current) {
      setTimeout(() => {
        console.log('🆕 Creando mapa por primera vez...');
        loadDashboardGoogleMap();
      }, 300);
    } else {
      // Si ya existe, solo actualizar marcadores
      console.log('♻️ Mapa ya existe, solo actualizando...');
      setTimeout(() => {
        loadDashboardGoogleMap(); // Esto actualizará marcadores sin recrear
      }, 100);
    }
  }
}, [selectedChild, activeChild?.id, currentScreen]); // ← Dependencias optimizadas

// ✨ AGREGAR AQUÍ EL NUEVO useEffect
// ✨ Observar cuando el mapa sea visible
useEffect(() => {
  if (currentScreen !== 'dashboard') return;

  const mapContainer = document.getElementById('dashboard-map');
  if (!mapContainer) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && mapInstanceRef.current && window.google) {
        console.log('🔄 Mapa visible, forzando resize...');
        setTimeout(() => {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          if (activeChild?.coordinates) {
            mapInstanceRef.current.setCenter({
              lat: activeChild.coordinates.lat,
              lng: activeChild.coordinates.lng
            });
            mapInstanceRef.current.setZoom(18);
          }
        }, 100);
      }
    });
  }, { threshold: 0.1 });

  observer.observe(mapContainer);

  return () => observer.disconnect();
}, [currentScreen, activeChild?.id]);


// ✨ NUEVO: Forzar resize del mapa cuando el layout cambia
useEffect(() => {
  if (currentScreen === 'dashboard' && mapInstanceRef.current && window.google) {
    // Esperar a que el layout se estabilice
    const timer = setTimeout(() => {
      window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
      
      if (activeChild?.coordinates) {
        mapInstanceRef.current.setCenter({
          lat: activeChild.coordinates.lat,
          lng: activeChild.coordinates.lng
        });
      }
      
      console.log('🗺️ Mapa resized y recentrado');
    }, 500);
    
    return () => clearTimeout(timer);
  }
}, [currentScreen, activeChild?.id]);

// ✨ Re-inicializar mapa cuando cambia entre mobile/desktop
useEffect(() => {
  const handleResize = () => {
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    console.log('📱 Breakpoint cambió. Desktop:', isDesktop);
    
    if (currentScreen === 'dashboard' && mapInstanceRef.current) {
      setTimeout(() => {
        console.log('🔄 Re-renderizando mapa...');
        if (window.google && mapInstanceRef.current) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
          if (activeChild?.coordinates) {
            mapInstanceRef.current.setCenter({
              lat: activeChild.coordinates.lat,
              lng: activeChild.coordinates.lng
            });
          }
        }
      }, 300);
    }
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [currentScreen, activeChild?.coordinates]);


// Realtime updates para ubicaciones
useEffect(() => {
  if (!user?.id) return;

  console.log('🔄 Activando Realtime para family');

  // Polling cada 30 segundos como backup
  const interval = setInterval(() => {
    console.log('⏰ Polling: recargando children');
    loadChildren();
  }, 30000);
  
  // Subscription de Realtime
  const subscription = supabase
    .channel('location-updates-web')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'user_locations' 
      }, 
      (payload) => {
        console.log('📍 Nueva ubicación detectada:', payload.new);
        // Recargar todos los children para actualizar ubicaciones
        loadChildren();
      }
    )
    .subscribe();
  
  return () => {
    console.log('🔌 Desconectando Realtime');
    clearInterval(interval);
    subscription.unsubscribe();
  };
}, [user?.id]);

// ❌ useEffect viejo ELIMINADO - Causaba alertas duplicadas
// Ahora usamos el nuevo useEffect (línea ~345) que detecta para TODOS los miembros

const loadDashboardGoogleMap = () => {
  const mapContainer = document.getElementById('dashboard-map');
  
  if (!mapContainer || !activeChild) {
    console.log('❌ Saliendo: mapContainer:', !!mapContainer, 'activeChild:', !!activeChild);
    return;
  }
  
  console.log('🗺️ Inicializando mapa - Zonas disponibles:', safeZones?.length || 0);
  
  if (window.google && window.google.maps) {
    console.log('🔵 Caso 1: Google ya cargado, llamando initializeDashboardMap');
    initializeDashboardMap(mapContainer);
    return;
  }
  if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDFgYBq7tKtG9LP2w2-1XhFwBUOndyF0rA&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('🗺️ Google Maps cargado - Zonas:', safeZones?.length || 0);
      console.log('🔵 Caso 2: Script cargado, llamando initializeDashboardMap');
      initializeDashboardMap(mapContainer);
    };
    document.head.appendChild(script);
  } else {
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkGoogleMaps);
        console.log('🗺️ Retry Google Maps - Zonas:', safeZones?.length || 0);
        console.log('🔵 Caso 3: Retry exitoso, llamando initializeDashboardMap');
        initializeDashboardMap(mapContainer);
      }
    }, 100);
  }
};

const initializeDashboardMap = (mapContainer) => {
  console.log('🎯 initializeDashboardMap llamado');  // ← Este log debe estar aquí
  console.log('🎯 mapContainer:', mapContainer);
  console.log('🎯 window.google:', !!window.google);
  console.log('🎯 activeChild:', activeChild);

  if (!window.google || !activeChild) return;

  console.log('🎯 Zonas disponibles:', safeZones?.length || 0);
  console.log('👥 Total miembros a mostrar:', children.length);

  const childLocation = {
    lat: activeChild.coordinates?.lat || 4.6951,
    lng: activeChild.coordinates?.lng || -74.0787
  };

  // Si el mapa ya existe
  if (mapInstanceRef.current) {
    // ✨ Limpiar todos los marcadores anteriores
    Object.values(markersRef.current).forEach(marker => {
      if (marker) marker.setMap(null);
    });
    markersRef.current = {};
    
    // ✨ Crear marcadores para TODOS los miembros
    children.forEach(child => {
      const location = {
        lat: child.coordinates?.lat || 4.6951,
        lng: child.coordinates?.lng || -74.0787
      };
      createMarker(child.id, location, mapInstanceRef.current, child);
    });
    
    // ✨ Centrar SOLO si shouldCenterMap es true
    if (shouldCenterMap) {
      console.log('🎯 Centrando mapa en:', activeChild.name);
      mapInstanceRef.current.setCenter(childLocation);
      mapInstanceRef.current.setZoom(18);
    } else {
      console.log('📍 Manteniendo vista actual');
    }
    
    // Limpiar zonas anteriores
    zoneCirclesRef.current.forEach(item => {
      if (item.circle) item.circle.setMap(null);
      if (item.marker) item.marker.setMap(null);
    });
    zoneCirclesRef.current = [];
    
    // Redibujar zonas con datos actuales
    drawSafeZones(mapInstanceRef.current);
    return;
  }

  // Crear mapa primera vez
  const map = new window.google.maps.Map(mapContainer, {
    zoom: 18,
    center: childLocation,
    mapTypeControl: true,
    streetViewControl: true,
    fullscreenControl: false,
    styles: [
      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
    ]
  });

  mapInstanceRef.current = map;
  
  // ✨ Listener: Detectar movimiento del mapa
  map.addListener('dragstart', () => {
    console.log('🖱️ Usuario movió el mapa');
    setShouldCenterMap(false);
  });
  
  // ✨ Crear marcadores para TODOS los miembros
  children.forEach(child => {
    const location = {
      lat: child.coordinates?.lat || 4.6951,
      lng: child.coordinates?.lng || -74.0787
    };
    createMarker(child.id, location, map, child);
  });
  
  drawSafeZones(map);
};

// ✨ Función para re-centrar el mapa
const recenterMap = () => {
  if (!mapInstanceRef.current || !activeChild) return;
  
  const childLocation = {
    lat: activeChild.coordinates?.lat || 4.6951,
    lng: activeChild.coordinates?.lng || -74.0787
  };
  
  console.log('🎯 Re-centrando en:', activeChild.name);
  mapInstanceRef.current.setCenter(childLocation);
  mapInstanceRef.current.setZoom(18);
  setShouldCenterMap(true);
};

// Nueva función para dibujar zonas
const drawSafeZones = (map) => {
  console.log('🎨 Dibujando zonas:', safeZones?.length || 0);
  
  if (!safeZones || safeZones.length === 0) {
    console.log('⚠️ No hay zonas para dibujar');
    return;
  }

  safeZones.forEach((zone) => {
    console.log('✏️ Dibujando zona:', zone.name);
    
    const circle = new window.google.maps.Circle({
      strokeColor: '#10b981',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.15,
      map: map,
      center: { lat: zone.coordinates.lat, lng: zone.coordinates.lng },
      radius: zone.radius || 200
    });

    const zoneMarker = new window.google.maps.Marker({
      position: { lat: zone.coordinates.lat, lng: zone.coordinates.lng },
      map: map,
      title: zone.name,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="35" height="35" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
            <circle cx="17.5" cy="17.5" r="15" fill="#10b981" stroke="#FFFFFF" stroke-width="3"/>
            <text x="17.5" y="23" text-anchor="middle" fill="white" font-size="14">🛡️</text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(35, 35),
        anchor: new window.google.maps.Point(17.5, 17.5)
      }
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 10px; font-family: system-ui;">
          <h4 style="margin: 0 0 6px 0; color: #10b981;">🛡️${zone.name}</h4>
          <p style="margin: 0; color: #6b7280; font-size: 13px;">
            Radio: ${zone.radius || 200}m
          </p>
        </div>
      `
    });

    zoneMarker.addListener('click', () => infoWindow.open(map, zoneMarker));
    
    zoneCirclesRef.current.push({ circle, marker: zoneMarker });
  });
};


// Nueva función para crear marcador
const createMarker = (memberId, location, map, childData = null) => {
  // ✨ Usar childData si se pasa, sino usar activeChild
  const child = childData || activeChild;
  const isLowBattery = child?.battery <= 20;
  const isSelected = child?.id === activeChild?.id;

  const marker = new window.google.maps.Marker({
    position: location,
    map: map,
    title: child.name,
    icon: {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="25" r="20" fill="${isLowBattery ? '#ef4444' : (isSelected ? '#3B82F6' : '#6b7280')}" stroke="#FFFFFF" stroke-width="${isSelected ? '4' : '3'}"/>
          <text x="25" y="32" text-anchor="middle" fill="white" font-size="18" font-family="Arial, sans-serif">
            ${child.avatar || '👤'}
          </text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(50, 50),
      anchor: new window.google.maps.Point(25, 25)
    }
  });

  const infoWindow = new window.google.maps.InfoWindow({
    content: `
      <div style="padding: 12px; min-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 24px; margin-right: 8px;">${child.avatar || '👤'}</span>
          <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
            ${child.name}
          </h3>
        </div>
        <div style="space-y: 4px;">
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
            <span style="margin-right: 6px;">📍</span>
            ${child.location || 'Ubicacion no disponible'}
          </p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
            <span style="margin-right: 6px;">🔋</span>
            Bateria: ${child.battery || 0}%
          </p>
          <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
            <span style="margin-right: 6px;">🕒</span>
            ${child.lastUpdate || 'Hace un momento'}
          </p>
        </div>
        <div style="margin-top: 10px; padding: 6px 12px; background: ${child.isConnected ? '#10b981' : '#ef4444'}; 
                    color: white; border-radius: 16px; font-size: 12px; text-align: center; font-weight: 500;">
          ${child.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
      </div>
    `
  });

  marker.addListener('click', () => {
    infoWindow.open(map, marker);
  });

  markersRef.current[memberId] = marker;
};

// Nueva función para actualizar solo la posición
const updateMarkerPosition = (memberId, newLocation) => {
  const marker = markersRef.current[memberId];
  if (marker) {
    marker.setPosition(newLocation);
    // Centrar mapa suavemente en la nueva ubicación
    mapInstanceRef.current.panTo(newLocation);
  }
};
  
// Parte 6 del FamilyTrackingApp.jsx - Funciones de interaccion (mensajes, emergencias, etc.)

const handleCheckMessages = () => {
    setCheckStatus('sending');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCheckRequestTime(time);
    
    setTimeout(() => {
      setCheckStatus('waiting');
      setTimeout(() => {
        setShowPasswordModal(true);
      }, 2000);
    }, 1000);
  };

  const handlePasswordSubmit = () => {
    const validPasswords = ['1234', 'emma', 'jake'];
    
    if (validPasswords.includes(passwordCheck.toLowerCase())) {
      setCheckStatus('success');
      setShowPasswordModal(false);
      setPasswordCheck('');
      setPasswordError('');
      
      setTimeout(() => {
        setCheckStatus('idle');
      }, 5000);
    } else {
      setPasswordError('Senha incorreta. Tente novamente.');
      setPasswordCheck('');
    }
  };

  const sendMessage = () => {
    if (newMessage.trim()) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const messageData = {
        id: Date.now(),
        sender: 'parent',
        message: newMessage,
        timestamp: time,
        verified: true
      };
      
      children[selectedChild].messages.push(messageData);
      setNewMessage('');
      
      setTimeout(() => {
        const responses = ['Tudo bem!', 'Entendi, obrigado!', 'Ok! ñ憤'];
        const childResponse = {
          id: Date.now() + 1,
          sender: 'child',
          message: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          verified: true
        };
        children[selectedChild].messages.push(childResponse);
      }, 2500);
    }
  };

  const handleEmergencyPress = () => {
    setShowEmergencyConfirmation(true);
  };

  const confirmEmergency = (type) => {
    setIsEmergencyActive(true);
    setAlertStartTime(new Date());
    setEmergencyType(type);
    setShowEmergencyConfirmation(false);
  };

  const cancelEmergency = () => {
    setIsEmergencyActive(false);
    setAlertStartTime(null);
    setEmergencyType('');
    setShowEmergencyConfirmation(false);
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString();
  };

  const getTimeDifference = () => {
    if (!alertStartTime) return '';
    const now = new Date();
    const diff = Math.floor((now - alertStartTime) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleLowBatteryAlert = async () => {
  if (!window.confirm('¿Notificar a tu familia que tu batería está baja?')) {
    return;
  }
  
  try {
    // Guardar alerta de batería baja en la BD
    const { error } = await supabase
      .from('user_locations')
      .update({ 
        battery_level: 10,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    if (!error) {
      alert('✅ Familia notificada: Tu batería está baja');
      await loadChildren();
    }
  } catch (error) {
    console.error('Error notificando batería baja:', error);
    alert('Error enviando alerta');
  }
};
  
// Parte 7 del FamilyTrackingApp.jsx - Renders condicionales (Login, Loading, Add Child)

// 1. Pantalla de login

  // 2. Loading screen
  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-gray-700">Carregando FamilyWatch...</p>
          <p className="text-xs text-gray-400 mt-2">Bem-vindo, {user?.user_metadata?.first_name || user?.email}</p>
        </div>
      </div>
    );
  }

// 3. Pantalla de agregar miembro familiar
  if (currentScreen === 'addchild') {
  console.log('Children count:', children.length);
  console.log('Children:', children);
  console.log('Current screen:', currentScreen);
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
        <div className="flex items-center space-x-3 mb-4">
          <button 
            onClick={() => setCurrentScreen('dashboard')}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Agregar Miembro Familiar</h1>
        </div>
      </div>

      <div className="p-6">
        {/* Mensaje de éxito */}
        {formSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <p className="text-green-800 font-medium">{formSuccess}</p>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">Proceso de invitacion:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Se enviara un email de invitacion al miembro</li>
            <li>2. Recibira una contrasena temporal para crear su cuenta</li>
            <li>3. Podra cambiar su contrasena en el primer acceso</li>
            <li>4. Una vez registrado aparecera en tu panel familiar</li>
          </ul>
        </div>

        <form onSubmit={handleAddMemberSubmit} className="space-y-4">
          {/* Nombres separados */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={memberFormData.first_name}
                onChange={(e) => handleMemberInputChange('first_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido *
              </label>
              <input
                type="text"
                value={memberFormData.last_name}
                onChange={(e) => handleMemberInputChange('last_name', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Apellido"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correo Electronico *
            </label>
            <input
              type="email"
              value={memberFormData.email}
              onChange={(e) => handleMemberInputChange('email', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="email@ejemplo.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Se enviara la invitacion a este correo
            </p>
          </div>

          {/* Parentesco */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Parentesco *
            </label>
            <select
              value={memberFormData.relationship}
              onChange={(e) => handleMemberInputChange('relationship', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Selecciona el parentesco</option>
              <option value="padre">Padre</option>
              <option value="madre">Madre</option>
              <option value="hijo">Hijo</option>
              <option value="hija">Hija</option>
              <option value="abuelo">Abuelo</option>
              <option value="abuela">Abuela</option>
              <option value="tio">Tio</option>
              <option value="tia">Tia</option>
              <option value="hermano">Hermano</option>
              <option value="hermana">Hermana</option>
              <option value="primo">Primo</option>
              <option value="prima">Prima</option>
              <option value="sobrino">Sobrino</option>
              <option value="sobrina">Sobrina</option>
              <option value="amigo">Amigo de la familia</option>
              <option value="cuidador">Cuidador/Ninera</option>
              <option value="otro">Otro</option>
            </select>
            {memberFormData.relationship && (
              <p className="text-xs text-blue-600 mt-1">
                Permisos que se asignaran: {getDefaultPermissions(memberFormData.relationship, determineRole(calculateAge(memberFormData.birth_date))).join(', ')}
              </p>
            )}
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Nacimiento *
            </label>
            <input
              type="date"
              value={memberFormData.birth_date}
              onChange={(e) => handleMemberInputChange('birth_date', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              max="2030-12-31"
              min="1900-01-01"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Edad calculada: {memberFormData.birth_date ? calculateAge(memberFormData.birth_date) + ' años' : 'Selecciona fecha'}
            </p>
          </div>

          {/* Telefono (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefono (Opcional)
            </label>
            <input
              type="tel"
              value={memberFormData.phone}
              onChange={(e) => handleMemberInputChange('phone', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+57 300 123 4567"
            />
            <p className="text-xs text-gray-500 mt-1">
              Para notificaciones de emergencia por SMS
            </p>
          </div>

          {/* Genero (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Genero (Opcional)
            </label>
            <select 
              value={memberFormData.gender}
              onChange={(e) => handleMemberInputChange('gender', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona (opcional)</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
              <option value="prefiero_no_decir">Prefiero no decir</option>
            </select>
          </div>

          {/* Notas adicionales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas Adicionales (Opcional)
            </label>
            <textarea
              value={memberFormData.notes}
              onChange={(e) => handleMemberInputChange('notes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Informacion adicional, alergias, condiciones medicas, etc."
            />
          </div>

          {/* Mensaje de error */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {formError}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setCurrentScreen('dashboard')}
              className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
              disabled={formLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formLoading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {formLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </span>
              ) : (
                'Enviar Invitacion'
              )}
            </button>
          </div>
        </form>

        {/* Información adicional */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Como funciona?</h4>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>1.</strong> El miembro recibira un email con un enlace de registro</p>
            <p><strong>2.</strong> Creara su cuenta con una contrasena personal</p>
            <p><strong>3.</strong> Una vez registrado aparecera en tu panel familiar</p>
            <p><strong>4.</strong> Podras ver su ubicacion y comunicarte con el</p>
          </div>
        </div>
      </div>
    </div>
  );
} 


  
// Parte 8 del FamilyTrackingApp.jsx - Pantallas de emergencia, zonas seguras y mensajeria

// Pantalla de confirmacion de emergencia
  if (showEmergencyConfirmation) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={() => setShowEmergencyConfirmation(false)} className="p-2 hover:bg-red-500 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Confirm Emergency</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-8">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">What type of emergency?</h2>
            <p className="text-gray-600">All family members will be notified immediately</p>
          </div>

          <div className="space-y-4 mb-8">
            <button onClick={() => confirmEmergency('Medical Emergency')} className="w-full p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors">
              Medical Emergency
            </button>
            <button onClick={() => confirmEmergency('Safety Emergency')} className="w-full p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors">
              Safety Emergency
            </button>
            <button onClick={() => confirmEmergency('General Emergency')} className="w-full p-4 bg-red-400 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors">
              General Emergency
            </button>
          </div>

          <button onClick={() => setShowEmergencyConfirmation(false)} className="w-full p-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Safe Zones screen
  if (currentScreen === 'safezones') {
	  console.log('🟢 Renderizando SafeZonesManager');
      return <SafeZonesManager onBack={() => setCurrentScreen('dashboard')} />;
  }

  // Emergency screen
  if (currentScreen === 'emergency') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {isEmergencyActive && (
          <div className="bg-red-600 text-white p-4 animate-pulse">
            <div className="text-center">
              <h2 className="text-lg font-bold">EMERGENCY ACTIVE</h2>
              <p className="text-sm opacity-90">{emergencyType}</p>
              <p className="text-sm opacity-90">Started at: {formatTime(alertStartTime)}</p>
              <p className="text-sm opacity-90">Duration: {getTimeDifference()}</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={() => setCurrentScreen('dashboard')} className="p-2 hover:bg-red-500 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Emergency Alert</h1>
          </div>
        </div>

        <div className="p-6">
          {!isEmergencyActive ? (
            <>
              <div className="text-center mb-8">
                <button onClick={handleEmergencyPress} className="relative w-48 h-48 mx-auto bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg animate-pulse transform hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-4 border-4 border-white rounded-full opacity-50"></div>
                  <div className="flex flex-col items-center justify-center h-full">
                    <AlertTriangle className="h-12 w-12 mb-2" />
                    <span className="text-xl font-bold">EMERGENCY</span>
                    <span className="text-sm">PRESS HERE</span>
                  </div>
                </button>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-3">Family Members ({familyMembers.length})</h3>
                <div className="space-y-2">
                  {familyMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div>
                        <span className="font-medium text-gray-800">{member.name}</span>
                        <p className="text-sm text-gray-600">{member.phone}</p>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-8">
                <AlertTriangle className="h-24 w-24 text-red-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold text-red-600 mb-2">EMERGENCY ACTIVATED</h2>
                <p className="text-lg text-gray-700 mb-2">{emergencyType}</p>
                <p className="text-gray-600">All family members have been notified</p>
              </div>
              <button onClick={cancelEmergency} className="w-full py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors">
                Cancel Emergency Alert
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }


  // Messaging screen
  if (currentScreen === 'messaging') {
    // Si hay un contacto seleccionado, mostrar chat
    if (selectedContact) {
      return (
        <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSelectedContact(null)}
                className="p-2 hover:bg-blue-500 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{selectedContact.avatar}</div>
                <div>
                  <h1 className="text-lg font-bold">{selectedContact.name}</h1>
                  <p className="text-xs opacity-90">Online</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {chatMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender_id === user.member_id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender_id === user.member_id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-900 border'
                }`}>
                  <p className="text-sm">{msg.message_text}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_id === user.member_id ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de mensaje */}
          <div className="p-4 bg-white border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Lista de conversaciones
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 hover:bg-blue-500 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">💬 Mensajes Familiares</h1>
          </div>
        </div>

        {/* 🔴 PON EL BOTÓN DEBUG AQUÍ 
        <div className="m-4 p-4 bg-red-500 text-white text-xs">
          <p><strong>User ID:</strong> {user?.id}</p>
          <p><strong>Children:</strong></p>
          {children.map((c, i) => (
            <p key={i}>- {c.name}: {c.id}</p>
          ))}
        </div> */}

        <div className="divide-y">
          {children.filter(c => c.id !== user?.member_id).map((contact) => {
            const conversation = conversations.find(conv => conv.contactId === contact.id);
            
            return (
              <div
                key={contact.id}
                onClick={() => openChat(contact)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-4xl">{contact.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                      {conversation && (
                        <span className="text-xs text-gray-500">
                          {new Date(conversation.lastMessageTime).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation?.lastMessage || 'Sin mensajes'}
                    </p>
                  </div>
                  {conversation?.unreadCount > 0 && (
                    <div className="bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ========== PANTALLA: SAFETY CHECK ==========
  if (currentScreen === 'safetycheck') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 hover:bg-purple-500 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">🛡️ Check de Seguridad</h1>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-white border-b">
          <button
            onClick={() => setActiveTabSafety('send')}
            className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeTabSafety === 'send'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Enviar Check
          </button>
          <button
            onClick={() => setActiveTabSafety('history')}
            className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeTabSafety === 'history'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Historial
          </button>
        </div>

        <div className="p-4">
          {activeTabSafety === 'send' ? (
            // TAB: ENVIAR CHECK
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-purple-800 mb-2">¿Cómo funciona?</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• Selecciona un miembro para solicitar confirmación</li>
                  <li>• PIN normal = Todo bien ✅</li>
                  <li>• PIN invertido = Emergencia silenciosa 🚨</li>
                </ul>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecciona un miembro:</h3>
              
              <div className="space-y-3">
                {children.filter(c => c.id !== user?.member_id).map((member) => {
                  const lastCheck = sentChecks.find(check => check.target_id === member.id);
                  
                  return (
                    <div
                      key={member.id}
                      onClick={() => sendSafetyCheck(member)}
                      className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-4xl">{member.avatar}</div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{member.name}</h4>
                          {lastCheck && (
                            <p className="text-sm text-gray-600">
                              {lastCheck.status === 'pending' ? (
                                <span className="text-orange-600">⏳ Pendiente - {new Date(lastCheck.requested_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span className="text-green-600">✅ OK - {new Date(lastCheck.responded_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // TAB: HISTORIAL
            <>
              {sentChecks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-500">No hay checks enviados aún</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de checks enviados:</h3>
                  <div className="space-y-2">
                    {sentChecks.map((check) => {
                      const targetMember = children.find(c => c.id === check.target_id);
                      
                      return (
                        <div key={check.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{targetMember?.avatar}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{targetMember?.name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(check.requested_at).toLocaleString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div>
                            {check.status === 'pending' ? (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">⏳ Pendiente</span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Confirmado</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ========== PANTALLA: LOG DE ALERTAS ==========
  if (currentScreen === 'alerts') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-yellow-500 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 hover:bg-yellow-600 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">📋 Log de Alertas</h1>
          </div>
        </div>

        {/* TABS */}
        <div className="flex bg-white border-b">
          <button
            onClick={() => setAlertsTab('user')}
            className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${
              alertsTab === 'user'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Por Usuario
          </button>
          <button
            onClick={() => {
              setAlertsTab('all');
              loadAllAlerts();
            }}
            className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${
              alertsTab === 'all'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas las Alertas
          </button>
        </div>

        <div className="p-4">
          {alertsTab === 'user' ? (
            // TAB: POR USUARIO
            <>
              {!selectedAlertUser ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecciona un miembro:</h3>
                  <div className="space-y-3">
                    {children.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setSelectedAlertUser(member);
                          loadUserAlerts(member.id);
                        }}
                        className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 cursor-pointer transition-all"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="text-4xl">{member.avatar}</div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{member.name}</h4>
                          </div>
                        </div>
                        <span className="text-gray-400">→</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Header del usuario seleccionado */}
                  <div
                    onClick={() => setSelectedAlertUser(null)}
                    className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg mb-4 cursor-pointer hover:bg-yellow-100"
                  >
                    <span className="text-3xl">{selectedAlertUser.avatar}</span>
                    <span className="text-lg font-semibold flex-1">{selectedAlertUser.name}</span>
                    <span className="text-gray-500">✕</span>
                  </div>

                  {userAlerts.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">📋</div>
                      <p className="text-gray-500">No hay alertas para este usuario</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userAlerts.map((alert, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <span className="text-2xl">{alert.icon}</span>
                          <div className="flex-1">
                            {alert.type === 'zone' && (
                              <p className="text-sm text-gray-700">
                                {alert.action === 'entered' ? 'Entró a' : 'Salió de'} <span className="font-semibold">{alert.zoneName}</span>
                              </p>
                            )}
                            {alert.type === 'battery' && (
                              <p className="text-sm text-gray-700">
                                Batería baja: <span className="font-semibold">{alert.batteryLevel}%</span>
                              </p>
                            )}
                            {alert.type === 'emergency_explicit' && (
                              <p className="text-sm text-gray-700">
                                Activó <span className="font-semibold">emergencia</span>
                              </p>
                            )}
                            {alert.type === 'emergency_silent' && (
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">Emergencia silenciosa</span> (PIN inverso)
                              </p>
                            )}
                            {alert.type === 'check_received' && (
                              <p className="text-sm text-gray-700">
                                Check de <span className="font-semibold">{alert.memberName}</span> - {alert.status === 'pending' ? '⏳ Pendiente' : '✅ Confirmado'}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.timestamp).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            // TAB: TODAS LAS ALERTAS
            <>
              {allAlerts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-500">No hay alertas registradas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {allAlerts.map((alert, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">{alert.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {alert.avatar} {alert.memberName}
                        </p>
                        {alert.type === 'zone' && (
                          <p className="text-sm text-gray-700">
                            {alert.action === 'entered' ? 'Entró a' : 'Salió de'} <span className="font-semibold">{alert.zoneName}</span>
                          </p>
                        )}
                        {alert.type === 'battery' && (
                          <p className="text-sm text-gray-700">
                            Batería baja: <span className="font-semibold">{alert.batteryLevel}%</span>
                          </p>
                        )}
                        {alert.type === 'emergency_explicit' && (
                          <p className="text-sm text-gray-700">
                            Activó <span className="font-semibold">emergencia</span>
                          </p>
                        )}
                        {alert.type === 'emergency_silent' && (
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">Emergencia silenciosa</span> (PIN inverso)
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

// Parte 9 y 10 del FamilyTrackingApp.jsx - Dashboard principal
// Dashboard principal

// 2. Loading screen
if (loading) {
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg font-semibold text-gray-700">Carregando FamilyWatch...</p>
        <p className="text-xs text-gray-400 mt-2">Bem-vindo, {user?.user_metadata?.first_name || user?.email}</p>
      </div>
    </div>
  );
}

// Dashboard principal
return (
  <>
    {console.log('🔍 DEBUG User:', { 
      id: user?.id, 
      member_id: user?.member_id,
      email: user?.email 
    })}

    {/* Alertas flotantes */}
    {zoneAlerts.length > 0 && (
      <div className="fixed top-16 left-4 z-50 max-w-sm space-y-2">
        {zoneAlerts.map(alert => (
          <div 
            key={alert.id}
            className={`flex items-center p-3 rounded-lg border-l-4 bg-white shadow-lg ${
              alert.eventType === 'entered' 
                ? 'bg-green-100 border-green-500' 
                : 'bg-red-100 border-red-500'
            }`}
          >
            <span className="text-2xl mr-3">{alert.type === 'entered' ? '✅' : '⚠️'}</span>
            <div className="flex-1">
              <p className="text-sm text-gray-800">
                <span className="font-bold">{alert.memberName}</span>
                {alert.type === 'entered' ? ' entró a ' : ' salió de '}
                <span className="font-semibold text-blue-600">{alert.zoneName}</span>
              </p>
              <p className="text-xs text-gray-500">
                {alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Hace un momento'}
              </p>
            </div>
            <button onClick={() => setZoneAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
          </div>
        ))}
      </div>
    )}

    {batteryAlerts.length > 0 && (
      <div className="fixed top-16 left-4 z-50 max-w-sm space-y-2">
        {batteryAlerts.map(alert => (
          <div key={alert.id} className="flex items-center p-3 rounded-lg border-l-4 bg-white shadow-lg border-red-500">
            <span className="text-2xl mr-3">⚠️</span>
            <div className="flex-1">
              <p className="text-sm text-gray-800">
                <span className="font-bold">{alert.memberName}</span> tiene batería baja: 
                <span className="font-semibold text-red-600">{alert.batteryLevel}%</span>
              </p>
              <p className="text-xs text-gray-500">{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Hace un momento'}</p>
            </div>
            <button onClick={() => setBatteryAlerts(prev => prev.filter(a => a.id !== alert.id))} className="text-gray-400 hover:text-gray-600 ml-2">✕</button>
          </div>
        ))}
      </div>
    )}

    {silentEmergencies.length > 0 && (
      <div className="fixed top-32 right-4 z-50 max-w-sm space-y-2">
        {silentEmergencies.map(emergency => {
          const targetMember = children.find(c => c.id === emergency.target_id);
          return (
            <div key={emergency.id} className="flex items-center p-3 rounded-lg bg-red-700 text-white shadow-lg animate-pulse">
              <span className="text-2xl mr-3">🚨</span>
              <div className="flex-1">
                <p className="text-sm font-bold">ALERTA: {targetMember?.name || 'Miembro'} necesita ayuda</p>
                <p className="text-xs opacity-90">Respondió con PIN de emergencia</p>
              </div>
              <button onClick={() => setSilentEmergencies(prev => prev.filter(e => e.id !== emergency.id))} className="text-white hover:text-red-200 ml-2">✕</button>
            </div>
          );
        })}
      </div>
    )}

    {explicitEmergencies.length > 0 && (
      <div className="fixed top-48 left-4 z-50 max-w-sm space-y-2">
        {explicitEmergencies.map(emergency => {
          const member = children.find(c => c.id === emergency.requester_id);
          return (
            <div key={emergency.id} className="flex items-center p-3 rounded-lg bg-red-800 text-white shadow-lg animate-pulse">
              <span className="text-2xl mr-3">🚨</span>
              <div className="flex-1">
                <p className="text-sm font-bold">¡{member?.name || 'Un miembro'} activó EMERGENCIA!</p>
              </div>
              <button onClick={() => setExplicitEmergencies(prev => prev.filter(e => e.id !== emergency.id))} className="text-white hover:text-red-200 ml-2">✕</button>
            </div>
          );
        })}
      </div>
    )}

    {children.length <= 1 ? (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-xl shadow-lg border p-8 text-center max-w-md">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no hay otros miembros</h3>
          <p className="text-gray-600 mb-6">Invita a tu familia para comenzar a usar FamilyWatch</p>
          <button onClick={() => setCurrentScreen('addchild')} className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium">
            <Users className="h-5 w-5" />
            <span>Invitar miembro familiar</span>
          </button>
        </div>
      </div>
    ) : (
      <DashboardLayout
        selectedMember={selectedChild}
        onMemberSelect={(index) => {
          setSelectedChild(index);
        }}
        members={children}
        memberStatus={{
          isConnected: activeChild?.isConnected,
          text: `${activeChild?.battery === null ? 'N/D' : activeChild.battery + '%'} • ${activeChild?.lastUpdate || 'Hace un momento'}`
        }}
        renderMap={() => (
          <div className="w-full h-full relative">
            {/* Barra superior con ubicación y botón centrar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-2 shadow-md">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">{activeChild?.location || 'Cargando...'}</span>
              </div>
              <button
                onClick={recenterMap}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs"
              >
                <MapPin className="h-3 w-3" />
                <span>Centrar</span>
              </button>
            </div>
            
            {/* Zona segura arriba derecha */}
            {activeChild?.safeZone && activeChild.safeZone !== "Verificando zona..." && (
              <div className="absolute top-16 right-3 z-10 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-semibold">{activeChild.safeZone}</span>
                </div>
              </div>
            )}
            
            <div id="dashboard-map" className="absolute inset-0" />
          </div>
        )}
        renderMemberInfo={() => (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <Battery className={`h-5 w-5 ${activeChild?.battery === null ? 'text-gray-400' : activeChild?.battery > 20 ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <p className="text-xs text-gray-500">Batería</p>
                <p className="font-semibold text-sm">{activeChild?.battery === null ? 'N/D' : `${activeChild.battery}%`}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${activeChild?.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                <p className={`font-semibold text-sm ${activeChild?.isConnected ? 'text-green-600' : 'text-red-600'}`}>{activeChild?.isConnected ? 'Online' : 'Offline'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Zona</p>
                <p className="font-semibold text-sm text-green-600">{activeChild?.safeZone && activeChild.safeZone !== "Verificando zona..." ? activeChild.safeZone : 'N/D'}</p>
              </div>
            </div>
          </div>
        )}
        renderActions={() => (
          <>
            {isIOSDevice && (
              <button onClick={handleLowBatteryAlert} className="w-full flex items-center space-x-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors">
                <Battery className="h-5 w-5" />
                <span className="font-medium">Mi batería está baja</span>
              </button>
            )}
            
            <button onClick={() => setCurrentScreen('messaging')} className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Enviar Mensaje</span>
              {unreadCount > 0 && <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{unreadCount}</span>}
            </button>

            <button onClick={() => { setCurrentScreen('safetycheck'); loadSentChecks(); }} className="w-full flex items-center space-x-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Check de Seguridad</span>
            </button>

            <button onClick={handleExplicitEmergency} className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors animate-pulse">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Emergencia</span>
            </button>

            <button onClick={() => setCurrentScreen('alerts')} className="w-full flex items-center space-x-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              <span className="font-medium">📋 Log de Alertas</span>
            </button>

            <button onClick={() => setCurrentScreen('safezones')} className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Gestionar Zonas Seguras</span>
            </button>
            
            <button onClick={() => setCurrentScreen('addchild')} className="w-full flex items-center space-x-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border-2 border-indigo-200">
              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">+</div>
              <span className="font-medium">Agregar Nuevo Miembro</span>
            </button>

            <div className="hidden md:block pt-3 mt-3 border-t">
              <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Cambiar Usuario</span>
              </button>
            </div>
          </>
        )}
      />
    )}
    
    {/* Modal de Safety Check PIN */}
    {showCheckPinModal && pendingCheckRequest && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🛡️ Check de Seguridad</h3>
            <p className="text-sm text-gray-600">
              <span className="font-bold text-purple-600">
                {children.find(c => c.id === pendingCheckRequest.requester_id)?.name || 'Un miembro'}
              </span>
              {' '}solicita confirmación de seguridad
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-purple-800 text-center">
              <strong>PIN normal:</strong> Todo bien ✅<br />
              <strong>PIN invertido:</strong> Necesito ayuda 🚨
            </p>
          </div>

          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={checkPin}
              onChange={(e) => setCheckPin(e.target.value.replace(/\D/g, ''))}
              onKeyPress={(e) => e.key === 'Enter' && handleCheckPinSubmit()}
              placeholder="PIN (4 dígitos)"
              className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg text-center text-xl tracking-wide placeholder:text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
            
            {checkPinError && (
              <p className="text-red-600 text-sm mt-2 text-center">{checkPinError}</p>
            )}

            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowCheckPinModal(false);
                  setPendingCheckRequest(null);
                  setCheckPin('');
                  setCheckPinError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleCheckPinSubmit}
                disabled={checkPin.length !== 4}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              💡 PIN de prueba: 1234 (normal) / 4321 (emergencia)
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Modal de verificación de contraseña */}
    {showPasswordModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Verificao de Seguranca</h3>
            <p className="text-sm text-gray-600 mt-1">
              {activeChild?.name} está respondendo. Digite a senha familiar:
            </p>
          </div>
          <div>
            <input
              type="password"
              value={passwordCheck}
              onChange={(e) => setPasswordCheck(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Digite a senha"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-600 text-sm mt-2 text-center">{passwordError}</p>
            )}
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordCheck('');
                  setPasswordError('');
                  setCheckStatus('idle');
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Verificar
              </button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              Senhas de teste: 1234, emma, jake
            </p>
          </div>
        </div>
      </div>
    )}
  </>
);

};

export default FamilyTrackingApp;
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

  // Auto-scroll al final cuando llegan mensajes nuevos
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const [newMessage, setNewMessage] = useState('');

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
  if (!user?.user_metadata?.family_id) return;

  console.log('🔔 Iniciando listener de eventos de zona...');

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
        if (member?.family_id === user.user_metadata.family_id) {
          const memberName = `${member.first_name} ${member.last_name}`;
          const zoneName = payload.new.metadata?.zone_name || 'zona desconocida';
          const eventType = payload.new.event_type;
          
          console.log(`✅ Evento de familia: ${memberName} ${eventType} ${zoneName}`);
          
          // Agregar alerta al banner (con protección anti-duplicados)
          addZoneAlert({
            id: Date.now(),
            type: eventType,
            memberName: memberName,
            zoneName: zoneName,
            timestamp: new Date()
          });
        }
      }
    )
    .subscribe();

  // AGREGAR este segundo listener de batería
  // Listener de batería baja
  console.log('🔋 Iniciando listener de alertas de batería...');
  
  const batteryAlertsSubscription = supabase
    .channel('battery-alerts-realtime')
    .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'battery_alerts'
      },
      async (payload) => {
        console.log('🔋 Nueva alerta de batería recibida:', payload);
        
        const { data: member } = await supabase
          .from('family_members')
          .select('first_name, last_name, family_id')
          .eq('id', payload.new.member_id)
          .single();
        
        console.log('🔋 Miembro encontrado:', member);
        console.log('🔋 Family ID del miembro:', member?.family_id);
        console.log('🔋 Family ID del usuario:', user.user_metadata.family_id);
        
        if (member?.family_id === user.user_metadata.family_id) {
          const memberName = `${member.first_name} ${member.last_name}`;
          
          console.log('✅ Agregando alerta de batería para:', memberName);
          
          setBatteryAlerts(prev => [{
            id: Date.now(),
            memberName: memberName,
            batteryLevel: payload.new.battery_level,
            timestamp: new Date()
          }, ...prev].slice(0, 5));
        } else {
          console.log('⚠️ Alerta de batería ignorada - diferente familia');
        }
      }
    )
    .subscribe();

  return () => {
    console.log('🔕 Cerrando listener de eventos de zona');
    zoneEventsSubscription.unsubscribe();
    batteryAlertsSubscription.unsubscribe();
  };
}, [user?.user_metadata?.family_id]);

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

const loadAppData = async (userData) => {
  try {
    setLoading(true);
    // await loadSafeZones(); // YA NO ES NECESARIO AQUÍ
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
          age: null,
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
      
      // ✨ Seleccionar usuario logueado por defecto
      const loggedUserIndex = formattedMembers.findIndex(m => 
        m.id === userData?.id || m.name.includes(userData?.user_metadata?.first_name)
      );
      
      if (loggedUserIndex !== -1) {
        console.log('👤 Usuario logueado encontrado en índice:', loggedUserIndex);
        setSelectedChild(loggedUserIndex);
      }
      
    } catch (error) {
      console.error('Error cargando miembros familiares:', error);
      setChildren([]);
    }
  };
  
  /*
  const handleZoneChanges = (zoneDetection) => {
    const alerts = [];
    
    // Alertas de entrada
    zoneDetection.entered?.forEach(zone => {
      alerts.push({
        id: Date.now() + Math.random(),
        type: 'entered',
        zone: zone,
        member: activeChild?.name || 'Miembro',
        timestamp: new Date(),
        message: `${activeChild?.name || 'Miembro'} entró a ${zone.name}`
      });
    });
    
    // Alertas de salida
    zoneDetection.exited?.forEach(zone => {
      alerts.push({
        id: Date.now() + Math.random(),
        type: 'exited',
        zone: zone,
        member: activeChild?.name || 'Miembro',
        timestamp: new Date(),
        message: `${activeChild?.name || 'Miembro'} salió de ${zone.name}`
      });
    });
    
    if (alerts.length > 0) {
      setZoneAlerts(prev => [...alerts, ...prev].slice(0, 10));
      setShowZoneAlert(true);
      
      setTimeout(() => {
        setShowZoneAlert(false);
      }, 10000);
    }
  };  
  */
  
// Parte 4 del FamilyTrackingApp.jsx - Funciones de configuracion y formularios

const loadSafeZones = async () => {
  try {
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
  
  const result = await MessagingService.getConversations(
    user.member_id, 
    user.user_metadata.family_id
  );
  
  if (result.success) {
    // Combinar con datos de children para nombres/avatares
    const conversationsWithInfo = result.data.map(conv => {
      const contact = children.find(c => c.id === conv.contactId);
      return {
        ...conv,
        name: contact?.name || 'Desconocido',
        avatar: contact?.avatar || '👤'
      };
    });
    
    setConversations(conversationsWithInfo);
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
  
  const result = await MessagingService.sendMessage(
    user.member_id,
    selectedContact.id,
    user.user_metadata.family_id,
    newMessage.trim()
  );
  
  if (result.success) {
    setChatMessages(prev => [...prev, result.data]);
    setNewMessage('');
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
        age: age,
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
  }
  
  // Cargar mapa cuando ENTRAS al dashboard
  if (currentScreen === 'dashboard' && activeChild && activeChild.id) {
    setTimeout(() => {
      loadDashboardGoogleMap();
    }, 100);
  }
}, [selectedChild, activeChild, currentScreen]);

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
  
  if (!mapContainer || !activeChild) return;
  
  console.log('🗺️ Inicializando mapa - Zonas disponibles:', safeZones?.length || 0);
  
  if (window.google && window.google.maps) {
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
      initializeDashboardMap(mapContainer);
    };
    document.head.appendChild(script);
  } else {
    const checkGoogleMaps = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkGoogleMaps);
        console.log('🗺️ Retry Google Maps - Zonas:', safeZones?.length || 0);
        initializeDashboardMap(mapContainer);
      }
    }, 100);
  }
};

const initializeDashboardMap = (mapContainer) => {
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
      mapInstanceRef.current.setZoom(15);
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
    zoom: 15,
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
  mapInstanceRef.current.setZoom(15);
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
  <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
    <header className="bg-white shadow-sm border-b">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Family Watch</h1>
						
            <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
              MODO TESTING
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="relative group">
              <button className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center hover:ring-2 hover:ring-blue-300 transition-all">
                <span className="text-white text-sm font-bold">
                  {user?.user_metadata?.first_name?.charAt(0)}{user?.user_metadata?.last_name?.charAt(0)}
                </span>
              </button>
              
              <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border py-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="px-4 py-2 border-b">
                  <p className="text-sm font-medium text-gray-900">{user?.user_metadata?.first_name} {user?.user_metadata?.last_name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cambiar Usuario</span>
                </button>
              </div>
            </div>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
		{children.length > 0 && (
		  <div>
		    <label className="block text-sm font-medium text-gray-700 mb-2">
			  Seleccionar miembro familiar
			</label>
			{children.length > 1 ? (
			  <select 
			    value={selectedChild} 
				onChange={(e) => {
				  setSelectedChild(parseInt(e.target.value));
				  setShouldCenterMap(true); // ✨ Activar centrado
				}} 
				className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			  >
			    {children.map((child, index) => (
				  <option key={child.id} value={index}>
				    {child.name} ({child.relationship})
				  </option>
				))}
			  </select>
			) : (
			  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
				Sin miembros cadastrados
			  </div>
			)}
		  </div>
		)}
      </div>
    </header>

    {/* Banner de alertas de zona */}
    {zoneAlerts.length > 0 && (
      <div className="bg-white border-b border-gray-200 py-2">
        <div className="max-w-md mx-auto px-4 space-y-2">
          {zoneAlerts.map(alert => (
            <div 
              key={alert.id}
              className={`flex items-center p-3 rounded-lg border-l-4 ${
                alert.type === 'entered' 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <span className="text-2xl mr-3">
                {alert.type === 'entered' ? '✅' : '⚠️'}
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  <span className="font-bold">{alert.memberName}</span>
                  {alert.type === 'entered' ? ' entró a ' : ' salió de '}
                  <span className="font-semibold text-blue-600">{alert.zoneName}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {alert.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setZoneAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Banner de alertas de batería baja */}
    {batteryAlerts.length > 0 && (
      <div className="bg-white border-b border-gray-200 py-2">
        <div className="max-w-md mx-auto px-4 space-y-2">
          {batteryAlerts.map(alert => (
            <div 
              key={alert.id}
              className="flex items-center p-3 rounded-lg border-l-4 bg-red-50 border-red-500"
            >
              <span className="text-2xl mr-3">
                ⚠️
              </span>
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  <span className="font-bold">{alert.memberName}</span>
                  {' tiene batería baja: '}
                  <span className="font-semibold text-red-600">{alert.batteryLevel}%</span>
                </p>
                <p className="text-xs text-gray-500">
                  {alert.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => setBatteryAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )}
	
	    {showZoneAlert && zoneAlerts.length > 0 && (
      <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
        {zoneAlerts.slice(0, 3).map(alert => (
          <div 
            key={alert.id}
            className={`p-4 rounded-lg shadow-lg border-l-4 bg-white ${
              alert.type === 'entered' 
                ? 'border-green-500' 
                : 'border-orange-500'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${
                  alert.type === 'entered' 
                    ? 'bg-green-100' 
                    : 'bg-orange-100'
                }`}>
                  {alert.type === 'entered' ? '✅' : '⚠️'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {alert.type === 'entered' ? 'Entró a zona segura' : 'Salió de zona segura'}
                  </p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {alert.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowZoneAlert(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    <div className="p-4 space-y-4">
      {children.length <= 1 ? (
		<div className="bg-white rounded-xl shadow-sm border p-8 text-center">
		  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
		  <h3 className="text-lg font-semibold text-gray-900 mb-2">Aun no hay otros miembros</h3>
		  <p className="text-gray-600 mb-6">Invita a tu familia para comenzar a usar FamilyWatch</p>
		  <button 
			onClick={() => setCurrentScreen('addchild')}
			className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
		  >
			<Users className="h-5 w-5" />
			<span>Invitar miembro familiar</span>
		  </button>
		</div>
		) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">MAPA</span>
                    Localizacion en tiempo real
                  </h3>
                  <p className="text-sm text-gray-600">{activeChild?.location || 'Ubicación no disponible'}</p>
                </div>
                <button
                  onClick={recenterMap}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md"
                  title="Centrar en usuario seleccionado"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Centrar</span>
                </button>
              </div>
            </div>
            <div 
              id="dashboard-map"
              className="w-full h-64"
              style={{ minHeight: '256px' }}
            />
            <div className="p-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${activeChild?.isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                    <span className={activeChild?.isConnected ? 'text-green-600' : 'text-red-600'}>
                      {activeChild?.isConnected ? 'En línea' : 'Desconectado'}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    Actualizado: {activeChild?.lastUpdate || 'Hace un momento'}
                  </span>
                </div>
				{activeChild?.safeZone && activeChild.safeZone !== "Verificando zona..." && (
				  <div className="flex items-center space-x-1 text-green-600">
					<span className="font-medium">En zona segura: {activeChild.safeZone}</span>
				  </div>
				)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">INFO del Miembro Familiar</span>
            </div>              
            <div className="flex items-center space-x-4 mb-4">
              <div className="relative">
                <img src={activeChild?.photo} alt={activeChild?.name} className="w-16 h-16 rounded-full object-cover" />
                <div className={`absolute bottom-0 right-0 w-5 h-5 ${activeChild?.isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full border-2 border-white`}></div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">{activeChild?.name}</h2>
                <p className="text-gray-600">{activeChild?.age} years old</p>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="h-4 w-4 text-gray-400" />                   
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
			  <div className="bg-gray-50 rounded-lg p-3">
				<div className="flex items-center space-x-2">
				  <Battery className={`h-4 w-4 ${
					activeChild.battery === null 
					  ? 'text-gray-400' 
					  : activeChild.battery > 20 
					    ? 'text-green-500' 
					    : 'text-red-500'
				  }`} />
				  <span className="text-sm font-medium">
				    {activeChild.battery === null ? 'N/D' : `${activeChild.battery}%`}
				  </span>
			    </div>
			    <p className="text-xs text-gray-500 mt-1">
				  {activeChild.battery === null ? 'No disponible' : 'Battery'}
			    </p>
			  </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Wifi className={`h-4 w-4 ${activeChild?.isConnected ? 'text-green-500' : 'text-red-500'}`} />
                  <span className="text-sm font-medium">{activeChild?.isConnected ? 'Connected' : 'Offline'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Status</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center mb-3">
              <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">Acciones</span>
              <h3 className="text-lg font-semibold text-gray-900">Acciones rápidas</h3>
            </div>
 
			{/* Botón solo para iOS */}
			{isIOSDevice && (
			  <button 
				onClick={handleLowBatteryAlert}
				className="w-full flex items-center space-x-3 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors"
			  >
				<Battery className="h-5 w-5" />
				<span className="font-medium">Mi batería está baja</span>
			  </button>
			)}
			
			<button onClick={() => setCurrentScreen('messaging')} className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
              <MessageCircle className="h-5 w-5" />
              <span className="font-medium">Enviar Mensaje</span>
            </button>
            <button onClick={handleCheckMessages} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              checkStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
              }`}>
                {checkStatus === 'sending' ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                      <span className="font-medium">Enviando Check...</span>
                    </>
                ) : checkStatus === 'waiting' ? (
                    <>
                      <Clock className="h-5 w-5 animate-pulse" />
                      <span className="font-medium">Aguardando {activeChild?.name}...</span>
                    </>
                ) : checkStatus === 'success' ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Check OK!</span>
                      <span className="ml-auto text-xs bg-green-200 px-2 py-1 rounded">{checkRequestTime}</span>
                    </>
                ) : (
                    <>
                      <MessageCircle className="h-5 w-5" />
                      <span className="font-medium">Checa Status</span>
                    </>
                )}
            </button>
            <button onClick={() => { 
				console.log('Botón clickeado');
				console.log('Estado antes:', currentScreen);
				setCurrentScreen('safezones')
				console.log('Estado después:', 'safezones');
			}} 
			className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Gestionar Zonas Seguras</span>
            </button>
			{/* POR este nuevo código: */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
			  <div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
				  <div className={`w-3 h-3 rounded-full ${isGPSTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
				  <span className="text-sm font-medium text-gray-700">
					GPS Tracking: {isGPSTracking ? 'Activo' : 'Inactivo'}
				  </span>
				</div>
				{lastGPSUpdate && (
				  <span className="text-xs text-gray-500">
					Última actualización: {lastGPSUpdate.toLocaleTimeString()}
				  </span>
				)}
			  </div>
			  {gpsError && (
				<p className="text-xs text-red-600 mt-1">{gpsError}</p>
			  )}
			</div>
            <button onClick={() => setCurrentScreen('emergency')} className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors animate-pulse">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Emergencia</span>
            </button>
          </div>
        </>
      )}
      
      <button 
        onClick={() => setCurrentScreen('addchild')}
        className="w-full flex items-center space-x-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors border-2 border-indigo-200"
      >
        <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">+</div>
        <span className="font-medium">Agregar Nuevo Miembro</span>
      </button>
    </div>

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
  </div>
);
};

export default FamilyTrackingApp;
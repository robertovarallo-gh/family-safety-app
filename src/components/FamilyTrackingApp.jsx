import React, { useState, useEffect } from 'react';
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
  Eye,
  EyeOff,
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

// Parte 1 - Login Screen
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">FamilyCare</h1>
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full px-4 py-3 border rounded-lg mb-4"
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full px-4 py-3 border rounded-lg mb-4"
      />
      
      <button
        onClick={() => onLogin(email, password)}
        className="w-full py-3 bg-blue-600 text-white rounded-lg mb-4"
      >
        Iniciar Sesión
      </button>
      
      <button
        onClick={() => alert(`Reset para: ${email}`)}
        className="w-full py-3 bg-red-500 text-white rounded-lg"
      >
        BOTÓN DE RESET - DEBERÍA APARECER
      </button>
    </div>
  );
};

//Parte 2 del FamilyTrackingApp.jsx - Estados y funciones principales  

const FamilyTrackingApp = () => {
  console.log('🚀 FamilyTrackingApp iniciando...');

  // Estados principales
  const [selectedChild, setSelectedChild] = useState(0);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [children, setChildren] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Estados para funcionalidades
  const [checkStatus, setCheckStatus] = useState('idle');
  const [checkRequestTime, setCheckRequestTime] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordCheck, setPasswordCheck] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showEmergencyConfirmation, setShowEmergencyConfirmation] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [alertStartTime, setAlertStartTime] = useState(null);

  // Estados para agregar hijos
  const [newChild, setNewChild] = useState({
    name: '',
    apellido: '',
    age: '',
    email: '',
    phone: '',
    gender: '',
    emergency_contact: '',
    notes: '',
    birthDate: ''
  });
  const [addChildLoading, setAddChildLoading] = useState(false);
  const [addChildError, setAddChildError] = useState('');

  // AGREGA ESTOS CONSOLE.LOGS AQUÍ:
  console.log('=== DEBUG ===');
  console.log('currentScreen:', currentScreen);
  console.log('loading:', loading);
  console.log('user:', user);

  const familyMembers = [
    { name: "Mom - Sarah", phone: "+57 (311) 123-4567" },
    { name: "Dad - Michael", phone: "+57 (312) 987-6543" },
    { name: "Grandma - Mary", phone: "+57 (313) 456-7890" },
    { name: "Uncle John", phone: "+57 (314) 321-0987" }
  ];

  // Función para obtener GPS y guardar en base de datos
  const handleGetCurrentLocation = async () => {
    try {
      console.log('Solicitando ubicación GPS...');
      
      const locationData = await geolocationService.getCurrentPosition();
      console.log('Ubicación obtenida:', locationData);
  
      // Obtener usuario actual (no hardcodeado)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }
      
      // Buscar el miembro familiar del usuario actual
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('id, first_name')
        .eq('user_id', currentUser.id)  // Usar el user_id real
        .single();
      
      if (memberError || !memberData) {
        throw new Error('No se encontró tu registro en family_members');
      }
      
      console.log('Miembro encontrado:', memberData);
      
      // Guardar en base de datos
      const saveResult = await locationStorageService.saveLocation(
        memberData.id, 
        locationData,
        { isManual: true }
      );
      
      if (saveResult.success) {
        // Recargar datos del dashboard
        await loadChildren();
        
        alert(`GPS guardado exitosamente!
        Ubicación: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
        Precisión: ${locationData.accuracy}m
        Guardado en base de datos: Sí`);
      } else {
        throw new Error(saveResult.error);
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
// Parte 3 del FamilyTrackingApp.jsx - useEffect hooks y carga de datos

// Autenticación real con Supabase
// Reemplaza tu useEffect de autenticación con este:
useEffect(() => {
  const checkAuth = async () => {
    setLoading(true);
    try {
      console.log('Verificando autenticación...');
      
      // Limpiar tokens corruptos si hay error
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('Error de sesión, limpiando tokens:', error.message);
        await supabase.auth.signOut(); // Esto limpia los tokens corruptos
        setCurrentScreen('login');
        return;
      }
      
      if (session?.user) {
        console.log('Usuario autenticado:', session.user.email);
        setUser(session.user);
        await loadAppData(session.user);
      } else {
        console.log('Sin sesión - mostrando login');
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (children.length > 0 && currentScreen === 'dashboard') {
        console.log('Auto-refresh: Actualizando ubicaciones...');
        loadChildren();
      }
    }, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [children.length, currentScreen]);

  const loadAppData = async (userData) => {
    try {
      setLoading(true);
      await loadChildren(userData);
      await loadSafeZones();
    } catch (error) {
      console.error('⌐ Error cargando datos de la aplicación:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async (userData = user) => {
    try {
      console.log('Cargando miembros familiares con ubicaciones reales...');
      console.log('userData completa:', userData);
      
      // Verificar si el usuario tiene family_id
      let familyId = userData?.user_metadata?.family_id;
	  console.log('family_id original del metadata:', familyId);
      
      if (!familyId) {
        console.log('Usuario sin family_id, creando familia automáticamente...');
        
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
	  console.log('DEBUG - family_id usado:', familyId);
      console.log('DEBUG - respuesta getFamilyMembers:', membersResponse);
      console.log('DEBUG - members array:', membersResponse.members);
      console.log('DEBUG - members length:', membersResponse.members?.length);
      
      if (!membersResponse.success || !membersResponse.members?.length) {
        console.log('No hay miembros familiares registrados');
        
        // Crear automáticamente el primer miembro familiar (el usuario actual)
        console.log('Creando miembro familiar para el usuario actual...');
        
        const createMemberResult = await FamilyMembersService.createFamilyMember({
          firstName: userData.user_metadata?.first_name || userData.email.split('@')[0],
          lastName: userData.user_metadata?.last_name || 'Usuario',
          email: userData.email,
          user_id: userData.id,
          role: 'padre/madre',
          age: 35,
          relationship: 'Padre/Madre',
          phone: userData.phone || '',
          emergencyContact: true
        }, familyId, userData.id);
        
        if (createMemberResult.success) {
          console.log('Miembro familiar creado exitosamente');
          // Recargar después de crear el miembro
          setTimeout(() => loadChildren(userData), 1000);
          return;
        } else {
          console.error('Error creando miembro familiar:', createMemberResult);
          setChildren([]);
          return;
        }
      }
      
      console.log('Miembros cargados:', membersResponse.members);
      
      // Para cada miembro, obtener su última ubicación real
      const formattedMembers = [];
      
      for (const member of membersResponse.members) {
        // Obtener última ubicación real de la base de datos
        const locationResult = await locationStorageService.getLatestLocation(member.id);
        
        let coordinates = { lat: 4.6951, lng: -74.0787 }; // Coordenadas por defecto (Bogotá)
        let location = "Ubicación no disponible";
        let lastUpdate = "Sin actualización";
        let isConnected = false;
        
        if (locationResult.success && locationResult.location) {
          // Usar ubicación real de la base de datos
          coordinates = {
            lat: parseFloat(locationResult.location.latitude),
            lng: parseFloat(locationResult.location.longitude)
          };
          
          location = locationResult.location.address || "Ubicación GPS actualizada";
          
          const updateTime = new Date(locationResult.location.timestamp);
          lastUpdate = updateTime.toLocaleString();
          
          // Considerar "conectado" si la última ubicación es de menos de 1 hora
          const oneHourAgo = new Date();
          oneHourAgo.setHours(oneHourAgo.getHours() - 1);
          isConnected = updateTime > oneHourAgo;
          
          console.log(`Ubicación real para ${member.first_name}:`, coordinates);
        } else {
          console.log(`Sin ubicación GPS para ${member.first_name}, usando coordenadas por defecto`);
        }
        
        formattedMembers.push({
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          age: member.age || 0,
          location: location,
          address: member.address || "Bogotá, Colombia", 
          distance: "Calculando...",
          lastUpdate: lastUpdate,
          battery: locationResult.location?.battery_level || 85,
          isConnected: isConnected,
          avatar: member.role === 'niño' ? '👶' : member.role === 'adolescente' ? '🧑' : member.role === 'adulto' ? '👨' : '👴',
          photo: member.photo_url || "/api/placeholder/48/48",
          safeZone: "Verificando zona...",
          messagingStatus: "online",
          coordinates: coordinates, // UBICACIÓN REAL del GPS
          role: member.role,
          relationship: member.relationship,
          phone: member.phone,
          emergency_contact: member.emergency_contact,
          // Información adicional de la ubicación real
          hasRealLocation: locationResult.success && locationResult.location,
          locationAccuracy: locationResult.location?.accuracy || null,
          messages: [
            { 
              id: 1, 
              sender: 'parent', 
              message: `Hola ${member.first_name}! ¿Cómo estás?`, 
              timestamp: '14:30', 
              verified: true 
            }
          ]
        });
      }
      
      setChildren(formattedMembers);
      console.log('Miembros con ubicaciones reales:', formattedMembers);
      
    } catch (error) {
      console.error('Error cargando miembros familiares:', error);
      setChildren([]);
    }
  };
  
// Parte 4 del FamilyTrackingApp.jsx - Funciones de configuración y formularios

const loadSafeZones = async () => {
    try {
      const zones = await familyService.getSafeZones();
      
      if (zones && Array.isArray(zones) && zones.length > 0) {
        const formattedZones = zones.map(zone => ({
          id: zone.id,
          name: zone.name,
          coordinates: { 
            lat: zone.latitude,
            lng: zone.longitude 
          },
          radius: zone.radius,
          type: zone.type
        }));
        
        setSafeZones(formattedZones);
      } else {
        setSafeZones([]);
      }
    } catch (error) {
      console.error('⌐ Error cargando zonas seguras:', error);
      setSafeZones([]);
    }
  };

  // Función para calcular edad
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

  const handleAddChild = async (e) => {
    e.preventDefault();
    setAddChildLoading(true);
    setAddChildError('');

    try {
      // Validaciones existentes
      if (!newChild.name.trim()) {
        throw new Error('El nombre es requerido');
      }
      if (!newChild.apellido.trim()) {
        throw new Error('El apellido es requerido');
      }
      if (!newChild.email.trim()) {
        throw new Error('El email es requerido');
      }
      if (!newChild.birthDate) {
        throw new Error('La fecha de nacimiento es requerida');
      }

      const calculatedAge = calculateAge(newChild.birthDate);
      if (calculatedAge < 1) {
        throw new Error('La fecha de nacimiento no puede ser futura o muy reciente');
      }
      if (calculatedAge > 25) {
        throw new Error('La edad no puede ser mayor a 25 años');
      }

      // Obtener usuario actual
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // 1. Crear usuario en Supabase Auth con credenciales reales
      const temporaryPassword = 'FamilyWatch2024!';
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newChild.email,
        password: temporaryPassword,
        options: {
          data: {
            first_name: newChild.name,
            last_name: newChild.apellido,
            family_id: currentUser.user_metadata.family_id,
            role: calculatedAge < 13 ? 'niño' : calculatedAge < 18 ? 'adolescente' : 'adulto'
          }
        }
      });

      if (authError) {
        throw new Error(`Error creando usuario: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // 2. Crear miembro familiar vinculado al nuevo usuario
      const memberResponse = await FamilyMembersService.createFamilyMember({
        firstName: newChild.name,
        lastName: newChild.apellido,
        email: newChild.email,
        user_id: authData.user.id, // ID del nuevo usuario creado
        role: calculatedAge < 13 ? 'niño' : calculatedAge < 18 ? 'adolescente' : 'adulto',
        age: calculatedAge,
        relationship: 'Hijo/a',
        phone: newChild.phone,
        emergencyContact: true
      }, currentUser.user_metadata.family_id, currentUser.id);

      if (!memberResponse.success) {
        throw new Error(`Error creando miembro familiar: ${memberResponse.message}`);
      }

      // Recargar datos y limpiar formulario
      await loadChildren();
      resetAddChildForm();
      setCurrentScreen('dashboard');
      
      // Mostrar credenciales al usuario
      alert(`${newChild.name} ${newChild.apellido} fue agregado exitosamente!

🔐 CREDENCIALES DE ACCESO:
📧 Email: ${newChild.email}
🔑 Password: ${temporaryPassword}

Para testing desde celular:
1. Abre: https://family-safety-app.vercel.app
2. Usa estas credenciales para login
3. El usuario debe cambiar su contraseña después del primer login`);

    } catch (error) {
      console.error('Error agregando hijo:', error);
      setAddChildError(error.message);
    } finally {
      setAddChildLoading(false);
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

  // Función de login real
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

// Función de logout real - CORREGIDA
  const handleLogout = async () => {
    try {
      console.log('Cerrando sesión...');
      setLoading(true);
      
      // Limpiar sesión de Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error en logout:', error);
        // Aún así, limpiar estado local
      }
      
      // Limpiar estado local
      setUser(null);
      setChildren([]);
      setSafeZones([]);
      setCurrentScreen('login');
      
      console.log('Logout exitoso - redirigiendo a login');
      
    } catch (error) {
      console.error('Error durante logout:', error);
      // Fallback: recargar página si falla el logout
      // window.location.reload();
	  setCurrentScreen('login'); // ← AGREGA ESTA LÍNEA
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
    if (currentScreen === 'dashboard' && activeChild && activeChild.id) {
      setTimeout(() => {
        loadDashboardGoogleMap();
      }, 100);
    }
  }, [selectedChild, activeChild, currentScreen]);

  const loadDashboardGoogleMap = () => {
    const mapContainer = document.getElementById('dashboard-map');
    if (!mapContainer || !activeChild) return;

    if (window.google && window.google.maps) {
      initializeDashboardMap(mapContainer);
      return;
    }

    if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDFgYBq7tKtG9LP2w2-1XhFwBUOndyF0rA&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initializeDashboardMap(mapContainer);
      document.head.appendChild(script);
    } else {
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps);
          initializeDashboardMap(mapContainer);
        }
      }, 100);
    }
  };

  const initializeDashboardMap = (mapContainer) => {
    if (!window.google || !activeChild) return;

    const childLocation = {
      lat: activeChild.coordinates?.lat || 4.6951,
      lng: activeChild.coordinates?.lng || -74.0787
    };

    const map = new window.google.maps.Map(mapContainer, {
      zoom: 15,
      center: childLocation,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: false,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    const childMarker = new window.google.maps.Marker({
      position: childLocation,
      map: map,
      title: activeChild.name,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <circle cx="25" cy="25" r="20" fill="#3B82F6" stroke="#FFFFFF" stroke-width="4"/>
            <text x="25" y="32" text-anchor="middle" fill="white" font-size="18" font-family="Arial, sans-serif">
              ${activeChild.avatar || '👤'}
            </text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(50, 50),
        anchor: new window.google.maps.Point(25, 25)
      },
      animation: window.google.maps.Animation.DROP
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 12px; min-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 24px; margin-right: 8px;">${activeChild.avatar || '👤'}</span>
            <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
              ${activeChild.name}
            </h3>
          </div>
          <div style="space-y: 4px;">
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
              <span style="margin-right: 6px;">📍</span>
              ${activeChild.location || 'Ubicación no disponible'}
            </p>
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
              <span style="margin-right: 6px;">🔋</span>
              Batería: ${activeChild.battery || 0}%
            </p>
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
              <span style="margin-right: 6px;">🕐</span>
              ${activeChild.lastUpdate || 'Hace un momento'}
            </p>
          </div>
          <div style="margin-top: 10px; padding: 6px 12px; background: ${activeChild.isConnected ? '#10b981' : '#ef4444'}; 
                      color: white; border-radius: 16px; font-size: 12px; text-align: center; font-weight: 500;">
            ${activeChild.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </div>
        </div>
      `
    });

    childMarker.addListener('click', () => {
      infoWindow.open(map, childMarker);
    });

    if (safeZones && safeZones.length > 0) {
      safeZones.forEach((zone) => {
        const circle = new window.google.maps.Circle({
          strokeColor: '#10b981',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.15,
          map: map,
          center: {
            lat: zone.coordinates.lat,
            lng: zone.coordinates.lng
          },
          radius: zone.radius || 200
        });

        const zoneMarker = new window.google.maps.Marker({
          position: {
            lat: zone.coordinates.lat,
            lng: zone.coordinates.lng
          },
          map: map,
          title: zone.name,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="35" height="35" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
                <circle cx="17.5" cy="17.5" r="15" fill="#10b981" stroke="#FFFFFF" stroke-width="3"/>
                <text x="17.5" y="23" text-anchor="middle" fill="white" font-size="14" font-family="Arial">
                  🛡️
                </text>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(35, 35),
            anchor: new window.google.maps.Point(17.5, 17.5)
          }
        });

        const zoneInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 10px; font-family: system-ui, -apple-system, sans-serif;">
              <h4 style="margin: 0 0 6px 0; color: #10b981; font-size: 16px; display: flex; align-items: center;">
                🛡️ ${zone.name}
              </h4>
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                Radio de seguridad: ${zone.radius || 200} metros
              </p>
            </div>
          `
        });

        zoneMarker.addListener('click', () => {
          zoneInfoWindow.open(map, zoneMarker);
        });
      });
    }
  };
  
// Parte 6 del FamilyTrackingApp.jsx - Funciones de interacción (mensajes, emergencias, etc.)

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
        const responses = ['Tudo bem!', 'Entendi, obrigado!', 'Ok! 👍'];
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
  
// Parte 7 del FamilyTrackingApp.jsx - Renders condicionales (Login, Loading, Add Child)

// 1. Pantalla de login
  console.log('Checking login screen condition:', currentScreen === 'login', 'currentScreen:', currentScreen);
  if (currentScreen === 'login') {
	console.log('RENDERING LOGIN SCREEN');
    return <LoginScreen onLogin={handleLogin} />;
  }

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

  // 3. Pantalla de agregar hijo
  if (currentScreen === 'addchild') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 hover:bg-indigo-500 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Agregar Nuevo Hijo</h1>
            <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold ml-auto">
              MODO TESTING
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleAddChild} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Información Básica</h3>
              <p className="text-sm text-blue-700">Complete los datos principales del nuevo integrante</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="child-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  id="child-name"
                  type="text"
                  value={newChild.name}
                  onChange={(e) => setNewChild({...newChild, name: e.target.value})}
                  placeholder="Juan Carlos"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  disabled={addChildLoading}
                />
              </div>
              
              <div>
                <label htmlFor="child-apellido" className="block text-sm font-medium text-gray-700 mb-2">
                  Apellido *
                </label>
                <input
                  id="child-apellido"
                  type="text"
                  value={newChild.apellido}
                  onChange={(e) => setNewChild({...newChild, apellido: e.target.value})}
                  placeholder="Pérez García"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  disabled={addChildLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="child-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                id="child-email"
                type="email"
                value={newChild.email}
                onChange={(e) => setNewChild({...newChild, email: e.target.value})}
                placeholder="hijo@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                disabled={addChildLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                (MODO TESTING - no se enviará email real)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">            
              <div>
                <label htmlFor="child-birthdate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Nacimiento *
                </label>
                <input
                  id="child-birthdate"
                  type="date"
                  value={newChild.birthDate}
                  onChange={(e) => setNewChild({...newChild, birthDate: e.target.value})}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                  disabled={addChildLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Edad calculada: {newChild.birthDate ? calculateAge(newChild.birthDate) : 0} años
                </p>
              </div>
                            
              <div>
                <label htmlFor="child-gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Género
                </label>
                <select
                  id="child-gender"
                  value={newChild.gender}
                  onChange={(e) => setNewChild({...newChild, gender: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={addChildLoading}
                >
                  <option value="">Seleccionar</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="child-phone" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                id="child-phone"
                type="tel"
                value={newChild.phone}
                onChange={(e) => setNewChild({...newChild, phone: e.target.value})}
                placeholder="+57 312 345 6789"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={addChildLoading}
              />
            </div>

            {addChildError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{addChildError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-800 mb-2">Modo Testing</h4>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li>• Se creará solo el registro en la base de datos</li>
                <li>• No se enviará email real de invitación</li>
                <li>• Aparecerá inmediatamente en tu lista de familia</li>
                <li>• Perfecto para testing de funcionalidades</li>
              </ul>
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={() => {
                  resetAddChildForm();
                  setCurrentScreen('dashboard');
                }}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                disabled={addChildLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium disabled:opacity-50"
                disabled={addChildLoading || !newChild.name || !newChild.apellido || !newChild.email || !newChild.birthDate}
              >
                {addChildLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Agregando...
                  </div>
                ) : (
                  'Agregar Hijo'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  
// Parte 8 del FamilyTrackingApp.jsx - Pantallas de emergencia, zonas seguras y mensajería

// Pantalla de confirmación de emergencia
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
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button onClick={() => setCurrentScreen('dashboard')} className="p-2 hover:bg-blue-500 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">Mensagens Familiares</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img src={activeChild?.photo} alt={activeChild?.name} className="w-12 h-12 rounded-full object-cover" />
                <div className={`absolute bottom-0 right-0 w-4 h-4 ${activeChild?.messagingStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white`}></div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{activeChild?.name}</h2>
                <p className="text-sm text-gray-600">
                  {activeChild?.messagingStatus === 'online' ? (
                    <span className="text-green-600">Ativo agora</span>
                  ) : (
                    <span className="text-gray-500">Offline</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {activeChild?.messages?.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'parent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-2 rounded-lg ${
                  message.sender === 'parent' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                }`}>
                  <p className="text-sm">{message.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${message.sender === 'parent' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.timestamp}
                    </span>
                    {message.verified && (
                      <CheckCircle className={`h-3 w-3 ${message.sender === 'parent' ? 'text-blue-200' : 'text-green-600'}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
// Parte 9 y 10 del FamilyTrackingApp.jsx - Dashboard principal

// Dashboard principal
// CÓDIGO DE DIAGNÓSTICO - REEMPLAZA EL DASHBOARD COMPLETO
console.log('=== RENDER DECISION ===');
console.log('currentScreen:', currentScreen);
console.log('loading:', loading);
console.log('user:', user);

if (loading) {
  console.log('MOSTRANDO LOADING');
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center">
      <div>LOADING...</div>
    </div>
  );
}

if (currentScreen === 'login') {
  console.log('DEBERÍA MOSTRAR LOGIN');
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen p-6">
      <h1>LOGIN SCREEN RENDERING</h1>
      <button onClick={() => alert('Login test')}>TEST BUTTON</button>
    </div>
  );
}

console.log('MOSTRANDO DASHBOARD U OTRA PANTALLA');
return (
  <div className="max-w-md mx-auto bg-white min-h-screen p-6">
    <h1>DASHBOARD OR OTHER SCREEN</h1>
    <p>currentScreen: {currentScreen}</p>
    <p>user: {user ? user.email : 'null'}</p>
    <button onClick={handleLogout}>LOGOUT</button>
  </div>
);
);

export default FamilyTrackingApp;
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

const FamilyTrackingApp = () => {
  console.log('🚀 FamilyTrackingApp iniciando...');

  // Estados principales
  const [selectedChild, setSelectedChild] = useState(0);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [children, setChildren] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Usuario mock para testing (sin autenticación real)
  const [user, setUser] = useState({
    id: 'test-user-123',
    email: 'test@familywatch.com',
    user_metadata: {
      family_id: 'a5bfd6c1-7cba-482b-8bdf-ecda80c21150',
      first_name: 'Roberto',
      last_name: 'Varallo'
    },
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString()
  });

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

  const familyMembers = [
    { name: "Mom - Sarah", phone: "+57 (311) 123-4567" },
    { name: "Dad - Michael", phone: "+57 (312) 987-6543" },
    { name: "Grandma - Mary", phone: "+57 (313) 456-7890" },
    { name: "Uncle John", phone: "+57 (314) 321-0987" }
  ];

  // BYPASS TEMPORAL - Sin autenticación real
  useEffect(() => {
    console.log('MODO TESTING: Saltando autenticación real');
    setLoading(false);
    loadAppData(user);
  }, []);

  const loadAppData = async (userData) => {
    try {
      setLoading(true);
      await loadChildren(userData);
      await loadSafeZones();
    } catch (error) {
      console.error('❌ Error cargando datos de la aplicación:', error);
    } finally {
      setLoading(false);
    }
  };

const loadChildren = async (userData = user) => {
  try {
    console.log('Cargando miembros familiares con ubicaciones reales...');
    
    if (!userData?.user_metadata?.family_id) {
      console.log('Usuario sin family_id');
      setChildren([]);
      return;
    }
    
    const familyId = userData.user_metadata.family_id;
    console.log('Usando family_id:', familyId);
    
    // Obtener miembros familiares
    const membersResponse = await FamilyMembersService.getFamilyMembers(familyId);
    
    if (!membersResponse.success || !membersResponse.members?.length) {
      console.log('No hay miembros familiares');
      setChildren([]);
      return;
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
        avatar: member.role === 'niño' ? '👶' : member.role === 'adolescente' ? '🧒' : member.role === 'adulto' ? '👨' : '👴',
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
      console.error('❌ Error cargando zonas seguras:', error);
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

  // MODO TESTING - Agregar hijo sin autenticación real
  const handleAddChild = async (e) => {
    e.preventDefault();
    setAddChildLoading(true);
    setAddChildError('');

    try {
      console.log('MODO TESTING: Agregando hijo sin autenticación real');
      
      // Validaciones
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

      // Simular ID de usuario único
      const mockUserId = 'user-' + Date.now();
      
      // Crear miembro familiar directo (sin autenticación)
      const memberResponse = await FamilyMembersService.createFamilyMember({
        firstName: newChild.name,
        lastName: newChild.apellido,
        email: newChild.email,
        user_id: mockUserId,
        role: calculatedAge < 13 ? 'niño' : calculatedAge < 18 ? 'adolescente' : 'adulto',
        age: calculatedAge,
        relationship: 'Hijo/a',
        phone: newChild.phone,
        emergencyContact: true
      }, user.user_metadata.family_id, user.id);

      if (!memberResponse.success) {
        throw new Error(`Error creando miembro familiar: ${memberResponse.message}`);
      }

      console.log('Miembro agregado en modo testing');

      // Recargar datos y limpiar formulario
      await loadChildren();
      resetAddChildForm();
      setCurrentScreen('dashboard');
      
      alert(`${newChild.name} ${newChild.apellido} fue agregado exitosamente (MODO TESTING - sin email real)`);

    } catch (error) {
      console.error('Error agregando hijo:', error);
      setAddChildError(error.message || 'Error al agregar hijo');
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

  // MODO TESTING - Logout simple
  const handleLogout = () => {
    console.log('Logout en modo testing - recargando página');
    window.location.reload();
  };

  const activeChild = children[selectedChild] || children[0];

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

  // Loading screen
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

  // Pantalla de agregar hijo
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
              <h1 className="text-xl font-bold text-gray-900">FamilyCare</h1>
              <div className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                MODO TESTING
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.user_metadata?.first_name?.charAt(0)}{user?.user_metadata?.last_name?.charAt(0)}
                </span>
              </div>
              
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </button>
              
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Settings className="h-5 w-5" />
              </button>

              <button onClick={handleLogout} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cerrar sesión">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {children.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar miembro familiar
              </label>
              <select 
                value={selectedChild} 
                onChange={(e) => setSelectedChild(parseInt(e.target.value))} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {children.map((child, index) => (
                  <option key={child.id} value={index}>
                    {child.name} ({child.relationship})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {children.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay miembros familiares</h3>
            <p className="text-gray-600 mb-6">Agrega el primer miembro de tu familia para comenzar</p>
            <button 
              onClick={() => setCurrentScreen('addchild')}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors font-medium"
            >
              <Users className="h-5 w-5" />
              <span>Agregar primer miembro</span>
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">MAPA</span>
                  Live Location
                </h3>
                <p className="text-sm text-gray-600">{activeChild?.location || 'Ubicación no disponible'} • {activeChild?.distance || 'Distancia no disponible'}</p>
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
                  
                  {activeChild?.safeZone && activeChild.safeZone !== "Zona desconocida" && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <span className="text-green-500">🛡️</span>
                      <span className="font-medium">En zona segura</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center mb-4">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">INFO</span>
                <h3 className="text-lg font-semibold text-gray-900">Child Information</h3>
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
                    <span className="text-sm text-gray-600">{activeChild?.location}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Battery className={`h-4 w-4 ${activeChild?.battery > 20 ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-sm font-medium">{activeChild?.battery}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Battery</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Wifi className={`h-4 w-4 ${activeChild?.isConnected ? 'text-green-500' : 'text-red-500'}`} />
                    <span className="text-sm font-medium">{activeChild?.isConnected ? 'Connected' : 'Offline'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Status</p>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500">Last update: {activeChild?.lastUpdate}</p>
                <p className="text-sm text-green-600 font-medium">In Safe Zone: {activeChild?.safeZone}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center mb-3">
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">ACTIONS</span>
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              </div>
              
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
              
              <button onClick={() => setCurrentScreen('safezones')} className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Gestionar Zonas Seguras</span>
              </button>
              
			  <button 
				onClick={handleGetCurrentLocation}
				className="w-full flex items-center space-x-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition-colors"
				>
				<span>🌍</span>
				<span className="font-medium">Probar GPS</span>
			  </button>
			  
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
          <span className="font-medium">Agregar Nuevo Hijo</span>
        </button>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Verificação de Segurança</h3>
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

// Función para obtener GPS y guardar en base de datos
const handleGetCurrentLocation = async () => {
  try {
    console.log('Solicitando ubicación GPS...');
    
    const locationData = await geolocationService.getCurrentPosition();
    console.log('Ubicación obtenida:', locationData);
    
    // Buscar tu ID en family_members usando los valores exactos del modo testing
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('id, first_name')
      .eq('family_id', 'a5bfd6c1-7cba-482b-8bdf-ecda80c21150')
      .eq('email', 'test@familywatch.com')
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

export default FamilyTrackingApp;
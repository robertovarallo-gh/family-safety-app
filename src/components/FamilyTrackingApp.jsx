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


//Parte 2 del FamilyTrackingApp.jsx - Estados y funciones principales  

const FamilyTrackingApp = () => {
  console.log('馃殌 FamilyTrackingApp iniciando...');

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


  // Funci贸n para obtener GPS y guardar en base de datos
  const handleGetCurrentLocation = async () => {
    try {
      console.log('Solicitando ubicaci贸n GPS...');
      
      const locationData = await geolocationService.getCurrentPosition();
      console.log('Ubicaci贸n obtenida:', locationData);
  
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
        throw new Error('No se encontr贸 tu registro en family_members');
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
        Ubicaci贸n: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}
        Precisi贸n: ${locationData.accuracy}m
        Guardado en base de datos: S铆`);
      } else {
        throw new Error(saveResult.error);
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Error: ${error.message}`);
    }
  };
  
// Parte 3 del FamilyTrackingApp.jsx - useEffect hooks y carga de datos

// Autenticaci贸n real con Supabase
// Reemplaza tu useEffect de autenticaci贸n con este:
useEffect(() => {
  const checkAuth = async () => {
    setLoading(true);
    try {
      console.log('Verificando autenticaci贸n...');
      
      // Limpiar tokens corruptos si hay error
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('Error de sesi贸n, limpiando tokens:', error.message);
        await supabase.auth.signOut(); // Esto limpia los tokens corruptos
        setCurrentScreen('login');
        return;
      }
      
      if (session?.user) {
        console.log('Usuario autenticado:', session.user.email);
        setUser(session.user);
        await loadAppData(session.user);
      } else {
        console.log('Sin sesi贸n - mostrando login');
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
      console.error('鈱?Error cargando datos de la aplicaci贸n:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChildren = async (userData = user) => {
    try {
      console.log('🔍 === INICIO loadChildren ===');
      console.log('📧 Email del usuario:', userData?.email);
      console.log('👤 User ID:', userData?.id);
      console.log('👨‍👩‍👧 Family ID del metadata:', userData?.user_metadata?.family_id);
      
      // Verificar si el usuario tiene family_id
      let familyId = userData?.user_metadata?.family_id;
	  console.log('✅ Family ID final usado:', familyId);
      
      if (!familyId) {
        console.log('Usuario sin family_id, creando familia autom谩ticamente...');
        
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
          // Recargar despu茅s de crear el miembro
          setTimeout(() => loadChildren(userData), 1000);
          return;
        } else {
          console.error('Error creando miembro familiar:', createMemberResult);
          setChildren([]);
          return;
        }
      }
      
      console.log('Miembros cargados:', membersResponse.members);
      
      // Para cada miembro, obtener su 煤ltima ubicaci贸n real
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
          console.log(`Sin ubicaci贸n GPS para ${member.first_name}, usando coordenadas por defecto`);
        }
        
        formattedMembers.push({
          id: member.id,
          name: `${member.first_name} ${member.last_name}`,
          age: member.age || 0,
          location: location,
          address: member.address || "Bogot谩, Colombia", 
          distance: "Calculando...",
          lastUpdate: lastUpdate,
          battery: locationResult.location?.battery_level || 85,
          isConnected: isConnected,
          avatar: member.role === 'ni帽o' ? '馃懚' : member.role === 'adolescente' ? '馃' : member.role === 'adulto' ? '馃懆' : '馃懘',
          photo: member.photo_url || "/api/placeholder/48/48",
          safeZone: "Verificando zona...",
          messagingStatus: "online",
          coordinates: coordinates, // UBICACI脫N REAL del GPS
          role: member.role,
          relationship: member.relationship,
          phone: member.phone,
          emergency_contact: member.emergency_contact,
          // Informaci贸n adicional de la ubicaci贸n real
          hasRealLocation: locationResult.success && locationResult.location,
          locationAccuracy: locationResult.location?.accuracy || null,
          messages: [
            { 
              id: 1, 
              sender: 'parent', 
              message: `Hola ${member.first_name}! 驴Como estas?`, 
              timestamp: '14:30', 
              verified: true 
            }
          ]
        });
      }
      
	  console.log('✨ formattedMembers final:', formattedMembers);
      setChildren(formattedMembers);
      console.log('Miembros con ubicaciones reales:', formattedMembers);
      
    } catch (error) {
      console.error('Error cargando miembros familiares:', error);
      setChildren([]);
    }
  };
  
// Parte 4 del FamilyTrackingApp.jsx - Funciones de configuraci贸n y formularios

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
      console.error('鈱?Error cargando zonas seguras:', error);
      setSafeZones([]);
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

  // Funci贸n de login real
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
        // A煤n as铆, limpiar estado local
      }
      
      // Limpiar estado local
      setUser(null);
      setChildren([]);
      setSafeZones([]);
      
      console.log('Logout exitoso - redirigiendo a login');
      
    } catch (error) {
      console.error('Error durante logout:', error);
      // Fallback: recargar p谩gina si falla el logout
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
              ${activeChild.avatar || '馃懁'}
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
            <span style="font-size: 24px; margin-right: 8px;">${activeChild.avatar || '馃懁'}</span>
            <h3 style="margin: 0; color: #1f2937; font-size: 18px; font-weight: 600;">
              ${activeChild.name}
            </h3>
          </div>
          <div style="space-y: 4px;">
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
              <span style="margin-right: 6px;">馃搷</span>
              ${activeChild.location || 'Ubicaci贸n no disponible'}
            </p>
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
              <span style="margin-right: 6px;">馃攱</span>
              Bater铆a: ${activeChild.battery || 0}%
            </p>
            <p style="margin: 4px 0; color: #6b7280; font-size: 14px; display: flex; align-items: center;">
              <span style="margin-right: 6px;">馃晲</span>
              ${activeChild.lastUpdate || 'Hace un momento'}
            </p>
          </div>
          <div style="margin-top: 10px; padding: 6px 12px; background: ${activeChild.isConnected ? '#10b981' : '#ef4444'}; 
                      color: white; border-radius: 16px; font-size: 12px; text-align: center; font-weight: 500;">
            ${activeChild.isConnected ? '馃煝 Conectado' : '馃敶 Desconectado'}
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
                  馃洝锔?                </text>
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
                馃洝锔?${zone.name}
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
  
// Parte 6 del FamilyTrackingApp.jsx - Funciones de interacci贸n (mensajes, emergencias, etc.)

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
        const responses = ['Tudo bem!', 'Entendi, obrigado!', 'Ok! 馃憤'];
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


  
// Parte 8 del FamilyTrackingApp.jsx - Pantallas de emergencia, zonas seguras y mensajer铆a

// Pantalla de confirmaci贸n de emergencia
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
				onChange={(e) => setSelectedChild(parseInt(e.target.value))} 
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">MAPA</span>
                Localizacion en tiempo real
              </h3>
              <p className="text-sm text-gray-600">{activeChild?.location || 'Ubicación no disponible'} ? {activeChild?.distance || 'Distancia no disponible'}</p>
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
                    <span className="text-green-500">???</span>
                    <span className="font-medium">En zona segura</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">INFO</span>
              <h3 className="text-lg font-semibold text-gray-900">Información del Miembro Familiar</h3>
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
              <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">Acciones</span>
              <h3 className="text-lg font-semibold text-gray-900">Acciones rápidas</h3>
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
              <span>??</span>
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
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Battery, Clock, Shield, MessageCircle, Bell, Settings, Home, School, AlertTriangle, CheckCircle, Wifi, WifiOff, ArrowLeft, Send, Lock, Plus, Edit, Trash2, Users } from 'lucide-react';

const FamilySafetyApp = () => {
  const [selectedChild, setSelectedChild] = useState(0);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  
  // Check Message System
  const [showCheckPrompt, setShowCheckPrompt] = useState(false);
  const [checkStatus, setCheckStatus] = useState('');
  const [checkPassword, setCheckPassword] = useState('');
  const [checkPasswordError, setCheckPasswordError] = useState('');
  const [checkRequestTime, setCheckRequestTime] = useState('');

  // Messaging System
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const messagesEndRef = useRef(null);

  // Safe Zones System
  const [showAddZone, setShowAddZone] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [newZone, setNewZone] = useState({
    name: '',
    address: '',
    type: 'custom',
    radius: 100,
    notifications: {
      entry: true,
      exit: true,
      extended_stay: false
    }
  });

  const children = [
    {
      id: 1,
      name: "Emma",
      age: 12,
      photo: "data:image/svg+xml;base64," + btoa(`
        <svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
          <circle cx="75" cy="75" r="75" fill="#E0E7FF"/>
          <circle cx="75" cy="60" r="25" fill="#6366F1"/>
          <path d="M75 85 C60 85 50 95 50 110 L100 110 C100 95 90 85 75 85" fill="#6366F1"/>
          <text x="75" y="135" text-anchor="middle" font-family="Arial" font-size="16" fill="#4F46E5">Emma</text>
        </svg>
      `),
      currentLocation: "Roosevelt Elementary School",
      battery: 78,
      lastSeen: "2 min ago",
      status: "safe",
      deviceOnline: true,
      currentZone: "school",
      messagingStatus: "online"
    },
    {
      id: 2,
      name: "Jake",
      age: 9,
      photo: "data:image/svg+xml;base64," + btoa(`
        <svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
          <circle cx="75" cy="75" r="75" fill="#DBEAFE"/>
          <circle cx="75" cy="60" r="25" fill="#3B82F6"/>
          <path d="M75 85 C60 85 50 95 50 110 L100 110 C100 95 90 85 75 85" fill="#3B82F6"/>
          <text x="75" y="135" text-anchor="middle" font-family="Arial" font-size="16" fill="#1E40AF">Jake</text>
        </svg>
      `),
      currentLocation: "Home",
      battery: 45,
      lastSeen: "5 min ago",
      status: "safe",
      deviceOnline: true,
      currentZone: "home",
      messagingStatus: "offline"
    }
  ];

  const sampleConversations = [
    [
      { id: 1, sender: "parent", message: "Hi Emma! How was school today?", timestamp: "2:30 PM", verified: true },
      { id: 2, sender: "child", message: "Hi Mom! School was great. We had a math test and I think I did well! 😊", timestamp: "2:35 PM", verified: true },
      { id: 3, sender: "parent", message: "That's wonderful! What time should I pick you up from soccer practice?", timestamp: "2:36 PM", verified: true },
      { id: 4, sender: "child", message: "Practice ends at 4:30 PM. Can you pick me up then?", timestamp: "2:40 PM", verified: true }
    ],
    [
      { id: 1, sender: "parent", message: "Hey buddy! Are you ready for lunch?", timestamp: "12:15 PM", verified: true },
      { id: 2, sender: "child", message: "Yes! Can we have pizza? 🍕", timestamp: "12:20 PM", verified: true },
      { id: 3, sender: "parent", message: "Pizza it is! I'll order your favorite. Pepperoni okay?", timestamp: "12:21 PM", verified: true },
      { id: 4, sender: "child", message: "YES! Thank you Dad! 🎉", timestamp: "12:25 PM", verified: true }
    ]
  ];

  const [safeZones, setSafeZones] = useState([
    [
      {
        id: 1,
        name: "Home",
        address: "123 Oak Street, Springfield",
        type: "home",
        radius: 150,
        status: "active",
        created: "2024-01-15",
        lastTriggered: "Today 8:30 AM",
        notifications: { entry: true, exit: true, extended_stay: false },
        stats: { entries: 28, avgStayTime: "8h 15m" }
      },
      {
        id: 2,
        name: "Roosevelt Elementary",
        address: "456 School Ave, Springfield",
        type: "school",
        radius: 200,
        status: "active",
        created: "2024-01-15",
        lastTriggered: "Today 2:45 PM",
        notifications: { entry: true, exit: true, extended_stay: true },
        stats: { entries: 45, avgStayTime: "6h 30m" }
      },
      {
        id: 3,
        name: "Soccer Field",
        address: "789 Sports Complex, Springfield",
        type: "activity",
        radius: 100,
        status: "active",
        created: "2024-02-01",
        lastTriggered: "Yesterday 4:00 PM",
        notifications: { entry: true, exit: true, extended_stay: false },
        stats: { entries: 12, avgStayTime: "2h 00m" }
      }
    ],
    [
      {
        id: 1,
        name: "Home",
        address: "123 Oak Street, Springfield",
        type: "home",
        radius: 150,
        status: "active",
        created: "2024-01-15",
        lastTriggered: "Today 1:15 PM",
        notifications: { entry: true, exit: true, extended_stay: false },
        stats: { entries: 35, avgStayTime: "10h 30m" }
      },
      {
        id: 2,
        name: "Sunny Day Daycare",
        address: "159 Kids Lane, Springfield",
        type: "school",
        radius: 80,
        status: "active",
        created: "2024-01-15",
        lastTriggered: "Today 12:50 PM",
        notifications: { entry: true, exit: true, extended_stay: true },
        stats: { entries: 42, avgStayTime: "5h 15m" }
      }
    ]
  ]);

  const recentActivity = [
    { time: "2:45 PM", event: "Emma entered Roosevelt Elementary", type: "geofence", icon: School, color: "text-green-600" },
    { time: "2:30 PM", event: "Jake's battery dropped to 45%", type: "battery", icon: Battery, color: "text-yellow-600" },
    { time: "1:15 PM", event: "Emma left McDonald's", type: "geofence", icon: MapPin, color: "text-blue-600" },
    { time: "12:50 PM", event: "Jake arrived at Home", type: "geofence", icon: Home, color: "text-green-600" }
  ];

  const activeChild = children[selectedChild];
  const childSafeZones = safeZones[selectedChild] || [];

  const zoneTypes = {
    home: { icon: Home, color: "text-green-600 bg-green-50", label: "Casa" },
    school: { icon: School, color: "text-blue-600 bg-blue-50", label: "Escola" },
    activity: { icon: MapPin, color: "text-purple-600 bg-purple-50", label: "Atividade" },
    family: { icon: Users, color: "text-orange-600 bg-orange-50", label: "Família" },
    custom: { icon: MapPin, color: "text-gray-600 bg-gray-50", label: "Personalizado" }
  };

  useEffect(() => {
    setMessages(sampleConversations[selectedChild] || []);
  }, [selectedChild]);

  useEffect(() => {
    if (currentScreen === 'messaging') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentScreen]);

  const handleCheckMessage = () => {
    setCheckStatus('sending');
    setCheckRequestTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setTimeout(() => {
      setCheckStatus('waiting');
      setShowCheckPrompt(true);
    }, 1500);
  };

  const handleCheckPasswordSubmit = () => {
    if (checkPassword === "1234" || checkPassword === activeChild.name.toLowerCase()) {
      setCheckStatus('success');
      setShowCheckPrompt(false);
      setCheckPassword('');
      setCheckPasswordError('');
      setTimeout(() => setCheckStatus(''), 3000);
    } else {
      setCheckPasswordError('Senha incorreta. Tente novamente.');
    }
  };

  const cancelCheck = () => {
    setShowCheckPrompt(false);
    setCheckStatus('');
    setCheckPassword('');
    setCheckPasswordError('');
  };

  const openMessaging = () => setCurrentScreen('messaging');
  const openSafeZones = () => setCurrentScreen('safezones');
  const backToDashboard = () => setCurrentScreen('dashboard');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: messages.length + 1,
      sender: "parent",
      message: newMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verified: true
    };

    setMessages([...messages, message]);
    setNewMessage('');
    setTimeout(() => setShowPasswordPrompt(true), 2000);
  };

  const handlePasswordSubmit = () => {
    if (password === "1234" || password === activeChild.name.toLowerCase()) {
      const childResponse = {
        id: messages.length + 2,
        sender: "child",
        message: "Got your message! Thanks Mom/Dad! 😊",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verified: true
      };
      
      setMessages(prev => [...prev, childResponse]);
      setShowPasswordPrompt(false);
      setPassword('');
      setPasswordError('');
    } else {
      setPasswordError('Senha incorreta. Tente novamente.');
    }
  };

  const handleAddZone = () => {
    if (!newZone.name || !newZone.address) return;

    const zone = {
      id: childSafeZones.length + 1,
      ...newZone,
      status: "active",
      created: new Date().toISOString().split('T')[0],
      lastTriggered: "Never",
      stats: { entries: 0, avgStayTime: "0h 00m" }
    };

    const updatedZones = [...safeZones];
    updatedZones[selectedChild] = [...childSafeZones, zone];
    setSafeZones(updatedZones);

    setNewZone({
      name: '',
      address: '',
      type: 'custom',
      radius: 100,
      notifications: { entry: true, exit: true, extended_stay: false }
    });
    setShowAddZone(false);
  };

  const handleEditZone = (zone) => {
    setEditingZone(zone);
    setNewZone({
      name: zone.name,
      address: zone.address,
      type: zone.type,
      radius: zone.radius,
      notifications: { ...zone.notifications }
    });
    setShowAddZone(true);
  };

  const handleUpdateZone = () => {
    if (!editingZone) return;

    const updatedZones = [...safeZones];
    const zoneIndex = updatedZones[selectedChild].findIndex(z => z.id === editingZone.id);
    
    if (zoneIndex !== -1) {
      updatedZones[selectedChild][zoneIndex] = { ...editingZone, ...newZone };
      setSafeZones(updatedZones);
    }

    setEditingZone(null);
    setNewZone({
      name: '',
      address: '',
      type: 'custom',
      radius: 100,
      notifications: { entry: true, exit: true, extended_stay: false }
    });
    setShowAddZone(false);
  };

  const handleDeleteZone = (zoneId) => {
    const updatedZones = [...safeZones];
    updatedZones[selectedChild] = updatedZones[selectedChild].filter(z => z.id !== zoneId);
    setSafeZones(updatedZones);
  };

  const toggleZoneStatus = (zoneId) => {
    const updatedZones = [...safeZones];
    const zoneIndex = updatedZones[selectedChild].findIndex(z => z.id === zoneId);
    
    if (zoneIndex !== -1) {
      updatedZones[selectedChild][zoneIndex].status = 
        updatedZones[selectedChild][zoneIndex].status === 'active' ? 'paused' : 'active';
      setSafeZones(updatedZones);
    }
  };

  const getZoneIcon = (zone) => {
    switch(zone) {
      case 'home': return Home;
      case 'school': return School;
      default: return MapPin;
    }
  };

  const getStatusColor = (status) => {
    return status === 'safe' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const getSafeZoneIcon = (type) => zoneTypes[type]?.icon || MapPin;
  const getSafeZoneColor = (type) => zoneTypes[type]?.color || "text-gray-600 bg-gray-50";
  const getStatusBadge = (status) => status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              {(currentScreen === 'messaging' || currentScreen === 'safezones') && (
                <button onClick={backToDashboard} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">
                {currentScreen === 'messaging' ? 'Mensagens Familiares' : 
                 currentScreen === 'safezones' ? 'Gerenciar Zonas Seguras' : 
                 'FamilyWatch'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <select 
                value={selectedChild} 
                onChange={(e) => setSelectedChild(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {children.map((child, index) => (
                  <option key={child.id} value={index}>{child.name}</option>
                ))}
              </select>
              
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </button>
              
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentScreen === 'dashboard' ? (
        // DASHBOARD
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Live Location</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span>Online</span>
                  </div>
                </div>
                
                <div className="h-96 w-full rounded-lg bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden border-2 border-gray-200 shadow-inner">
                  <div className="absolute inset-0 opacity-30">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="absolute w-full h-px bg-gray-400" style={{top: `${i * 5}%`}}></div>
                    ))}
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className="absolute h-full w-px bg-gray-400" style={{left: `${i * 5}%`}}></div>
                    ))}
                  </div>
                  
                  <div className="absolute top-4 left-4 text-xs text-gray-600 font-medium">5th Avenue</div>
                  <div className="absolute top-1/2 right-4 text-xs text-gray-600 font-medium transform rotate-90">Broadway</div>
                  
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="absolute inset-0 w-12 h-12 bg-blue-400 rounded-full opacity-25 animate-ping"></div>
                      <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-3 py-2 rounded-lg text-xs">
                        📍 {activeChild.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-6 right-6 bg-green-100 border-2 border-green-300 rounded-full w-20 h-20 flex items-center justify-center">
                    <div className="text-center">
                      <Home className="h-5 w-5 text-green-600 mx-auto" />
                      <div className="text-xs text-green-700">Home</div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-6 left-6 bg-blue-100 border-2 border-blue-300 rounded-full w-20 h-20 flex items-center justify-center">
                    <div className="text-center">
                      <School className="h-5 w-5 text-blue-600 mx-auto" />
                      <div className="text-xs text-blue-700">School</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getZoneIcon(activeChild.currentZone), { className: "h-5 w-5 text-gray-600" })}
                    <span className="text-sm font-medium text-gray-900">{activeChild.currentLocation}</span>
                  </div>
                  <span className="text-sm text-gray-500">Last updated: {activeChild.lastSeen}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <img src={activeChild.photo} alt={activeChild.name} className="w-16 h-16 rounded-full object-cover border-4 border-blue-100" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{activeChild.name}</h3>
                    <p className="text-sm text-gray-600">Age {activeChild.age}</p>
                  </div>
                  <div className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activeChild.status)}`}>
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Safe
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Battery className={`h-4 w-4 ${activeChild.battery > 50 ? 'text-green-500' : 'text-yellow-500'}`} />
                      <span className="text-sm font-medium text-gray-900">{activeChild.battery}%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Battery</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900">{activeChild.lastSeen}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Last Seen</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button onClick={openMessaging} className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-medium">Send Message</span>
                  </button>
                  
                  <button 
                    onClick={handleCheckMessage}
                    disabled={checkStatus === 'sending' || checkStatus === 'waiting'}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      checkStatus === 'success' ? 'bg-green-50 text-green-700' :
                      checkStatus === 'sending' || checkStatus === 'waiting' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-purple-50 hover:bg-purple-100 text-purple-700'
                    }`}
                  >
                    {checkStatus === 'sending' ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                        <span className="font-medium">Enviando Check...</span>
                      </>
                    ) : checkStatus === 'waiting' ? (
                      <>
                        <Clock className="h-5 w-5 animate-pulse" />
                        <span className="font-medium">Aguardando {activeChild.name}...</span>
                      </>
                    ) : checkStatus === 'success' ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Check OK! ✓</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-5 w-5" />
                        <span className="font-medium">Check Messages</span>
                      </>
                    )}
                  </button>
                  
                  <button onClick={openSafeZones} className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Manage Safe Zones</span>
                  </button>
                  
                  <button className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Emergency Alert</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="p-1.5 rounded-full bg-gray-100">
                        {React.createElement(activity.icon, { className: `h-3 w-3 ${activity.color}` })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.event}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : currentScreen === 'messaging' ? (
        // MESSAGING SCREEN
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img src={activeChild.photo} alt={activeChild.name} className="w-12 h-12 rounded-full object-cover" />
                  <div className={`absolute bottom-0 right-0 w-4 h-4 ${activeChild.messagingStatus === 'online' ? 'bg-green-500' : 'bg-gray-400'} rounded-full border-2 border-white`}></div>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">{activeChild.name}</h2>
                  <p className="text-sm text-gray-600">
                    {activeChild.messagingStatus === 'online' ? (
                      <span className="text-green-600">● Ativo agora</span>
                    ) : (
                      <span className="text-gray-500">● Visto por último {activeChild.lastSeen}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Seguro</span>
                </div>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'parent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'parent' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${message.sender === 'parent' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp}
                      </span>
                      {message.verified && (
                        <CheckCircle className={`h-3 w-3 ${message.sender === 'parent' ? 'text-blue-200' : 'text-green-500'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Envie uma mensagem para ${activeChild.name}...`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Enviar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // SAFE ZONES SCREEN
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Mapa de Zonas - {activeChild.name}</h2>
                  <button
                    onClick={() => setShowAddZone(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nova Zona</span>
                  </button>
                </div>
                
                <div className="h-96 w-full rounded-lg bg-gradient-to-br from-green-50 to-blue-50 relative overflow-hidden border-2 border-gray-200 shadow-inner">
                  <div className="absolute inset-0 opacity-20">
                    {[...Array(15)].map((_, i) => (
                      <div key={`h-${i}`} className="absolute w-full h-px bg-gray-400" style={{top: `${i * 6.67}%`}}></div>
                    ))}
                    {[...Array(15)].map((_, i) => (
                      <div key={`v-${i}`} className="absolute h-full w-px bg-gray-400" style={{left: `${i * 6.67}%`}}></div>
                    ))}
                  </div>
                  
                  <div className="absolute top-2 left-2 text-xs text-gray-600 font-medium">Oak Street</div>
                  <div className="absolute top-1/3 right-2 text-xs text-gray-600 font-medium transform rotate-90">School Ave</div>
                  
                  {childSafeZones.map((zone, index) => {
                    const positions = [
                      { top: '60%', left: '25%' },
                      { top: '30%', left: '70%' },
                      { top: '70%', left: '60%' },
                    ];
                    const pos = positions[index % positions.length];
                    
                    return (
                      <div
                        key={zone.id}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2"
                        style={{ top: pos.top, left: pos.left }}
                      >
                        <div 
                          className={`rounded-full border-2 flex items-center justify-center opacity-60 ${
                            zone.status === 'active' 
                              ? zone.type === 'home' ? 'border-green-400 bg-green-100' :
                                zone.type === 'school' ? 'border-blue-400 bg-blue-100' :
                                'border-purple-400 bg-purple-100'
                              : 'border-gray-400 bg-gray-100'
                          }`}
                          style={{ width: `${Math.max(zone.radius / 5, 40)}px`, height: `${Math.max(zone.radius / 5, 40)}px` }}
                        >
                          {React.createElement(getSafeZoneIcon(zone.type), { 
                            className: `h-4 w-4 ${zone.status === 'active' ? 
                              zone.type === 'home' ? 'text-green-600' :
                              zone.type === 'school' ? 'text-blue-600' :
                              'text-purple-600'
                              : 'text-gray-600'
                            }`
                          })}
                        </div>
                        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded px-2 py-1 text-xs font-medium shadow-sm">
                          {zone.name}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-2 py-1 rounded text-xs">
                        {activeChild.name}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <img src={activeChild.photo} alt={activeChild.name} className="w-12 h-12 rounded-full object-cover border-2 border-green-100" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{activeChild.name}</h3>
                    <p className="text-sm text-gray-600">{childSafeZones.length} zonas configuradas</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-green-900">{childSafeZones.filter(z => z.status === 'active').length}</div>
                    <div className="text-xs text-green-700">Zonas ativas</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-blue-900">
                      {childSafeZones.reduce((total, zone) => total + zone.stats.entries, 0)}
                    </div>
                    <div className="text-xs text-blue-700">Total de entradas</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Zonas Seguras</h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {childSafeZones.length === 0 ? (
                    <div className="p-6 text-center">
                      <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhuma zona configurada ainda.</p>
                      <button onClick={() => setShowAddZone(true)} className="mt-2 text-green-600 hover:text-green-800 text-sm">
                        Criar primeira zona
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {childSafeZones.map((zone) => (
                        <div key={zone.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`p-2 rounded-lg ${getSafeZoneColor(zone.type)}`}>
                                {React.createElement(getSafeZoneIcon(zone.type), { className: "h-4 w-4" })}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">{zone.name}</h4>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(zone.status)}`}>
                                    {zone.status === 'active' ? 'Ativa' : 'Pausada'}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-gray-600 truncate">{zone.address}</p>
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span>Raio: {zone.radius}m</span>
                                  <span>{zone.stats.entries} entradas</span>
                                  <span>Última: {zone.lastTriggered}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => toggleZoneStatus(zone.id)}
                                className={`p-1 rounded ${zone.status === 'active' ? 'text-yellow-600 hover:bg-yellow-100' : 'text-green-600 hover:bg-green-100'}`}
                                title={zone.status === 'active' ? 'Pausar zona' : 'Ativar zona'}
                              >
                                {zone.status === 'active' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                              </button>
                              
                              <button onClick={() => handleEditZone(zone)} className="p-1 text-blue-600 hover:bg-blue-100 rounded" title="Editar zona">
                                <Edit className="h-4 w-4" />
                              </button>
                              
                              <button onClick={() => handleDeleteZone(zone.id)} className="p-1 text-red-600 hover:bg-red-100 rounded" title="Excluir zona">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check Modal */}
      {showCheckPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <img src={activeChild.photo} alt={activeChild.name} className="w-12 h-12 rounded-full object-cover" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verificação Solicitada</h3>
              <p className="text-sm text-gray-600">Mamãe/Papai está pedindo para você dar um check. Digite sua senha e clique OK.</p>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={checkPassword}
                onChange={(e) => setCheckPassword(e.target.value)}
                placeholder="Digite sua senha..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              {checkPasswordError && <p className="text-sm text-red-600">{checkPasswordError}</p>}

              <div className="flex space-x-3">
                <button onClick={cancelCheck} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleCheckPasswordSubmit} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  OK ✓
                </button>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Demo:</strong> Senha: "1234" ou "{activeChild.name.toLowerCase()}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Password Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{activeChild.name} está respondendo...</h3>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha familiar..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setPassword('');
                    setPasswordError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button onClick={handlePasswordSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Verificar
                </button>
              </div>

              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>Demo:</strong> Senha: "1234" ou "{activeChild.name.toLowerCase()}"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Zone Modal */}
      {showAddZone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingZone ? 'Editar Zona Segura' : 'Nova Zona Segura'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddZone(false);
                    setEditingZone(null);
                    setNewZone({
                      name: '',
                      address: '',
                      type: 'custom',
                      radius: 100,
                      notifications: { entry: true, exit: true, extended_stay: false }
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Zona</label>
                  <input
                    type="text"
                    value={newZone.name}
                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                    placeholder="Ex: Casa da vovó, Escola, Parque..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={newZone.address}
                    onChange={(e) => setNewZone({ ...newZone, address: e.target.value })}
                    placeholder="Rua, número, bairro, cidade"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Zona</label>
                  <select
                    value={newZone.type}
                    onChange={(e) => setNewZone({ ...newZone, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="home">🏠 Casa</option>
                    <option value="school">🏫 Escola</option>
                    <option value="activity">⚽ Atividade</option>
                    <option value="family">👥 Família</option>
                    <option value="custom">📍 Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Raio da Zona: {newZone.radius}m</label>
                  <input
                    type="range"
                    min="50"
                    max="500"
                    step="10"
                    value={newZone.radius}
                    onChange={(e) => setNewZone({ ...newZone, radius: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50m</span>
                    <span>500m</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notificações</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newZone.notifications.entry}
                        onChange={(e) => setNewZone({
                          ...newZone,
                          notifications: { ...newZone.notifications, entry: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Notificar quando entrar na zona</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newZone.notifications.exit}
                        onChange={(e) => setNewZone({
                          ...newZone,
                          notifications: { ...newZone.notifications, exit: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Notificar quando sair da zona</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newZone.notifications.extended_stay}
                        onChange={(e) => setNewZone({
                          ...newZone,
                          notifications: { ...newZone.notifications, extended_stay: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Notificar permanência prolongada (4+ horas)</span>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddZone(false);
                      setEditingZone(null);
                      setNewZone({
                        name: '',
                        address: '',
                        type: 'custom',
                        radius: 100,
                        notifications: { entry: true, exit: true, extended_stay: false }
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  
                  <button
                    onClick={editingZone ? handleUpdateZone : handleAddZone}
                    disabled={!newZone.name || !newZone.address}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {editingZone ? 'Atualizar' : 'Criar Zona'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilySafetyApp;
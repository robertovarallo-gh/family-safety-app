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
  Send 
} from 'lucide-react';

const FamilyTrackingApp = () => {
  const [selectedChild, setSelectedChild] = useState(0);
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [checkStatus, setCheckStatus] = useState('idle');
  const [checkRequestTime, setCheckRequestTime] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showEmergencyConfirmation, setShowEmergencyConfirmation] = useState(false);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [alertStartTime, setAlertStartTime] = useState(null);

  const children = [
    {
      id: 1,
      name: "Emma",
      age: 8,
      location: "Roosevelt Elementary School",
      distance: "0.8 miles away",
      lastUpdate: "2 min ago",
      battery: 85,
      isConnected: true,
      avatar: "👧",
      photo: "/api/placeholder/48/48",
      safeZone: "School",
      messagingStatus: "online",
      messages: [
        { 
          id: 1, 
          sender: 'parent', 
          message: 'Oi Emma! Como foi a aula hoje?', 
          timestamp: '14:30', 
          verified: true 
        },
        { 
          id: 2, 
          sender: 'child', 
          message: 'Foi legal! Aprendi sobre dinossauros 🦕', 
          timestamp: '14:32', 
          verified: true 
        }
      ]
    },
    {
      id: 2,
      name: "Jake",
      age: 12,
      location: "Central Park",
      distance: "1.2 miles away",
      lastUpdate: "5 min ago",
      battery: 62,
      isConnected: true,
      avatar: "👦",
      photo: "/api/placeholder/48/48",
      safeZone: "Park",
      messagingStatus: "offline",
      messages: [
        { 
          id: 1, 
          sender: 'parent', 
          message: 'Jake, lembra de voltar às 17h!', 
          timestamp: '15:45', 
          verified: true 
        },
        { 
          id: 2, 
          sender: 'child', 
          message: 'Ok pai! Estou jogando futebol com os amigos', 
          timestamp: '15:50', 
          verified: true 
        }
      ]
    }
  ];

  const familyMembers = [
    { name: "Mom - Sarah", phone: "+1 (555) 123-4567" },
    { name: "Dad - Michael", phone: "+1 (555) 987-6543" },
    { name: "Grandma - Mary", phone: "+1 (555) 456-7890" },
    { name: "Uncle John", phone: "+1 (555) 321-0987" }
  ];

  const activeChild = children[selectedChild];

  useEffect(() => {
    let interval;
    if (isEmergencyActive) {
      interval = setInterval(() => {
        // Force re-render
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEmergencyActive]);

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
    
    if (validPasswords.includes(password.toLowerCase())) {
      setCheckStatus('success');
      setShowPasswordModal(false);
      setPassword('');
      setPasswordError('');
      
      setTimeout(() => {
        setCheckStatus('idle');
      }, 5000);
    } else {
      setPasswordError('Senha incorreta. Tente novamente.');
      setPassword('');
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

  if (showEmergencyConfirmation) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => setShowEmergencyConfirmation(false)}
              className="p-2 hover:bg-red-500 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">🚨 Confirm Emergency</h1>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-8">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">What type of emergency?</h2>
            <p className="text-gray-600">All family members will be notified immediately</p>
          </div>

          <div className="space-y-4 mb-8">
            <button
              onClick={() => confirmEmergency('Medical Emergency')}
              className="w-full p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
            >
              🏥 Medical Emergency
            </button>
            
            <button
              onClick={() => confirmEmergency('Safety Emergency')}
              className="w-full p-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
            >
              ⚠️ Safety Emergency
            </button>
            
            <button
              onClick={() => confirmEmergency('General Emergency')}
              className="w-full p-4 bg-red-400 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors"
            >
              🚨 General Emergency
            </button>
          </div>

          <button
            onClick={() => setShowEmergencyConfirmation(false)}
            className="w-full p-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (currentScreen === 'safezones') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 hover:bg-green-500 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">🛡️ Safe Zones</h1>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">🗺️ Safe Zones Map</h3>
              <p className="text-sm text-gray-600">View all configured safe zones</p>
            </div>
            
            <div className="relative h-64 bg-gradient-to-br from-emerald-100 via-green-200 to-teal-200">
              <div className="absolute top-8 left-8">
                <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <span className="text-lg">🏫</span>
                </div>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded px-2 py-1 shadow text-xs font-medium">
                  School
                </div>
              </div>
              
              <div className="absolute bottom-8 left-12">
                <div className="w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <span className="text-lg">🏠</span>
                </div>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded px-2 py-1 shadow text-xs font-medium">
                  Home
                </div>
              </div>
              
              <div className="absolute top-12 right-12">
                <div className="w-12 h-12 bg-green-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <span className="text-lg">🌳</span>
                </div>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded px-2 py-1 shadow text-xs font-medium">
                  Park
                </div>
              </div>
              
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white">
                  <span className="text-sm">{activeChild.avatar}</span>
                </div>
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white rounded px-1 py-0.5 text-xs">
                  {activeChild.name}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">Current Safe Zones:</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <span className="font-medium text-gray-800">🏫 School Zone</span>
                  <p className="text-sm text-gray-600">Roosevelt Elementary School</p>
                </div>
                <span className="text-green-600">✓ Active</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <span className="font-medium text-gray-800">🏠 Home Zone</span>
                  <p className="text-sm text-gray-600">Family Home</p>
                </div>
                <span className="text-green-600">✓ Active</span>
              </div>
            </div>
          </div>

          <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mb-4">
            + Add New Safe Zone
          </button>
        </div>
      </div>
    );
  }

  if (currentScreen === 'messaging') {
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
            <h1 className="text-xl font-bold">Mensagens Familiares</h1>
          </div>
        </div>

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
                    <span className="text-gray-500">● Offline</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {activeChild.messages.map((message) => (
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
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === 'emergency') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {isEmergencyActive && (
          <div className="bg-red-600 text-white p-4 animate-pulse">
            <div className="text-center">
              <h2 className="text-lg font-bold">🚨 EMERGENCY ACTIVE</h2>
              <p className="text-sm opacity-90">{emergencyType}</p>
              <p className="text-sm opacity-90">Started at: {formatTime(alertStartTime)}</p>
              <p className="text-sm opacity-90">Duration: {getTimeDifference()}</p>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-4">
          <div className="flex items-center space-x-3 mb-4">
            <button 
              onClick={() => setCurrentScreen('dashboard')}
              className="p-2 hover:bg-red-500 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold">🚨 Emergency Alert</h1>
          </div>
        </div>

        <div className="p-6">
          {!isEmergencyActive ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Emergency Button</h2>
                <p className="text-gray-600 mb-8">Press this button if you need immediate help.</p>
                
                <button 
                  onClick={handleEmergencyPress}
                  className="relative w-48 h-48 mx-auto bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg animate-pulse transform hover:scale-105 transition-all duration-300"
                >
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
                      <span className="text-green-600">
                        <CheckCircle className="h-5 w-5" />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-8">
                <AlertTriangle className="h-24 w-24 text-red-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold text-red-600 mb-2">🚨 EMERGENCY ACTIVATED</h2>
                <p className="text-lg text-gray-700 mb-2">{emergencyType}</p>
                <p className="text-gray-600">All family members have been notified</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-green-800 mb-3">📱 Notification Status:</h3>
                <div className="space-y-2">
                  {familyMembers.map((member, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-green-700">{member.name}</span>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-green-600">Notified</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                  📞 Call 911
                </button>
                
                <button className="w-full flex items-center justify-center space-x-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <MapPin className="h-5 w-5" />
                  <span>Share My Location</span>
                </button>
              </div>

              <button
                onClick={cancelEmergency}
                className="w-full py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
              >
                Cancel Emergency Alert
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">FamilyWatch</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <select 
                value={selectedChild} 
                onChange={(e) => setSelectedChild(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {children.map((child, index) => (
                  <option key={child.id} value={index}>
                    {child.name}
                  </option>
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

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">1º MAPA</span>
              Live Location
            </h3>
            <p className="text-sm text-gray-600">{activeChild.location} • {activeChild.distance}</p>
          </div>
          
          <div className="relative w-full h-64 bg-gradient-to-br from-green-100 via-green-200 to-blue-200">
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xl animate-pulse border-4 border-white">
                  <span className="text-3xl">{activeChild.avatar}</span>
                </div>
                <div className="bg-white rounded-lg px-4 py-2 shadow-lg border">
                  <p className="text-sm font-bold text-gray-800">{activeChild.name}</p>
                  <p className="text-xs text-gray-600">{activeChild.location}</p>
                </div>
              </div>
            </div>
            
            <div className="absolute top-4 left-4 z-20">
              <div className="bg-green-500 text-white px-3 py-2 rounded-full text-sm font-medium shadow-lg">
                Safe Zone: {activeChild.safeZone}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">2º INFO</span>
            <h3 className="text-lg font-semibold text-gray-900">Child Information</h3>
          </div>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <img src={activeChild.photo} alt={activeChild.name} className="w-16 h-16 rounded-full object-cover" />
              <div className={`absolute bottom-0 right-0 w-5 h-5 ${activeChild.isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full border-2 border-white`}></div>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{activeChild.name}</h2>
              <p className="text-gray-600">{activeChild.age} years old</p>
              <div className="flex items-center space-x-2 mt-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{activeChild.location}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Battery className={`h-4 w-4 ${activeChild.battery > 20 ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm font-medium">{activeChild.battery}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Battery</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Wifi className={`h-4 w-4 ${activeChild.isConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className="text-sm font-medium">{activeChild.isConnected ? 'Connected' : 'Offline'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Status</p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">Last update: {activeChild.lastUpdate}</p>
            <p className="text-sm text-green-600 font-medium">✓ In Safe Zone: {activeChild.safeZone}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center mb-3">
            <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm mr-3 font-bold">3º ACTIONS</span>
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          
          <button 
            onClick={() => setCurrentScreen('messaging')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">Send Message</span>
          </button>

          <button 
            onClick={handleCheckMessages}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              checkStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
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
                <span className="ml-auto text-xs bg-green-200 px-2 py-1 rounded">
                  {checkRequestTime}
                </span>
              </>
            ) : (
              <>
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">Check Messages</span>
              </>
            )}
          </button>
          
          <button 
            onClick={() => setCurrentScreen('safezones')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors"
          >
            <Shield className="h-5 w-5" />
            <span className="font-medium">Manage Safe Zones</span>
          </button>
          
          <button 
            onClick={() => setCurrentScreen('emergency')}
            className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors animate-pulse"
          >
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">🚨 Emergency Alert</span>
          </button>
        </div>
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
                {activeChild.name} está respondendo. Digite a senha familiar:
              </p>
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                    setPassword('');
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
                💡 Senhas de teste: 1234, emma, jake
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTrackingApp;
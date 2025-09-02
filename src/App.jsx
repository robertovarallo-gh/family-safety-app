import React, { useState, useEffect } from 'react';
import { MapPin, Battery, Clock, Shield, MessageCircle, Bell, Settings, User, Home, School, AlertTriangle, CheckCircle, Wifi, WifiOff } from 'lucide-react';

const FamilySafetyDashboard = () => {
  const [selectedChild, setSelectedChild] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const children = [
    {
      id: 1,
      name: "Emma",
      age: 12,
      avatar: "👧",
      currentLocation: "Roosevelt Elementary School",
      latitude: 40.7589,
      longitude: -73.9851,
      battery: 78,
      lastSeen: "2 min ago",
      status: "safe",
      deviceOnline: true,
      currentZone: "school"
    },
    {
      id: 2,
      name: "Jake",
      age: 9,
      avatar: "👦",
      currentLocation: "Home",
      latitude: 40.7505,
      longitude: -73.9934,
      battery: 45,
      lastSeen: "5 min ago",
      status: "safe",
      deviceOnline: true,
      currentZone: "home"
    }
  ];

  const recentActivity = [
    { time: "2:45 PM", event: "Emma entered Roosevelt Elementary", type: "geofence", icon: School, color: "text-green-600" },
    { time: "2:30 PM", event: "Jake's battery dropped to 45%", type: "battery", icon: Battery, color: "text-yellow-600" },
    { time: "1:15 PM", event: "Emma left McDonald's", type: "geofence", icon: MapPin, color: "text-blue-600" },
    { time: "12:50 PM", event: "Jake arrived at Home", type: "geofence", icon: Home, color: "text-green-600" },
    { time: "12:30 PM", event: "Emma entered McDonald's", type: "geofence", icon: MapPin, color: "text-blue-600" }
  ];

  const activeChild = children[selectedChild];

  const getZoneIcon = (zone) => {
    switch(zone) {
      case 'home': return Home;
      case 'school': return School;
      default: return MapPin;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'safe': return 'text-green-600 bg-green-100';
      case 'attention': return 'text-yellow-600 bg-yellow-100';
      case 'alert': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">FamilyWatch</h1>
            </div>
            
            {/* Child Selector */}
            <div className="flex items-center space-x-4">
              <select 
                value={selectedChild} 
                onChange={(e) => setSelectedChild(parseInt(e.target.value))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {children.map((child, index) => (
                  <option key={child.id} value={index}>
                    {child.avatar} {child.name}
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Map Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Live Location</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {activeChild.deviceOnline ? (
                    <>
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-red-500" />
                      <span>Offline</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Mock Map */}
              <div className="h-96 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                
                {/* Map Pin */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                      {activeChild.name} is here
                    </div>
                  </div>
                </div>
                
                {/* Safe Zones */}
                <div className="absolute top-8 right-8 bg-green-100 border-2 border-green-300 rounded-full w-16 h-16 flex items-center justify-center">
                  <Home className="h-6 w-6 text-green-600" />
                </div>
                
                <div className="absolute bottom-8 left-8 bg-blue-100 border-2 border-blue-300 rounded-full w-16 h-16 flex items-center justify-center">
                  <School className="h-6 w-6 text-blue-600" />
                </div>
                
                {/* Map Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
                  <button className="bg-white border border-gray-300 rounded-lg p-2 shadow-sm hover:bg-gray-50">
                    <span className="text-lg">+</span>
                  </button>
                  <button className="bg-white border border-gray-300 rounded-lg p-2 shadow-sm hover:bg-gray-50">
                    <span className="text-lg">-</span>
                  </button>
                </div>
              </div>
              
              {/* Location Info */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {React.createElement(getZoneIcon(activeChild.currentZone), { className: "h-5 w-5 text-gray-600" })}
                  <span className="text-sm font-medium text-gray-900">{activeChild.currentLocation}</span>
                </div>
                <span className="text-sm text-gray-500">Last updated: {activeChild.lastSeen}</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Child Status Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-3xl">{activeChild.avatar}</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{activeChild.name}</h3>
                  <p className="text-sm text-gray-600">Age {activeChild.age}</p>
                </div>
                <div className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activeChild.status)}`}>
                  <CheckCircle className="h-3 w-3 inline mr-1" />
                  Safe
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Battery className={`h-4 w-4 ${activeChild.battery > 50 ? 'text-green-500' : activeChild.battery > 20 ? 'text-yellow-500' : 'text-red-500'}`} />
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

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors">
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-medium">Send Message</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Manage Safe Zones</span>
                </button>
                
                <button className="w-full flex items-center space-x-3 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Emergency Alert</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.slice(0, 4).map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`p-1.5 rounded-full bg-gray-100`}>
                      {React.createElement(activity.icon, { className: `h-3 w-3 ${activity.color}` })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.event}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors">
                View All Activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilySafetyDashboard;
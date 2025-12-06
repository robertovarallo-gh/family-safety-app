import React from 'react';

const DashboardLayout = ({ 
  selectedMember,
  onMemberSelect,
  members = [],
  memberStatus,
  renderMap,
  renderMemberInfo,
  renderActions
}) => {
  return (
    <>
      {/* ========== MOBILE LAYOUT ========== */}
      <div className="md:hidden flex flex-col h-screen">
        {/* Mapa - 50% fijo */}
        <div className="h-1/2 w-full">
          {renderMap()}
        </div>

        {/* Selector y Status - Fijo */}
        <div className="bg-white border-b px-4 py-3 shadow-sm">
          {/* Selector de miembro */}
          <div className="flex items-center space-x-2 mb-2 overflow-x-auto pb-2">
            {members.map((member, index) => (
              <button
                key={member.id}
                onClick={() => onMemberSelect(index)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedMember === index
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{member.avatar}</span>
                {member.name}
              </button>
            ))}
          </div>

          {/* Status */}
          {memberStatus && (
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${memberStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-600">{memberStatus.text}</span>
            </div>
          )}
        </div>

        {/* Botones - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-4">
          {renderActions()}
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT ========== */}
      <div className="hidden md:flex h-screen overflow-hidden">
        {/* Contenido principal - Izquierda */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mapa - Ocupa espacio disponible */}
          <div style={{ height: 'calc(100vh - 100px)' }}>
            {renderMap()}
          </div>
        </div>

        {/* Sidebar - Derecha */}
        <div className="w-80 bg-white border-l flex flex-col shadow-lg">
          {/* Header del Sidebar */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🛡️</span>
              </div>
              <h1 className="text-xl font-bold">FamilyWatch</h1>
            </div>
          </div>

          {/* Selector de miembro */}
          <div className="p-4 border-b bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miembro de familia
            </label>
            <select 
              value={selectedMember} 
              onChange={(e) => onMemberSelect(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {members.map((member, index) => (
                <option key={member.id} value={index}>
                  {member.avatar} {member.name}
                </option>
              ))}
            </select>

            {/* Status */}
            {memberStatus && (
              <div className="flex items-center space-x-2 mt-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${memberStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">{memberStatus.text}</span>
              </div>
            )}
          </div>

          {/* Acciones - Sin scroll, todo visible */}
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            {renderActions()}
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
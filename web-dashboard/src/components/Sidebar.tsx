import React, { useContext } from 'react';
import {
  Heart, BarChart3, Pill, Brain, Settings, LogOut, Home, User, Activity, Shield, Users, CreditCard, FileText
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  currentPage: string;
  isAdmin?: boolean;
}

const Sidebar = ({ isOpen, onNavigate, onLogout, currentPage, isAdmin = false }: SidebarProps) => {
  const { logout } = useContext(AuthContext);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, color: '#2563eb' },
    { id: 'profile', name: 'Profile', icon: User, color: '#6366f1' },
    { id: 'medications', name: 'Medications', icon: Pill, color: '#8b5cf6' },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, color: '#ec4899' },
    { id: 'ai-health', name: 'AI Health', icon: Activity, color: '#14b8a6' },
    { id: 'ai-recommendations', name: 'AI Insights', icon: Brain, color: '#f59e0b' },
    { id: 'settings', name: 'Settings', icon: Settings, color: '#6b7280' },
  ];

  // Add admin menu items if user is admin
  if (isAdmin) {
    navigation.push(
      { id: 'admin-patients', name: 'Patient Management', icon: Users, color: '#2563eb' },
      { id: 'bulk-rfid', name: 'Bulk RFID Assignment', icon: CreditCard, color: '#8b5cf6' },
      { id: 'activity-logs', name: 'Activity Logs', icon: FileText, color: '#f59e0b' },
      { id: 'admin-management', name: 'Admin Management', icon: Shield, color: '#dc2626' }
    );
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Sidebar */}
      <div
        style={{
          width: isOpen ? '256px' : '0px',
          backgroundColor: '#1f2937',
          transition: 'width 0.3s ease',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          position: 'relative'
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '20px 16px',
            borderBottom: '1px solid #374151'
          }}
        >
          <div style={{ width: '40px', height: '40px', backgroundColor: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>MediBot</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Health Monitor</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto' }}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '12px 12px',
                  marginBottom: '8px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isActive ? '#374151' : 'transparent',
                  color: isActive ? '#fff' : '#d1d5db',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '500',
                  borderLeft: isActive ? `4px solid ${item.color}` : '4px solid transparent'
                }}
              >
                <Icon size={20} color={isActive ? item.color : '#d1d5db'} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div
          style={{
            padding: '16px 8px',
            borderTop: '1px solid #374151'
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 12px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <LogOut size={20} />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

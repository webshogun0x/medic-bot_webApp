import React, { useState, useContext } from 'react';
import { Menu, X, Heart } from 'lucide-react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import ProfilePage from './pages/ProfilePage';
import MedicationPage from './pages/MedicationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIHealthPage from './pages/AIHealthPage';
import AIRecommendationPage from './pages/AIRecommendationPage';
import SettingsPage from './pages/SettingsPage';
import AdminManagementPage from './pages/AdminManagementPage';
import AdminPatientsPage from './pages/AdminPatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import BulkRFIDPage from './pages/BulkRFIDPage';
import AdminActivityLogsPage from './pages/AdminActivityLogsPage';
import Sidebar from './components/Sidebar';
import { AuthContext } from './context/AuthContext';

const DashboardContainer = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  const handleNavigate = (page: string) => {
    const routes: { [key: string]: string } = {
      'dashboard': '/dashboard',
      'profile': '/dashboard/profile',
      'medications': '/dashboard/medication',
      'analytics': '/dashboard/analytics',
      'ai-health': '/dashboard/ai-health',
      'ai-recommendations': '/dashboard/ai-recommendations',
      'settings': '/dashboard/settings',
      'admin-management': '/dashboard/admin-management',
      'admin-patients': '/dashboard/admin-patients',
      'bulk-rfid': '/dashboard/bulk-rfid',
      'activity-logs': '/dashboard/activity-logs'
    };
    navigate(routes[page] || '/dashboard');
    // Close sidebar on mobile when navigating
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get current page from URL for sidebar highlighting
  const getPageFromRoute = () => {
    const pathname = window.location.pathname;
    if (pathname.includes('profile')) return 'profile';
    if (pathname.includes('medication')) return 'medications';
    if (pathname.includes('analytics')) return 'analytics';
    if (pathname.includes('ai-health')) return 'ai-health';
    if (pathname.includes('ai-recommendations')) return 'ai-recommendations';
    if (pathname.includes('settings')) return 'settings';
    if (pathname.includes('admin-management')) return 'admin-management';
    if (pathname.includes('admin-patients')) return 'admin-patients';
    if (pathname.includes('bulk-rfid')) return 'bulk-rfid';
    if (pathname.includes('activity-logs')) return 'activity-logs';
    return 'dashboard';
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#ffffff' }}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        currentPage={getPageFromRoute()}
        isAdmin={isAdmin}
      />

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar with Menu Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            gap: '16px'
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b5563'
            }}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={20} color="#2563eb" />
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>MediBot</span>
          </div>
        </div>

        {/* Content Area with Routes */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Dashboard onNavigate={handleNavigate} />} />
            <Route path="/profile" element={<ProfilePage onBack={() => handleNavigate('dashboard')} />} />
            <Route path="/medication" element={<MedicationPage onBack={() => handleNavigate('dashboard')} />} />
            <Route path="/analytics" element={<AnalyticsPage onBack={() => handleNavigate('dashboard')} />} />
            <Route path="/ai-health" element={<AIHealthPage onBack={() => handleNavigate('dashboard')} />} />
            <Route path="/ai-recommendations" element={<AIRecommendationPage onBack={() => handleNavigate('dashboard')} />} />
            <Route path="/settings" element={<SettingsPage onBack={() => handleNavigate('dashboard')} />} />
            {isAdmin && (
              <>
                <Route path="/admin-management" element={<AdminManagementPage onBack={() => handleNavigate('dashboard')} />} />
                <Route path="/admin-patients" element={<AdminPatientsPage onBack={() => handleNavigate('dashboard')} />} />
                <Route path="/admin-patient-detail/:uid" element={<PatientDetailPage onBack={() => handleNavigate('admin-patients')} />} />
                <Route path="/bulk-rfid" element={<BulkRFIDPage onBack={() => handleNavigate('admin-patients')} />} />
                <Route path="/activity-logs" element={<AdminActivityLogsPage onBack={() => handleNavigate('dashboard')} />} />
              </>
            )}
          </Routes>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
            display: window.innerWidth < 1024 ? 'block' : 'none'
          }}
        />
      )}
    </div>
  );
};

export default DashboardContainer;

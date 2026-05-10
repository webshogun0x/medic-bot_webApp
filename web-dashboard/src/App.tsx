import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import DashboardContainer from './DashboardContainer';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

function AppContent() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isTokenValid, setIsTokenValid] = useState(true);

  useEffect(() => {
    // Check if token is expired on mount and every minute
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('userToken');
      
      if (!token && user) {
        // User exists but no token, log out
        setIsTokenValid(false);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userId');
        navigate('/login');
      }
    };

    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [user, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '18px', marginBottom: '16px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <SignInPage onNavigate={() => navigate('/dashboard')} onSwitchToSignUp={() => navigate('/signup')} /> : <Navigate to="/dashboard" />} />
      <Route path="/signup" element={!user ? <SignUpPage onSwitchToSignIn={() => navigate('/login')} /> : <Navigate to="/dashboard" />} />
      <Route path="/dashboard/*" element={user && isTokenValid ? <DashboardContainer /> : <Navigate to="/login" />} />
      <Route path="/" element={<Navigate to={user && isTokenValid ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

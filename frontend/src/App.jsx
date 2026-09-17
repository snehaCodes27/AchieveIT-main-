import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SplashScreen from './components/SplashScreen';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import HodLoginPage from './pages/auth/HodLoginPage';
import StudentDashboard from './pages/student/StudentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import './styles/App.css';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState('landing');
  const [portalMode, setPortalMode] = useState('user'); // 'user' or 'admin'

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  // If user is authenticated, route to their dedicated dashboard
  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <AdminDashboard />;
    }
    if (user.role === 'teacher') {
      return <TeacherDashboard />;
    }
    return <StudentDashboard />;
  }

  // Separate Login pages for User Portal vs HOD Portal
  if (currentView === 'login') {
    if (portalMode === 'admin') {
      return <HodLoginPage onBackHome={() => setCurrentView('landing')} />;
    }
    return <LoginPage onBackHome={() => setCurrentView('landing')} />;
  }

  return (
    <LandingPage
      onSelectPortal={(portal) => {
        setPortalMode(portal);
        setCurrentView('login');
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
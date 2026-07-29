import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminLogin from './pages/AdminLogin';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Contacts from './pages/Contacts';
import Templates from './pages/Templates';
import Broadcast from './pages/Broadcast';
import Flows from './pages/Flows';
import QuickReplies from './pages/QuickReplies';
import DripSequences from './pages/DripSequences';
import Analytics from './pages/Analytics';
import Billing from './pages/Billing';
import Plans from './pages/Plans';
import Agents from './pages/Agents';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import Admin from './pages/Admin';
import AdminPlans from './pages/AdminPlans';
import Onboarding from './pages/Onboarding';
import Landing from './pages/Landing';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function OnboardingRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg, #0f172a)', color: 'white' }}>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={user ? (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <Landing />} />
      <Route path="/login" element={user ? (isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />) : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="/admin/login" element={user && isAdmin ? <Navigate to="/admin" replace /> : <AdminLogin />} />
      <Route path="/onboarding/*" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

      {/* Admin Routes */}
      {isAdmin && (
        <Route path="/admin/*" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Admin />} />
          <Route path="users" element={<Admin />} />
          <Route path="users/:id" element={<Admin />} />
          <Route path="numbers" element={<Admin />} />
          <Route path="messages" element={<Admin />} />
          <Route path="contacts" element={<Admin />} />
          <Route path="templates" element={<Admin />} />
          <Route path="flows" element={<Admin />} />
          <Route path="pricing" element={<Admin />} />
          <Route path="settings" element={<Admin />} />
          <Route path="facebook" element={<Admin />} />
          <Route path="whatsapp-api" element={<Admin />} />
          <Route path="notifications-admin" element={<Admin />} />
          <Route path="logs" element={<Admin />} />
          <Route path="agents" element={<Admin />} />
          <Route path="drip-sequences" element={<Admin />} />
          <Route path="plans" element={<AdminPlans />} />
        </Route>
      )}

      {/* User Routes */}
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/broadcast" element={<Broadcast />} />
        <Route path="/flows" element={<Flows />} />
        <Route path="/quick-replies" element={<QuickReplies />} />
        <Route path="/drip-sequences" element={<DripSequences />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
          <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

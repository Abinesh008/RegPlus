import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { api, setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);

  // Recovery: refresh access token using cookie
  const refreshSession = useCallback(async () => {
    const res = await api.refresh();
    if (res.success && res.data) {
      setUser(res.data.user);
      setAccessToken(res.data.access_token);
      setLoading(false);
      return res.data.access_token;
    }
    setUser(null);
    setAccessToken(null);
    setLoading(false);
    return null;
  }, []);

  // Login handler
  const login = async (email, password) => {
    setError(null);
    const res = await api.login(email, password);
    if (res.success && res.data) {
      setUser(res.data.user);
      setAccessToken(res.data.access_token);
      return { success: true };
    }
    setError(res.error || 'Login failed');
    return { success: false, error: res.error };
  };

  // Logout handler
  const logout = async () => {
    await api.logout();
    setUser(null);
    setAccessToken(null);
    setShowIdleWarning(false);
  };

  // Initial check on mount to restore user session
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Idle Timer logic
  useEffect(() => {
    if (!user) return;

    let warningTimer;
    let logoutTimer;

    const resetTimers = () => {
      setShowIdleWarning(false);
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);

      // 15 mins warning (900000 ms)
      warningTimer = setTimeout(() => {
        setShowIdleWarning(true);
      }, 15 * 60 * 1000);

      // 20 mins logout (1200000 ms)
      logoutTimer = setTimeout(() => {
        logout();
      }, 20 * 60 * 1000);
    };

    // Track user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimers));

    // Initialize timers on mount/user update
    resetTimers();

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(logoutTimer);
      events.forEach(event => window.removeEventListener(event, resetTimers));
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, refreshSession, showIdleWarning }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, setToken, removeToken, getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdmin() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await authService.getMe();
        if (res.success && res.admin) {
          setAdmin(res.admin);
        } else {
          removeToken();
          setAdmin(null);
        }
      } catch (err) {
        removeToken();
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    }

    loadAdmin();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.token) {
      setToken(res.token);
      setAdmin(res.admin);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    removeToken();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

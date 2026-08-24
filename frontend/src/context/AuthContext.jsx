import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('roboscope_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    let isMounted = true;
    const storedToken = localStorage.getItem('roboscope_token');

    if (storedToken) {
      api.auth.getMe()
        .then((res) => {
          if (isMounted && res.user) {
            setUser(res.user);
            setToken(storedToken);
          }
        })
        .catch(() => {
          if (isMounted) {
            localStorage.removeItem('roboscope_token');
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (usernameOrEmail, password) => {
    const res = await api.auth.login({ username_or_email: usernameOrEmail, password });
    if (res.token && res.user) {
      localStorage.setItem('roboscope_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error('Login failed. No token received.');
  }, []);

  const register = useCallback(async (email, username, password, fullName = '') => {
    const res = await api.auth.register({
      email,
      username,
      password,
      full_name: fullName,
    });
    if (res.token && res.user) {
      localStorage.setItem('roboscope_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    }
    throw new Error('Registration failed.');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('roboscope_token');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('rakthasethu_token');
      const storedUser = localStorage.getItem('rakthasethu_user');

      if (storedToken) {
        setToken(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // invalid JSON
          }
        }
        try {
          const res = await authApi.getMe();
          if (res.data?.data) {
            setUser(res.data.data);
            localStorage.setItem('rakthasethu_user', JSON.stringify(res.data.data));
          }
        } catch {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          localStorage.removeItem('rakthasethu_token');
          localStorage.removeItem('rakthasethu_refresh_token');
          localStorage.removeItem('rakthasethu_user');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: any): Promise<User> => {
    const res = await authApi.login(credentials);
    const { user: loggedInUser, accessToken, refreshToken } = res.data.data;

    localStorage.setItem('rakthasethu_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('rakthasethu_refresh_token', refreshToken);
    }
    localStorage.setItem('rakthasethu_user', JSON.stringify(loggedInUser));

    setToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload: any): Promise<User> => {
    const res = await authApi.register(payload);
    const { user: registeredUser, accessToken, refreshToken } = res.data.data;

    localStorage.setItem('rakthasethu_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('rakthasethu_refresh_token', refreshToken);
    }
    localStorage.setItem('rakthasethu_user', JSON.stringify(registeredUser));

    setToken(accessToken);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('rakthasethu_refresh_token') || undefined;
      await authApi.logout(refreshToken);
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('rakthasethu_token');
      localStorage.removeItem('rakthasethu_refresh_token');
      localStorage.removeItem('rakthasethu_user');
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.data?.data) {
        setUser(res.data.data);
        localStorage.setItem('rakthasethu_user', JSON.stringify(res.data.data));
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

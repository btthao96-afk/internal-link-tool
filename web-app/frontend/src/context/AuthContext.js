import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user on mount
  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });

      const { user, token: newToken, refreshToken: newRefreshToken } = response.data;

      setUser(user);
      setToken(newToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      toast.success('Login successful!');
      return user;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);

      const { user, token: newToken, refreshToken: newRefreshToken } = response.data;

      setUser(user);
      setToken(newToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      toast.success('Registration successful!');
      return user;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        await axios.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    setToken(null);
    setRefreshToken(null);

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    delete axios.defaults.headers.common['Authorization'];

    toast.success('Logged out successfully');
  };

  const refreshAccessToken = async () => {
    try {
      if (!refreshToken) throw new Error('No refresh token');

      const response = await axios.post('/api/auth/refresh', { refreshToken });

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      setToken(newToken);
      setRefreshToken(newRefreshToken);

      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      return newToken;
    } catch (error) {
      logout();
      throw error;
    }
  };

  // Axios interceptor for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshAccessToken();
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [token, refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    token
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

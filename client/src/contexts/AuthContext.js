import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { toastSuccess } from '../utils/alerts';
import API_CONFIG from '../config/api';

// Configure axios with base URL
axios.defaults.baseURL = API_CONFIG.baseURL;

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  isAuthenticated: false,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      // Store in localStorage
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));

      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;

      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case AUTH_ACTIONS.LOGOUT:
      // Clear localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear axios default header
      delete axios.defaults.headers.common['Authorization'];

      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Export the context for direct use if needed
export { AuthContext };

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Set axios default headers and interceptors
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
      localStorage.setItem('token', state.token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [state.token]);

  // Store user data in localStorage
  useEffect(() => {
    if (state.user) {
      localStorage.setItem('user', JSON.stringify(state.user));
    } else {
      localStorage.removeItem('user');
    }
  }, [state.user]);

  // Add response interceptor to handle JWT errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Only auto-logout for specific authentication endpoints, not voice processing
        const isAuthEndpoint = error.config?.url?.includes('/auth/') ||
                              error.config?.url?.includes('/profile');

        if ((error.response?.status === 401 ||
             error.message?.includes('jwt malformed') ||
             error.response?.data?.message?.includes('jwt malformed')) &&
             isAuthEndpoint) {
          // Token is invalid on auth endpoint, logout user
          console.warn('Invalid token detected on auth endpoint, logging out user');
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
        } else if (error.response?.status === 401) {
          // For non-auth endpoints, just log the error but don't auto-logout
          console.warn('401 error on non-auth endpoint:', error.config?.url);
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Load user on app start
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // Basic token validation - check if it looks like a JWT
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          console.warn('Invalid token format, clearing token');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
          return;
        }

        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/api/auth/profile');
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: {
              user: response.data.user,
              token,
            },
          });
        } catch (error) {
          console.error('Failed to load user:', error);
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
          dispatch({ type: AUTH_ACTIONS.LOGOUT });
        }
      } else {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);

      const { user, token } = response.data;

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token },
      });

      // Don't show toast - let the form handle success message
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      // Return error for form handling, don't show alert here
      return { success: false, message, errors: error.response?.data?.errors };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);

      const { user, token } = response.data;

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token },
      });

      // Don't show toast - let the form handle success message
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      // Return error for form handling, don't show alert here
      return { success: false, message, errors: error.response?.data?.errors };
    }
  };

  // Logout function
  const logout = () => {
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    // Don't show toast for logout
  };

  // Update user function
  const updateUser = async (userData) => {
    try {
      const response = await axios.put('/api/auth/profile', userData);
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: response.data.user,
      });
      toastSuccess('Profile updated successfully');
      return { success: true };
    } catch (error) {
        const message = error.response?.data?.message || 'Update failed';
      return { success: false, message, errors: error.response?.data?.errors };
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { useState, createContext, useContext, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Global lock to prevent duplicate login/register calls
  const authInProgressRef = useRef(false);

  // Use environment variable for BACKEND_URL
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://tenant-tracker-28.preview.emergentagent.com';
  
  // Debug logging
  console.log('[AuthContext] BACKEND_URL:', BACKEND_URL);
  console.log('[AuthContext] process.env.REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
  console.log('[AuthContext] window.location.origin:', window.location.origin);

  useEffect(() => {
    // Check if token exists in localStorage
    const savedToken = localStorage.getItem('portal_token');
    const savedUser = localStorage.getItem('portal_user');
    
    if (savedToken && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      
      // CRITICAL FIX: Set token and user IMMEDIATELY from localStorage
      // This prevents race condition where ProtectedRoute checks before data is loaded
      setUser(parsedUser);
      setToken(savedToken);
      setLoading(false);
      
      console.log('[AuthContext] Loaded user from localStorage:', parsedUser.email);
      
      // THEN refresh from backend in background to get latest data
      const refreshUserData = async () => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', `${BACKEND_URL}/api/portal/auth/me`);
          xhr.setRequestHeader('Authorization', `Bearer ${savedToken}`);
          
          xhr.onload = function() {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(xhr.responseText);
                console.log('[AuthContext] Fresh user data from backend:', data);
                
                // Always use backend data as source of truth
                const updatedUser = { 
                  ...parsedUser, 
                  company: data.company || parsedUser.company,
                  name: data.name || parsedUser.name 
                };
                
                setUser(updatedUser);
                localStorage.setItem('portal_user', JSON.stringify(updatedUser));
                
                if (parsedUser.company !== data.company) {
                  console.log('[AuthContext] Company updated from:', parsedUser.company, 'to:', data.company);
                }
              } catch (e) {
                console.error('[AuthContext] Error parsing user refresh:', e);
              }
            } else if (xhr.status === 401) {
              // Token expired during refresh - keep user logged in but mark for re-auth
              console.warn('[AuthContext] Token may be expired, but keeping user logged in for now');
              // Don't logout automatically as this breaks the UX - user should stay logged in until they try to make an API call
            }
          };
          
          xhr.onerror = function() {
            console.error('[AuthContext] Error refreshing user data, keeping cached data');
          };
          
          xhr.send();
        } catch (error) {
          console.error('[AuthContext] Error refreshing user data:', error);
        }
      };
      
      // Call refresh in background
      refreshUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    // Prevent duplicate login calls
    if (authInProgressRef.current) {
      console.log('[AuthContext] Login already in progress, skipping duplicate call');
      return { success: false, error: 'Login already in progress' };
    }
    
    authInProgressRef.current = true;
    
    try {
      // Use XMLHttpRequest to avoid Response cloning issues with monitoring scripts
      return await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BACKEND_URL}/api/portal/auth/login`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
          let data = null;
          
          try {
            if (xhr.responseText) {
              data = JSON.parse(xhr.responseText);
            }
          } catch (parseError) {
            console.error('Failed to parse login response:', parseError);
            resolve({ success: false, error: 'Invalid response format' });
            return;
          }

          // Check if login was successful
          if (xhr.status !== 200) {
            resolve({ success: false, error: data?.detail || 'Login failed' });
            return;
          }

          if (data?.access_token) {
            // Clear any impersonation data on fresh login
            localStorage.removeItem('impersonated_customer');
            localStorage.removeItem('admin_token_backup');
            localStorage.removeItem('admin_user_backup');
            
            setToken(data.access_token);
            setUser(data.user);
            localStorage.setItem('portal_token', data.access_token);
            localStorage.setItem('portal_user', JSON.stringify(data.user));
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'No access token received' });
          }
        };
        
        xhr.onerror = function() {
          console.error('Login network error');
          resolve({ success: false, error: 'Network error' });
        };
        
        xhr.send(JSON.stringify({ email, password }));
      });
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      // Reset lock after a short delay
      setTimeout(() => {
        authInProgressRef.current = false;
      }, 500);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_user');
    // Clear impersonation data on logout
    localStorage.removeItem('impersonated_customer');
    localStorage.removeItem('admin_token_backup');
    localStorage.removeItem('admin_user_backup');
  };

  const register = async (email, password, name, company) => {
    // Prevent duplicate register calls
    if (authInProgressRef.current) {
      console.log('[AuthContext] Registration already in progress, skipping duplicate call');
      return { success: false, error: 'Registration already in progress' };
    }
    
    authInProgressRef.current = true;
    
    try {
      // Use XMLHttpRequest to avoid Response cloning issues with monitoring scripts
      return await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BACKEND_URL}/api/portal/auth/register`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
          let data = null;
          
          try {
            if (xhr.responseText) {
              data = JSON.parse(xhr.responseText);
            }
          } catch (parseError) {
            console.error('Failed to parse register response:', parseError);
            resolve({ success: false, error: 'Invalid response format' });
            return;
          }

          // Check if registration was successful
          if (xhr.status !== 200 && xhr.status !== 201) {
            resolve({ success: false, error: data?.detail || 'Registration failed' });
            return;
          }

          // Handle pending registration (waiting for admin approval)
          if (data?.status === 'pending') {
            resolve({ 
              success: true, 
              status: 'pending',
              message: data.message 
            });
            return;
          }

          // Handle successful registration with immediate login
          if (data?.access_token) {
            setToken(data.access_token);
            setUser(data.user);
            localStorage.setItem('portal_token', data.access_token);
            localStorage.setItem('portal_user', JSON.stringify(data.user));
            resolve({ success: true, user: data.user });
          } else {
            resolve({ success: false, error: 'Unexpected response format' });
          }
        };
        
        xhr.onerror = function() {
          console.error('Registration network error');
          resolve({ success: false, error: 'Network error' });
        };
        
        xhr.send(JSON.stringify({ email, password, name, company, role: 'customer' }));
      });
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    } finally {
      // Reset lock after a short delay
      setTimeout(() => {
        authInProgressRef.current = false;
      }, 500);
    }
  };

  const apiCall = async (endpoint, options = {}) => {
    // Use XMLHttpRequest with BACKEND_URL to ensure HTTPS
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const method = options.method || 'GET';
      // If endpoint is absolute (starts with http), use as-is, otherwise prefix with BACKEND_URL
      const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;
      
      console.log('[apiCall] Calling:', url);
      
      xhr.open(method, url);
      
      // Set headers - CRITICAL FIX: Always read token from localStorage to avoid race conditions
      const currentToken = token || localStorage.getItem('portal_token');
      if (currentToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${currentToken}`);
        console.log('[apiCall] Token present:', currentToken ? 'YES' : 'NO');
      } else {
        console.warn('[apiCall] No token available for request to:', url);
      }
      
      // Handle different body types
      if (options.body && !options.isFormData && !options.skipContentType) {
        xhr.setRequestHeader('Content-Type', 'application/json');
      }
      
      // Additional headers
      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      xhr.onload = function() {
        const status = xhr.status;
        const isOk = status >= 200 && status < 300;
        
        // Check for 401
        if (status === 401) {
          logout();
          resolve({ success: false, error: 'Session expired. Please login again.', status: 401 });
          return;
        }
        
        // Parse response
        let data = null;
        try {
          if (xhr.responseText && xhr.responseText.trim()) {
            data = JSON.parse(xhr.responseText);
          }
        } catch (error) {
          console.error('Response parsing error:', error);
          resolve({ 
            success: false, 
            error: 'Failed to parse response', 
            status 
          });
          return;
        }
        
        resolve({ success: isOk, data, status });
      };
      
      xhr.onerror = function() {
        console.error('API call network error');
        resolve({ success: false, error: 'Network error' });
      };
      
      xhr.ontimeout = function() {
        console.error('API call timeout');
        resolve({ success: false, error: 'Request timeout' });
      };
      
      // Send request
      try {
        if (options.body) {
          // For FormData, send directly without JSON stringifying
          if (options.body instanceof FormData || options.skipContentType || options.isFormData) {
            xhr.send(options.body);
          } else if (typeof options.body === 'string') {
            xhr.send(options.body);
          } else {
            xhr.send(JSON.stringify(options.body));
          }
        } else {
          xhr.send();
        }
      } catch (error) {
        console.error('API call send error:', error);
        resolve({ success: false, error: error.message || 'Failed to send request' });
      }
    });
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
    apiCall,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    // Expose setters for impersonation
    setToken,
    setUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

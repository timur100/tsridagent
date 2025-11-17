import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ImpersonationContext = createContext(null);

export const ImpersonationProvider = ({ children }) => {
  const { user, token, setToken, setUser, apiCall } = useAuth();
  const [impersonatedCustomer, setImpersonatedCustomer] = useState(null);
  const [adminTokenBackup, setAdminTokenBackup] = useState(null);
  const [adminUserBackup, setAdminUserBackup] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Check if already impersonating on mount
  useEffect(() => {
    const savedImpersonation = localStorage.getItem('impersonated_customer');
    const savedAdminToken = localStorage.getItem('admin_token_backup');
    const savedAdminUser = localStorage.getItem('admin_user_backup');
    
    if (savedImpersonation && savedAdminToken) {
      setImpersonatedCustomer(JSON.parse(savedImpersonation));
      setAdminTokenBackup(savedAdminToken);
      if (savedAdminUser) {
        setAdminUserBackup(JSON.parse(savedAdminUser));
      }
      setIsImpersonating(true);
    }
  }, []);

  const impersonateCustomer = async (customer) => {
    try {
      // Only admins can impersonate
      if (user?.role !== 'admin') {
        throw new Error('Only admins can impersonate customers');
      }

      // Save current admin token and user
      setAdminTokenBackup(token);
      setAdminUserBackup(user);
      localStorage.setItem('admin_token_backup', token);
      localStorage.setItem('admin_user_backup', JSON.stringify(user));

      // Get impersonation token from backend
      const result = await apiCall('/api/portal/auth/impersonate', {
        method: 'POST',
        body: JSON.stringify({ customer_email: customer.email }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (result.success && result.data.access_token) {
        // Store impersonation state
        setImpersonatedCustomer(customer);
        setIsImpersonating(true);
        localStorage.setItem('impersonated_customer', JSON.stringify(customer));
        
        // Update auth context with customer token (NO RELOAD)
        setToken(result.data.access_token);
        setUser(result.data.user);
        localStorage.setItem('portal_token', result.data.access_token);
        localStorage.setItem('portal_user', JSON.stringify(result.data.user));
        
        return { success: true };
      } else {
        throw new Error('Failed to get impersonation token');
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      return { success: false, error: error.message };
    }
  };

  const clearImpersonation = () => {
    try {
      console.log('Clearing impersonation...');
      console.log('adminTokenBackup:', adminTokenBackup);
      console.log('adminUserBackup:', adminUserBackup);
      
      // Try to get from state or localStorage
      const backupToken = adminTokenBackup || localStorage.getItem('admin_token_backup');
      const backupUserStr = localStorage.getItem('admin_user_backup');
      const backupUser = adminUserBackup || (backupUserStr ? JSON.parse(backupUserStr) : null);
      
      if (backupToken && backupUser) {
        console.log('Restoring admin:', backupUser);
        
        // Restore admin token and user
        setToken(backupToken);
        setUser(backupUser);
        localStorage.setItem('portal_token', backupToken);
        localStorage.setItem('portal_user', JSON.stringify(backupUser));
        
        // Clear impersonation state
        localStorage.removeItem('admin_token_backup');
        localStorage.removeItem('admin_user_backup');
        localStorage.removeItem('impersonated_customer');
        
        setImpersonatedCustomer(null);
        setIsImpersonating(false);
        setAdminTokenBackup(null);
        setAdminUserBackup(null);
        
        console.log('Impersonation cleared successfully');
      } else {
        console.error('Cannot clear impersonation - no backup data found');
      }
    } catch (error) {
      console.error('Clear impersonation error:', error);
    }
  };

  const value = {
    impersonatedCustomer,
    isImpersonating,
    impersonateCustomer,
    clearImpersonation,
    adminTokenBackup
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
};

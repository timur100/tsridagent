import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext();

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState('all');
  const [selectedTenantName, setSelectedTenantName] = useState('Alle Kunden');

  // Check if user is super admin (admin@tsrid.com)
  const isSuperAdmin = user?.email === 'admin@tsrid.com';

  const setSelectedTenant = (tenantId, tenantName) => {
    console.log('[TenantContext] Setting tenant:', { tenantId, tenantName });
    setSelectedTenantId(tenantId || 'all');
    setSelectedTenantName(tenantName || 'Alle Kunden');
  };

  const resetTenant = () => {
    console.log('[TenantContext] Resetting to all tenants');
    setSelectedTenantId('all');
    setSelectedTenantName('Alle Kunden');
  };

  // Log state changes for debugging
  useEffect(() => {
    console.log('[TenantContext] State changed:', {
      selectedTenantId,
      selectedTenantName,
      isSuperAdmin
    });
  }, [selectedTenantId, selectedTenantName, isSuperAdmin]);

  const value = {
    selectedTenantId,
    selectedTenantName,
    setSelectedTenant,
    resetTenant,
    isSuperAdmin
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;

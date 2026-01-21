import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ImpersonationProvider, useImpersonation } from './contexts/ImpersonationContext';
import { TenantProvider } from './contexts/TenantContext';
import PortalLogin from './components/PortalLogin';
import CustomerPortal from './pages/CustomerPortal';
import AdminPortal from './pages/AdminPortal';
import TenantDetailPage from './pages/TenantDetailPage';
import LocationDetailPage from './pages/LocationDetailPage';
import CustomerLocationDetailPage from './pages/CustomerLocationDetailPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import InPreparationOverviewPage from './pages/InPreparationOverviewPage';
import TenantInPreparationPage from './pages/TenantInPreparationPage';
import CustomerInPreparationPage from './pages/CustomerInPreparationPage';
import CatalogPortal from './pages/CatalogPortal';
import AdminLayout from './components/AdminLayout';
import IDChecksPage from './pages/IDChecksPage';
import IDCheckDetailPage from './pages/IDCheckDetailPage';
import IdeasPage from './pages/IdeasPage';
import FacematchPage from './pages/FacematchPage';
import FingerprintPage from './pages/FingerprintPage';
import KISearchPage from './pages/KISearchPage';
import VehicleDetailPage from './pages/VehicleDetailPage';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  // SECURITY: Admin portal ONLY for admin@tsrid.com
  if (adminOnly) {
    const isSuperAdmin = user?.email?.toLowerCase() === 'admin@tsrid.com';
    
    console.log('[ProtectedRoute] Checking admin access:', {
      email: user?.email,
      isSuperAdmin,
      isImpersonating,
      role: user?.role
    });
    
    // Allow access if:
    // 1. User is super admin (admin@tsrid.com)
    // 2. OR user is impersonating (admin viewing customer portal)
    if (!isSuperAdmin && !isImpersonating) {
      console.log('[ProtectedRoute] ❌ Access denied - Not super admin and not impersonating');
      return <Navigate to="/portal/customer" replace />;
    }
    
    console.log('[ProtectedRoute] ✅ Access granted to admin portal');
  }

  return children;
};

const PortalRoutes = () => {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();

  // Debug logging
  console.log('[PortalRoutes] Current pathname:', location.pathname);

  // Helper function for smart routing
  const getDefaultRoute = () => {
    if (isImpersonating) {
      // During impersonation, stay on admin route
      return "/portal/admin";
    }
    
    // SECURITY: Only admin@tsrid.com can access admin portal
    const isSuperAdmin = user?.email?.toLowerCase() === 'admin@tsrid.com';
    
    // Admin check based solely on email - backend enforces role
    return isSuperAdmin ? "/portal/admin" : "/portal/customer";
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          // Always allow access to login page (for logout/switching accounts)
          isAuthenticated ? (
            <PortalLogin />
          ) : (
            <PortalLogin />
          )
        }
      />
      
      {/* Customer Portal with nested routes */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute>
            <CustomerPortal />
          </ProtectedRoute>
        }
      >
        {/* Nested routes - rendered inside CustomerPortal's Outlet */}
        <Route path="in-preparation" element={<CustomerInPreparationPage />} />
        <Route path="locations/:locationId" element={<CustomerLocationDetailPage />} />
        <Route path="devices/:deviceId" element={<DeviceDetailPage />} />
      </Route>
      
      {/* Admin Portal with nested routes */}
      <Route
        path="admin/*"
        element={
          <ProtectedRoute adminOnly>
            <AdminPortal />
          </ProtectedRoute>
        }
      >
        {/* Nested routes - rendered inside AdminPortal's Outlet */}
        <Route path="tenants/:tenantId" element={<TenantDetailPage />} />
        <Route path="tenants/:tenantId/in-preparation" element={<TenantInPreparationPage />} />
        <Route path="locations/:locationId" element={<LocationDetailPage />} />
        <Route path="tenants/:tenantId/locations/:locationId" element={<LocationDetailPage />} />
        <Route path="tenants/:tenantId/devices/:deviceId" element={<DeviceDetailPage />} />
        <Route path="devices/:deviceId" element={<DeviceDetailPage />} />
        <Route path="in-preparation" element={<InPreparationOverviewPage />} />
        <Route path="id-checks" element={<IDChecksPage />} />
        <Route path="id-checks/:id" element={<IDCheckDetailPage />} />
        <Route path="vehicles/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="facematch" element={<FacematchPage />} />
        <Route path="fingerprint" element={<FingerprintPage />} />
        <Route path="ki-search" element={<KISearchPage />} />
        <Route path="ideas" element={<IdeasPage />} />
      </Route>
      
      <Route
        path="/catalog"
        element={
          <ProtectedRoute>
            <CatalogPortal />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={getDefaultRoute()} replace />
          ) : (
            <Navigate to="/portal/login" replace />
          )
        }
      />
      
      <Route path="*" element={<Navigate to="/portal/login" replace />} />
    </Routes>
  );
};

const PortalApp = () => {
  return (
    <AuthProvider>
      <ImpersonationProvider>
        <TenantProvider>
          <ThemeProvider>
            <PortalRoutes />
            <Toaster position="top-right" />
          </ThemeProvider>
        </TenantProvider>
      </ImpersonationProvider>
    </AuthProvider>
  );
};

export default PortalApp;

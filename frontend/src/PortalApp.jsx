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
import CatalogPortal from './pages/CatalogPortal';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
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

  // If impersonating, allow access to admin route even though user role is customer
  if (adminOnly && !isAdmin && !isImpersonating) {
    return <Navigate to="/portal/customer" replace />;
  }

  return children;
};

const PortalRoutes = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { isImpersonating } = useImpersonation();
  const location = useLocation();

  // Helper function for smart routing
  const getDefaultRoute = () => {
    if (isImpersonating) {
      // During impersonation, stay on admin route
      return "/portal/admin";
    }
    return isAdmin ? "/portal/admin" : "/portal/customer";
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
      
      <Route
        path="/customer"
        element={
          <ProtectedRoute>
            <CustomerPortal />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminPortal />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/tenants/:tenantId"
        element={
          <ProtectedRoute adminOnly>
            <TenantDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/locations/:locationId"
        element={
          <ProtectedRoute adminOnly>
            <LocationDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/tenants/:tenantId/locations/:locationId"
        element={
          <ProtectedRoute adminOnly>
            <LocationDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Customer Portal Location Details */}
      <Route
        path="/customer/locations/:locationId"
        element={
          <ProtectedRoute>
            <CustomerLocationDetailPage />
          </ProtectedRoute>
        }
      />
      
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

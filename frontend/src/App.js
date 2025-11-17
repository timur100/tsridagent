import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import VerificationInterface from './components/VerificationInterface';
import PortalApp from './PortalApp';
import StockPortalBarcode from './pages/StockPortalBarcode';
import TechnicianPortal from './pages/TechnicianPortal';
import { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Portal Routes */}
        <Route path="/portal/*" element={<PortalApp />} />
        
        {/* Stock Portal */}
        <Route path="/portal/stock" element={<StockPortalBarcode />} />
        
        {/* Technician Portal */}
        <Route path="/portal/technician" element={<TechnicianPortal />} />
        
        {/* Main Verification Interface (default) */}
        <Route path="*" element={
          <div className="App min-h-screen bg-background">
            <VerificationInterface />
            <Toaster 
              position="top-center"
              toastOptions={{
                style: {
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
                success: {
                  iconTheme: {
                    primary: 'hsl(var(--verification-success))',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: 'hsl(var(--destructive))',
                    secondary: 'white',
                  },
                },
              }}
            />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

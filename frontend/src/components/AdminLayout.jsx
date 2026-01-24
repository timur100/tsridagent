import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Shield, LogOut, User, Lightbulb, Scan } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import IdeasModal from './IdeasModal';

const AdminLayout = ({ children }) => {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showIdeasModal, setShowIdeasModal] = useState(false);

  // Get company branding
  const companyName = user?.company_name || 'TSRID';
  const companyLogoLight = user?.company_logo_light;
  const companyLogoDark = user?.company_logo_dark;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleScanApp = () => {
    window.location.href = '/';
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-lg ${theme === 'dark' ? 'bg-gradient-to-r from-[#c00000] to-[#a00000]' : 'bg-white border-b border-gray-200'}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/portal/admin')}
            >
              {(theme === 'dark' ? companyLogoDark : companyLogoLight) ? (
                <>
                  <img 
                    src={theme === 'dark' ? companyLogoDark : companyLogoLight} 
                    alt={companyName} 
                    className="h-12 w-auto max-w-[200px] object-contain"
                  />
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>
                    Admin Portal
                  </h1>
                </>
              ) : (
                <>
                  <Shield className={`h-10 w-10 ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`} />
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>
                    {companyName} Admin Portal
                  </h1>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Scan App Button */}
              <button
                onClick={handleScanApp}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  theme === 'dark'
                    ? 'bg-white text-[#c00000] hover:bg-gray-100'
                    : 'bg-[#c00000] text-white hover:bg-[#a00000]'
                }`}
                title="Zur Scan App / Agent wechseln"
              >
                <Scan className="h-5 w-5" />
                <span>Scan App</span>
              </button>
              
              {/* Ideas Button */}
              <button
                onClick={() => setShowIdeasModal(true)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-white/10 text-yellow-400'
                    : 'hover:bg-gray-100 text-yellow-600'
                }`}
                title="Ideen & Verbesserungsvorschläge"
              >
                <Lightbulb className="h-5 w-5" />
              </button>
              
              <ThemeToggle />
              
              {/* User Menu */}
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
                }`}>
                  <User className={`h-5 w-5 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                    {user?.email}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-white/10 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                  title="Abmelden"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        {children}
      </main>
      
      {/* Ideas Modal */}
      <IdeasModal 
        isOpen={showIdeasModal} 
        onClose={() => setShowIdeasModal(false)} 
        theme={theme}
      />
    </div>
  );
};

export default AdminLayout;

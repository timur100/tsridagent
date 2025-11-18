import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, User, Building, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const PortalLogin = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginInProgressRef = useRef(false); // Prevent duplicate login calls
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent duplicate submissions (StrictMode protection)
    if (loginInProgressRef.current) {
      console.log('Login already in progress, skipping duplicate call');
      return;
    }
    
    loginInProgressRef.current = true;
    setLoading(true);

    try {
      let result;
      if (isLoginMode) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(
          formData.email,
          formData.password,
          formData.name,
          formData.company
        );
      }

      if (result.success) {
        if (!isLoginMode && result.status === 'pending') {
          // Registration pending approval
          toast.success('Registrierung erfolgreich eingereicht! Bitte warten Sie auf die Genehmigung durch einen Administrator.', {
            duration: 6000
          });
          setIsLoginMode(true); // Switch back to login mode
          setFormData({ email: formData.email, password: '', name: '', company: '' }); // Clear form but keep email
        } else {
          // Successful login or approved registration
          toast.success(isLoginMode ? 'Login erfolgreich!' : 'Registrierung erfolgreich!');
          
          // Redirect to the page they tried to access, or default
          const from = location.state?.from?.pathname || (result.user?.role === 'admin' ? '/portal/admin' : '/portal/customer');
          navigate(from, { replace: true });
        }
      } else {
        toast.error(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
      // Reset the flag after a delay to allow future logins
      setTimeout(() => {
        loginInProgressRef.current = false;
      }, 1000);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-[#2a2a2a] rounded-2xl border-none shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_brand-portal-11/artifacts/afr4xalh_TSRID_Logo1_white.svg" 
              alt="TSRID Logo" 
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Portal
          </h1>
          <p className="text-gray-400">
            {isLoginMode ? 'Willkommen zurück' : 'Erstellen Sie ein Konto'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              E-Mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all"
                placeholder="ihre.email@firma.de"
              />
            </div>
          </div>

          {/* Name (Register only) */}
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required={!isLoginMode}
                  className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all"
                  placeholder="Max Mustermann"
                />
              </div>
            </div>
          )}

          {/* Company (Register only) */}
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Firma
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  required={!isLoginMode}
                  className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all"
                  placeholder="Firma GmbH"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Passwort
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-12 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-lg bg-[#c00000] hover:bg-[#a00000] text-white font-semibold rounded-lg shadow-lg transition-all"
          >
            {loading ? 'Bitte warten...' : (isLoginMode ? 'Anmelden' : 'Registrieren')}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-[#c00000] hover:text-[#a00000] text-sm font-medium transition-colors"
          >
            {isLoginMode
              ? 'Noch kein Konto? Jetzt registrieren'
              : 'Bereits registriert? Zur Anmeldung'
            }
          </button>
        </div>

        {/* Demo Credentials */}
        {isLoginMode && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800 font-semibold mb-2">Demo-Zugang:</p>
            <p className="text-xs text-blue-700">
              E-Mail: admin@tsrid.com<br />
              Passwort: admin123
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PortalLogin;

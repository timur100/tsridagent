import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Phone, 
  PhoneOff, 
  PhoneForwarded, 
  Clock, 
  User,
  Building2,
  MapPin,
  X
} from 'lucide-react';
import { Card } from './ui/card';

const IncomingCallModal = ({ 
  isOpen, 
  callData, 
  onAccept, 
  onReject, 
  onForward, 
  onQueue,
  onClose 
}) => {
  const { theme } = useTheme();
  const [ringingDuration, setRingingDuration] = useState(0);
  
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setRingingDuration(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setRingingDuration(0);
    }
  }, [isOpen]);
  
  if (!isOpen || !callData) return null;
  
  const { caller, location, tenant } = callData;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-fade-in">
      <Card className={`w-full max-w-md mx-4 animate-bounce-in ${
        theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header with ringing animation */}
        <div className={`relative p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 p-1 rounded hover:bg-gray-700 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center">
            {/* Pulsing phone icon */}
            <div className="relative mb-4">
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
              <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-green-600' : 'bg-green-500'
              }`}>
                <Phone className="w-8 h-8 text-white animate-pulse" />
              </div>
            </div>
            
            <h2 className={`text-xl font-semibold mb-1 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Eingehender Anruf
            </h2>
            
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {ringingDuration}s
            </p>
          </div>
        </div>
        
        {/* Caller Info */}
        <div className="p-6 space-y-4">
          {/* Phone Number */}
          <div className="text-center">
            <p className={`text-2xl font-mono font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              {caller?.phone || 'Unbekannt'}
            </p>
          </div>
          
          {/* Location Info */}
          {location && (
            <div className={`p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className={`w-4 h-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {location.station_name}
                    </p>
                    <p className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {location.city}, {location.state}
                    </p>
                  </div>
                </div>
                
                {location.location_code && (
                  <p className={`text-xs font-mono ${
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    Code: {location.location_code}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Tenant Info */}
          {tenant && (
            <div className="flex items-center gap-2">
              <Building2 className={`w-4 h-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`} />
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {tenant.name}
              </p>
            </div>
          )}
          
          {/* Unknown Caller */}
          {!location && (
            <div className={`p-4 rounded-lg text-center ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <User className={`w-8 h-8 mx-auto mb-2 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Unbekannte Nummer
              </p>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-6 border-t border-gray-700 space-y-3">
          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onAccept}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <Phone className="w-5 h-5" />
              Annehmen
            </button>
            
            <button
              onClick={onReject}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              <PhoneOff className="w-5 h-5" />
              Ablehnen
            </button>
          </div>
          
          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onForward}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              <PhoneForwarded className="w-4 h-4" />
              Weiterleiten
            </button>
            
            <button
              onClick={onQueue}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Warteschlange
            </button>
          </div>
        </div>
      </Card>
      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default IncomingCallModal;

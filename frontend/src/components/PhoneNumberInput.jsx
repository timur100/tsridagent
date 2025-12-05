import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Phone } from 'lucide-react';

const PhoneNumberInput = ({ value, onChange, disabled = false }) => {
  const { theme } = useTheme();
  
  // Parse existing phone number
  const parsePhone = (phoneStr) => {
    if (!phoneStr) return { countryCode: '49', areaCode: '', number: '' };
    
    // Pattern: +49 (7721) 9968690
    const match = phoneStr.match(/^\+(\d+)\s*\((\d+)\)\s*(\d+)$/);
    if (match) {
      return {
        countryCode: match[1],
        areaCode: match[2],
        number: match[3]
      };
    }
    
    // Fallback
    return { countryCode: '49', areaCode: '', number: phoneStr || '' };
  };
  
  const [phone, setPhone] = useState(parsePhone(value));
  
  useEffect(() => {
    setPhone(parsePhone(value));
  }, [value]);
  
  const handleChange = (field, val) => {
    const newPhone = { ...phone, [field]: val };
    setPhone(newPhone);
    
    // Format and callback
    if (newPhone.areaCode && newPhone.number) {
      const areaCode = newPhone.areaCode.startsWith('0') 
        ? newPhone.areaCode.substring(1) 
        : newPhone.areaCode;
      
      const formatted = `+${newPhone.countryCode} (${areaCode}) ${newPhone.number}`;
      onChange(formatted);
    } else {
      onChange('');
    }
  };
  
  return (
    <div className="space-y-2">
      <label className={`block text-sm font-medium ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <Phone className="w-4 h-4 inline mr-1" />
        Telefonnummer
      </label>
      
      <div className="flex gap-2">
        {/* Country Code */}
        <div className="w-24">
          <div className={`flex items-center px-3 py-2 rounded-md border ${
            theme === 'dark'
              ? 'bg-gray-700 border-gray-600 text-white'
              : 'bg-white border-gray-300 text-gray-900'
          }`}>
            <span className="text-sm">+</span>
            <input
              type="text"
              value={phone.countryCode}
              onChange={(e) => handleChange('countryCode', e.target.value.replace(/\D/g, ''))}
              disabled={disabled}
              maxLength={3}
              className="w-full bg-transparent border-none focus:outline-none text-sm"
              placeholder="49"
            />
          </div>
        </div>
        
        {/* Area Code */}
        <div className="w-32">
          <input
            type="text"
            value={phone.areaCode}
            onChange={(e) => handleChange('areaCode', e.target.value.replace(/\D/g, ''))}
            disabled={disabled}
            maxLength={5}
            placeholder="7721"
            className={`w-full px-3 py-2 rounded-md border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000] text-sm`}
          />
        </div>
        
        {/* Number */}
        <div className="flex-1">
          <input
            type="text"
            value={phone.number}
            onChange={(e) => handleChange('number', e.target.value.replace(/\D/g, ''))}
            disabled={disabled}
            maxLength={15}
            placeholder="9968690"
            className={`w-full px-3 py-2 rounded-md border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000] text-sm`}
          />
        </div>
      </div>
      
      {/* Preview */}
      {phone.areaCode && phone.number && (
        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Vorschau: +{phone.countryCode} ({phone.areaCode.startsWith('0') ? phone.areaCode.substring(1) : phone.areaCode}) {phone.number}
        </p>
      )}
    </div>
  );
};

export default PhoneNumberInput;

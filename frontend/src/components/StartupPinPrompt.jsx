import React, { useState } from 'react';
import { Shield, Lock } from 'lucide-react';

const StartupPinPrompt = ({ 
  onSuccess, 
  onVerifyPin,
  stationName = 'TSRID Agent',
  logoUrl = null
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handlePinInput = (digit) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN muss mindestens 4 Ziffern haben');
      return;
    }

    if (onVerifyPin) {
      const result = await onVerifyPin(pin);
      if (result.valid) {
        onSuccess();
      } else {
        setAttempts(prev => prev + 1);
        setError(`Falsche PIN (Versuch ${attempts + 1})`);
        setPin('');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="bg-[#1a1a1a] p-10 rounded-3xl border border-gray-700 w-96 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-20 w-auto mx-auto mb-4" />
          ) : (
            <Shield className="w-20 h-20 text-red-600 mx-auto mb-4" />
          )}
          <h1 className="text-white text-2xl font-bold">{stationName}</h1>
          <p className="text-gray-400 mt-2">Stations-PIN eingeben</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                i < pin.length 
                  ? 'bg-red-500 border-red-500 scale-110' 
                  : 'border-gray-500'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-center text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* PIN Pad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => handlePinInput(String(digit))}
              className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white text-2xl font-bold py-5 rounded-xl transition-all transform hover:scale-105"
            >
              {digit}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-bold py-5 rounded-xl transition-colors"
          >
            CLEAR
          </button>
          <button
            onClick={() => handlePinInput('0')}
            className="bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white text-2xl font-bold py-5 rounded-xl transition-all transform hover:scale-105"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-2xl py-5 rounded-xl transition-colors"
          >
            ⌫
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            pin.length >= 4
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Lock className="w-5 h-5 inline mr-2" />
          Entsperren
        </button>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-xs">
          TSRID Agent v1.0.4
        </div>
      </div>
    </div>
  );
};

export default StartupPinPrompt;

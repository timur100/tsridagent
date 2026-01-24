import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const ScannerPinPrompt = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  
  // Original TSRID Logo URL
  const tsridLogo = "https://customer-assets.emergentagent.com/job_8cfa6bf8-c558-4069-977e-195a51c5328e/artifacts/vvya9jse_Zeichenfl%C3%A4che%201.png";

  useEffect(() => {
    // Focus first input on mount
    inputRefs[0].current?.focus();
  }, []);

  const handleInput = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only digits

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Only last character
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Check PIN when all 4 digits entered
    if (index === 3 && value) {
      checkPin([...newPin.slice(0, 3), value]);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      const newPin = pastedData.split('');
      setPin(newPin);
      inputRefs[3].current?.focus();
      checkPin(newPin);
    }
  };

  const checkPin = async (pinToCheck) => {
    const pinString = pinToCheck.join('');
    if (pinString.length !== 4) return;

    setChecking(true);
    setError('');

    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await fetch(`${BACKEND_URL}/api/scanner-pin/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinString })
      });

      const data = await response.json();

      if (data.valid) {
        // Speichere Rolle im sessionStorage
        sessionStorage.setItem('userRole', data.role || 'user');
        sessionStorage.setItem('isAdmin', data.role === 'admin' ? 'true' : 'false');
        onSuccess(data.role);
      } else {
        setError('Falsche PIN. Bitte erneut versuchen.');
        setPin(['', '', '', '']);
        inputRefs[0].current?.focus();
      }
    } catch (error) {
      console.error('Error checking PIN:', error);
      setError('Fehler beim Überprüfen der PIN');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-4 gap-8">
      <div className="bg-black border-4 border-red-600 rounded-2xl shadow-2xl p-8 max-w-md w-full relative z-10">
        {/* Close Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            PIN Eingabe
          </h2>
        </div>

        {/* PIN Input */}
        <div className="flex justify-center gap-4 mb-8" onPaste={handlePaste}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={checking}
              className={`
                w-16 h-16 text-center text-3xl font-mono font-bold
                border-2 rounded-lg
                transition-all duration-200
                focus:outline-none focus:ring-2
                ${error 
                  ? 'border-red-500 bg-red-900/20 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-700 bg-gray-900 focus:border-red-600 focus:ring-red-600'
                }
                ${checking ? 'opacity-50 cursor-not-allowed' : ''}
                text-white
                placeholder-gray-600
              `}
              style={{
                boxShadow: error ? '0 0 0 1px rgba(239, 68, 68, 0.5)' : 'none'
              }}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-400 text-center font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Status */}
        {checking && (
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-red-600"></div>
              Überprüfe PIN...
            </div>
          </div>
        )}

        {/* Keyboard */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'c', 0, '⌫'].map((num, idx) => {
            if (num === 'c') {
              return (
                <button
                  key={idx}
                  className="h-16 text-xl font-bold bg-gray-800 hover:bg-gray-700 text-white rounded-lg border-2 border-gray-700 transition-all duration-200 active:scale-95"
                  onClick={() => {
                    setPin(['', '', '', '']);
                    setError('');
                    inputRefs[0].current?.focus();
                  }}
                  disabled={checking}
                >
                  c
                </button>
              );
            }
            
            const isBackspace = num === '⌫';
            
            return (
              <button
                key={idx}
                className="h-16 text-xl font-bold bg-gray-800 hover:bg-gray-700 text-white rounded-lg border-2 border-gray-700 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (isBackspace) {
                    // Find last filled input
                    const lastFilledIndex = pin.findLastIndex(d => d !== '');
                    if (lastFilledIndex >= 0) {
                      const newPin = [...pin];
                      newPin[lastFilledIndex] = '';
                      setPin(newPin);
                      setError('');
                      inputRefs[lastFilledIndex].current?.focus();
                    }
                  } else {
                    // Find first empty input
                    const emptyIndex = pin.findIndex(d => d === '');
                    if (emptyIndex >= 0) {
                      handleInput(emptyIndex, String(num));
                    }
                  }
                }}
                disabled={checking}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Demo PIN Text */}
        <p className="text-xs text-gray-600 text-center mt-6">
          Demo PIN: 1234
        </p>
      </div>
      
      {/* Logo unter dem PIN-Feld - klar sichtbar */}
      <div className="flex items-center justify-center">
        <img 
          src={tsridLogo} 
          alt="TSRID Logo" 
          className="w-48 h-48 object-contain"
        />
      </div>
    </div>
  );
};

export default ScannerPinPrompt;

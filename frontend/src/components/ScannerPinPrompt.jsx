import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Lock, X } from 'lucide-react';

const ScannerPinPrompt = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

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
        onSuccess();
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
        {/* Close Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            PIN eingeben
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Bitte geben Sie die 4-stellige PIN ein, um fortzufahren
          </p>
        </div>

        {/* PIN Input */}
        <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
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
                border-2 rounded-xl
                transition-all duration-200
                focus:outline-none focus:ring-4
                ${error 
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-900' 
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-200 dark:focus:ring-blue-900'
                }
                ${checking ? 'opacity-50 cursor-not-allowed' : ''}
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-white
              `}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-6">
            <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Status */}
        {checking && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              Überprüfe PIN...
            </div>
          </div>
        )}

        {/* Keyboard */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((num, idx) => {
            if (num === '') return <div key={idx}></div>;
            
            const isBackspace = num === '⌫';
            
            return (
              <Button
                key={idx}
                variant="outline"
                className="h-14 text-xl font-semibold"
                onClick={() => {
                  if (isBackspace) {
                    // Find last filled input
                    const lastFilledIndex = pin.findLastIndex(d => d !== '');
                    if (lastFilledIndex >= 0) {
                      const newPin = [...pin];
                      newPin[lastFilledIndex] = '';
                      setPin(newPin);
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
              </Button>
            );
          })}
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-6">
          Bei Problemen wenden Sie sich bitte an einen Administrator
        </p>
      </div>
    </div>
  );
};

export default ScannerPinPrompt;

import React, { useState } from 'react';
import { X } from 'lucide-react';

const PinModal = ({ isOpen, onClose, onVerify, title = "PIN Eingabe" }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      setPin(pin + num);
      setError('');
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleVerify = async () => {
    if (pin.length !== 4) {
      setError('Bitte geben Sie einen 4-stelligen PIN ein');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const isValid = await onVerify(pin);
      
      if (isValid) {
        setPin('');
        onClose();
      } else {
        setError('Falscher PIN. Bitte versuchen Sie es erneut.');
        setPin('');
      }
    } catch (err) {
      setError('Fehler bei der PIN-Überprüfung');
      console.error('PIN verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key >= '0' && e.key <= '9') {
      handleNumberClick(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Enter' && pin.length === 4) {
      handleVerify();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, pin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 border-2 border-red-600 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center text-2xl font-bold
                ${pin.length > index 
                  ? 'border-red-600 bg-gray-800 text-white' 
                  : 'border-gray-700 bg-gray-800 text-transparent'
                }`}
            >
              {pin[index] ? '●' : '○'}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              disabled={isLoading}
              className="h-16 bg-gray-800 hover:bg-gray-700 text-white text-2xl font-bold rounded-lg 
                       border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
        </div>

        {/* Bottom Row: C, 0, Backspace */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="h-16 bg-gray-800 hover:bg-gray-700 text-white text-xl font-bold rounded-lg 
                     border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            C
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            disabled={isLoading}
            className="h-16 bg-gray-800 hover:bg-gray-700 text-white text-2xl font-bold rounded-lg 
                     border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={isLoading}
            className="h-16 bg-gray-800 hover:bg-gray-700 text-white text-xl font-bold rounded-lg 
                     border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⌫
          </button>
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={pin.length !== 4 || isLoading}
          className={`w-full py-3 rounded-lg font-bold text-lg transition-colors
            ${pin.length === 4 && !isLoading
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
        >
          {isLoading ? 'Überprüfe...' : 'Bestätigen'}
        </button>

        {/* Demo PIN Info */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Demo PIN: 1234
        </p>
      </div>
    </div>
  );
};

export default PinModal;

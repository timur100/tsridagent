import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const ScannerPinPrompt = ({ onSuccess, onCancel }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  
  // TSRID Logo SVG as base64 or inline
  const tsridLogo = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjwhLS0gRmluZ2VycHJpbnQgLS0+CjxwYXRoIGQ9Ik0xMDAgMTUwQzg2LjE5MyAxNTAgNzUgMTM4LjgwNyA3NSAxMjVDNzUgMTExLjE5MyA4Ni4xOTMgMTAwIDEwMCAxMDBDMTEzLjgwNyAxMDAgMTI1IDExMS4xOTMgMTI1IDEyNUMxMjUgMTM4LjgwNyAxMTMuODA3IDE1MCAxMDAgMTUwWk0xMDAgMTEwQzkxLjcxNTcgMTEwIDg1IDExNi43MTYgODUgMTI1Qzg1IDEzMy4yODQgOTEuNzE1NyAxNDAgMTAwIDE0MEMxMDguMjg0IDE0MCAxMTUgMTMzLjI4NCAxMTUgMTI1QzExNSAxMTYuNzE2IDEwOC4yODQgMTEwIDEwMCAxMTBaIiBmaWxsPSIjRUYwMDAwIi8+CjxwYXRoIGQ9Ik0xMDAgNjBDNjkuNjI0MyA2MCA0NSA4NC42MjQzIDQ1IDExNUM0NSAxNDUuMzc2IDY5LjYyNDMgMTcwIDEwMCAxNzBDMTMwLjM3NiAxNzAgMTU1IDE0NS4zNzYgMTU1IDExNUMxNTUgODQuNjI0MyAxMzAuMzc2IDYwIDEwMCA2ME0xMDAgODBDMTE5LjMzIDgwIDEzNSA5NS42NzAxIDEzNSAxMTVDMTM1IDEzNC4zMyAxMTkuMzMgMTUwIDEwMCAxNTBDODAuNjcwMSAxNTAgNjUgMTM0LjMzIDY1IDExNUM2NSA5NS42NzAxIDgwLjY3MDEgODAgMTAwIDgwWiIgc3Ryb2tlPSIjRUYwMDAwIiBzdHJva2Utd2lkdGg9IjUiLz4KPCEtLSBDb3JuZXIgQnJhY2tldHMgLS0+CjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9IjMwIiBoZWlnaHQ9IjUiIGZpbGw9IiNFRjAwMDAiLz4KPHJlY3QgeD0iMzAiIHk9IjMwIiB3aWR0aD0iNSIgaGVpZ2h0PSIzMCIgZmlsbD0iI0VGMDAwMCIvPgo8cmVjdCB4PSIxNDAiIHk9IjMwIiB3aWR0aD0iMzAiIGhlaWdodD0iNSIgZmlsbD0iI0VGMDAwMCIvPgo8cmVjdCB4PSIxNjUiIHk9IjMwIiB3aWR0aD0iNSIgaGVpZ2h0PSIzMCIgZmlsbD0iI0VGMDAwMCIvPgo8cmVjdCB4PSIzMCIgeT0iMTY1IiB3aWR0aD0iMzAiIGhlaWdodD0iNSIgZmlsbD0iI0VGMDAwMCIvPgo8cmVjdCB4PSIzMCIgeT0iMTQwIiB3aWR0aD0iNSIgaGVpZ2h0PSIzMCIgZmlsbD0iI0VGMDAwMCIvPgo8cmVjdCB4PSIxNDAiIHk9IjE2NSIgd2lkdGg9IjMwIiBoZWlnaHQ9IjUiIGZpbGw9IiNFRjAwMDAiLz4KPHJlY3QgeD0iMTY1IiB5PSIxNDAiIHdpZHRoPSI1IiBoZWlnaHQ9IjMwIiBmaWxsPSIjRUYwMDAwIi8+Cjwvc3ZnPg==";

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
    <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
      {/* Background Logo - Large and Centered */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <img 
          src={tsridLogo} 
          alt="TSRID Logo" 
          className="w-[80vh] h-[80vh] object-contain"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>
      
      {/* TSRID Text Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none">
        <div className="text-center">
          <div className="text-[20vw] font-bold text-white leading-none">TSRID</div>
          <div className="text-[5vw] font-light text-white tracking-[0.5em] mt-4">FORENSIC SOLUTIONS</div>
        </div>
      </div>
      
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

import React, { useState, useEffect, useRef } from 'react';
import { Lock, Shield } from 'lucide-react';

const ScreensaverOverlay = ({ 
  isActive, 
  onUnlock, 
  requirePin = false,
  onVerifyPin,
  logoUrl = null,
  stationName = 'TSRID Agent'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [showPinPad, setShowPinPad] = useState(false);
  const animationRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 1 });

  // Animate logo to prevent burn-in
  useEffect(() => {
    if (!isActive) return;

    const animate = () => {
      setLogoPosition(prev => {
        let newX = prev.x + directionRef.current.x * 0.3;
        let newY = prev.y + directionRef.current.y * 0.2;

        // Bounce off edges
        if (newX <= 10 || newX >= 90) {
          directionRef.current.x *= -1;
          newX = Math.max(10, Math.min(90, newX));
        }
        if (newY <= 10 || newY >= 90) {
          directionRef.current.y *= -1;
          newY = Math.max(10, Math.min(90, newY));
        }

        return { x: newX, y: newY };
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  // Handle screen touch/click
  const handleScreenClick = () => {
    if (requirePin) {
      setShowPinPad(true);
    } else {
      onUnlock();
    }
  };

  // Handle PIN input
  const handlePinInput = (digit) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      
      // Auto-verify when PIN reaches expected length (4-6 digits)
      if (newPin.length >= 4) {
        verifyPin(newPin);
      }
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

  const verifyPin = async (pinToVerify) => {
    if (onVerifyPin) {
      const result = await onVerifyPin(pinToVerify);
      if (result.valid) {
        setPin('');
        setShowPinPad(false);
        onUnlock();
      } else {
        setError('Falsche PIN');
        setPin('');
      }
    }
  };

  if (!isActive) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black cursor-pointer"
      onClick={!showPinPad ? handleScreenClick : undefined}
    >
      {/* Animated Logo */}
      {!showPinPad && (
        <div 
          className="absolute transition-all duration-100 ease-linear"
          style={{ 
            left: `${logoPosition.x}%`, 
            top: `${logoPosition.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="text-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-24 w-auto mx-auto mb-4 opacity-50" />
            ) : (
              <Shield className="w-24 h-24 text-red-600/50 mx-auto mb-4" />
            )}
            <div className="text-white/30 text-xl font-bold">{stationName}</div>
            <div className="text-white/20 text-sm mt-2">Bildschirm berühren zum Entsperren</div>
          </div>
        </div>
      )}

      {/* PIN Pad Overlay */}
      {showPinPad && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-700 w-80">
            <div className="text-center mb-6">
              <Lock className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-white text-xl font-bold">Stations-PIN eingeben</h2>
              <p className="text-gray-400 text-sm mt-1">Zum Entsperren</p>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${
                    i < pin.length 
                      ? 'bg-red-500 border-red-500' 
                      : 'border-gray-500'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-center text-sm mb-4">{error}</div>
            )}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(String(digit))}
                  className="bg-gray-800 hover:bg-gray-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-bold py-4 rounded-lg transition-colors"
              >
                CLEAR
              </button>
              <button
                onClick={() => handlePinInput('0')}
                className="bg-gray-800 hover:bg-gray-700 text-white text-2xl font-bold py-4 rounded-lg transition-colors"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-xl py-4 rounded-lg transition-colors"
              >
                ⌫
              </button>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setShowPinPad(false)}
              className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreensaverOverlay;

import React, { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';

const ScreensaverOverlay = ({ 
  isActive, 
  onUnlock, 
  requirePin = false,
  onVerifyPin,
  logoUrl = null,
  stationName = 'TSRID Agent',
  stationCode = ''
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [showPinPad, setShowPinPad] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const animationRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 1 });
  const scaleDirectionRef = useRef(1);

  // Animate logo to prevent burn-in with smooth movement and pulsing
  useEffect(() => {
    if (!isActive) return;

    let frameCount = 0;
    
    const animate = () => {
      frameCount++;
      
      // Move logo
      setLogoPosition(prev => {
        let newX = prev.x + directionRef.current.x * 0.15;
        let newY = prev.y + directionRef.current.y * 0.1;

        // Bounce off edges with some randomness
        if (newX <= 15 || newX >= 85) {
          directionRef.current.x *= -1;
          directionRef.current.y += (Math.random() - 0.5) * 0.3;
          newX = Math.max(15, Math.min(85, newX));
        }
        if (newY <= 15 || newY >= 85) {
          directionRef.current.y *= -1;
          directionRef.current.x += (Math.random() - 0.5) * 0.3;
          newY = Math.max(15, Math.min(85, newY));
        }

        // Clamp direction
        directionRef.current.x = Math.max(-1.5, Math.min(1.5, directionRef.current.x));
        directionRef.current.y = Math.max(-1.5, Math.min(1.5, directionRef.current.y));

        return { x: newX, y: newY };
      });

      // Pulse scale effect (subtle)
      if (frameCount % 2 === 0) {
        setLogoScale(prev => {
          let newScale = prev + scaleDirectionRef.current * 0.002;
          if (newScale >= 1.08 || newScale <= 0.92) {
            scaleDirectionRef.current *= -1;
          }
          return Math.max(0.92, Math.min(1.08, newScale));
        });
      }

      // Subtle rotation
      setLogoRotation(prev => (prev + 0.05) % 360);

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
      className="fixed inset-0 z-[9999] bg-black cursor-pointer overflow-hidden"
      onClick={!showPinPad ? handleScreenClick : undefined}
    >
      {/* Animated TSRID Logo */}
      {!showPinPad && (
        <div 
          className="absolute transition-none"
          style={{ 
            left: `${logoPosition.x}%`, 
            top: `${logoPosition.y}%`,
            transform: `translate(-50%, -50%) scale(${logoScale})`
          }}
        >
          <div className="text-center">
            {/* TSRID Logo */}
            <div className="mb-6">
              <svg 
                viewBox="0 0 200 200" 
                className="w-40 h-40 mx-auto"
                style={{ 
                  filter: 'drop-shadow(0 0 20px rgba(213, 12, 45, 0.5))',
                  transform: `rotate(${Math.sin(logoRotation * 0.02) * 3}deg)`
                }}
              >
                {/* Shield background */}
                <path 
                  d="M100 10 L180 50 L180 110 Q180 160 100 190 Q20 160 20 110 L20 50 Z" 
                  fill="rgba(213, 12, 45, 0.15)"
                  stroke="rgba(213, 12, 45, 0.6)"
                  strokeWidth="2"
                />
                {/* Inner shield */}
                <path 
                  d="M100 25 L165 58 L165 108 Q165 150 100 175 Q35 150 35 108 L35 58 Z" 
                  fill="rgba(213, 12, 45, 0.1)"
                  stroke="rgba(213, 12, 45, 0.4)"
                  strokeWidth="1"
                />
                {/* TSRID Text */}
                <text 
                  x="100" 
                  y="95" 
                  textAnchor="middle" 
                  fill="#d50c2d" 
                  fontSize="36" 
                  fontWeight="bold"
                  fontFamily="Arial, sans-serif"
                >
                  TSRID
                </text>
                {/* ID Verification subtitle */}
                <text 
                  x="100" 
                  y="125" 
                  textAnchor="middle" 
                  fill="rgba(255,255,255,0.5)" 
                  fontSize="14"
                  fontFamily="Arial, sans-serif"
                >
                  ID Verification
                </text>
                {/* Scanning lines animation effect */}
                <line 
                  x1="50" y1="145" x2="150" y2="145" 
                  stroke="rgba(213, 12, 45, 0.3)" 
                  strokeWidth="2"
                  strokeDasharray="10,5"
                />
              </svg>
            </div>
            
            {/* Station Info */}
            <div className="space-y-2">
              {stationCode && (
                <div className="text-red-500/80 text-2xl font-bold tracking-wider">
                  {stationCode}
                </div>
              )}
              <div className="text-white/40 text-lg font-medium">
                {stationName}
              </div>
              <div className="text-white/20 text-sm mt-4 animate-pulse">
                Bildschirm berühren zum Entsperren
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle background animation - moving gradient */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${logoPosition.x}% ${logoPosition.y}%, rgba(213, 12, 45, 0.3) 0%, transparent 50%)`
        }}
      />

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
              {stationCode && (
                <p className="text-red-500/80 text-sm mt-1 font-mono">{stationCode}</p>
              )}
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    i < pin.length 
                      ? 'bg-red-500 border-red-500 scale-110' 
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
                  className="bg-gray-800 hover:bg-gray-700 active:bg-red-900/50 text-white text-2xl font-bold py-4 rounded-lg transition-colors"
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
                className="bg-gray-800 hover:bg-gray-700 active:bg-red-900/50 text-white text-2xl font-bold py-4 rounded-lg transition-colors"
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

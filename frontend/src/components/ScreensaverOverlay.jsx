import React, { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';

const ScreensaverOverlay = ({ 
  isActive, 
  onUnlock, 
  requirePin = false,
  onVerifyPin,
  stationName = 'TSRID Agent',
  stationCode = ''
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [showPinPad, setShowPinPad] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const [logoTilt, setLogoTilt] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 0.7 });
  const scaleDirectionRef = useRef(1);
  const tiltDirectionRef = useRef({ x: 1, y: 1 });

  // Animate logo with movement, rotation, scaling, and 3D tilt
  useEffect(() => {
    if (!isActive) return;

    let frameCount = 0;
    
    const animate = () => {
      frameCount++;
      
      // Move logo slowly across screen
      setLogoPosition(prev => {
        let newX = prev.x + directionRef.current.x * 0.08;
        let newY = prev.y + directionRef.current.y * 0.06;

        // Bounce off edges
        if (newX <= 20 || newX >= 80) {
          directionRef.current.x *= -1;
          newX = Math.max(20, Math.min(80, newX));
        }
        if (newY <= 20 || newY >= 80) {
          directionRef.current.y *= -1;
          newY = Math.max(20, Math.min(80, newY));
        }

        return { x: newX, y: newY };
      });

      // Gentle scale pulsing
      if (frameCount % 3 === 0) {
        setLogoScale(prev => {
          let newScale = prev + scaleDirectionRef.current * 0.001;
          if (newScale >= 1.05 || newScale <= 0.95) {
            scaleDirectionRef.current *= -1;
          }
          return Math.max(0.95, Math.min(1.05, newScale));
        });
      }

      // Slow rotation (full 360° over time)
      setLogoRotation(prev => (prev + 0.1) % 360);

      // 3D tilt effect
      if (frameCount % 2 === 0) {
        setLogoTilt(prev => {
          let newX = prev.x + tiltDirectionRef.current.x * 0.15;
          let newY = prev.y + tiltDirectionRef.current.y * 0.1;
          
          if (newX >= 15 || newX <= -15) {
            tiltDirectionRef.current.x *= -1;
          }
          if (newY >= 10 || newY <= -10) {
            tiltDirectionRef.current.y *= -1;
          }
          
          return {
            x: Math.max(-15, Math.min(15, newX)),
            y: Math.max(-10, Math.min(10, newY))
          };
        });
      }

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
          className="absolute"
          style={{ 
            left: `${logoPosition.x}%`, 
            top: `${logoPosition.y}%`,
            transform: `translate(-50%, -50%) scale(${logoScale}) perspective(1000px) rotateX(${logoTilt.y}deg) rotateY(${logoTilt.x}deg) rotate(${Math.sin(logoRotation * Math.PI / 180) * 5}deg)`,
            transition: 'none'
          }}
        >
          <div className="text-center">
            {/* TSRID Logo Image */}
            <div 
              className="mb-8"
              style={{
                filter: `drop-shadow(0 0 30px rgba(213, 12, 45, ${0.4 + Math.sin(logoRotation * 0.05) * 0.2})) drop-shadow(0 0 60px rgba(213, 12, 45, 0.2))`
              }}
            >
              <img 
                src="/tsrid-logo.png" 
                alt="TSRID Forensic Solutions"
                className="w-[400px] h-auto mx-auto"
                style={{
                  opacity: 0.9
                }}
              />
            </div>
            
            {/* Station Info */}
            <div className="space-y-3 mt-8">
              {stationCode && (
                <div 
                  className="text-red-500 text-4xl font-bold tracking-widest"
                  style={{
                    textShadow: '0 0 20px rgba(213, 12, 45, 0.5)'
                  }}
                >
                  {stationCode}
                </div>
              )}
              <div className="text-white/50 text-xl font-medium">
                {stationName}
              </div>
              <div className="text-white/25 text-base mt-6 animate-pulse">
                Bildschirm berühren zum Entsperren
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ambient glow effect that follows logo */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${logoPosition.x}% ${logoPosition.y}%, rgba(213, 12, 45, 0.15) 0%, transparent 40%)`
        }}
      />

      {/* PIN Pad Overlay */}
      {showPinPad && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-red-900/50 w-96 shadow-2xl">
            <div className="text-center mb-6">
              {/* Small logo in PIN pad */}
              <img 
                src="/tsrid-logo.png" 
                alt="TSRID"
                className="w-32 h-auto mx-auto mb-4 opacity-80"
              />
              <h2 className="text-white text-xl font-bold">Stations-PIN eingeben</h2>
              {stationCode && (
                <p className="text-red-500 text-lg mt-2 font-mono font-bold">{stationCode}</p>
              )}
              <p className="text-white/50 text-sm mt-1">{stationName}</p>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                    i < pin.length 
                      ? 'bg-red-500 border-red-500 scale-125 shadow-lg shadow-red-500/50' 
                      : 'border-gray-600'
                  }`}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-center text-sm p-3 rounded-lg mb-4 animate-shake">
                {error}
              </div>
            )}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(String(digit))}
                  className="bg-gray-800 hover:bg-gray-700 active:bg-red-900/50 text-white text-2xl font-bold py-5 rounded-xl transition-all duration-150 hover:scale-105 active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm font-bold py-5 rounded-xl transition-colors"
              >
                CLEAR
              </button>
              <button
                onClick={() => handlePinInput('0')}
                className="bg-gray-800 hover:bg-gray-700 active:bg-red-900/50 text-white text-2xl font-bold py-5 rounded-xl transition-all duration-150 hover:scale-105 active:scale-95"
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

            {/* Cancel Button */}
            <button
              onClick={() => setShowPinPad(false)}
              className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-xl hover:border-gray-500"
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

import React, { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';

// Matrix-style characters
const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
const HEX_CHARS = '0123456789ABCDEF';

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
  const [matrixColumns, setMatrixColumns] = useState([]);
  const [scanLineY, setScanLineY] = useState(0);
  const [hexCodes, setHexCodes] = useState([]);
  const [glitchActive, setGlitchActive] = useState(false);
  const animationRef = useRef(null);
  const directionRef = useRef({ x: 1.2, y: 0.8 });
  const scaleDirectionRef = useRef(1);
  const tiltDirectionRef = useRef({ x: 1, y: 1 });

  // Initialize matrix columns
  useEffect(() => {
    if (!isActive) return;
    
    const cols = [];
    const numCols = Math.floor(window.innerWidth / 20);
    for (let i = 0; i < numCols; i++) {
      cols.push({
        x: i * 20,
        y: Math.random() * window.innerHeight,
        speed: 2 + Math.random() * 4,
        chars: Array(20).fill('').map(() => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)])
      });
    }
    setMatrixColumns(cols);

    // Initialize hex codes floating around
    const hexes = [];
    for (let i = 0; i < 15; i++) {
      hexes.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        code: '0x' + Array(8).fill('').map(() => HEX_CHARS[Math.floor(Math.random() * 16)]).join(''),
        opacity: 0.1 + Math.random() * 0.2,
        speed: 0.02 + Math.random() * 0.03
      });
    }
    setHexCodes(hexes);
  }, [isActive]);

  // Main animation loop
  useEffect(() => {
    if (!isActive) return;

    let frameCount = 0;
    
    const animate = () => {
      frameCount++;
      
      // Move logo across ENTIRE screen (5% to 95%)
      setLogoPosition(prev => {
        let newX = prev.x + directionRef.current.x * 0.12;
        let newY = prev.y + directionRef.current.y * 0.08;

        // Bounce off edges - full screen coverage
        if (newX <= 12 || newX >= 88) {
          directionRef.current.x *= -1;
          // Add some randomness on bounce
          directionRef.current.y += (Math.random() - 0.5) * 0.5;
          newX = Math.max(12, Math.min(88, newX));
        }
        if (newY <= 12 || newY >= 88) {
          directionRef.current.y *= -1;
          directionRef.current.x += (Math.random() - 0.5) * 0.5;
          newY = Math.max(12, Math.min(88, newY));
        }

        // Clamp direction speed
        directionRef.current.x = Math.max(-1.5, Math.min(1.5, directionRef.current.x));
        directionRef.current.y = Math.max(-1.5, Math.min(1.5, directionRef.current.y));

        return { x: newX, y: newY };
      });

      // Scale pulsing
      if (frameCount % 3 === 0) {
        setLogoScale(prev => {
          let newScale = prev + scaleDirectionRef.current * 0.0015;
          if (newScale >= 1.06 || newScale <= 0.94) {
            scaleDirectionRef.current *= -1;
          }
          return Math.max(0.94, Math.min(1.06, newScale));
        });
      }

      // Rotation
      setLogoRotation(prev => (prev + 0.15) % 360);

      // 3D tilt
      if (frameCount % 2 === 0) {
        setLogoTilt(prev => {
          let newX = prev.x + tiltDirectionRef.current.x * 0.2;
          let newY = prev.y + tiltDirectionRef.current.y * 0.15;
          
          if (newX >= 12 || newX <= -12) tiltDirectionRef.current.x *= -1;
          if (newY >= 8 || newY <= -8) tiltDirectionRef.current.y *= -1;
          
          return {
            x: Math.max(-12, Math.min(12, newX)),
            y: Math.max(-8, Math.min(8, newY))
          };
        });
      }

      // Update matrix columns
      if (frameCount % 2 === 0) {
        setMatrixColumns(prev => prev.map(col => ({
          ...col,
          y: col.y + col.speed > window.innerHeight ? -400 : col.y + col.speed,
          chars: Math.random() > 0.95 
            ? col.chars.map(() => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)])
            : col.chars
        })));
      }

      // Scan line
      setScanLineY(prev => (prev + 2) % (window.innerHeight + 100));

      // Update hex codes
      if (frameCount % 3 === 0) {
        setHexCodes(prev => prev.map(hex => ({
          ...hex,
          y: hex.y + hex.speed > 100 ? 0 : hex.y + hex.speed,
          code: Math.random() > 0.98 
            ? '0x' + Array(8).fill('').map(() => HEX_CHARS[Math.floor(Math.random() * 16)]).join('')
            : hex.code
        })));
      }

      // Random glitch effect
      if (frameCount % 60 === 0 && Math.random() > 0.7) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100);
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

  const handleScreenClick = () => {
    if (requirePin) {
      setShowPinPad(true);
    } else {
      onUnlock();
    }
  };

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

  const handleBackspace = () => setPin(prev => prev.slice(0, -1));
  const handleClear = () => { setPin(''); setError(''); };

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
      {/* Matrix Rain Background */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {matrixColumns.map((col, i) => (
          <div
            key={i}
            className="absolute text-green-500 font-mono text-sm leading-tight"
            style={{
              left: col.x,
              top: col.y,
              transform: 'translateY(-100%)',
              textShadow: '0 0 10px #0f0'
            }}
          >
            {col.chars.map((char, j) => (
              <div 
                key={j} 
                style={{ 
                  opacity: 1 - (j * 0.05),
                  color: j === 0 ? '#fff' : undefined
                }}
              >
                {char}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Floating Hex Codes */}
      {hexCodes.map((hex, i) => (
        <div
          key={i}
          className="absolute font-mono text-xs text-red-500/30"
          style={{
            left: `${hex.x}%`,
            top: `${hex.y}%`,
            opacity: hex.opacity
          }}
        >
          {hex.code}
        </div>
      ))}

      {/* Scan Line */}
      <div
        className="absolute left-0 right-0 h-1 pointer-events-none"
        style={{
          top: scanLineY,
          background: 'linear-gradient(to bottom, transparent, rgba(213, 12, 45, 0.3), transparent)',
          boxShadow: '0 0 20px rgba(213, 12, 45, 0.5)'
        }}
      />

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(213, 12, 45, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(213, 12, 45, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Animated TSRID Logo */}
      {!showPinPad && (
        <div 
          className="absolute"
          style={{ 
            left: `${logoPosition.x}%`, 
            top: `${logoPosition.y}%`,
            transform: `translate(-50%, -50%) scale(${logoScale}) perspective(1000px) rotateX(${logoTilt.y}deg) rotateY(${logoTilt.x}deg) rotate(${Math.sin(logoRotation * Math.PI / 180) * 3}deg)`,
            filter: glitchActive ? 'hue-rotate(90deg) saturate(2)' : 'none'
          }}
        >
          <div className="text-center relative">
            {/* Glitch layers */}
            {glitchActive && (
              <>
                <img 
                  src="/tsrid-logo.png" 
                  alt=""
                  className="absolute w-[450px] h-auto opacity-50"
                  style={{ transform: 'translate(-3px, -3px)', filter: 'hue-rotate(-60deg)' }}
                />
                <img 
                  src="/tsrid-logo.png" 
                  alt=""
                  className="absolute w-[450px] h-auto opacity-50"
                  style={{ transform: 'translate(3px, 3px)', filter: 'hue-rotate(60deg)' }}
                />
              </>
            )}
            
            {/* Main Logo */}
            <div 
              className="mb-8"
              style={{
                filter: `drop-shadow(0 0 40px rgba(213, 12, 45, ${0.5 + Math.sin(logoRotation * 0.05) * 0.2})) drop-shadow(0 0 80px rgba(213, 12, 45, 0.3))`
              }}
            >
              <img 
                src="/tsrid-logo.png" 
                alt="TSRID Forensic Solutions"
                className="w-[450px] h-auto mx-auto"
              />
            </div>

            {/* Cyber frame around logo */}
            <div className="absolute -inset-8 border border-red-500/20 pointer-events-none">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/50" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500/50" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500/50" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500/50" />
            </div>
            
            {/* Station Info */}
            <div className="space-y-3 mt-8">
              {stationCode && (
                <div 
                  className="text-red-500 text-4xl font-bold tracking-widest font-mono"
                  style={{ textShadow: '0 0 20px rgba(213, 12, 45, 0.8)' }}
                >
                  [{stationCode}]
                </div>
              )}
              <div className="text-white/60 text-xl font-medium">
                {stationName}
              </div>
              
              {/* Cyber text decoration */}
              <div className="text-green-500/40 text-xs font-mono mt-4 space-y-1">
                <div>SYS::SECURE_MODE_ACTIVE</div>
                <div>SCAN::AWAITING_INPUT</div>
              </div>
              
              <div className="text-white/30 text-base mt-6 animate-pulse">
                [ TOUCH TO UNLOCK ]
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at ${logoPosition.x}% ${logoPosition.y}%, rgba(213, 12, 45, 0.2) 0%, transparent 50%)`
        }}
      />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 text-red-500/30 font-mono text-xs">
        <div>TSRID::v1.0.5</div>
        <div className="text-green-500/30">STATUS::LOCKED</div>
      </div>
      <div className="absolute top-4 right-4 text-red-500/30 font-mono text-xs text-right">
        <div>{new Date().toLocaleTimeString()}</div>
        <div>{new Date().toLocaleDateString()}</div>
      </div>
      <div className="absolute bottom-4 left-4 text-green-500/20 font-mono text-xs">
        ID_VERIFICATION_SYSTEM
      </div>
      <div className="absolute bottom-4 right-4 text-red-500/20 font-mono text-xs text-right">
        FORENSIC_SOLUTIONS
      </div>

      {/* PIN Pad Overlay */}
      {showPinPad && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[#0a0a0a] p-8 rounded-2xl border border-red-900/50 w-96 shadow-2xl relative overflow-hidden">
            {/* Scan line in PIN pad */}
            <div 
              className="absolute left-0 right-0 h-px bg-red-500/30 pointer-events-none"
              style={{ top: `${(scanLineY / 10) % 100}%` }}
            />
            
            <div className="text-center mb-6 relative z-10">
              <img 
                src="/tsrid-logo.png" 
                alt="TSRID"
                className="w-40 h-auto mx-auto mb-4 opacity-90"
              />
              <h2 className="text-white text-xl font-bold font-mono">ACCESS REQUIRED</h2>
              {stationCode && (
                <p className="text-red-500 text-lg mt-2 font-mono font-bold">[{stationCode}]</p>
              )}
              <p className="text-white/50 text-sm mt-1">{stationName}</p>
            </div>

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

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-center text-sm p-3 rounded-lg mb-4 font-mono">
                ERROR: {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinInput(String(digit))}
                  className="bg-gray-900 hover:bg-gray-800 active:bg-red-900/50 text-white text-2xl font-bold py-5 rounded-xl transition-all duration-150 hover:scale-105 active:scale-95 border border-gray-800 hover:border-red-500/50"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="bg-gray-900 hover:bg-gray-800 text-red-400 text-xs font-bold py-5 rounded-xl transition-colors border border-gray-800"
              >
                CLEAR
              </button>
              <button
                onClick={() => handlePinInput('0')}
                className="bg-gray-900 hover:bg-gray-800 active:bg-red-900/50 text-white text-2xl font-bold py-5 rounded-xl transition-all duration-150 hover:scale-105 active:scale-95 border border-gray-800 hover:border-red-500/50"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="bg-gray-900 hover:bg-gray-800 text-gray-400 text-2xl py-5 rounded-xl transition-colors border border-gray-800"
              >
                ⌫
              </button>
            </div>

            <button
              onClick={() => setShowPinPad(false)}
              className="w-full mt-4 py-3 text-gray-500 hover:text-white transition-colors border border-gray-800 rounded-xl hover:border-red-500/50 font-mono text-sm"
            >
              [ CANCEL ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreensaverOverlay;

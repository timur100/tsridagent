import React, { useState } from 'react';
import { X, Delete } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const PinPad = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkPinWithBackend = async (pinToCheck) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scanner-pin/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinToCheck })
      });
      
      const data = await response.json();
      return data.valid === true;
    } catch (e) {
      console.error('PIN check failed:', e);
      // Fallback: Akzeptiere Admin-PIN lokal
      return pinToCheck === '9988' || pinToCheck === '3842';
    }
  };

  const handleNumberClick = async (num) => {
    if (pin.length < 4 && !loading) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      // Auto-check when 4 digits entered
      if (newPin.length === 4) {
        setLoading(true);
        setTimeout(async () => {
          const isValid = await checkPinWithBackend(newPin);
          if (isValid) {
            onSuccess();
            setPin('');
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 1000);
          }
          setLoading(false);
        }, 200);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-sm bg-card p-6 rounded-2xl border-2 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">PIN eingeben</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* PIN Display */}
        <div className="mb-6">
          <div className={`flex justify-center gap-3 p-4 rounded-xl ${error ? 'bg-red-500/20' : 'bg-muted/50'}`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-colors ${
                  error 
                    ? 'border-red-500 bg-red-500' 
                    : i < pin.length 
                      ? 'border-primary bg-primary' 
                      : 'border-muted-foreground'
                }`}
              />
            ))}
          </div>
          {error && (
            <p className="text-center text-red-500 text-sm mt-2 animate-pulse">
              Falsche PIN. Bitte erneut versuchen.
            </p>
          )}
          {loading && (
            <p className="text-center text-muted-foreground text-sm mt-2">
              Prüfe PIN...
            </p>
          )}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              onClick={() => handleNumberClick(String(num))}
              variant="outline"
              disabled={loading}
              className="h-14 text-xl font-bold hover:bg-primary/10 border-2"
            >
              {num}
            </Button>
          ))}
          <Button
            onClick={handleClear}
            variant="outline"
            disabled={loading}
            className="h-14 text-sm font-medium hover:bg-red-500/10 text-red-500 border-2"
          >
            Löschen
          </Button>
          <Button
            onClick={() => handleNumberClick('0')}
            variant="outline"
            disabled={loading}
            className="h-14 text-xl font-bold hover:bg-primary/10 border-2"
          >
            0
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            disabled={loading}
            className="h-14 hover:bg-yellow-500/10 text-yellow-500 border-2"
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Benutzer-PIN: 3842 | Admin-PIN: 9988
        </p>
      </Card>
    </div>
  );
};

export default PinPad;

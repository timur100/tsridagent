import React, { useState } from 'react';
import { X, Delete } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const PinPad = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const correctPin = '1234'; // Demo PIN

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      // Auto-check when 4 digits entered
      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === correctPin) {
            onSuccess();
            setPin('');
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setError(false);
            }, 1000);
          }
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
        className="bg-card border-4 border-primary/40 p-8 max-w-md w-full animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">PIN Eingabe</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-foreground" />
          </button>
        </div>
        
        {/* PIN Display */}
        <div className="mb-8">
          <div className={`flex justify-center gap-4 mb-4 transition-all ${
            error ? 'animate-shake' : ''
          }`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-16 h-16 rounded-lg border-4 flex items-center justify-center transition-all ${
                  error 
                    ? 'border-destructive bg-destructive/10' 
                    : pin.length > i 
                    ? 'border-primary bg-primary/20' 
                    : 'border-border bg-muted/30'
                }`}
              >
                {pin.length > i && (
                  <div className={`w-4 h-4 rounded-full ${
                    error ? 'bg-destructive' : 'bg-primary'
                  }`} />
                )}
              </div>
            ))}
          </div>
          {error && (
            <p className="text-center text-destructive font-semibold animate-in fade-in duration-200">
              Falsche PIN!
            </p>
          )}
        </div>
        
        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              onClick={() => handleNumberClick(num.toString())}
              className="h-16 text-2xl font-bold bg-muted hover:bg-primary/20 text-foreground"
              disabled={pin.length >= 4}
            >
              {num}
            </Button>
          ))}
          <Button
            onClick={handleClear}
            className="h-16 text-lg font-semibold bg-muted hover:bg-destructive/20 text-foreground"
          >
            C
          </Button>
          <Button
            onClick={() => handleNumberClick('0')}
            className="h-16 text-2xl font-bold bg-muted hover:bg-primary/20 text-foreground"
            disabled={pin.length >= 4}
          >
            0
          </Button>
          <Button
            onClick={handleDelete}
            className="h-16 bg-muted hover:bg-destructive/20 text-foreground"
          >
            <Delete className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Hint */}
        <p className="text-center text-xs text-muted-foreground">
          Demo PIN: 1234
        </p>
      </Card>
    </div>
  );
};

export default PinPad;

import React, { useState } from 'react';
import { X, User, Lock } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import toast from 'react-hot-toast';

const SecurityLogin = ({ isOpen, onClose, onSuccess, securityUsers }) => {
  const [step, setStep] = useState('number'); // 'number' or 'pin'
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [selectedUser, setSelectedUser] = useState(null);
  const [shake, setShake] = useState(false);

  const handleNumberInput = (num) => {
    if (employeeNumber.length < 2) {
      const newNumber = employeeNumber + num;
      setEmployeeNumber(newNumber);
      
      if (newNumber.length === 2) {
        // Find user with this number
        const user = securityUsers.find(u => u.employeeNumber === newNumber);
        if (user) {
          setSelectedUser(user);
          setTimeout(() => setStep('pin'), 300);
        } else {
          toast.error('Mitarbeiternummer nicht gefunden!');
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setEmployeeNumber('');
          }, 500);
        }
      }
    }
  };

  const handlePinInput = (num) => {
    const firstEmpty = pin.findIndex(p => p === '');
    if (firstEmpty !== -1) {
      const newPin = [...pin];
      newPin[firstEmpty] = num;
      setPin(newPin);
      
      if (firstEmpty === 3) {
        // Check PIN
        setTimeout(() => {
          const enteredPin = newPin.join('');
          if (selectedUser && enteredPin === selectedUser.pin) {
            // Toast removed - notification handled by parent component
            onSuccess(selectedUser);
            handleClose();
          } else {
            toast.error('Falsche PIN!');
            setShake(true);
            setTimeout(() => {
              setShake(false);
              setPin(['', '', '', '']);
            }, 500);
          }
        }, 100);
      }
    }
  };

  const handleClear = () => {
    if (step === 'number') {
      setEmployeeNumber('');
    } else {
      setPin(['', '', '', '']);
    }
  };

  const handleBack = () => {
    if (step === 'pin') {
      setStep('number');
      setEmployeeNumber('');
      setSelectedUser(null);
      setPin(['', '', '', '']);
    }
  };

  const handleClose = () => {
    setStep('number');
    setEmployeeNumber('');
    setSelectedUser(null);
    setPin(['', '', '', '']);
    onClose();
  };

  const handleBackspace = () => {
    if (step === 'number') {
      setEmployeeNumber(employeeNumber.slice(0, -1));
    } else {
      const lastFilled = pin.map((p, i) => p !== '' ? i : -1).filter(i => i !== -1).pop();
      if (lastFilled !== undefined) {
        const newPin = [...pin];
        newPin[lastFilled] = '';
        setPin(newPin);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <Card className={`relative w-[500px] bg-card border-4 border-primary/40 p-8 shadow-2xl ${shake ? 'animate-shake' : ''}`}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <X className="h-6 w-6 text-foreground" />
        </button>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <User className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Security Login</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {step === 'number' ? 'Mitarbeiternummer eingeben' : `Willkommen ${selectedUser?.name}`}
          </p>
        </div>

        {step === 'number' ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-3 text-center">
              Mitarbeiternummer (2-stellig)
            </label>
            <div className="flex gap-3 justify-center mb-2">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className={`w-16 h-20 rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                    employeeNumber[index]
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {employeeNumber[index] || ''}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Lock className="h-5 w-5 text-primary" />
              <label className="text-sm font-medium text-foreground">
                PIN eingeben
              </label>
            </div>
            <div className="flex gap-3 justify-center mb-2">
              {pin.map((digit, index) => (
                <div
                  key={index}
                  className={`w-14 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    digit
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {digit ? '●' : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => step === 'number' ? handleNumberInput(num.toString()) : handlePinInput(num.toString())}
              className="h-16 rounded-xl bg-muted hover:bg-muted/70 border-2 border-border hover:border-primary/40 text-foreground text-xl font-semibold transition-all active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="h-16 rounded-xl bg-muted hover:bg-muted/70 border-2 border-border hover:border-primary/40 text-foreground text-sm font-semibold transition-all active:scale-95"
          >
            C
          </button>
          <button
            onClick={() => step === 'number' ? handleNumberInput('0') : handlePinInput('0')}
            className="h-16 rounded-xl bg-muted hover:bg-muted/70 border-2 border-border hover:border-primary/40 text-foreground text-xl font-semibold transition-all active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-16 rounded-xl bg-muted hover:bg-muted/70 border-2 border-border hover:border-primary/40 text-foreground text-sm font-semibold transition-all active:scale-95"
          >
            ⌫
          </button>
        </div>

        {step === 'pin' && (
          <Button
            onClick={handleBack}
            variant="outline"
            className="w-full"
          >
            Zurück zur Nummern-Eingabe
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground mt-4">
          Demo: 00=Admin (1234), 01=Max Müller (1111), 02=Anna Schmidt (2222)
        </p>
      </Card>
    </div>
  );
};

export default SecurityLogin;

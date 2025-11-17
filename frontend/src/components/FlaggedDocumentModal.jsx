import React from 'react';
import { AlertTriangle, XCircle, X } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';

const FlaggedDocumentModal = ({ isOpen, type, message, onConfirm, onCancel, requireConfirmation }) => {
  if (!isOpen) return null;

  const config = type === 'unknown' 
    ? {
        icon: AlertTriangle,
        title: 'Dokument unbekannt',
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30'
      }
    : {
        icon: XCircle,
        title: 'Dokument fehlerhaft',
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30'
      };

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className={`max-w-2xl w-full mx-4 p-8 ${config.bgColor} border-2 ${config.borderColor} shadow-2xl`}>
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Icon */}
          <div className={`${config.color} p-4 rounded-full ${config.bgColor}`}>
            <Icon className="h-16 w-16" strokeWidth={2} />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-foreground">
            {config.title}
          </h2>

          {/* Message */}
          <p className="text-lg text-foreground leading-relaxed max-w-xl">
            {message}
          </p>

          {/* Warning if confirmation required */}
          {requireConfirmation && (
            <div className="bg-card/50 border border-border rounded-lg p-4 w-full">
              <p className="text-sm text-muted-foreground">
                ⚠️ Sie müssen diese Meldung bestätigen, um fortzufahren.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 w-full pt-4">
            {!requireConfirmation && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 h-14 text-base"
              >
                Abbrechen
              </Button>
            )}
            <Button
              onClick={onConfirm}
              variant="destructive"
              className={`${requireConfirmation ? 'w-full' : 'flex-1'} h-14 text-base font-semibold`}
              style={{ backgroundColor: '#c00000' }}
            >
              {requireConfirmation ? 'OK - Verstanden' : 'OK'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FlaggedDocumentModal;

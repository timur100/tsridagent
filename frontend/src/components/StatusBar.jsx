import React from 'react';
import { Check, AlertTriangle, X, Loader2, HelpCircle, RotateCw } from 'lucide-react';

const StatusBar = ({ status, isProcessing, hasDocument, scanState }) => {
  const getStatusConfig = () => {
    // Scanning states - all remain GRAY (not colored)
    if (scanState === 'scanning') {
      return {
        icon: Loader2,
        text: 'SCANNE VORDERSEITE...',
        bgColor: 'bg-status-default',
        textColor: 'text-white',
        iconClass: 'animate-spin'
      };
    }

    if (scanState === 'scanning_back') {
      return {
        icon: Loader2,
        text: 'SCANNE RÜCKSEITE...',
        bgColor: 'bg-status-default',
        textColor: 'text-white',
        iconClass: 'animate-spin'
      };
    }
    
    // Special state for turning document - remains GRAY
    if (scanState === 'turn_document') {
      return {
        icon: RotateCw,
        text: 'BITTE DREHEN SIE DAS DOKUMENT',
        bgColor: 'bg-status-default',
        textColor: 'text-white',
        iconClass: 'animate-spin'
      };
    }
    
    // Document placed/recognized - remains GRAY (not green)
    if (scanState === 'placed') {
      return {
        icon: Check,
        text: 'DOKUMENT ERKANNT...',
        bgColor: 'bg-status-default',
        textColor: 'text-white',
        iconClass: ''
      };
    }
    
    // If no document, show gray bar with instruction
    if (!hasDocument && status !== 'success' && status !== 'warning' && status !== 'error' && status !== 'blurry') {
      return {
        icon: null,
        text: 'Bitte legen Sie das Dokument auf den Scanner...',
        bgColor: 'bg-status-default',
        textColor: 'text-white',
        iconClass: ''
      };
    }
    
    if (isProcessing) {
      return {
        icon: Loader2,
        text: 'VERARBEITUNG...',
        bgColor: 'bg-status-default',
        textColor: 'text-white',
        iconClass: 'animate-spin'
      };
    }
    
    switch (status) {
      case 'success':
        return {
          icon: Check,
          text: 'OK',
          bgColor: 'bg-status-success',
          textColor: 'text-white',
          iconClass: ''
        };
      case 'warning':
      case 'unknown':
        return {
          icon: HelpCircle,
          text: 'UNBEKANNT',
          bgColor: 'bg-status-warning',
          textColor: 'text-black',
          iconClass: ''
        };
      case 'blurry':
        return {
          icon: AlertTriangle,
          text: 'VERSCHWOMMEN - ERNEUT SCANNEN',
          bgColor: 'bg-status-error',
          textColor: 'text-white',
          iconClass: 'animate-pulse'
        };
      case 'error':
        return {
          icon: X,
          text: 'FEHLERHAFT',
          bgColor: 'bg-status-error',
          textColor: 'text-white',
          iconClass: ''
        };
      default:
        return {
          icon: null,
          text: 'Bitte legen Sie das Dokument auf den Scanner...',
          bgColor: 'bg-status-default',
          textColor: 'text-white',
          iconClass: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} ${config.textColor} px-8 py-6 border-b-4 border-black/20`}>
      <div className="flex items-center justify-center gap-4">
        {Icon && <Icon className={`h-8 w-8 ${config.iconClass}`} strokeWidth={3} />}
        <span className="text-3xl font-bold tracking-wider text-shadow-sm">
          {config.text}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;

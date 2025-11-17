import React from 'react';
import { Button } from './ui/button';
import { CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';

const ActionButtons = ({ onAction, isUnlocked, securityUser, onSecurityAction, hasDocument, currentStatus, onSecurityDashboard }) => {
  // Only show action buttons if security user is logged in
  if (!securityUser) {
    return null;
  }

  // Check if a final scan result is available (not just document placed)
  const hasResult = ['success', 'warning', 'error', 'unknown', 'blurry'].includes(currentStatus);

  const securityActions = [
    { 
      id: 'approve', 
      label: 'Genehmigen', 
      icon: CheckCircle,
      onClick: () => onSecurityAction('approved'),
      requiresResult: true  // Needs scan result to be active
    },
    { 
      id: 'reject', 
      label: 'Ablehnen', 
      icon: XCircle,
      onClick: () => onSecurityAction('rejected'),
      requiresResult: true  // Needs scan result to be active
    },
    { 
      id: 'flag', 
      label: 'Problem melden', 
      icon: AlertTriangle,
      onClick: () => onSecurityAction('problem'),
      requiresResult: false
    },
    { 
      id: 'more', 
      label: 'Security Dashboard', 
      icon: Shield,
      onClick: () => onSecurityDashboard(),
      requiresResult: false
    }
  ];

  return (
    <div className="space-y-3 w-full">
      {/* Security actions row */}
      <div className="flex gap-3 w-full">
        {securityActions.map((action) => {
          const Icon = action.icon;
          // Disable if scan result is required but not available yet
          const isDisabled = action.requiresResult && !hasResult;
          
          return (
            <Button
              key={action.id}
              onClick={action.onClick}
              disabled={isDisabled}
              variant="destructive"
              className={`flex-1 h-14 text-base font-semibold text-white ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{ backgroundColor: isDisabled ? '#666' : '#c00000' }}
              onMouseEnter={(e) => !isDisabled && (e.currentTarget.style.backgroundColor = '#a00000')}
              onMouseLeave={(e) => !isDisabled && (e.currentTarget.style.backgroundColor = '#c00000')}
            >
              <Icon className="mr-2 h-5 w-5" />
              {action.label}
              {isDisabled && <span className="ml-2 text-xs">(kein Ergebnis)</span>}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default ActionButtons;

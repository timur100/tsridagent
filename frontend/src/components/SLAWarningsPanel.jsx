import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  AlertTriangle, Clock, XCircle, TrendingUp, 
  RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const SLAWarningsPanel = ({ onTicketClick }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [warnings, setWarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState('critical'); // critical, breached, at_risk
  
  useEffect(() => {
    loadWarnings();
    
    // Auto-refresh every 2 minutes
    const interval = setInterval(loadWarnings, 120000);
    return () => clearInterval(interval);
  }, []);
  
  const loadWarnings = async () => {
    try {
      const result = await apiCall('/api/sla/warnings');
      console.log('SLA Warnings result:', result);
      
      if (result.success && result.data) {
        setWarnings(result.data);
      } else if (result.success) {
        // API returned success but no data structure - set empty
        setWarnings({
          critical_count: 0,
          breached_count: 0,
          at_risk_count: 0,
          warnings: {
            critical: [],
            breached: [],
            at_risk: []
          }
        });
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error loading SLA warnings:', error);
      // Only show toast on actual error, not on empty data
      if (error.message !== 'API returned unsuccessful response') {
        toast.error('Fehler beim Laden der SLA-Warnungen');
      }
      // Set empty warnings structure on error
      setWarnings({
        critical_count: 0,
        breached_count: 0,
        at_risk_count: 0,
        warnings: {
          critical: [],
          breached: [],
          at_risk: []
        }
      });
    } finally {
      setLoading(false);
    }
  };
  
  const formatTimeRemaining = (hours) => {
    if (!hours) return '-';
    
    const absHours = Math.abs(hours);
    const isOverdue = hours < 0;
    
    if (absHours < 1) {
      const minutes = Math.round(absHours * 60);
      return `${isOverdue ? '-' : ''}${minutes}m`;
    } else if (absHours < 24) {
      return `${isOverdue ? '-' : ''}${Math.round(absHours)}h`;
    } else {
      const days = Math.round(absHours / 24);
      return `${isOverdue ? '-' : ''}${days}d`;
    }
  };
  
  const getSeverityColor = (sla) => {
    if (sla.resolution_breached || sla.response_breached) {
      return 'text-red-600 dark:text-red-400';
    }
    if (sla.resolution_time_remaining && sla.resolution_time_remaining < 2) {
      return 'text-orange-600 dark:text-orange-400';
    }
    return 'text-yellow-600 dark:text-yellow-400';
  };
  
  const WarningSection = ({ title, icon: Icon, count, items, sectionKey, color }) => {
    const isExpanded = expandedSection === sectionKey;
    
    return (
      <Card className={`mb-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <button
          onClick={() => setExpandedSection(isExpanded ? null : sectionKey)}
          className={`w-full p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors ${
            theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${color}`} />
            <div className="text-left">
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {count} {count === 1 ? 'Ticket' : 'Tickets'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-2xl font-bold ${color}`}>
              {count}
            </span>
            {isExpanded ? (
              <ChevronUp className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            ) : (
              <ChevronDown className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
            )}
          </div>
        </button>
        
        {isExpanded && items.length > 0 && (
          <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="p-4 space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => onTicketClick && onTicketClick(item.ticket)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    theme === 'dark' 
                      ? 'bg-[#1a1a1a] hover:bg-[#222]' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-mono text-sm font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.ticket.ticket_number}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.sla.priority === 'critical'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : item.sla.priority === 'high'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            : item.sla.priority === 'medium'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {item.sla.priority}
                        </span>
                      </div>
                      
                      <p className={`text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                      }`}>
                        {item.ticket.title}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs">
                        {item.sla.response_breached && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="h-3 w-3" />
                            Response SLA breached
                          </span>
                        )}
                        {item.sla.resolution_breached && (
                          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="h-3 w-3" />
                            Resolution SLA breached
                          </span>
                        )}
                        {!item.sla.response_breached && item.sla.response_time_remaining !== null && (
                          <span className={`flex items-center gap-1 ${
                            item.sla.response_time_remaining < 1 
                              ? 'text-red-600 dark:text-red-400' 
                              : 'text-orange-600 dark:text-orange-400'
                          }`}>
                            <Clock className="h-3 w-3" />
                            Response: {formatTimeRemaining(item.sla.response_time_remaining)}
                          </span>
                        )}
                        {!item.sla.resolution_breached && item.sla.resolution_time_remaining !== null && (
                          <span className={`flex items-center gap-1 ${
                            item.sla.resolution_time_remaining < 2 
                              ? 'text-orange-600 dark:text-orange-400' 
                              : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <Clock className="h-3 w-3" />
                            Resolution: {formatTimeRemaining(item.sla.resolution_time_remaining)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };
  
  if (loading) {
    return (
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center justify-center">
          <RefreshCw className={`h-6 w-6 animate-spin ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
          <span className={`ml-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lade SLA-Warnungen...
          </span>
        </div>
      </Card>
    );
  }
  
  // Show empty state if no warnings at all (but not an error)
  const totalWarnings = (warnings?.critical_count || 0) + (warnings?.breached_count || 0) + (warnings?.at_risk_count || 0);
  
  if (!warnings || !warnings.warnings) {
    return (
      <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <AlertTriangle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Keine SLA-Daten verfügbar
        </h3>
        <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
          Es konnten keine SLA-Warnungen geladen werden. Bitte versuchen Sie es später erneut.
        </p>
        <Button
          onClick={loadWarnings}
          className="mt-4"
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Erneut versuchen
        </Button>
      </Card>
    );
  }
  
  // Show "all good" state if data loaded but no warnings
  if (totalWarnings === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            SLA Warnungen
          </h2>
          <Button
            onClick={loadWarnings}
            variant="outline"
            size="sm"
            className={theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
        
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <TrendingUp className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Alle SLAs eingehalten
          </h3>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Aktuell gibt es keine kritischen Tickets oder SLA-Verstöße
          </p>
        </Card>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          SLA Warnungen
        </h2>
        <Button
          onClick={loadWarnings}
          variant="outline"
          size="sm"
          className={theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>
      
      <WarningSection
        title="Kritische Priorität"
        icon={AlertTriangle}
        count={warnings.critical_count || 0}
        items={warnings.warnings?.critical || []}
        sectionKey="critical"
        color="text-red-600 dark:text-red-400"
      />
      
      <WarningSection
        title="SLA Überschritten"
        icon={XCircle}
        count={warnings.breached_count || 0}
        items={warnings.warnings?.breached || []}
        sectionKey="breached"
        color="text-red-600 dark:text-red-400"
      />
      
      <WarningSection
        title="Gefährdet (< 2h verbleibend)"
        icon={Clock}
        count={warnings.at_risk_count || 0}
        items={warnings.warnings?.at_risk || []}
        sectionKey="at_risk"
        color="text-orange-600 dark:text-orange-400"
      />
    </div>
  );
};

export default SLAWarningsPanel;

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Car, Truck, Bus, Bike, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const DrivingLicenseClasses = ({ licenseData }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!licenseData || !licenseData.all_classes || licenseData.all_classes.length === 0) {
    return null;
  }

  const { valid_classes, expired_classes, warnings, allowed_for_rental, rental_class_required, is_eligible_for_rental } = licenseData;

  // Icon-Mapping für Kategorien
  const getCategoryIcon = (licenseClass) => {
    if (['B', 'BE', 'B96'].includes(licenseClass)) return <Car className="h-4 w-4" />;
    if (['C', 'C1', 'CE', 'C1E'].includes(licenseClass)) return <Truck className="h-4 w-4" />;
    if (['D', 'D1', 'DE', 'D1E'].includes(licenseClass)) return <Bus className="h-4 w-4" />;
    if (['A', 'A1', 'A2', 'AM'].includes(licenseClass)) return <Bike className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  // Kompakte Ansicht (nicht expandiert)
  const CompactView = () => (
    <div className="space-y-2">
      {/* Vermietungsstatus */}
      <div className={`flex items-center gap-2 p-2 rounded ${
        is_eligible_for_rental 
          ? 'bg-green-500/10 border border-green-500/30' 
          : 'bg-red-500/10 border border-red-500/30'
      }`}>
        {is_eligible_for_rental ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm font-medium">
          {is_eligible_for_rental 
            ? `✅ Berechtigt für Klasse ${rental_class_required}`
            : `❌ Nicht berechtigt für Klasse ${rental_class_required}`
          }
        </span>
      </div>

      {/* Gültige Klassen - Badges */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground">Gültige Klassen:</span>
        {valid_classes.map((cls) => (
          <Badge 
            key={cls.license_class} 
            className="bg-green-500/10 text-green-500 border-green-500/30"
          >
            {getCategoryIcon(cls.license_class)}
            <span className="ml-1">{cls.license_class}</span>
          </Badge>
        ))}
      </div>

      {/* Warnungen - nur erste anzeigen */}
      {warnings.length > 0 && (
        <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <span className="text-xs text-yellow-500">{warnings[0]}</span>
        </div>
      )}

      {/* Expandieren Button */}
      <button
        onClick={() => setIsExpanded(true)}
        className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
      >
        Details anzeigen
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );

  // Erweiterte Ansicht (expandiert)
  const ExpandedView = () => (
    <div className="space-y-4">
      {/* Vermietungsstatus */}
      <div className={`p-3 rounded-lg ${
        is_eligible_for_rental 
          ? 'bg-green-500/10 border border-green-500/30' 
          : 'bg-red-500/10 border border-red-500/30'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {is_eligible_for_rental ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-semibold text-sm">
            Vermietungsberechtigung (Klasse {rental_class_required})
          </span>
        </div>
        <p className="text-xs text-muted-foreground ml-7">
          {is_eligible_for_rental 
            ? `Fahrer ist berechtigt, Fahrzeuge der Klasse ${rental_class_required} zu führen.`
            : `Fahrer ist NICHT berechtigt, Fahrzeuge der Klasse ${rental_class_required} zu führen.`
          }
        </p>
      </div>

      {/* Alle Warnungen */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-yellow-500 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Warnungen ({warnings.length})
          </div>
          {warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
              <span className="text-xs text-yellow-500">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Gültige Klassen - Detailliert */}
      {valid_classes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-green-500 flex items-center gap-1">
            <CheckCircle className="h-4 w-4" />
            Gültige Klassen ({valid_classes.length})
          </div>
          <div className="space-y-2">
            {valid_classes.map((cls) => (
              <div 
                key={cls.license_class}
                className="flex items-center justify-between p-2 rounded bg-green-500/5 border border-green-500/20"
              >
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cls.license_class)}
                  <span className="font-mono font-bold text-sm">{cls.license_class}</span>
                </div>
                <div className="text-right">
                  {cls.valid_until && (
                    <>
                      <div className="text-xs text-green-500 font-medium">
                        Gültig bis: {cls.valid_until}
                      </div>
                      {cls.days_until_expiry !== null && cls.days_until_expiry <= 30 && (
                        <div className="text-xs text-yellow-500">
                          ({cls.days_until_expiry} Tage)
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abgelaufene Klassen - Detailliert */}
      {expired_classes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-red-500 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Abgelaufene Klassen ({expired_classes.length})
          </div>
          <div className="space-y-2">
            {expired_classes.map((cls) => (
              <div 
                key={cls.license_class}
                className="flex items-center justify-between p-2 rounded bg-red-500/5 border border-red-500/20"
              >
                <div className="flex items-center gap-2">
                  {getCategoryIcon(cls.license_class)}
                  <span className="font-mono font-bold text-sm text-red-500">{cls.license_class}</span>
                </div>
                <div className="text-right">
                  {cls.valid_until && (
                    <>
                      <div className="text-xs text-red-500 font-medium">
                        Abgelaufen: {cls.valid_until}
                      </div>
                      {cls.days_until_expiry !== null && (
                        <div className="text-xs text-muted-foreground">
                          (vor {Math.abs(cls.days_until_expiry)} Tagen)
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zugelassene Klassen für Vermietung */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <div className="text-xs font-semibold mb-2">Für Vermietung zugelassen:</div>
        <div className="flex flex-wrap gap-2">
          {allowed_for_rental.map((cls) => (
            <Badge 
              key={cls}
              className="bg-primary/10 text-primary border-primary/30"
            >
              {getCategoryIcon(cls)}
              <span className="ml-1">{cls}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* Einklappen Button */}
      <button
        onClick={() => setIsExpanded(false)}
        className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
      >
        Weniger anzeigen
        <ChevronUp className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-primary" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Führerscheinklassen
        </span>
      </div>
      
      <Card className="p-3 bg-card/50">
        {isExpanded ? <ExpandedView /> : <CompactView />}
      </Card>
    </div>
  );
};

export default DrivingLicenseClasses;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Calculator, AlertTriangle, CheckCircle, Package, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const DemandCalculator = () => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [targetSets, setTargetSets] = useState(1);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch templates on load
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/components/templates/list');
      if (response.success && response.data) {
        setTemplates(response.data.templates || []);
        if (response.data.templates && response.data.templates.length > 0) {
          setSelectedTemplateId(response.data.templates[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Fehler beim Laden der Vorlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedTemplateId) {
      toast.error('Bitte wählen Sie eine Vorlage aus');
      return;
    }

    if (targetSets < 1) {
      toast.error('Anzahl der Sets muss mindestens 1 sein');
      return;
    }

    setCalculating(true);
    try {
      const response = await apiCall('/api/components/demand-calculation', {
        method: 'POST',
        body: JSON.stringify({
          template_id: selectedTemplateId,
          target_sets: parseInt(targetSets)
        })
      });

      if (response.success && response.data) {
        setResult(response.data);
        if (response.data.all_components_available) {
          toast.success(`Sie können ${response.data.can_build_sets} Sets bauen!`);
        } else {
          toast.error(`Unzureichende Komponenten. Nur ${response.data.can_build_sets} Sets möglich.`);
        }
      } else {
        toast.error('Fehler bei der Berechnung');
      }
    } catch (error) {
      console.error('Error calculating demand:', error);
      toast.error(error.message || 'Fehler bei der Bedarfsermittlung');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Bedarfsermittlung (Set-Kalkulator)
        </h2>
        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Berechnen Sie, welche Komponenten Sie benötigen, um eine bestimmte Anzahl von Sets zu bauen
        </p>
      </div>

      {/* Input Section */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Template Selection */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Vorlage auswählen
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={loading || templates.length === 0}
                className={`w-full px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                {templates.length === 0 ? (
                  <option value="">Keine Vorlagen verfügbar</option>
                ) : (
                  templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.template_name} ({template.components?.length || 0} Komponenten)
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Target Sets Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Anzahl der Sets
              </label>
              <input
                type="number"
                min="1"
                value={targetSets}
                onChange={(e) => setTargetSets(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="z.B. 10"
              />
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            disabled={calculating || !selectedTemplateId || templates.length === 0}
            className="w-full bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculating ? 'Berechnet...' : 'Bedarf berechnen'}
          </Button>
        </div>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ziel-Sets
                  </p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {result.target_sets}
                  </p>
                </div>
                <Package className={`h-10 w-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
            </Card>

            <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Baubare Sets
                  </p>
                  <p className={`text-2xl font-bold ${
                    result.can_build_sets >= result.target_sets
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {result.can_build_sets}
                  </p>
                </div>
                <TrendingUp className={`h-10 w-10 ${
                  result.can_build_sets >= result.target_sets
                    ? 'text-green-600'
                    : 'text-red-600'
                }`} />
              </div>
            </Card>

            <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </p>
                  <p className={`text-sm font-bold ${
                    result.all_components_available
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {result.all_components_available ? 'Alle verfügbar' : 'Fehlende Komponenten'}
                  </p>
                </div>
                {result.all_components_available ? (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertTriangle className="h-10 w-10 text-red-600" />
                )}
              </div>
            </Card>
          </div>

          {/* Component Demand Table */}
          <Card className={theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}>
            <div className="p-4 border-b" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Komponentenbedarf für {result.template_name}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`text-left p-4 font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Komponente
                    </th>
                    <th className={`text-left p-4 font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Typ
                    </th>
                    <th className={`text-right p-4 font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Pro Set
                    </th>
                    <th className={`text-right p-4 font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Gesamt Benötigt
                    </th>
                    <th className={`text-right p-4 font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Aktueller Bestand
                    </th>
                    <th className={`text-right p-4 font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Fehlmenge
                    </th>
                    <th className={`text-center p-4 font-mono text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.demand && result.demand.map((item, index) => (
                    <tr
                      key={index}
                      className={`border-b ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className={`p-4 text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        <div>
                          <div className="font-medium">{item.component_name}</div>
                          <div className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            {item.identification_value}
                          </div>
                        </div>
                      </td>
                      <td className={`p-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.component_type}
                      </td>
                      <td className={`p-4 text-sm text-right ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.required_per_set}
                      </td>
                      <td className={`p-4 text-sm text-right font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.total_required}
                      </td>
                      <td className={`p-4 text-sm text-right ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.current_stock}
                      </td>
                      <td className={`p-4 text-sm text-right font-bold ${
                        item.shortage > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.shortage > 0 ? item.shortage : '-'}
                      </td>
                      <td className="p-4 text-center">
                        {item.is_sufficient ? (
                          <CheckCircle className="h-5 w-5 text-green-600 inline" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Shortages Alert */}
          {result.shortages && result.shortages.length > 0 && (
            <Card className={`p-4 border-l-4 border-red-600 ${
              theme === 'dark' ? 'bg-red-900/20 border-gray-700' : 'bg-red-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Fehlende Komponenten ({result.shortages.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.shortages.map((shortage, index) => (
                      <li key={index} className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        • <strong>{shortage.component_name}</strong>: {shortage.shortage} {shortage.unit} fehlen
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Low Stock Alert */}
          {result.low_stock_alerts && result.low_stock_alerts.length > 0 && (
            <Card className={`p-4 border-l-4 border-yellow-600 ${
              theme === 'dark' ? 'bg-yellow-900/20 border-gray-700' : 'bg-yellow-50 border-gray-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className={`font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Niedriger Bestand ({result.low_stock_alerts.length})
                  </h4>
                  <ul className="space-y-1">
                    {result.low_stock_alerts.map((alert, index) => (
                      <li key={index} className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        • <strong>{alert.component_name}</strong>: {alert.current_stock} Stück 
                        (Mindestbestand: {alert.min_stock_level})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* No Templates Message */}
      {!loading && templates.length === 0 && (
        <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Package className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Vorlagen verfügbar
          </p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen Sie zuerst eine Vorlage im "Vorlagen"-Tab, um die Bedarfsermittlung zu nutzen.
          </p>
        </Card>
      )}
    </div>
  );
};

export default DemandCalculator;

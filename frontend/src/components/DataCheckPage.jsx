import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  CheckCircle, XCircle, AlertTriangle, Package, MapPin, Wrench,
  Upload, FileText, Play, Download, Search, Filter, RefreshCw,
  Clock, Archive, X, Info, TrendingUp, Database, FileSpreadsheet, Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import SubTabNavigation from './SubTabNavigation';

const DataCheckPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [activeTab, setActiveTab] = useState('validation');
  const [serialNumbers, setSerialNumbers] = useState('');
  const [importedFile, setImportedFile] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        // Parse CSV or text file
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        setSerialNumbers(lines.join('\n'));
        setImportedFile(file.name);
        toast.success(`${lines.length} Seriennummern importiert`);
      };
      reader.readAsText(file);
    }
  };

  const handleRunTest = async () => {
    if (!serialNumbers.trim()) {
      toast.error('Bitte geben Sie mindestens eine Seriennummer ein');
      return;
    }

    setIsLoading(true);
    try {
      const serialList = serialNumbers
        .split('\n')
        .map(sn => sn.trim())
        .filter(sn => sn);

      const result = await apiCall('/api/test-center/data-check', {
        method: 'POST',
        body: JSON.stringify({
          serial_numbers: serialList
        })
      });

      console.log('[DataCheck] API Response:', result);

      // apiCall returns { success, data, status }
      // Backend returns { success: true, data: { summary, results, ... } }
      if (result.success) {
        const responseData = result.data;
        console.log('[DataCheck] Response data:', responseData);
        
        // Check if data is nested (from apiCall wrapper)
        if (responseData && responseData.data) {
          setTestResults(responseData.data);
        } else if (responseData && responseData.summary && responseData.results) {
          setTestResults(responseData);
        } else {
          setTestResults(responseData);
        }
        
        toast.success(`Test abgeschlossen: ${serialList.length} Seriennummern geprüft`);
      } else {
        toast.error('Test fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error running data check:', error);
      toast.error('Fehler beim Ausführen des Tests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSerialNumbers('');
    setImportedFile(null);
    setTestResults(null);
    setActiveFilter('all');
  };

  const handleLoadExamples = () => {
    const exampleSerials = '047924271453\n201737 01567\n010242571153';
    setSerialNumbers(exampleSerials);
    toast.success('Beispieldaten geladen');
  };

  const handleExportResults = () => {
    if (!testResults) return;

    const csvContent = generateCSVReport(testResults);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `daten-check-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Report exportiert');
  };

  const generateCSVReport = (results) => {
    let csv = 'Seriennummer,Status,Kategorie,Gerät,Standort,Bemerkungen\n';
    
    Object.entries(results.results || {}).forEach(([category, items]) => {
      items.forEach(item => {
        csv += `"${item.serial_number}","${item.status}","${category}","${item.device_type || '-'}","${item.location || '-'}","${item.notes || '-'}"\n`;
      });
    });
    
    return csv;
  };

  const getFilteredResults = () => {
    if (!testResults || !testResults.results) return {};
    
    if (activeFilter === 'all') {
      return testResults.results;
    }
    
    return {
      [activeFilter]: testResults.results[activeFilter] || []
    };
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'correct': CheckCircle,
      'incorrect': XCircle,
      'unused': AlertTriangle,
      'closed_location': Archive,
      'defective': Wrench,
      'in_warehouse': Package
    };
    return icons[category] || Info;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'correct': 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
      'incorrect': 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
      'unused': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
      'closed_location': 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
      'defective': 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
      'in_warehouse': 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
    };
    return colors[category] || 'text-gray-600 bg-gray-100';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'correct': 'Korrekt',
      'incorrect': 'Inkorrekt',
      'unused': 'Unbenutzt',
      'closed_location': 'Geschlossener Standort',
      'defective': 'Defekt',
      'in_warehouse': 'Im Lager'
    };
    return labels[category] || category;
  };

  const filteredResults = getFilteredResults();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Daten Check
          </h1>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Validierung von Geräte- und Standortdaten, Seriennummern-Prüfung
          </p>
        </div>
        {testResults && (
          <Button
            onClick={handleExportResults}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Report exportieren
          </Button>
        )}
      </div>

      {/* Tab Navigation */}
      <SubTabNavigation
        tabs={[
          { id: 'validation', label: 'Validierung', icon: CheckCircle },
          { id: 'setid-config', label: 'Set-ID Konfiguration', icon: Settings }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Validation Tab */}
      {activeTab === 'validation' && (
        <>
          {/* Input Section */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Seriennummern eingeben oder importieren
            </h2>
            <Button
              onClick={handleLoadExamples}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Beispieldaten laden
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 border-red-600"
            >
              <RefreshCw className="h-4 w-4" />
              Alles zurücksetzen
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Text Input */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Seriennummern (eine pro Zeile)
              </label>
              <textarea
                value={serialNumbers}
                onChange={(e) => setSerialNumbers(e.target.value)}
                placeholder="Seriennummern hier eingeben...&#10;Beispiel:&#10;047924271453&#10;201737 01567&#10;010242571153"
                rows={10}
                className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {serialNumbers.split('\n').filter(s => s.trim()).length} Seriennummern eingegeben
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                CSV/TXT Datei importieren
              </label>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                theme === 'dark' ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-300 bg-gray-50'
              }`}>
                <Upload className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {importedFile || 'CSV oder TXT Datei hochladen'}
                </p>
                <label className="cursor-pointer">
                  <span className="text-[#c00000] hover:text-[#a00000] text-sm font-medium">
                    Datei auswählen
                  </span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className={`mt-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                  <strong>Format:</strong> Eine Seriennummer pro Zeile. CSV-Dateien werden automatisch geparst.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleRunTest}
              disabled={isLoading || !serialNumbers.trim()}
              className="flex items-center gap-2 bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Test läuft...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Test starten
                </>
              )}
            </Button>
            
            <Button
              onClick={() => setSerialNumbers('')}
              variant="outline"
              disabled={!serialNumbers.trim()}
            >
              Eingabe löschen
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Section */}
      {testResults && (
        <div className="space-y-4">
          {/* Debug Info - Remove after testing */}
          {!testResults.summary && (
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-400">
                Debug: testResults vorhanden, aber summary fehlt. Keys: {Object.keys(testResults).join(', ')}
              </p>
            </div>
          )}
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(testResults.summary || {}).map(([category, count]) => {
              const Icon = getCategoryIcon(category);
              return (
                <Card
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className={`p-4 cursor-pointer transition-all ${
                    activeFilter === category
                      ? 'ring-2 ring-[#c00000]'
                      : ''
                  } ${theme === 'dark' ? 'bg-[#2a2a2a] hover:bg-[#333]' : 'bg-white hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {count}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {getCategoryLabel(category)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setActiveFilter('all')}
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
            >
              Alle anzeigen
            </Button>
            {Object.keys(testResults.results || {}).map(category => (
              <Button
                key={category}
                onClick={() => setActiveFilter(category)}
                variant={activeFilter === category ? 'default' : 'outline'}
                size="sm"
              >
                {getCategoryLabel(category)}
              </Button>
            ))}
          </div>

          {/* Results Table */}
          <Card className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Seriennummer
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Gerätetyp
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Standort
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Bemerkungen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(filteredResults).map(([category, items]) =>
                    items.map((item, idx) => {
                      const Icon = getCategoryIcon(category);
                      return (
                        <tr
                          key={`${category}-${idx}`}
                          className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                        >
                          <td className="px-6 py-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
                              <Icon className="h-4 w-4" />
                              {getCategoryLabel(category)}
                            </div>
                          </td>
                          <td className={`px-6 py-4 font-mono text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {item.serial_number}
                          </td>
                          <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.device_type || '-'}
                          </td>
                          <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.location || '-'}
                          </td>
                          <td className={`px-6 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!testResults && !isLoading && (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <Database className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Testergebnisse
          </h3>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Geben Sie Seriennummern ein und starten Sie den Test, um Ergebnisse zu sehen
          </p>
        </Card>
      )}
        </>
      )}

      {/* Set-ID Configuration Tab */}
      {activeTab === 'setid-config' && (
        <SetIDConfigurationTab theme={theme} apiCall={apiCall} />
      )}
    </div>
  );
};

// Set-ID Configuration Component
const SetIDConfigurationTab = ({ theme, apiCall }) => {
  const [setIdFormat, setSetIdFormat] = useState('LOCATIONCODE-SETNUMBER-SERIALNUMBER');
  const [formatParts, setFormatParts] = useState([
    { key: 'LOCATIONCODE', label: 'Standortcode', description: 'z.B. BERT01', example: 'BERT01' },
    { key: 'SETNUMBER', label: 'Set-Nummer', description: 'z.B. 01', example: '01' },
    { key: 'SERIALNUMBER', label: 'Seriennummer', description: 'z.B. S1', example: 'S1' }
  ]);
  const [separator, setSeparator] = useState('-');
  const [isSaving, setIsSaving] = useState(false);

  const generatePreview = () => {
    return formatParts.map(part => part.example).join(separator);
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      const config = {
        format: setIdFormat,
        parts: formatParts,
        separator: separator
      };
      
      const result = await apiCall('/api/test-center/setid-config', {
        method: 'POST',
        body: JSON.stringify(config)
      });

      if (result.success) {
        toast.success('Set-ID Konfiguration gespeichert');
      }
    } catch (error) {
      console.error('Error saving Set-ID config:', error);
      toast.error('Fehler beim Speichern der Konfiguration');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePartChange = (index, field, value) => {
    const newParts = [...formatParts];
    newParts[index][field] = value;
    setFormatParts(newParts);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Info */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="mb-4">
          <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Set-ID Format Konfiguration
          </h2>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Definieren Sie das Format und die Bedeutung der Set-ID Komponenten
          </p>
        </div>

        {/* Preview */}
        <div className={`p-4 rounded-lg mb-6 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Vorschau
          </label>
          <div className="flex items-center gap-2">
            <code className={`text-2xl font-mono font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
              {generatePreview()}
            </code>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              (Beispiel)
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Trennzeichen
          </label>
          <select
            value={separator}
            onChange={(e) => setSeparator(e.target.value)}
            className={`w-48 px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="-">Bindestrich (-)</option>
            <option value="_">Unterstrich (_)</option>
            <option value=".">Punkt (.)</option>
            <option value="">Kein Trennzeichen</option>
          </select>
        </div>

        {/* Format Parts */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Format-Komponenten
          </h3>
          
          {formatParts.map((part, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Bezeichnung
                  </label>
                  <input
                    type="text"
                    value={part.label}
                    onChange={(e) => handlePartChange(index, 'label', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Beschreibung
                  </label>
                  <input
                    type="text"
                    value={part.description}
                    onChange={(e) => handlePartChange(index, 'description', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Beispielwert
                  </label>
                  <input
                    type="text"
                    value={part.example}
                    onChange={(e) => handlePartChange(index, 'example', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveConfiguration}
            disabled={isSaving}
            className="bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            {isSaving ? 'Speichern...' : 'Konfiguration speichern'}
          </Button>
        </div>
      </Card>

      {/* Usage Example */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Verwendungsbeispiel
        </h3>
        <div className={`space-y-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Format: {generatePreview()}</p>
              <ul className="mt-2 space-y-1 ml-4">
                {formatParts.map((part, idx) => (
                  <li key={idx}>
                    <span className="font-mono font-semibold">{part.example}</span> = {part.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DataCheckPage;

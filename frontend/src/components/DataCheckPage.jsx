import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  CheckCircle, XCircle, AlertTriangle, Package, MapPin, Wrench,
  Upload, FileText, Play, Download, Search, Filter, RefreshCw,
  Clock, Archive, X, Info, TrendingUp, Database, FileSpreadsheet, Settings, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import SubTabNavigation from './SubTabNavigation';

const DataCheckPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [activeTab, setActiveTab] = useState('validation');
  const [serialNumbers, setSerialNumbers] = useState('');
  const [licensedSerials, setLicensedSerials] = useState('');
  const [warehouseSerials, setWarehouseSerials] = useState('');
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
    if (!serialNumbers.trim() && !licensedSerials.trim() && !warehouseSerials.trim()) {
      toast.error('Bitte geben Sie mindestens eine Seriennummer ein');
      return;
    }

    setIsLoading(true);
    try {
      const serialList = serialNumbers
        .split('\n')
        .map(sn => sn.trim())
        .filter(sn => sn);
      const licensedList = licensedSerials
        .split('\n')
        .map(sn => sn.trim())
        .filter(sn => sn);
      const warehouseList = warehouseSerials
        .split('\n')
        .map(sn => sn.trim())
        .filter(sn => sn);

      const result = await apiCall('/api/test-center/data-check', {
        method: 'POST',
        body: JSON.stringify({
          serial_numbers: serialList,
          licensed_serials: licensedList,
          warehouse_serials: warehouseList
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
        
        const totalSerials = serialList.length + licensedList.length + warehouseList.length;
        toast.success(`Test abgeschlossen: ${totalSerials} Seriennummern geprüft`);
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Text Input - Main Serial Numbers */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Seriennummern (eine pro Zeile)
              </label>
              <textarea
                value={serialNumbers}
                onChange={(e) => setSerialNumbers(e.target.value)}
                placeholder="Seriennummern hier eingeben...&#10;Beispiel:&#10;047924271453&#10;201737 01567&#10;010242571153"
                rows={8}
                className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {serialNumbers.split('\n').filter(s => s.trim()).length} Seriennummern
              </p>
            </div>

            {/* Licensed Serials */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Aktivierte Lizenzen (eine pro Zeile)
              </label>
              <textarea
                value={licensedSerials}
                onChange={(e) => setLicensedSerials(e.target.value)}
                placeholder="Lizenzen hier eingeben...&#10;Beispiel:&#10;047924271453&#10;201737 01567"
                rows={8}
                className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {licensedSerials.split('\n').filter(s => s.trim()).length} Lizenzen
              </p>
            </div>

            {/* Warehouse Scanners */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Scanner auf Lager (eine pro Zeile)
              </label>
              <textarea
                value={warehouseSerials}
                onChange={(e) => setWarehouseSerials(e.target.value)}
                placeholder="Scanner-SNs hier eingeben...&#10;Beispiel:&#10;201743 00735&#10;201820 00651"
                rows={8}
                className={`w-full px-4 py-2 rounded-lg border font-mono text-sm ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
              <p className={`mt-2 text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {warehouseSerials.split('\n').filter(s => s.trim()).length} Scanner
              </p>
            </div>
          </div>

          {/* File Upload */}
          <div className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{/* File Upload */}
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

          {/* Device Statistics */}
          {testResults.device_stats && (
            <div className="space-y-3">
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Geräte-Übersicht
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Scanners */}
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {testResults.device_stats.scanners.total}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Scanner
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {testResults.device_stats.scanners.desko > 0 && `${testResults.device_stats.scanners.desko} Desko`}
                        {testResults.device_stats.scanners.desko > 0 && testResults.device_stats.scanners.tsrid > 0 && ' • '}
                        {testResults.device_stats.scanners.tsrid > 0 && `${testResults.device_stats.scanners.tsrid} TSRID`}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Tablets/PCs */}
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {testResults.device_stats.tablets.total}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        PC/Tablets
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {testResults.device_stats.tablets.surface > 0 && `${testResults.device_stats.tablets.surface} Surface`}
                        {testResults.device_stats.tablets.surface > 0 && testResults.device_stats.tablets.tsrid > 0 && ' • '}
                        {testResults.device_stats.tablets.tsrid > 0 && `${testResults.device_stats.tablets.tsrid} TSRID`}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Docking Stations */}
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <Archive className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {testResults.device_stats.docking_stations.total}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Dockingstationen
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {testResults.device_stats.docking_stations.desko > 0 && `${testResults.device_stats.docking_stations.desko} Desko`}
                        {testResults.device_stats.docking_stations.desko > 0 && testResults.device_stats.docking_stations.tsrid > 0 && ' • '}
                        {testResults.device_stats.docking_stations.tsrid > 0 && `${testResults.device_stats.docking_stations.tsrid} TSRID`}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Complete Sets */}
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {testResults.device_stats.sets.complete}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Vollständige Sets
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        von {testResults.device_stats.sets.total} Sets
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Incomplete Sets */}
                <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {testResults.device_stats.sets.incomplete}
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Unvollständige Sets
                      </p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        PC oder Scanner fehlt
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

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
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Status
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      SN-SC
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      SN-PC
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      SN-DC
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      SN-NT
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Set-ID
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Gerätetyp
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Standort
                    </th>
                    <th className={`px-4 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
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
                          <td className="px-4 py-4">
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(category)}`}>
                              <Icon className="h-4 w-4" />
                              {getCategoryLabel(category)}
                            </div>
                          </td>
                          <td className={`px-4 py-4 font-mono text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {item.sn_scanner || item.serial_number || '-'}
                          </td>
                          <td className={`px-4 py-4 font-mono text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {item.sn_pc || '-'}
                          </td>
                          <td className={`px-4 py-4 font-mono text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {item.sn_docking || '-'}
                          </td>
                          <td className={`px-4 py-4 font-mono text-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {item.sn_power || '-'}
                          </td>
                          <td className={`px-4 py-4 font-mono text-sm font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                            {item.set_id || '-'}
                          </td>
                          <td className={`px-4 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.device_type || '-'}
                          </td>
                          <td className={`px-4 py-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.location || '-'}
                          </td>
                          <td className={`px-4 py-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
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
  const [setIdFormat, setSetIdFormat] = useState('LOCATIONCODE-SETNUMBER-SETTYPE');
  const [formatParts, setFormatParts] = useState([
    { key: 'LOCATIONCODE', label: 'Standortcode', description: 'z.B. BERT01', example: 'BERT01' },
    { key: 'SETNUMBER', label: 'Set-Nummer', description: 'z.B. 01', example: '01' },
    { key: 'SETTYPE', label: 'Set-Typ', description: 'z.B. S1', example: 'S1' }
  ]);
  const [separator, setSeparator] = useState('-');
  const [setTypes, setSetTypes] = useState([
    {
      id: 'S1',
      name: 'Microsoft Surface Set',
      description: 'Surface + Desko Scanner + Desko Dockingstation + Netzteile',
      components: [
        { type: 'PC', label: 'Microsoft Surface', pattern: '^\\d{12}$', example: '033341763753' },
        { type: 'Scanner', label: 'Desko Scanner', pattern: '^\\d{6}\\s\\d{5}$', example: '201743 00735' },
        { type: 'Dockingstation', label: 'Desko Dockingstation', pattern: '^\\d{6}\\s\\d{5}$', example: '201743 00736' },
        { type: 'Power_Surface', label: 'Netzteil Surface', pattern: '^\\d{12}$', example: '033341763754' },
        { type: 'Power_Scanner', label: 'Netzteil Desko Scanner', pattern: '^\\d{6}\\s\\d{5}$', example: '201743 00737' }
      ]
    },
    {
      id: 'S2',
      name: 'TSRID Tablet Set',
      description: 'TSRID Tablet + TSRID Scanner + Dockingstation + Netzteile',
      components: [
        { type: 'PC', label: 'TSRID Tablet', pattern: '^[A-Z0-9]{13}$', example: '7E81054BA3550' },
        { type: 'Scanner', label: 'TSRID Scanner', pattern: '^[A-Z0-9]{13}$', example: '7E81054BA3559' },
        { type: 'Dockingstation', label: 'Dockingstation', pattern: '^[A-Z0-9]{13}$', example: '7E81054BA3560' },
        { type: 'Power_Tablet', label: 'Netzteil TSRID Tablet', pattern: '^[A-Z0-9]{13}$', example: '7E81054BA3561' },
        { type: 'Power_Scanner', label: 'Netzteil TSRID Scanner', pattern: '^[A-Z0-9]{13}$', example: '7E81054BA3562' }
      ]
    }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSetType, setActiveSetType] = useState('S1');

  const generatePreview = () => {
    return formatParts.map(part => part.example).join(separator);
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      const config = {
        format: setIdFormat,
        parts: formatParts,
        separator: separator,
        setTypes: setTypes
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

  const handleSetTypeChange = (setTypeId, field, value) => {
    const newSetTypes = setTypes.map(st => 
      st.id === setTypeId ? { ...st, [field]: value } : st
    );
    setSetTypes(newSetTypes);
  };

  const handleComponentChange = (setTypeId, componentIndex, field, value) => {
    const newSetTypes = setTypes.map(st => {
      if (st.id === setTypeId) {
        const newComponents = [...st.components];
        newComponents[componentIndex] = { ...newComponents[componentIndex], [field]: value };
        return { ...st, components: newComponents };
      }
      return st;
    });
    setSetTypes(newSetTypes);
  };

  const addSetType = () => {
    const newId = `S${setTypes.length + 1}`;
    setSetTypes([...setTypes, {
      id: newId,
      name: `Neues Set ${newId}`,
      description: 'Beschreibung eingeben',
      components: [
        { type: 'PC', label: 'PC/Tablet', pattern: '', example: '' },
        { type: 'Scanner', label: 'Scanner', pattern: '', example: '' },
        { type: 'Dockingstation', label: 'Dockingstation', pattern: '', example: '' },
        { type: 'Power_PC', label: 'Netzteil PC/Tablet', pattern: '', example: '' },
        { type: 'Power_Scanner', label: 'Netzteil Scanner', pattern: '', example: '' }
      ]
    }]);
  };

  const addComponent = (setTypeId) => {
    const newSetTypes = setTypes.map(st => {
      if (st.id === setTypeId) {
        return {
          ...st,
          components: [...st.components, { type: 'Other', label: 'Neue Komponente', pattern: '', example: '' }]
        };
      }
      return st;
    });
    setSetTypes(newSetTypes);
  };

  const removeComponent = (setTypeId, componentIndex) => {
    const newSetTypes = setTypes.map(st => {
      if (st.id === setTypeId) {
        const newComponents = st.components.filter((_, idx) => idx !== componentIndex);
        return { ...st, components: newComponents };
      }
      return st;
    });
    setSetTypes(newSetTypes);
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

      </Card>

      {/* Set-Types Configuration */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Set-Typen Konfiguration
            </h2>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Definieren Sie verschiedene Set-Typen mit Seriennummern-Patterns für automatische Erkennung
            </p>
          </div>
          <Button
            onClick={addSetType}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Set-Typ hinzufügen
          </Button>
        </div>

        {/* Set Type Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {setTypes.map(st => (
            <button
              key={st.id}
              onClick={() => setActiveSetType(st.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSetType === st.id
                  ? 'bg-[#c00000] text-white'
                  : theme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-400 hover:bg-[#3a3a3a]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {st.id}: {st.name}
            </button>
          ))}
        </div>

        {/* Active Set Type Configuration */}
        {setTypes.filter(st => st.id === activeSetType).map(setType => (
          <div key={setType.id} className="space-y-6">
            {/* Set Type Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Set-Typ ID
                </label>
                <input
                  type="text"
                  value={setType.id}
                  readOnly
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-gray-500'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name
                </label>
                <input
                  type="text"
                  value={setType.name}
                  onChange={(e) => handleSetTypeChange(setType.id, 'name', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Beschreibung
              </label>
              <input
                type="text"
                value={setType.description}
                onChange={(e) => handleSetTypeChange(setType.id, 'description', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Components */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Komponenten & Seriennummern-Patterns
                </h3>
                <Button
                  onClick={() => addComponent(setType.id)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Komponente hinzufügen
                </Button>
              </div>
              <div className="space-y-4">
                {setType.components.map((component, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border relative ${
                      theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {setType.components.length > 1 && (
                      <button
                        onClick={() => removeComponent(setType.id, idx)}
                        className={`absolute top-2 right-2 p-1 rounded hover:bg-red-500 hover:text-white ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}
                        title="Komponente entfernen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-8">
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Typ
                        </label>
                        <div className={`px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a] text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                          {component.type}
                        </div>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Bezeichnung
                        </label>
                        <input
                          type="text"
                          value={component.label}
                          onChange={(e) => handleComponentChange(setType.id, idx, 'label', e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm ${
                            theme === 'dark'
                              ? 'bg-[#2a2a2a] border-gray-700 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Regex Pattern
                        </label>
                        <input
                          type="text"
                          value={component.pattern}
                          onChange={(e) => handleComponentChange(setType.id, idx, 'pattern', e.target.value)}
                          placeholder="^\\d{12}$"
                          className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${
                            theme === 'dark'
                              ? 'bg-[#2a2a2a] border-gray-700 text-white'
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Beispiel
                        </label>
                        <input
                          type="text"
                          value={component.example}
                          onChange={(e) => handleComponentChange(setType.id, idx, 'example', e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm font-mono ${
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
            </div>
          </div>
        ))}

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

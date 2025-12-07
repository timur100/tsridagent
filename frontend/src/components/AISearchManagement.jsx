import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Search, Brain, TrendingUp, AlertCircle, CheckCircle, 
  XCircle, BarChart3, PieChart, Sparkles, Zap, Target,
  Info, ChevronRight, Database, Activity
} from 'lucide-react';
import SubTabNavigation from './SubTabNavigation';
import toast from 'react-hot-toast';

const AISearchManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const handleNaturalSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Bitte geben Sie eine Suchanfrage ein');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await apiCall('/api/test-center/ai-search', {
        method: 'POST',
        body: JSON.stringify({ query: searchQuery })
      });

      if (result.success) {
        setSearchResults(result.data);
        toast.success('Suche abgeschlossen');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Fehler bei der Suche');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runDataAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await apiCall('/api/test-center/ai-analysis', {
        method: 'POST'
      });

      if (result.success) {
        setAnalysisResults(result.data);
        toast.success('Analyse abgeschlossen');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Fehler bei der Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <SubTabNavigation
        tabs={[
          { id: 'search', label: 'Intelligente Suche', icon: Search },
          { id: 'analysis', label: 'Daten-Analyse', icon: BarChart3 },
          { id: 'insights', label: 'KI-Insights', icon: Brain }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mb-6">
        <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          KI & Analyse
        </h2>
        <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          KI-gestützte Datenanalyse und intelligente Suche
        </p>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Natural Language Search */}
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Natürliche Sprachsuche
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Stellen Sie eine Frage oder beschreiben Sie, was Sie suchen
                </label>
                <textarea
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Beispiele:&#10;- Zeige mir alle Surface-Geräte am Standort BERT01&#10;- Welche Scanner haben keine aktive Lizenz?&#10;- Finde unvollständige Sets in Augsburg&#10;- Liste alle Desko Dockingstationen auf"
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg border text-sm ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              <Button
                onClick={handleNaturalSearch}
                disabled={isAnalyzing || !searchQuery.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Suche läuft...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Suche starten
                  </>
                )}
              </Button>
            </div>

            {searchResults && (
              <div className={`mt-6 p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Suchergebnisse
                </h4>
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  <p className="mb-2">
                    <strong>Interpretation:</strong> {searchResults.interpretation || 'Ihre Anfrage wurde verarbeitet'}
                  </p>
                  <p className="mb-2">
                    <strong>Gefundene Einträge:</strong> {searchResults.count || 0}
                  </p>
                  {searchResults.summary && (
                    <p className="text-sm mt-2 p-3 rounded bg-blue-50 dark:bg-blue-900/20">
                      {searchResults.summary}
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Quick Queries */}
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Häufige Abfragen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Zeige alle unvollständigen Sets',
                'Liste Scanner ohne Lizenz',
                'Finde defekte Geräte',
                'Zeige verfügbare Lager-Scanner',
                'Geräte mit abgelaufener Lizenz',
                'Sets ohne Dockingstation'
              ].map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => setSearchQuery(query)}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 hover:bg-[#333] text-gray-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{query}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Automatische Datenanalyse
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    KI-gestützte Analyse aller Geräte und Sets
                  </p>
                </div>
              </div>
              <Button
                onClick={runDataAnalysis}
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyse starten
                  </>
                )}
              </Button>
            </div>

            {analysisResults && (
              <div className="space-y-4">
                {/* Analysis Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <Database className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {analysisResults.total_devices || 0}
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Geräte gesamt
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-8 w-8 text-green-500" />
                      <div>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {analysisResults.health_score || 0}%
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Geräte-Health
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className={`p-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {analysisResults.optimization_potential || 0}%
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Optimierungspotenzial
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Recommendations */}
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className={`font-semibold mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Brain className="h-5 w-5 text-purple-500" />
                    KI-Empfehlungen
                  </h4>
                  <ul className="space-y-2">
                    {(analysisResults.recommendations || []).map((rec, idx) => (
                      <li key={idx} className={`text-sm flex items-start gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!analysisResults && !isAnalyzing && (
              <div className="text-center py-8">
                <BarChart3 className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  Klicken Sie auf "Analyse starten", um eine umfassende Datenanalyse durchzuführen
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pattern Detection */}
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-4">
                <PieChart className="h-6 w-6 text-orange-500" />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Muster-Erkennung
                </h3>
              </div>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Automatische Erkennung von Mustern in Seriennummern und Geräteverteilung
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Seriennummern-Muster', value: 'Desko: XXXXXX XXXXX', color: 'blue' },
                  { label: 'Häufigster Standort', value: 'AAHC01 (23%)', color: 'green' },
                  { label: 'Beliebtester Set-Typ', value: 'S1 - Surface Sets', color: 'purple' }
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.label}
                      </span>
                      <span className={`text-sm font-mono font-semibold text-${item.color}-600`}>
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Anomaly Detection */}
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-500" />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Anomalie-Erkennung
                </h3>
              </div>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                KI erkennt ungewöhnliche Muster und potenzielle Probleme
              </p>
              <div className="space-y-3">
                {[
                  { type: 'warning', text: '5 Geräte ohne Standort-Zuordnung' },
                  { type: 'info', text: '12 Sets könnten vervollständigt werden' },
                  { type: 'success', text: 'Keine doppelten Seriennummern gefunden' }
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border flex items-start gap-2 ${
                    item.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                    item.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                    'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}>
                    {item.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />}
                    {item.type === 'info' && <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />}
                    {item.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />}
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISearchManagement;

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { RotateCcw, Search, AlertTriangle, DollarSign, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EuropcarReturns = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/europcar/returns/list');
      if (result.success) {
        setReturns(result.data.returns || []);
      }
    } catch (error) {
      console.error('Error loading returns:', error);
      toast.error('Fehler beim Laden der Rückgaben');
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = returns.filter(r => 
    r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customer_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: returns.length,
    withDamages: returns.filter(r => r.neue_schaeden && r.neue_schaeden.length > 0).length,
    withCharges: returns.filter(r => r.gesamtbetrag_zusatzkosten > 0).length,
    needsCleaning: returns.filter(r => r.reinigung_erforderlich).length
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="text-center">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-red-500/30`}>
          <div className="text-center">
            <p className="text-sm text-red-600">Mit Schäden</p>
            <p className="text-2xl font-bold text-red-600">{stats.withDamages}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-yellow-500/30`}>
          <div className="text-center">
            <p className="text-sm text-yellow-600">Mit Gebühren</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.withCharges}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-orange-500/30`}>
          <div className="text-center">
            <p className="text-sm text-orange-600">Reinigung nötig</p>
            <p className="text-2xl font-bold text-orange-600">{stats.needsCleaning}</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Rückgabe-ID oder Kunden-ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
            />
          </div>
        </div>
      </Card>

      {/* Returns List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredReturns.length === 0 ? (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <RotateCcw className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Rückgaben gefunden
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Rückgaben erscheinen hier nach Fahrzeugrückgabe
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((returnData) => (
            <Card key={returnData.id} className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} ${
              returnData.neue_schaeden && returnData.neue_schaeden.length > 0 ? 'border-2 border-red-500' : ''
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Rückgabe #{returnData.id.substring(0, 8)}
                    </h3>
                    {returnData.fahrzeug_bereit ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Bereit
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Nicht bereit
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Rückgabedatum</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {new Date(returnData.rueckgabe_datum).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Kilometerstand</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {returnData.rueckgabe_kilometerstand?.toLocaleString()} km
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Tankstand</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {returnData.rueckgabe_tankstand}%
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Zusatzkosten</p>
                      <p className={`text-lg font-bold ${returnData.gesamtbetrag_zusatzkosten > 0 ? 'text-red-600' : theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {returnData.gesamtbetrag_zusatzkosten?.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  {returnData.neue_schaeden && returnData.neue_schaeden.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2 text-sm text-red-800 font-semibold mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        {returnData.neue_schaeden.length} Schaden/Schäden gemeldet
                      </div>
                      {returnData.neue_schaeden.slice(0, 2).map((damage, idx) => (
                        <p key={idx} className="text-xs text-red-700 ml-6">
                          • {damage.description} ({damage.severity})
                        </p>
                      ))}
                    </div>
                  )}
                  {returnData.zusaetzliche_gebuehren && returnData.zusaetzliche_gebuehren.length > 0 && (
                    <div className="mt-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="flex items-center gap-2 text-sm text-yellow-800 font-semibold mb-1">
                        <DollarSign className="h-4 w-4" />
                        Zusätzliche Gebühren
                      </div>
                      {returnData.zusaetzliche_gebuehren.map((charge, idx) => (
                        <p key={idx} className="text-xs text-yellow-700 ml-6">
                          • {charge.description}: {charge.amount?.toFixed(2)} €
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EuropcarReturns;

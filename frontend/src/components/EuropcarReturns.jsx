import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { RotateCcw, Search, CheckCircle, AlertTriangle, Camera, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

// MOCK DEMO DATA
const MOCK_RETURNS = [
  {
    id: 'RET-2024-001',
    contract_id: 'CNT-2024-004',
    vehicle_id: 'v9',
    vehicle_info: 'BMW X5 (B-EC 3456)',
    customer_name: 'Julia Weber',
    return_date: '2024-11-25T19:45:00',
    planned_return: '2024-11-25T20:00:00',
    status: 'completed',
    condition: 'good',
    kilometerstand_out: 30500,
    kilometerstand_in: 31000,
    tankstand_out: 80,
    tankstand_in: 75,
    damages_found: [],
    additional_charges: 0,
    notes: 'Fahrzeug in einwandfreiem Zustand zurückgegeben'
  },
  {
    id: 'RET-2024-002',
    contract_id: 'CNT-2024-005',
    vehicle_id: 'v4',
    vehicle_info: 'VW Passat (HH-EC 3456)',
    customer_name: 'Peter Schneider',
    return_date: '2024-11-15T11:50:00',
    planned_return: '2024-11-15T12:00:00',
    status: 'completed',
    condition: 'good',
    kilometerstand_out: 44500,
    kilometerstand_in: 45000,
    tankstand_out: 90,
    tankstand_in: 40,
    damages_found: [],
    additional_charges: 35.00,
    notes: 'Nachberechnung für Tanknachfüllung: 35 EUR'
  },
  {
    id: 'RET-2024-003',
    contract_id: 'CNT-2024-007',
    vehicle_id: 'v7',
    vehicle_info: 'Audi A6 (F-EC 5678)',
    customer_name: 'Michael Fischer',
    return_date: '2024-11-28T14:30:00',
    planned_return: '2024-11-28T15:00:00',
    status: 'completed',
    condition: 'damaged',
    kilometerstand_out: 37500,
    kilometerstand_in: 38000,
    tankstand_out: 100,
    tankstand_in: 85,
    damages_found: [
      {
        typ: 'Kratzer',
        beschreibung: 'Kratzer an der Tür rechts',
        kosten: 250.00
      }
    ],
    additional_charges: 250.00,
    notes: 'Schaden an der Beifahrertür festgestellt. Kunde akzeptiert Schadensbericht.'
  },
  {
    id: 'RET-2024-004',
    contract_id: 'CNT-2024-008',
    vehicle_id: 'v2',
    vehicle_info: 'Mercedes C-Klasse (M-EC 5678)',
    customer_name: 'Anna Schmidt',
    return_date: '2024-12-03T17:15:00',
    planned_return: '2024-12-03T17:00:00',
    status: 'pending',
    condition: 'good',
    kilometerstand_out: 27800,
    kilometerstand_in: 28000,
    tankstand_out: 70,
    tankstand_in: 60,
    damages_found: [],
    additional_charges: 0,
    notes: 'Rückgabe in Bearbeitung - Finalprüfung ausstehend'
  },
  {
    id: 'RET-2024-005',
    contract_id: 'CNT-2024-009',
    vehicle_id: 'v5',
    vehicle_info: 'BMW 5er (B-EC 7890)',
    customer_name: 'Thomas Müller',
    return_date: '2024-11-18T16:00:00',
    planned_return: '2024-11-18T16:00:00',
    status: 'completed',
    condition: 'excellent',
    kilometerstand_out: 21800,
    kilometerstand_in: 22000,
    tankstand_out: 75,
    tankstand_in: 70,
    damages_found: [],
    additional_charges: 0,
    notes: 'Perfekter Zustand, keine Beanstandungen'
  }
];

const EuropcarReturns = () => {
  const { theme } = useTheme();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simuliere Laden der Daten
    setTimeout(() => {
      setReturns(MOCK_RETURNS);
      setLoading(false);
    }, 500);
  }, []);

  const getConditionBadge = (condition) => {
    const conditionConfig = {
      excellent: { label: 'Ausgezeichnet', color: 'green' },
      good: { label: 'Gut', color: 'blue' },
      fair: { label: 'Zufriedenstellend', color: 'yellow' },
      damaged: { label: 'Beschädigt', color: 'red' }
    };
    const config = conditionConfig[condition] || { label: condition, color: 'gray' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Ausstehend', color: 'yellow' },
      completed: { label: 'Abgeschlossen', color: 'green' }
    };
    const config = statusConfig[status] || { label: status, color: 'gray' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        {config.label}
      </span>
    );
  };

  const filteredReturns = returns.filter(r => 
    r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vehicle_info?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: returns.length,
    completed: returns.filter(r => r.status === 'completed').length,
    pending: returns.filter(r => r.status === 'pending').length,
    damaged: returns.filter(r => r.damages_found && r.damages_found.length > 0).length
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
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-green-500/30`}>
          <div className="text-center">
            <p className="text-sm text-green-600">Abgeschlossen</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-yellow-500/30`}>
          <div className="text-center">
            <p className="text-sm text-yellow-600">Ausstehend</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-red-500/30`}>
          <div className="text-center">
            <p className="text-sm text-red-600">Mit Schäden</p>
            <p className="text-2xl font-bold text-red-600">{stats.damaged}</p>
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
              placeholder="Suche nach Rückgabe-ID, Kunde oder Fahrzeug..."
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
            Ändern Sie Ihre Suchkriterien
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((returnItem) => (
            <Card key={returnItem.id} className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {returnItem.id}
                    </h3>
                    {getStatusBadge(returnItem.status)}
                    {getConditionBadge(returnItem.condition)}
                  </div>
                  <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {returnItem.customer_name} • {returnItem.vehicle_info}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Rückgabe</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {new Date(returnItem.return_date).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Kilometer</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        +{(returnItem.kilometerstand_in - returnItem.kilometerstand_out).toLocaleString()} km
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Tankstand</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {returnItem.tankstand_in}% (von {returnItem.tankstand_out}%)
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Zusatzkosten</p>
                      <p className={`text-lg font-bold ${returnItem.additional_charges > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {returnItem.additional_charges?.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  {returnItem.damages_found && returnItem.damages_found.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-semibold">Schäden festgestellt:</span>
                      </div>
                      {returnItem.damages_found.map((damage, idx) => (
                        <div key={idx} className={`text-xs ml-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          • {damage.typ}: {damage.beschreibung} ({damage.kosten?.toFixed(2)} €)
                        </div>
                      ))}
                    </div>
                  )}
                  {returnItem.notes && (
                    <div className={`text-xs italic ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      Hinweis: {returnItem.notes}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Camera className="h-4 w-4 mr-1" />
                    Fotos
                  </Button>
                  <Button size="sm" variant="outline">
                    <FileText className="h-4 w-4 mr-1" />
                    Protokoll
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
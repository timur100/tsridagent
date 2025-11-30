import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { FileText, Search, CheckCircle, Clock, XCircle, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// MOCK DEMO DATA
const MOCK_CONTRACTS = [
  {
    id: 'CNT-2024-001',
    reservation_id: 'res-001',
    customer_id: 'c1',
    customer_name: 'Max Mustermann',
    vehicle_id: 'v1',
    vehicle_info: 'BMW 3er (B-EC 2023)',
    status: 'active',
    start_date: '2024-12-05T10:00:00',
    end_date: '2024-12-10T18:00:00',
    total_price: 425.00,
    deposit: 500.00,
    signed_date: '2024-12-04T14:30:00',
    pickup_location: 'Berlin Hauptbahnhof',
    return_location: 'Berlin Hauptbahnhof'
  },
  {
    id: 'CNT-2024-002',
    reservation_id: 'res-002',
    customer_id: 'c2',
    customer_name: 'Anna Schmidt',
    vehicle_id: 'v3',
    vehicle_info: 'Audi A4 (F-EC 9012)',
    status: 'active',
    start_date: '2024-12-01T09:00:00',
    end_date: '2024-12-03T17:00:00',
    total_price: 180.00,
    deposit: 300.00,
    signed_date: '2024-11-30T16:20:00',
    pickup_location: 'Frankfurt Flughafen',
    return_location: 'Frankfurt Flughafen'
  },
  {
    id: 'CNT-2024-003',
    reservation_id: 'res-003',
    customer_id: 'c3',
    customer_name: 'Thomas Müller',
    vehicle_id: 'v6',
    vehicle_info: 'Mercedes E-Klasse (M-EC 1234)',
    status: 'draft',
    start_date: '2024-12-15T14:00:00',
    end_date: '2024-12-20T10:00:00',
    total_price: 650.00,
    deposit: 800.00,
    signed_date: null,
    pickup_location: 'München Zentrum',
    return_location: 'München Zentrum'
  },
  {
    id: 'CNT-2024-004',
    reservation_id: 'res-004',
    customer_id: 'c4',
    customer_name: 'Julia Weber',
    vehicle_id: 'v9',
    vehicle_info: 'BMW X5 (B-EC 3456)',
    status: 'completed',
    start_date: '2024-11-20T08:00:00',
    end_date: '2024-11-25T20:00:00',
    total_price: 580.00,
    deposit: 700.00,
    signed_date: '2024-11-19T12:00:00',
    pickup_location: 'Berlin Tegel',
    return_location: 'Berlin Tegel',
    return_date: '2024-11-25T19:45:00'
  },
  {
    id: 'CNT-2024-005',
    reservation_id: 'res-005',
    customer_id: 'c5',
    customer_name: 'Peter Schneider',
    vehicle_id: 'v4',
    vehicle_info: 'VW Passat (HH-EC 3456)',
    status: 'completed',
    start_date: '2024-11-10T12:00:00',
    end_date: '2024-11-15T12:00:00',
    total_price: 395.00,
    deposit: 400.00,
    signed_date: '2024-11-09T10:30:00',
    pickup_location: 'Hamburg Hauptbahnhof',
    return_location: 'Hamburg Hauptbahnhof',
    return_date: '2024-11-15T11:50:00'
  },
  {
    id: 'CNT-2024-006',
    reservation_id: 'res-006',
    customer_id: 'c6',
    customer_name: 'Lisa Becker',
    vehicle_id: 'v8',
    vehicle_info: 'VW Golf (HH-EC 9012)',
    status: 'cancelled',
    start_date: '2024-12-08T10:00:00',
    end_date: '2024-12-09T18:00:00',
    total_price: 95.00,
    deposit: 200.00,
    signed_date: null,
    pickup_location: 'Hamburg City',
    return_location: 'Hamburg City'
  }
];

const EuropcarContracts = () => {
  const { theme } = useTheme();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Simuliere Laden der Daten
    setTimeout(() => {
      setContracts(MOCK_CONTRACTS);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Entwurf', color: 'gray' },
      active: { label: 'Aktiv', color: 'green' },
      completed: { label: 'Abgeschlossen', color: 'blue' },
      cancelled: { label: 'Storniert', color: 'red' }
    };
    const config = statusConfig[status] || { label: status, color: 'gray' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        {config.label}
      </span>
    );
  };

  const filteredContracts = contracts.filter(c => 
    c.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.vehicle_info?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: contracts.length,
    draft: contracts.filter(c => c.status === 'draft').length,
    active: contracts.filter(c => c.status === 'active').length,
    completed: contracts.filter(c => c.status === 'completed').length
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
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-gray-500/30`}>
          <div className="text-center">
            <p className="text-sm text-gray-600">Entwurf</p>
            <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-green-500/30`}>
          <div className="text-center">
            <p className="text-sm text-green-600">Aktiv</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-blue-500/30`}>
          <div className="text-center">
            <p className="text-sm text-blue-600">Abgeschlossen</p>
            <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
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
              placeholder="Suche nach Vertrags-ID, Kunde oder Fahrzeug..."
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

      {/* Contracts List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredContracts.length === 0 ? (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <FileText className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Verträge gefunden
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Ändern Sie Ihre Suchkriterien
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {contract.id}
                    </h3>
                    {getStatusBadge(contract.status)}
                  </div>
                  <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {contract.customer_name} • {contract.vehicle_info}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Zeitraum</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {new Date(contract.start_date).toLocaleDateString('de-DE')} - {new Date(contract.end_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Standort</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {contract.pickup_location}
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Gesamtpreis</p>
                      <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {contract.total_price?.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  {contract.signed_date && (
                    <div className="mt-3 text-xs text-green-600">
                      <CheckCircle className="inline h-3 w-3 mr-1" />
                      Unterschrieben am {new Date(contract.signed_date).toLocaleString('de-DE')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    Ansehen
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    PDF
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

export default EuropcarContracts;
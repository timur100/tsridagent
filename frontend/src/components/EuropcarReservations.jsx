import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Search, Calendar, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// MOCK DEMO DATA
const MOCK_RESERVATIONS = [
  {
    id: 'res-001',
    vehicle_id: 'v1',
    customer_id: 'c1',
    customer_name: 'Max Mustermann',
    start_date: '2024-12-05T10:00:00',
    end_date: '2024-12-10T18:00:00',
    status: 'confirmed',
    buchungstyp: 'Online-Buchung',
    total_price: 425.00,
    extras: ['GPS', 'Kindersitz']
  },
  {
    id: 'res-002',
    vehicle_id: 'v3',
    customer_id: 'c2',
    customer_name: 'Anna Schmidt',
    start_date: '2024-12-01T09:00:00',
    end_date: '2024-12-03T17:00:00',
    status: 'active',
    buchungstyp: 'Telefonische Buchung',
    total_price: 180.00,
    extras: []
  },
  {
    id: 'res-003',
    vehicle_id: 'v6',
    customer_id: 'c3',
    customer_name: 'Thomas Müller',
    start_date: '2024-12-15T14:00:00',
    end_date: '2024-12-20T10:00:00',
    status: 'pending',
    buchungstyp: 'Online-Buchung',
    total_price: 650.00,
    extras: ['Vollkasko', 'Zusatzfahrer']
  },
  {
    id: 'res-004',
    vehicle_id: 'v9',
    customer_id: 'c4',
    customer_name: 'Julia Weber',
    start_date: '2024-11-20T08:00:00',
    end_date: '2024-11-25T20:00:00',
    status: 'completed',
    buchungstyp: 'Walk-in',
    total_price: 580.00,
    extras: ['GPS']
  },
  {
    id: 'res-005',
    vehicle_id: 'v4',
    customer_id: 'c5',
    customer_name: 'Peter Schneider',
    start_date: '2024-12-22T12:00:00',
    end_date: '2024-12-27T12:00:00',
    status: 'confirmed',
    buchungstyp: 'Online-Buchung',
    total_price: 495.00,
    extras: ['Winterreifen']
  },
  {
    id: 'res-006',
    vehicle_id: 'v8',
    customer_id: 'c6',
    customer_name: 'Lisa Becker',
    start_date: '2024-12-08T10:00:00',
    end_date: '2024-12-09T18:00:00',
    status: 'cancelled',
    buchungstyp: 'Online-Buchung',
    total_price: 95.00,
    extras: []
  }
];

const EuropcarReservations = () => {
  const { theme } = useTheme();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    // Simuliere Laden der Daten
    setTimeout(() => {
      setReservations(MOCK_RESERVATIONS);
      setLoading(false);
    }, 500);
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Ausstehend', color: 'yellow' },
      confirmed: { label: 'Bestätigt', color: 'green' },
      active: { label: 'Aktiv', color: 'blue' },
      completed: { label: 'Abgeschlossen', color: 'gray' },
      cancelled: { label: 'Storniert', color: 'red' },
      no_show: { label: 'Nicht erschienen', color: 'orange' }
    };
    const config = statusConfig[status] || { label: status, color: 'gray' };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${config.color}-100 text-${config.color}-800`}>
        {config.label}
      </span>
    );
  };

  const filteredReservations = reservations.filter(r => {
    const matchesSearch = 
      r.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    active: reservations.filter(r => r.status === 'active').length,
    completed: reservations.filter(r => r.status === 'completed').length
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="text-center">
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
            <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-yellow-500/30`}>
          <div className="text-center">
            <p className="text-sm text-yellow-600">Ausstehend</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-green-500/30`}>
          <div className="text-center">
            <p className="text-sm text-green-600">Bestätigt</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-blue-500/30`}>
          <div className="text-center">
            <p className="text-sm text-blue-600">Aktiv</p>
            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
          </div>
        </Card>
        <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-gray-500/30`}>
          <div className="text-center">
            <p className="text-sm text-gray-600">Abgeschlossen</p>
            <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
          </div>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Reservierungs-ID oder Kunde..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
          >
            <option value="all">Alle Status</option>
            <option value="pending">Ausstehend</option>
            <option value="confirmed">Bestätigt</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Storniert</option>
          </select>
          <Button 
            className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
            onClick={() => toast.info('CRUD-Funktionalität wird implementiert')}
          >
            <Plus className="h-4 w-4" />
            Neue Reservierung
          </Button>
        </div>
      </Card>

      {/* Reservations List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-[#c00000] border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : filteredReservations.length === 0 ? (
        <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <Calendar className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Reservierungen gefunden
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Ändern Sie Ihre Suchkriterien
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <Card key={reservation.id} className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {reservation.customer_name}
                    </h3>
                    {getStatusBadge(reservation.status)}
                  </div>
                  <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Reservierung #{reservation.id}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Zeitraum</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {new Date(reservation.start_date).toLocaleDateString('de-DE')} - {new Date(reservation.end_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Buchungstyp</p>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {reservation.buchungstyp}
                      </p>
                    </div>
                    <div>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Gesamtpreis</p>
                      <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {reservation.total_price?.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  {reservation.extras && reservation.extras.length > 0 && (
                    <div className="mt-3">
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Extras: {reservation.extras.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {reservation.status === 'pending' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Bestätigen
                    </Button>
                  )}
                  {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                    <Button size="sm" variant="outline" className="text-red-600">
                      <XCircle className="h-4 w-4 mr-1" />
                      Stornieren
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EuropcarReservations;
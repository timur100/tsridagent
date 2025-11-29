import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Search, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EuropcarReservations = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/europcar/reservations/list');
      if (result.success) {
        setReservations(result.data.reservations || []);
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Fehler beim Laden der Reservierungen');
    } finally {
      setLoading(false);
    }
  };

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
      r.customer_id?.toLowerCase().includes(searchTerm.toLowerCase());
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
              placeholder="Suche nach Reservierungs-ID oder Kunden-ID..."
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
          <Button className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2">
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
            Erstellen Sie eine neue Reservierung
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
                      Reservierung #{reservation.id.substring(0, 8)}
                    </h3>
                    {getStatusBadge(reservation.status)}
                  </div>
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

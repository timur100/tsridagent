import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, User, MapPin, Circle, Eye, Ban, Car, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const MobilityBookings = ({ tenantId }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  
  const statusOptions = [
    { id: 'all', label: 'Alle Status', color: 'gray' },
    { id: 'pending', label: 'Ausstehend', color: 'yellow' },
    { id: 'confirmed', label: 'Bestätigt', color: 'blue' },
    { id: 'active', label: 'Aktiv', color: 'green' },
    { id: 'completed', label: 'Abgeschlossen', color: 'gray' },
    { id: 'cancelled', label: 'Storniert', color: 'red' }
  ];
  
  useEffect(() => {
    if (tenantId) {
      loadBookings();
    }
  }, [tenantId, filterStatus]);
  
  const loadBookings = async () => {
    setLoading(true);
    try {
      let url = `/api/mobility/bookings?tenant_id=${tenantId}`;
      if (filterStatus !== 'all') {
        url += `&status=${filterStatus}`;
      }
      
      const response = await apiCall(url);
      const bookingData = response?.data || response || [];
      setBookings(Array.isArray(bookingData) ? bookingData : []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Fehler beim Laden der Buchungen');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDetails = async (booking) => {
    try {
      const response = await apiCall(`/api/mobility/bookings/${booking.id}`);
      setSelectedBooking(response.data);
    } catch (error) {
      console.error('Error loading booking details:', error);
      toast.error('Fehler beim Laden der Details');
    }
  };
  
  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Buchung wirklich stornieren?')) return;
    
    try {
      await apiCall(`/api/mobility/bookings/${bookingId}`, { method: 'DELETE' });
      toast.success('Buchung storniert');
      loadBookings();
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Fehler beim Stornieren');
    }
  };
  
  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await apiCall(`/api/mobility/bookings/${bookingId}/status?status=${newStatus}`, {
        method: 'PATCH'
      });
      toast.success('Status aktualisiert');
      loadBookings();
      if (selectedBooking?.id === bookingId) {
        handleViewDetails({ id: bookingId });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };
  
  const getStatusBadge = (status) => {
    const config = statusOptions.find(s => s.id === status);
    if (!config) return null;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-400`}>
        <Circle className="w-2 h-2" fill="currentColor" />
        {config.label}
      </span>
    );
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: theme === 'dark' ? '#fff' : '#1f2937' }}>
            Buchungsverwaltung
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Alle Buchungen und Vermietungen überwachen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          >
            {statusOptions.map(status => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Bookings Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Buchungsnr.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fahrzeug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Zeitraum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kosten
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {bookings.map(booking => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-medium">
                      {booking.booking_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{booking.customer_name}</div>
                      <div className="text-xs text-gray-500">{booking.customer_email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-gray-400" />
                      <span className="text-sm truncate max-w-[150px]" title={booking.vehicle_id}>
                        {booking.vehicle_id.slice(0, 8)}...
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <div>{formatDate(booking.start_time)}</div>
                      <div className="text-gray-500">bis</div>
                      <div>{formatDate(booking.end_time)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {booking.actual_cost !== null && booking.actual_cost !== undefined ? (
                        <span className="font-semibold">{booking.actual_cost.toFixed(2)} €</span>
                      ) : (
                        <span className="text-gray-500">{booking.estimated_cost.toFixed(2)} €</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleViewDetails(booking)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors inline-flex items-center gap-1 text-sm"
                      title="Details anzeigen"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Keine Buchungen gefunden</p>
          </div>
        )}
      </Card>
      
      {/* Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Buchungsdetails</h3>
                  <p className="text-sm text-gray-500 mt-1 font-mono">{selectedBooking.booking_number}</p>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
              
              {/* Customer Info */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Kunde
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
                  <div><strong>Name:</strong> {selectedBooking.customer_name}</div>
                  <div><strong>Email:</strong> {selectedBooking.customer_email}</div>
                  <div><strong>Telefon:</strong> {selectedBooking.customer_phone}</div>
                  {selectedBooking.license_number && (
                    <div><strong>Führerschein:</strong> {selectedBooking.license_number}</div>
                  )}
                </div>
              </div>
              
              {/* Vehicle Info */}
              {selectedBooking.vehicle_details && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Fahrzeug
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
                    <div><strong>Name:</strong> {selectedBooking.vehicle_details.name}</div>
                    {selectedBooking.vehicle_details.brand && (
                      <div><strong>Marke/Modell:</strong> {selectedBooking.vehicle_details.brand} {selectedBooking.vehicle_details.model}</div>
                    )}
                    {selectedBooking.vehicle_details.license_plate && (
                      <div><strong>Kennzeichen:</strong> {selectedBooking.vehicle_details.license_plate}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Booking Info */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Buchungszeitraum
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
                  <div><strong>Start:</strong> {formatDate(selectedBooking.start_time)}</div>
                  <div><strong>Ende:</strong> {formatDate(selectedBooking.end_time)}</div>
                  {selectedBooking.check_in_time && (
                    <div><strong>Check-In:</strong> {formatDate(selectedBooking.check_in_time)}</div>
                  )}
                  {selectedBooking.check_out_time && (
                    <div><strong>Check-Out:</strong> {formatDate(selectedBooking.check_out_time)}</div>
                  )}
                  <div className="pt-2 border-t dark:border-gray-700">
                    <strong>Status:</strong> {getStatusBadge(selectedBooking.status)}
                  </div>
                </div>
              </div>
              
              {/* Pricing Info */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Kosten
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Preismodell:</span>
                    <span className="font-semibold">{selectedBooking.pricing_model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Geschätzte Kosten:</span>
                    <span>{selectedBooking.estimated_cost.toFixed(2)} €</span>
                  </div>
                  {selectedBooking.actual_cost !== null && selectedBooking.actual_cost !== undefined && (
                    <div className="flex justify-between pt-2 border-t dark:border-gray-700">
                      <span className="font-semibold">Tatsächliche Kosten:</span>
                      <span className="font-bold text-lg">{selectedBooking.actual_cost.toFixed(2)} €</span>
                    </div>
                  )}
                  {selectedBooking.distance_km && (
                    <div className="flex justify-between">
                      <span>Gefahrene Kilometer:</span>
                      <span>{selectedBooking.distance_km} km</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 pt-4">
                {selectedBooking.status === 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'active')}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Check-In
                  </button>
                )}
                {selectedBooking.status === 'active' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.id, 'completed')}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Check-Out
                  </button>
                )}
                {(selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
                  <button
                    onClick={() => handleCancelBooking(selectedBooking.id)}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Stornieren
                  </button>
                )}
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MobilityBookings;
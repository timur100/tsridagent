import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Car, MapPin, Calendar, AlertCircle, CheckCircle, 
  XCircle, Search, RefreshCw, Send, Clock 
} from 'lucide-react';
import toast from 'react-hot-toast';

const EuropcarCrossLocationVehicles = () => {
  const { theme } = useTheme();
  const { selectedTenantId } = useTenant();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [countryCode, setCountryCode] = useState(null);
  const [locationCount, setLocationCount] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activeView, setActiveView] = useState('vehicles'); // vehicles, requests

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (selectedTenantId) {
      fetchAvailableVehicles();
      fetchTransferRequests();
    }
  }, [selectedTenantId]);

  const fetchAvailableVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/europcar/cross-location/available-vehicles`,
        {
          headers: {
            'X-Tenant-ID': selectedTenantId
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setVehicles(data.data.vehicles || []);
          setEnabled(data.data.enabled);
          setCountryCode(data.data.country_code);
          setLocationCount(data.data.location_count || 0);
        } else {
          setEnabled(false);
          toast.error(data.message || 'Standortübergreifende Suche nicht aktiviert');
        }
      }
    } catch (error) {
      console.error('Error fetching cross-location vehicles:', error);
      toast.error('Fehler beim Laden der Fahrzeuge');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferRequests = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/europcar/cross-location/transfer-requests?direction=both`,
        {
          headers: {
            'X-Tenant-ID': selectedTenantId
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRequests(data.data.requests || []);
        }
      }
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
    }
  };

  const handleRequestVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowRequestModal(true);
  };

  const submitRequest = async (requestData) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/europcar/cross-location/request-vehicle`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': selectedTenantId
          },
          body: JSON.stringify({
            vehicle_id: selectedVehicle.id,
            from_tenant_id: selectedVehicle.tenant_id,
            to_tenant_id: selectedTenantId,
            requested_date: requestData.requestedDate,
            return_date: requestData.returnDate,
            notes: requestData.notes
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Transferanfrage erfolgreich gesendet');
          setShowRequestModal(false);
          fetchTransferRequests();
          fetchAvailableVehicles();
        } else {
          toast.error(data.message || 'Fehler beim Senden der Anfrage');
        }
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Fehler beim Senden der Anfrage');
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/europcar/cross-location/transfer-requests/${requestId}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': selectedTenantId
          },
          body: JSON.stringify({ status: action })
        }
      );

      if (response.ok) {
        toast.success(`Anfrage ${action === 'approved' ? 'akzeptiert' : 'abgelehnt'}`);
        fetchTransferRequests();
        fetchAvailableVehicles();
      } else {
        toast.error('Fehler bei der Bearbeitung');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Fehler bei der Bearbeitung');
    }
  };

  if (!enabled) {
    return (
      <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
        <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Standortübergreifende Fahrzeugsuche nicht aktiviert
        </h3>
        <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Diese Funktion muss in den Tenant-Einstellungen aktiviert werden.
        </p>
        <Button className="bg-[#c00000] hover:bg-[#a00000] text-white">
          Zu den Einstellungen
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Standortübergreifende Fahrzeugsuche
            </h2>
            <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Verfügbare Fahrzeuge bei anderen Standorten in {countryCode}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setActiveView('vehicles')}
              variant={activeView === 'vehicles' ? 'default' : 'outline'}
              className={activeView === 'vehicles' ? 'bg-[#c00000] hover:bg-[#a00000]' : ''}
            >
              <Car className="w-4 h-4 mr-2" />
              Fahrzeuge ({vehicles.length})
            </Button>
            <Button
              onClick={() => setActiveView('requests')}
              variant={activeView === 'requests' ? 'default' : 'outline'}
              className={activeView === 'requests' ? 'bg-[#c00000] hover:bg-[#a00000]' : ''}
            >
              <Send className="w-4 h-4 mr-2" />
              Anfragen ({requests.length})
            </Button>
            <Button
              onClick={fetchAvailableVehicles}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900 bg-opacity-20' : 'bg-green-50'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-800'}`}>
            ✓ Suche aktiviert in {locationCount} Standorten
          </p>
        </div>
      </Card>

      {/* Vehicles View */}
      {activeView === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#c00000]" />
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Lade Fahrzeuge...
              </p>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Car className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Keine verfügbaren Fahrzeuge gefunden
              </p>
            </div>
          ) : (
            vehicles.map(vehicle => (
              <Card key={vehicle.id} className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {vehicle.make} {vehicle.model}
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {vehicle.year} • {vehicle.category}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-500 bg-opacity-20 text-green-600 text-xs rounded">
                    Verfügbar
                  </span>
                </div>

                <div className={`flex items-center gap-2 mb-3 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <MapPin className="w-4 h-4" />
                  <span>{vehicle.tenant_display_name}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                  <div>
                    <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      €{vehicle.daily_rate}
                    </span>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>/Tag</span>
                  </div>
                  <Button
                    onClick={() => handleRequestVehicle(vehicle)}
                    className="bg-[#c00000] hover:bg-[#a00000] text-white text-sm"
                  >
                    Anfragen
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Requests View */}
      {activeView === 'requests' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <Send className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  Keine Anfragen vorhanden
                </p>
              </div>
            ) : (
              requests.map(request => (
                <div
                  key={request.id}
                  className={`p-4 rounded-lg border ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {request.vehicle_info.make} {request.vehicle_info.model}
                      </h4>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {request.vehicle_info.license_plate}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending'
                          ? 'bg-yellow-500 bg-opacity-20 text-yellow-600'
                          : request.status === 'approved'
                          ? 'bg-green-500 bg-opacity-20 text-green-600'
                          : 'bg-red-500 bg-opacity-20 text-red-600'
                      }`}
                    >
                      {request.status === 'pending' && 'Ausstehend'}
                      {request.status === 'approved' && 'Akzeptiert'}
                      {request.status === 'rejected' && 'Abgelehnt'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Von:</p>
                      <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {request.from_tenant_name}
                      </p>
                    </div>
                    <div>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Nach:</p>
                      <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {request.to_tenant_name}
                      </p>
                    </div>
                    <div>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Von:</p>
                      <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {new Date(request.requested_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                    <div>
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Bis:</p>
                      <p className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {new Date(request.return_date).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {request.notes}
                    </p>
                  )}

                  {request.status === 'pending' && request.from_tenant_id === selectedTenantId && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRequestAction(request.id, 'approved')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Akzeptieren
                      </Button>
                      <Button
                        onClick={() => handleRequestAction(request.id, 'rejected')}
                        variant="outline"
                        className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Ablehnen
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedVehicle && (
        <RequestModal
          vehicle={selectedVehicle}
          theme={theme}
          onSubmit={submitRequest}
          onClose={() => setShowRequestModal(false)}
        />
      )}
    </div>
  );
};

// Request Modal Component
const RequestModal = ({ vehicle, theme, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    requestedDate: '',
    returnDate: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className={`w-full max-w-md p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
        <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Fahrzeug anfragen
        </h3>

        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {vehicle.make} {vehicle.model}
          </p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            von {vehicle.tenant_display_name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Gewünschtes Datum
            </label>
            <input
              type="date"
              value={formData.requestedDate}
              onChange={(e) => setFormData({...formData, requestedDate: e.target.value})}
              required
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Rückgabedatum
            </label>
            <input
              type="date"
              value={formData.returnDate}
              onChange={(e) => setFormData({...formData, returnDate: e.target.value})}
              required
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Notizen (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Zusätzliche Informationen..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              Anfrage senden
            </Button>
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EuropcarCrossLocationVehicles;

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Ticket, AlertCircle, Clock, CheckCircle, XCircle, 
  TrendingUp, Plus, Search, Filter, MessageSquare,
  User, MapPin, Monitor, AlertTriangle, X, Video, Circle
} from 'lucide-react';
import toast from 'react-hot-toast';
import TicketDetailModal from './TicketDetailModal';

const SupportManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [devices, setDevices] = useState([]);
  const [statusTileFilter, setStatusTileFilter] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchTickets();
    fetchDevices();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTickets();
      fetchDevices();
    }, 30000);
    return () => clearInterval(interval);
  }, [filterStatus, filterPriority]);

  const fetchDevices = async () => {
    try {
      const result = await apiCall('/api/portal/europcar-devices');
      if (result.success) {
        // API response structure: result.data.data.devices (nested data)
        const devicesData = result.data?.data || result.data || {};
        const devicesList = devicesData.devices || [];
        setDevices(devicesList);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const getDeviceStatus = (deviceId) => {
    if (!deviceId) return null;
    const device = devices.find(d => d.device_id === deviceId);
    if (device) {
      // Prioritize tvid (numeric TeamViewer ID) over teamviewer_id
      // Remove any non-numeric characters from teamviewer_id if present
      let tvId = device.tvid || device.teamviewer_id;
      if (tvId && typeof tvId === 'string') {
        // Remove 'r' prefix or any non-numeric characters
        tvId = tvId.replace(/\D/g, '');
      }
      return {
        online: device.teamviewer_online === 'online' || device.teamviewer_online === true,
        teamviewerId: tvId
      };
    }
    return null;
  };

  const handleTeamViewerConnect = (e, teamviewerId) => {
    e.stopPropagation();
    if (teamviewerId) {
      window.open(`https://start.teamviewer.com/${teamviewerId}`, '_blank');
    }
  };

  const fetchStats = async () => {
    try {
      const result = await apiCall('/api/tickets/stats');
      if (result.success && result.data) {
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      let url = '/api/tickets';
      const params = [];
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (filterPriority) params.push(`priority=${filterPriority}`);
      if (params.length > 0) url += '?' + params.join('&');

      const result = await apiCall(url);
      if (result.success && result.data) {
        setTickets(result.data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-600',
      in_progress: 'bg-yellow-600',
      waiting: 'bg-orange-600',
      resolved: 'bg-green-600',
      closed: 'bg-gray-600'
    };
    return colors[status] || 'bg-gray-600';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Offen',
      in_progress: 'In Bearbeitung',
      waiting: 'Wartet',
      resolved: 'Gelöst',
      closed: 'Geschlossen'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      critical: 'Kritisch'
    };
    return labels[priority] || priority;
  };

  const handleTileClick = (filter) => {
    setStatusTileFilter(statusTileFilter === filter ? null : filter);
    setFilterStatus(''); // Reset dropdown filter
  };

  const filteredTickets = tickets.filter(ticket => {
    // Apply tile filter
    if (statusTileFilter) {
      const status = ticket.status;
      switch (statusTileFilter) {
        case 'open':
          if (!(status === 'new' || status === 'open' || status === 'accepted')) return false;
          break;
        case 'in_progress':
          if (status !== 'in_progress') return false;
          break;
        case 'critical':
          if (ticket.priority !== 'critical') return false;
          break;
      }
    }
    
    // Apply search query
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return (
        ticket.ticket_number?.toLowerCase().includes(search) ||
        ticket.title?.toLowerCase().includes(search) ||
        ticket.description?.toLowerCase().includes(search) ||
        ticket.customer_name?.toLowerCase().includes(search) ||
        ticket.customer_company?.toLowerCase().includes(search) ||
        ticket.customer_email?.toLowerCase().includes(search) ||
        ticket.location_id?.toLowerCase().includes(search) ||
        ticket.location_name?.toLowerCase().includes(search) ||
        ticket.device_id?.toLowerCase().includes(search) ||
        ticket.category?.toLowerCase().includes(search) ||
        (ticket.comments && ticket.comments.some(c => 
          c.comment?.toLowerCase().includes(search) ||
          c.author?.toLowerCase().includes(search)
        ))
      );
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Open */}
          <Card 
            onClick={() => handleTileClick('open')}
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
              statusTileFilter === 'open' ? 'ring-2 ring-blue-500 shadow-lg' : ''
            } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Offene Tickets
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.open}
                </p>
              </div>
              <AlertCircle className={`h-12 w-12 ${statusTileFilter === 'open' ? 'text-blue-700' : 'text-blue-600'}`} />
            </div>
          </Card>

          {/* In Progress */}
          <Card 
            onClick={() => handleTileClick('in_progress')}
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
              statusTileFilter === 'in_progress' ? 'ring-2 ring-yellow-500 shadow-lg' : ''
            } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  In Bearbeitung
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.in_progress}
                </p>
              </div>
              <Clock className={`h-12 w-12 ${statusTileFilter === 'in_progress' ? 'text-yellow-700' : 'text-yellow-600'}`} />
            </div>
          </Card>

          {/* Critical */}
          <Card 
            onClick={() => handleTileClick('critical')}
            className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
              statusTileFilter === 'critical' ? 'ring-2 ring-red-500 shadow-lg' : ''
            } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Kritisch
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.critical}
                </p>
              </div>
              <AlertTriangle className={`h-12 w-12 ${statusTileFilter === 'critical' ? 'text-red-700' : 'text-red-600'}`} />
            </div>
          </Card>

          {/* Avg Resolution */}
          <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Ø Lösungszeit
                </p>
                <p className={`text-3xl font-bold mt-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {stats.avg_resolution_hours}h
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Ticket-Nr., Stationscode, Titel, Beschreibung, Kommentaren..."
                className={`w-full pl-10 pr-10 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-700 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  title="Suche zurücksetzen"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 border rounded-lg ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Alle Status</option>
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="waiting">Wartet</option>
            <option value="resolved">Gelöst</option>
            <option value="closed">Geschlossen</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`px-4 py-2 border rounded-lg ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">Alle Prioritäten</option>
            <option value="low">Niedrig</option>
            <option value="medium">Mittel</option>
            <option value="high">Hoch</option>
            <option value="critical">Kritisch</option>
          </select>

          {/* Create Button */}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#c00000] hover:bg-[#a00000] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neues Ticket
          </Button>
          
          {/* Reset Filters Button */}
          {(statusTileFilter || searchQuery) && (
            <Button
              onClick={() => {
                setStatusTileFilter(null);
                setSearchQuery('');
                setFilterStatus('');
                setFilterPriority('');
              }}
              variant="outline"
              className={theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-300 text-gray-600'}
            >
              Filter zurücksetzen
            </Button>
          )}
        </div>
        
        {/* Active Filters Display */}
        {(statusTileFilter || searchQuery) && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Aktive Filter:
            </span>
            {statusTileFilter && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                theme === 'dark' ? 'bg-[#c00000]/20 text-[#c00000]' : 'bg-red-100 text-[#c00000]'
              }`}>
                {statusTileFilter === 'open' ? 'Offen' : statusTileFilter === 'in_progress' ? 'In Bearbeitung' : 'Kritisch'}
              </span>
            )}
            {searchQuery && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                theme === 'dark' ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'
              }`}>
                Suche: "{searchQuery}"
              </span>
            )}
            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              • {filteredTickets.length} {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'} gefunden
            </span>
          </div>
        )}
      </Card>

      {/* Tickets Table */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Support Tickets
        </h3>

        {loading ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lade Tickets...
          </p>
        ) : filteredTickets.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <Ticket className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Keine Tickets gefunden</p>
            <p className="text-sm mt-2">Erstellen Sie ein neues Ticket, um zu beginnen</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ticket-Nr.
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Titel
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Kunde
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Online
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Priorität
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Erstellt
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Zuordnung
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowDetailModal(true);
                    }}
                    className={`border-b cursor-pointer ${
                      theme === 'dark'
                        ? 'border-gray-700 hover:bg-[#3a3a3a]'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <td className={`py-3 px-4 font-mono text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {ticket.ticket_number}
                    </td>
                    <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      <div>
                        <p className="font-medium">{ticket.title}</p>
                        {(ticket.location_name || ticket.device_name) && (
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            {ticket.location_name && (
                              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                                <MapPin className="inline h-3 w-3 mr-1" />
                                {ticket.location_name}
                              </span>
                            )}
                            {ticket.device_name && (
                              <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                                <Monitor className="inline h-3 w-3 mr-1" />
                                {ticket.device_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      <div>
                        <p className="font-medium">{ticket.customer_name}</p>
                        <p className="text-xs text-gray-500">{ticket.customer_company}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-white ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {ticket.device_id && (() => {
                        const deviceStatus = getDeviceStatus(ticket.device_id);
                        if (deviceStatus) {
                          return (
                            <div className="flex items-center gap-2">
                              {/* Green Online Button or Red Offline */}
                              <button
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-colors ${
                                  deviceStatus.online 
                                    ? 'bg-green-500 hover:bg-green-600' 
                                    : 'bg-red-500 hover:bg-red-600'
                                }`}
                                disabled
                              >
                                <div className="relative">
                                  <Circle className="h-3 w-3 fill-current" />
                                  {deviceStatus.online && (
                                    <span className="absolute top-0 left-0 h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    </span>
                                  )}
                                </div>
                                {deviceStatus.online ? 'Online' : 'Offline'}
                              </button>
                              
                              {/* Blue TeamViewer Connect Button - Pill shape with Monitor icon and text */}
                              {deviceStatus.online && deviceStatus.teamviewerId && (
                                <button
                                  onClick={(e) => handleTeamViewerConnect(e, deviceStatus.teamviewerId)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                  title="TeamViewer Verbindung starten"
                                >
                                  <Monitor className="h-3 w-3" />
                                  Connect
                                </button>
                              )}
                            </div>
                          );
                        }
                        return <span className="text-xs text-gray-500">-</span>;
                      })()}
                      {!ticket.device_id && <span className="text-xs text-gray-500">-</span>}
                    </td>
                    <td className={`py-3 px-4 font-semibold ${getPriorityColor(ticket.priority)}`}>
                      {getPriorityLabel(ticket.priority)}
                    </td>
                    <td className={`py-3 px-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(ticket.created_at).toLocaleString('de-DE')}
                    </td>
                    <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {ticket.device_id && (
                        <div className="flex items-center gap-2 text-xs">
                          <Monitor className="h-3 w-3" />
                          <span>{ticket.device_name}</span>
                        </div>
                      )}
                      {ticket.location_id && !ticket.device_id && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="h-3 w-3" />
                          <span>{ticket.location_name}</span>
                        </div>
                      )}
                      {!ticket.device_id && !ticket.location_id && (
                        <span className="text-xs text-gray-500">Allgemein</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ticket Detail Modal */}
      {showDetailModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTicket(null);
          }}
          onUpdate={() => {
            fetchTickets();
            fetchStats();
          }}
          devices={devices}
          isAdmin={true}
        />
      )}

      {/* OLD MODAL - REMOVE THIS BLOCK */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`sticky top-0 flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'
            }`}>
              <div>
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Ticket Details
                </h2>
                <p className={`text-sm mt-1 font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedTicket.ticket_number}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTicket(null);
                }}
                className={`p-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'hover:bg-[#3a3a3a] text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-sm font-semibold mb-2 block ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status
                  </label>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold text-white ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusLabel(selectedTicket.status)}
                  </span>
                </div>
                <div>
                  <label className={`text-sm font-semibold mb-2 block ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Priorität
                  </label>
                  <span className={`inline-block text-lg font-bold ${getPriorityColor(selectedTicket.priority)}`}>
                    {getPriorityLabel(selectedTicket.priority)}
                  </span>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className={`text-sm font-semibold mb-2 block ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Titel
                </label>
                <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTicket.title}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className={`text-sm font-semibold mb-2 block ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Beschreibung
                </label>
                <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {selectedTicket.description}
                </p>
              </div>

              {/* Customer Info */}
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kundeninformationen
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Name</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.customer_name}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Unternehmen</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.customer_company}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>E-Mail</p>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedTicket.customer_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location & Device Info */}
              {(selectedTicket.location_id || selectedTicket.device_id) && (
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  <h3 className={`text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Zuordnung
                  </h3>
                  <div className="space-y-3">
                    {selectedTicket.location_name && (
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`} />
                        <div>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Standort</p>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {selectedTicket.location_name}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedTicket.device_id && (
                      <div className="flex items-start gap-2">
                        <Monitor className={`h-4 w-4 mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`} />
                        <div className="flex-1">
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Gerät</p>
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {selectedTicket.device_name || selectedTicket.device_id}
                          </p>
                          
                          {/* Device Status & TeamViewer Connect */}
                          {(() => {
                            const deviceStatus = getDeviceStatus(selectedTicket.device_id);
                            if (deviceStatus) {
                              return (
                                <div className="flex items-center gap-3 mt-2">
                                  {/* Green Online Button or Red Offline */}
                                  <button
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-colors ${
                                      deviceStatus.online 
                                        ? 'bg-green-500 hover:bg-green-600' 
                                        : 'bg-red-500 hover:bg-red-600'
                                    }`}
                                    disabled
                                  >
                                    <div className="relative">
                                      <Circle className="h-4 w-4 fill-current" />
                                      {deviceStatus.online && (
                                        <span className="absolute top-0 left-0 h-4 w-4">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        </span>
                                      )}
                                    </div>
                                    {deviceStatus.online ? 'Online' : 'Offline'}
                                  </button>
                                  
                                  {/* Blue TeamViewer Connect Button - Pill shape with Monitor icon and text */}
                                  {deviceStatus.online && deviceStatus.teamviewerId && (
                                    <button
                                      onClick={(e) => handleTeamViewerConnect(e, deviceStatus.teamviewerId)}
                                      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                      title="TeamViewer Verbindung starten"
                                    >
                                      <Monitor className="h-4 w-4" />
                                      Connect
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Erstellt am</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {new Date(selectedTicket.created_at).toLocaleString('de-DE')}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Kategorie</p>
                  <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTicket.category === 'technical' ? 'Technisch' : 
                     selectedTicket.category === 'billing' ? 'Abrechnung' :
                     selectedTicket.category === 'general' ? 'Allgemein' : 
                     selectedTicket.category === 'hardware' ? 'Hardware' :
                     selectedTicket.category === 'software' ? 'Software' : selectedTicket.category}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`sticky bottom-0 flex justify-end gap-3 p-6 border-t ${
              theme === 'dark' ? 'border-gray-700 bg-[#2d2d2d]' : 'border-gray-200 bg-white'
            }`}>
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTicket(null);
                }}
                className={theme === 'dark' 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }
              >
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal - Will implement next */}
      {showCreateModal && (
        <div>Create Ticket Modal (wird implementiert...)</div>
      )}
    </div>
  );
};

export default SupportManagement;

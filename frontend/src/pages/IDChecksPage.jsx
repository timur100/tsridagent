import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Search, Filter, RefreshCw, Download, Eye, CheckCircle, 
  XCircle, AlertCircle, Clock, Settings, Calendar,
  MapPin, Monitor, Building, User
} from 'lucide-react';

const IDChecksPage = () => {
  console.log('[IDChecksPage] Component mounted/rendered');
  const { theme } = useTheme();
  const { user, apiCall } = useAuth();
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('dokumentenscan');

  // Data states
  const [scans, setScans] = useState([]);
  const [stats, setStats] = useState({ total: 0, validated: 0, rejected: 0, unknown: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    tenant_id: '',
    location_id: '',
    device_id: '',
    document_type: '',
    from_date: '',
    to_date: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Column visibility states
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    tenant: true,
    location: true,
    device: true,
    document_type: true,
    status: true,
    name: true,
    document_number: true,
    scanned_by: true,
    actions: true
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Load scans
  const loadScans = async () => {
    try {
      setRefreshing(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.tenant_id) params.append('tenant_id', filters.tenant_id);
      if (filters.location_id) params.append('location_id', filters.location_id);
      if (filters.device_id) params.append('device_id', filters.device_id);
      if (filters.document_type) params.append('document_type', filters.document_type);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      params.append('limit', itemsPerPage);
      params.append('skip', (currentPage - 1) * itemsPerPage);

      const result = await apiCall(`/api/id-scans/?${params.toString()}`);
      console.log('[IDChecksPage] Scans result:', result);
      
      if (result.success && result.data) {
        console.log('[IDChecksPage] Setting scans:', result.data.scans);
        setScans(result.data.scans || []);
      }
    } catch (error) {
      console.error('Error loading scans:', error);
      toast.error('Fehler beim Laden der Scans');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      console.log('[IDChecksPage] Loading stats...');
      const result = await apiCall('/api/id-scans/stats/summary');
      console.log('[IDChecksPage] Stats result:', result);
      if (result && result.success && result.data && result.data.stats) {
        console.log('[IDChecksPage] Setting stats:', result.data.stats);
        setStats(result.data.stats);
      } else {
        console.log('[IDChecksPage] No stats in result, setting defaults');
        // Set default stats if API fails
        setStats({ total: 0, validated: 0, rejected: 0, unknown: 0, pending: 0 });
      }
    } catch (error) {
      console.error('[IDChecksPage] Error loading stats:', error);
      setStats({ total: 0, validated: 0, rejected: 0, unknown: 0, pending: 0 });
    }
  };

  useEffect(() => {
    loadScans();
    loadStats();
  }, [filters, currentPage]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadScans();
      loadStats();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [filters, currentPage]);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      validated: { color: 'green', icon: CheckCircle, label: 'Validated' },
      rejected: { color: 'red', icon: XCircle, label: 'Rejected' },
      unknown: { color: 'yellow', icon: AlertCircle, label: 'Unknown' },
      pending: { color: 'gray', icon: Clock, label: 'Pending' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold
        ${config.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
        ${config.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
        ${config.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
        ${config.color === 'gray' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' : ''}
      `}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Search filter
  const filteredScans = scans.filter(scan => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      scan.tenant_name?.toLowerCase().includes(searchLower) ||
      scan.location_name?.toLowerCase().includes(searchLower) ||
      scan.device_name?.toLowerCase().includes(searchLower) ||
      scan.extracted_data?.full_name?.toLowerCase().includes(searchLower) ||
      scan.extracted_data?.document_number?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className={`h-8 w-8 animate-spin mx-auto mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Lade ID-Checks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          ID-Checks
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
            title="Spalten-Einstellungen"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              loadScans();
              loadStats();
            }}
            disabled={refreshing}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
            }`}
            title="Aktualisieren"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab Menu */}
      <div className={`flex gap-2 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('dokumentenscan')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'dokumentenscan'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Dokumentenscan
        </button>
        <button
          onClick={() => setActiveTab('facematch')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'facematch'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Facematch
        </button>
        <button
          onClick={() => setActiveTab('fingerprint')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'fingerprint'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Fingerprint
        </button>
        <button
          onClick={() => setActiveTab('ki-suche')}
          className={`px-6 py-3 font-semibold transition-colors relative ${
            activeTab === 'ki-suche'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          KI-Suche
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
        </div>
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-500/20' : 'bg-green-50 border border-green-200'}`}>
          <p className="text-sm text-green-600 dark:text-green-400">Validated</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.validated}</p>
        </div>
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/20 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
          <p className="text-sm text-red-600 dark:text-red-400">Rejected</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.rejected}</p>
        </div>
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/20 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">Unknown</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.unknown}</p>
        </div>
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700/20 border border-gray-500/20' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
          <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{stats.pending}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Suchen nach Name, Tenant, Standort, Dokumentennummer..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] text-white border border-gray-700'
                  : 'bg-gray-50 text-gray-900 border border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              theme === 'dark'
                ? 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                : 'bg-gray-50 text-gray-600 hover:text-gray-900 border border-gray-300'
            }`}
          >
            <Filter className="h-5 w-5" />
            Filter
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-700">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] text-white border border-gray-700'
                  : 'bg-gray-50 text-gray-900 border border-gray-300'
              }`}
            >
              <option value="">Alle Status</option>
              <option value="validated">Validated</option>
              <option value="rejected">Rejected</option>
              <option value="unknown">Unknown</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={filters.document_type}
              onChange={(e) => setFilters({ ...filters, document_type: e.target.value })}
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] text-white border border-gray-700'
                  : 'bg-gray-50 text-gray-900 border border-gray-300'
              }`}
            >
              <option value="">Alle Dokumenttypen</option>
              <option value="passport">Reisepass</option>
              <option value="id_card">Personalausweis</option>
              <option value="drivers_license">Führerschein</option>
              <option value="residence_permit">Aufenthaltstitel</option>
            </select>

            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
              placeholder="Von Datum"
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] text-white border border-gray-700'
                  : 'bg-gray-50 text-gray-900 border border-gray-300'
              }`}
            />

            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
              placeholder="Bis Datum"
              className={`px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] text-white border border-gray-700'
                  : 'bg-gray-50 text-gray-900 border border-gray-300'
              }`}
            />
          </div>
        )}
      </div>

      {/* Column Settings Modal */}
      {showColumnSettings && (
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
          <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Sichtbare Spalten
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {Object.keys(visibleColumns).map(column => (
              <label key={column} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleColumns[column]}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, [column]: e.target.checked })}
                  className="rounded"
                />
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {column.charAt(0).toUpperCase() + column.slice(1).replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white border border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
              <tr>
                {visibleColumns.timestamp && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Zeitstempel
                  </th>
                )}
                {visibleColumns.tenant && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Kunde
                  </th>
                )}
                {visibleColumns.location && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Standort
                  </th>
                )}
                {visibleColumns.device && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gerät
                  </th>
                )}
                {visibleColumns.document_type && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Dokumenttyp
                  </th>
                )}
                {visibleColumns.status && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </th>
                )}
                {visibleColumns.name && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Name
                  </th>
                )}
                {visibleColumns.document_number && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Dokumentennummer
                  </th>
                )}
                {visibleColumns.scanned_by && (
                  <th className={`px-4 py-3 text-left text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Gescannt von
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className={`px-4 py-3 text-right text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Aktionen
                  </th>
                )}
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredScans.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center">
                    <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                      Keine ID-Scans gefunden
                    </p>
                  </td>
                </tr>
              ) : (
                filteredScans.map((scan) => (
                  <tr
                    key={scan.id}
                    onClick={() => navigate(`/portal/admin/id-checks/${scan.id}`)}
                    className={`cursor-pointer transition-colors ${
                      theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-50'
                    }`}
                  >
                    {visibleColumns.timestamp && (
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        {formatDate(scan.scan_timestamp)}
                      </td>
                    )}
                    {visibleColumns.tenant && (
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          {scan.tenant_name}
                        </div>
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          {scan.location_name || '-'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.device && (
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-gray-500" />
                          {scan.device_name || '-'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.document_type && (
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        {scan.document_type || '-'}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-4 py-3">
                        <StatusBadge status={scan.status} />
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        {scan.extracted_data?.full_name || scan.extracted_data?.first_name + ' ' + scan.extracted_data?.last_name || '-'}
                      </td>
                    )}
                    {visibleColumns.document_number && (
                      <td className={`px-4 py-3 text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        {scan.extracted_data?.document_number || '-'}
                      </td>
                    )}
                    {visibleColumns.scanned_by && (
                      <td className={`px-4 py-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          {scan.scanned_by || '-'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/portal/admin/id-checks/${scan.id}`);
                          }}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm ${
                            theme === 'dark'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          <Eye className="h-4 w-4" />
                          Details
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredScans.length > 0 && (
        <div className="flex items-center justify-between">
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Zeige {((currentPage - 1) * itemsPerPage) + 1} bis {Math.min(currentPage * itemsPerPage, stats.total)} von {stats.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg ${
                currentPage === 1
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              } ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
                  : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Zurück
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage * itemsPerPage >= stats.total}
              className={`px-4 py-2 rounded-lg ${
                currentPage * itemsPerPage >= stats.total
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              } ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'
                  : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IDChecksPage;

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Server,
  BarChart,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useTenant } from '../contexts/TenantContext';
import { Card } from '../components/ui/card';
import TenantHierarchySidebarV2 from '../components/TenantHierarchySidebarV2';

const TenantsPage = ({ onSelectTenant }) => {
  const { theme } = useTheme();
  const { selectedTenantId, setSelectedTenant } = useTenant();
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [hierarchyFilter, setHierarchyFilter] = useState(null);
  const [hierarchySelectedId, setHierarchySelectedId] = useState(null);
  const [hierarchyStats, setHierarchyStats] = useState(null);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchStats();
    fetchTenants();
  }, [filterStatus, filterPlan, selectedTenantId]);

  useEffect(() => {
    fetchHierarchyStats();
  }, [hierarchySelectedId]);

  const fetchHierarchyStats = async () => {
    try {
      // If no hierarchy selection, fetch default stats
      if (!hierarchySelectedId) {
        await fetchStats();
        return;
      }

      const tenantId = hierarchySelectedId === 'all' ? 'all' : hierarchySelectedId;
      const url = `${BACKEND_URL}/api/hierarchy-stats/${tenantId}`;
      
      console.log('[TenantsPage] Fetching hierarchy stats from:', url);
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const data = result.data;
          
          // Map hierarchy stats to display stats format
          const mappedStats = {
            total_tenants: data.hierarchy.locations || 0,
            total_devices: data.physical_assets.devices || 0,
            total_locations: data.physical_assets.physical_locations || 0,
            total_users: data.physical_assets.users || 0,
            online_devices: 0, // Not provided by hierarchy API
            offline_devices: 0, // Not provided by hierarchy API
            total_scans: 0, // Not provided by hierarchy API
            correct_scans: 0,
            unknown_scans: 0,
            failed_scans: 0,
            _hierarchyInfo: {
              organizations: data.hierarchy.organizations,
              continents: data.hierarchy.continents,
              countries: data.hierarchy.countries,
              states: data.hierarchy.states,
              cities: data.hierarchy.cities,
              locations: data.hierarchy.locations,
              selected_level: data.scope.selected_level
            }
          };
          
          console.log('[TenantsPage] Hierarchy stats loaded:', mappedStats);
          setHierarchyStats(mappedStats);
        }
      }
    } catch (error) {
      console.error('Error fetching hierarchy stats:', error);
    }
  };

  const fetchStats = async () => {
    try {
      let url = `${BACKEND_URL}/api/tenants/stats`;
      
      // If a specific tenant is selected, load tenant-specific stats
      if (selectedTenantId && selectedTenantId !== 'all') {
        url = `${BACKEND_URL}/api/tenants/${selectedTenantId}/dashboard-stats`;
      }
      
      console.log('[TenantsPage] Fetching stats from:', url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('[TenantsPage] Stats loaded:', data);
        setStats(data);
        setHierarchyStats(null); // Clear hierarchy stats when showing default
      }
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      let url = `${BACKEND_URL}/api/tenants/?skip=0&limit=100`;
      if (filterStatus !== 'all') {
        url += `&status_filter=${filterStatus}`;
      }
      if (filterPlan !== 'all') {
        url += `&subscription_plan=${filterPlan}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // API returns { success, tenants, total } - extract the array
        const tenantsList = Array.isArray(data) ? data : (data.tenants || data.data || []);
        setTenants(tenantsList);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchTenants();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/search?query=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        // API returns { success, tenants, total } - extract the array
        const tenantsList = Array.isArray(data) ? data : (data.tenants || data.data || []);
        setTenants(tenantsList);
      }
    } catch (error) {
      console.error('Error searching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status, enabled) => {
    // If no status but enabled=true, treat as active
    const effectiveStatus = status || (enabled !== false ? 'active' : 'inactive');
    
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      trial: 'bg-blue-100 text-blue-800 border-blue-200',
      suspended: 'bg-red-100 text-red-800 border-red-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      active: <CheckCircle className="w-4 h-4" />,
      trial: <Clock className="w-4 h-4" />,
      suspended: <XCircle className="w-4 h-4" />,
      inactive: <XCircle className="w-4 h-4" />
    };

    const labels = {
      active: 'Aktiv',
      trial: 'Trial',
      suspended: 'Gesperrt',
      inactive: 'Inaktiv'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[effectiveStatus] || styles.active}`}>
        {icons[effectiveStatus]}
        {labels[effectiveStatus] || 'Aktiv'}
      </span>
    );
  };

  const getPlanBadge = (plan) => {
    const styles = {
      basic: 'bg-gray-100 text-gray-800',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-indigo-100 text-indigo-800'
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[plan] || styles.basic}`}>
        {(plan || 'basic').charAt(0).toUpperCase() + (plan || 'basic').slice(1)}
      </span>
    );
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar - Hierarchie */}
      <div className="flex-shrink-0">
        <TenantHierarchySidebarV2
          selectedTenantId={hierarchySelectedId}
          onSelectTenant={(tenantId) => {
            setHierarchySelectedId(tenantId);
          }}
          onFilterChange={(tenantIds) => {
            setHierarchyFilter(tenantIds);
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Tenants
            </h2>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {hierarchyStats && hierarchyStats._hierarchyInfo
                ? `${hierarchyStats._hierarchyInfo.locations} Standort(e) im ausgewählten Bereich`
                : hierarchyFilter 
                ? `${hierarchyFilter.length} Tenant(s) im ausgewählten Bereich`
                : 'Verwalten Sie alle Mandanten und deren Ressourcen'
              }
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Neuer Tenant
          </button>
        </div>

      {/* Statistics Cards */}
      {(stats || hierarchyStats) && (
        <>
          {/* Row 1: Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hierarchyStats ? 'Standorte' : 'Kunden'}
                  </p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {hierarchyStats ? hierarchyStats.total_tenants : stats.total_tenants}
                  </p>
                </div>
                <Building className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
              </div>
            </Card>

            <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Geräte</p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {hierarchyStats ? hierarchyStats.total_devices : stats.total_devices}
                  </p>
                </div>
                <Server className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
              </div>
            </Card>

            <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {hierarchyStats ? 'Physische Standorte' : 'Standorte'}
                  </p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {hierarchyStats ? hierarchyStats.total_locations : stats.total_locations}
                  </p>
                </div>
                <MapPin className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
              </div>
            </Card>

            <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Mitarbeiter</p>
                  <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {hierarchyStats ? hierarchyStats.total_users : stats.total_users}
                  </p>
                </div>
                <Users className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
              </div>
            </Card>
          </div>

          {/* Row 2: Device Status - Only show when not using hierarchy stats */}
          {!hierarchyStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-green-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-green-50 border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>Online Geräte</p>
                    <p className="text-3xl font-bold text-green-600">{stats.online_devices}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-green-500/20' : 'bg-green-200'}`}>
                    <div className="h-6 w-6 bg-green-600 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </Card>

              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-red-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-red-50 border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>Offline Geräte</p>
                    <p className="text-3xl font-bold text-red-600">{stats.offline_devices}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-red-500/20' : 'bg-red-200'}`}>
                    <div className="h-6 w-6 bg-red-600 rounded-full"></div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Row 3: Scan Statistics - Only show when not using hierarchy stats */}
          {!hierarchyStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              {/* Scans Insgesamt - Moved from Row 1 */}
              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Scans Insgesamt</p>
                    <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{stats.total_scans}</p>
                  </div>
                  <BarChart className={`h-12 w-12 ${theme === 'dark' ? 'text-[#c00000]' : 'text-gray-400'}`} />
                </div>
              </Card>

              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-green-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-green-50 border border-green-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>Korrekte Scans</p>
                    <p className="text-3xl font-bold text-green-600">{stats.correct_scans}</p>
                  </div>
                  <CheckCircle className={`h-12 w-12 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                </div>
              </Card>

              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-yellow-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-yellow-50 border border-yellow-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>Unbekannte Scans</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.unknown_scans}</p>
                  </div>
                  <HelpCircle className={`h-12 w-12 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                </div>
              </Card>

              <Card className={`p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-[#2a2a2a] border border-red-500/20 shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                  : 'bg-red-50 border border-red-200 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>Fehlgeschlagene Scans</p>
                    <p className="text-3xl font-bold text-red-600">{stats.failed_scans}</p>
                  </div>
                  <XCircle className={`h-12 w-12 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Search and Filters */}
      <Card className={`p-4 rounded-xl ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
          : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
      }`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Name, Domain oder Email..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#c00000] focus:border-transparent ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
          </form>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#c00000] focus:border-transparent ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="trial">Trial</option>
              <option value="suspended">Gesperrt</option>
              <option value="inactive">Inaktiv</option>
            </select>

            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className={`px-4 py-2 rounded-lg border focus:ring-2 focus:ring-[#c00000] focus:border-transparent ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Alle Pläne</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tenants Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : tenants.length === 0 ? (
        <Card className={`p-12 text-center rounded-xl ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
        }`}>
          <Building className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-[#c00000]/50' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Tenants gefunden
          </h3>
          <p className={`mb-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {searchQuery ? 'Keine Ergebnisse für Ihre Suche.' : 'Erstellen Sie Ihren ersten Tenant um zu beginnen.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Neuer Tenant
            </button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {tenants
            .filter(tenant => {
              // Filter by hierarchy if selected
              if (hierarchyFilter && hierarchyFilter.length > 0) {
                return hierarchyFilter.includes(tenant.tenant_id);
              }
              return true;
            })
            .filter(tenant => {
              // Filter by search query
              if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                  tenant.name?.toLowerCase().includes(query) ||
                  tenant.display_name?.toLowerCase().includes(query) ||
                  tenant.tenant_id?.toLowerCase().includes(query)
                );
              }
              return true;
            })
            .map((tenant) => (
            <Card
              key={tenant.tenant_id}
              onClick={() => {
                // Update global tenant context
                setSelectedTenant(tenant.tenant_id, tenant.display_name || tenant.name);
                // Call the callback for navigation
                onSelectTenant && onSelectTenant(tenant.tenant_id);
              }}
              className={`p-5 rounded-xl transition-all duration-300 cursor-pointer ${
                // Highlight selected tenant
                selectedTenantId === tenant.tenant_id
                  ? theme === 'dark'
                    ? 'bg-[#c00000]/20 border-2 border-[#c00000] shadow-[0_8px_24px_rgba(192,0,0,0.5)]'
                    : 'bg-red-50 border-2 border-[#c00000] shadow-[0_8px_24px_rgba(192,0,0,0.3)]'
                  : theme === 'dark' 
                    ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:-translate-y-1' 
                    : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1'
              }`}
            >
              {/* Logo and Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {tenant.logo_url ? (
                    <img src={tenant.logo_url} alt={tenant.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-[#c00000] to-[#900000] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {(tenant.display_name || tenant.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {getStatusBadge(tenant.status)}
              </div>

              {/* Tenant Info */}
              <h3 className={`text-lg font-semibold mb-1 truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`} title={tenant.display_name || tenant.name}>
                {tenant.display_name || tenant.name || 'Unnamed'}
              </h3>
              <p className={`text-sm mb-1 truncate ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} title={tenant.name}>
                {tenant.name || tenant.tenant_id}
              </p>
              {tenant.domain && (
                <p className={`text-xs mb-3 truncate ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`} title={tenant.domain}>
                  {tenant.domain}
                </p>
              )}

              {/* Plan Badge */}
              <div className="mb-3">
                {getPlanBadge(tenant.subscription_plan)}
              </div>

              {/* Stats */}
              <div className={`space-y-2 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Users className="w-4 h-4" />
                    Benutzer
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.user_count || 0} / {tenant.limits?.max_users || '∞'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Server className="w-4 h-4" />
                    Geräte
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.device_count || 0} / {tenant.limits?.max_devices || '∞'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <BarChart className="w-4 h-4" />
                    Storage
                  </span>
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tenant.storage_used_gb || 0} / {tenant.limits?.max_storage_gb || '∞'} GB
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  Erstellt: {new Date(tenant.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TenantModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTenants();
            fetchStats();
          }}
          backendUrl={BACKEND_URL}
        />
      )}
      </div>
    </div>
  );
};

// Create/Edit Modal Component
const TenantModal = ({ onClose, onSuccess, backendUrl, tenant = null }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    display_name: tenant?.display_name || '',
    domain: tenant?.domain || '',
    description: tenant?.description || '',
    admin_email: tenant?.contact?.admin_email || '',
    admin_password: '',
    phone: tenant?.contact?.phone || '',
    address: tenant?.contact?.address || '',
    city: tenant?.contact?.city || '',
    country: tenant?.contact?.country || '',
    postal_code: tenant?.contact?.postal_code || '',
    subscription_plan: tenant?.subscription_plan || 'basic',
    max_users: tenant?.limits?.max_users || 100,
    max_devices: tenant?.limits?.max_devices || 1000,
    max_storage_gb: tenant?.limits?.max_storage_gb || 50,
    max_api_calls_per_day: tenant?.limits?.max_api_calls_per_day || 10000,
    max_locations: tenant?.limits?.max_locations || 10
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        display_name: formData.display_name,
        domain: formData.domain || null,
        description: formData.description || null,
        contact: {
          admin_email: formData.admin_email,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          country: formData.country || null,
          postal_code: formData.postal_code || null
        },
        admin_password: formData.admin_password,
        subscription_plan: formData.subscription_plan,
        limits: {
          max_users: parseInt(formData.max_users),
          max_devices: parseInt(formData.max_devices),
          max_storage_gb: parseInt(formData.max_storage_gb),
          max_api_calls_per_day: parseInt(formData.max_api_calls_per_day),
          max_locations: parseInt(formData.max_locations)
        },
        settings: {},
        logo_url: null
      };

      const response = await fetch(`${backendUrl}/api/tenants/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.detail || 'Fehler beim Erstellen des Tenants');
      }
    } catch (error) {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a]' 
          : 'bg-white'
      }`}>
        <div className={`p-6 border-b sticky top-0 z-10 ${
          theme === 'dark' 
            ? 'bg-[#2a2a2a] border-gray-700' 
            : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Neuer Tenant
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className={`p-4 rounded-lg border ${
              theme === 'dark'
                ? 'bg-red-900/20 border-red-800 text-red-300'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Basis-Informationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Name (ID) <span className="text-[#c00000]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="tenant-name"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Anzeigename <span className="text-[#c00000]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="Tenant Display Name"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Domain
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Subscription Plan
                </label>
                <select
                  value={formData.subscription_plan}
                  onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  rows="2"
                  placeholder="Kurze Beschreibung des Tenants..."
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kontakt-Informationen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Admin Email <span className="text-[#c00000]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Admin Passwort <span className="text-[#c00000]">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Sicheres Passwort"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="+49 123 456789"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Stadt</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Berlin"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Land</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Deutschland"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>PLZ</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="10115"
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Adresse</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                  placeholder="Straße und Hausnummer"
                />
              </div>
            </div>
          </div>

          {/* Resource Limits */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Ressourcen-Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Max. Benutzer</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Max. Geräte</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_devices}
                  onChange={(e) => setFormData({ ...formData, max_devices: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Max. Storage (GB)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_storage_gb}
                  onChange={(e) => setFormData({ ...formData, max_storage_gb: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Max. API Calls/Tag</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_api_calls_per_day}
                  onChange={(e) => setFormData({ ...formData, max_api_calls_per_day: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Max. Standorte</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_locations}
                  onChange={(e) => setFormData({ ...formData, max_locations: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent transition-all ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex gap-3 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 border rounded-lg transition-all hover:scale-105 ${
                theme === 'dark'
                  ? 'border-gray-700 text-gray-300 hover:bg-[#1a1a1a]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              disabled={loading}
            >
              {loading ? 'Wird erstellt...' : 'Tenant erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Detail Modal Component
const TenantDetailModal = ({ tenant, onClose, onUpdate, backendUrl }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: tenant.status,
    enabled: tenant.enabled,
    subscription_plan: tenant.subscription_plan
  });

  const tabs = [
    { id: 'overview', label: 'Übersicht' },
    { id: 'subscription', label: 'Vertrag & Subscription' },
    { id: 'locations', label: 'Standorte' },
    { id: 'branding', label: 'Branding' },
    { id: 'billing', label: 'Abrechnung' }
  ];

  const handleStatusUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/tenants/${tenant.tenant_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Möchten Sie den Tenant "${tenant.display_name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/tenants/${tenant.tenant_id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto ${
        theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
      }`}>
        <div className={`p-6 border-b sticky top-0 z-10 ${
          theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {tenant.display_name}
            </h2>
            <button
              onClick={onClose}
              className={`transition-colors hover:scale-110 ${
                theme === 'dark' ? 'text-gray-400 hover:text-[#c00000]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#c00000] text-white'
                    : theme === 'dark'
                    ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#333]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Tenant-Informationen
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Name (ID)</p>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.name}</p>
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Domain</p>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.domain || '-'}</p>
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                {isEditing ? (
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={`px-3 py-1 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="active">Aktiv</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Gesperrt</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                ) : (
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.status}</span>
                )}
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Plan</p>
                {isEditing ? (
                  <select
                    value={formData.subscription_plan}
                    onChange={(e) => setFormData({ ...formData, subscription_plan: e.target.value })}
                    className={`px-3 py-1 border rounded-lg focus:ring-2 focus:ring-[#c00000] focus:border-transparent ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                ) : (
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.subscription_plan}</span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Kontakt</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.contact.admin_email}</p>
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Telefon</p>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{tenant.contact.phone || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Adresse</p>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {tenant.contact.address || '-'}
                  {tenant.contact.city && `, ${tenant.contact.city}`}
                  {tenant.contact.postal_code && ` ${tenant.contact.postal_code}`}
                  {tenant.contact.country && `, ${tenant.contact.country}`}
                </p>
              </div>
            </div>
          </div>

          {/* Resource Usage */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Ressourcen-Nutzung</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Benutzer</span>
                  <span>{tenant.user_count} / {tenant.limits.max_users}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#c00000] h-2 rounded-full"
                    style={{ width: `${(tenant.user_count / tenant.limits.max_users) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Geräte</span>
                  <span>{tenant.device_count} / {tenant.limits.max_devices}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#c00000] h-2 rounded-full"
                    style={{ width: `${(tenant.device_count / tenant.limits.max_devices) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Storage</span>
                  <span>{tenant.storage_used_gb} / {tenant.limits.max_storage_gb} GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#c00000] h-2 rounded-full"
                    style={{ width: `${(tenant.storage_used_gb / tenant.limits.max_storage_gb) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>API Calls (Heute)</span>
                  <span>{tenant.api_calls_today} / {tenant.limits.max_api_calls_per_day}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-[#c00000] h-2 rounded-full"
                    style={{ width: `${(tenant.api_calls_today / tenant.limits.max_api_calls_per_day) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Zeitstempel</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Erstellt</p>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{new Date(tenant.created_at).toLocaleString('de-DE')}</p>
              </div>
              <div>
                <p className="text-gray-600">Aktualisiert</p>
                <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{new Date(tenant.updated_at).toLocaleString('de-DE')}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex gap-3 pt-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-all hover:scale-105 ${
                    theme === 'dark'
                      ? 'border-gray-700 text-gray-300 hover:bg-[#1a1a1a]'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleStatusUpdate}
                  className="flex-1 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all hover:scale-105"
                  disabled={loading}
                >
                  {loading ? 'Wird gespeichert...' : 'Speichern'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#900000] transition-all hover:scale-105"
                  disabled={loading}
                >
                  Löschen
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-all hover:scale-105 ${
                    theme === 'dark'
                      ? 'border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
                      : 'border-[#c00000] text-[#c00000] hover:bg-[#c00000]/10'
                  }`}
                >
                  Bearbeiten
                </button>
              </>
            )}
          </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="text-center py-8">
              <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Vertrag & Subscription
              </h3>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Verwalten Sie Verträge und Subscriptions für diesen Tenant.
              </p>
            </div>
          )}

          {activeTab === 'locations' && (
            <div className="text-center py-8">
              <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Standorte
              </h3>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Verwalten Sie Standorte für diesen Tenant.
              </p>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="text-center py-8">
              <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Branding
              </h3>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Konfigurieren Sie Logo, Farben und Corporate Identity für diesen Tenant.
              </p>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="text-center py-8">
              <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Abrechnung
              </h3>
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Rechnungen, Zahlungshistorie und Abrechnungseinstellungen für diesen Tenant.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantsPage;

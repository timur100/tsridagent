import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { 
  Users, 
  Shield, 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  X,
  Save,
  UserPlus,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserModal from '../components/UserModal';
import RoleModal from '../components/RoleModal';

const UsersRolesPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('users'); // users, roles, or registrations
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTenant, setFilterTenant] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isInitializingRoles, setIsInitializingRoles] = useState(false);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadRoles(),
        loadTenants(),
        loadRegistrations()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/roles/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadTenants = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tenants/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTenants(data);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const loadRegistrations = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/portal/auth/registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data);
      }
    } catch (error) {
      console.error('Error loading registrations:', error);
      // Set empty array if endpoint doesn't exist yet
      setRegistrations([]);
    }
  };

  const initializeStandardRoles = async () => {
    setIsInitializingRoles(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/roles/init-standard-roles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success(`${data.roles.length} Standard-Rollen wurden initialisiert`);
        await loadRoles();
      } else {
        toast.error('Fehler beim Initialisieren der Rollen');
      }
    } catch (error) {
      console.error('Error initializing roles:', error);
      toast.error('Fehler beim Initialisieren der Rollen');
    } finally {
      setIsInitializingRoles(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Möchten Sie diesen Benutzer wirklich löschen?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Benutzer erfolgreich gelöscht');
        await loadUsers();
      } else {
        toast.error('Fehler beim Löschen des Benutzers');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Fehler beim Löschen des Benutzers');
    }
  };

  const deleteRole = async (roleId) => {
    if (!window.confirm('Möchten Sie diese Rolle wirklich löschen?')) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Rolle erfolgreich gelöscht');
        await loadRoles();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fehler beim Löschen der Rolle');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Fehler beim Löschen der Rolle');
    }
  };

  const saveUser = async (userData) => {
    try {
      const url = selectedUser 
        ? `${BACKEND_URL}/api/users/${selectedUser.user_id}`
        : `${BACKEND_URL}/api/users/`;
      
      const method = selectedUser ? 'PUT' : 'POST';

      // Remove password if empty during edit
      const dataToSend = { ...userData };
      if (selectedUser && !dataToSend.password) {
        delete dataToSend.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        toast.success(selectedUser ? 'Benutzer aktualisiert' : 'Benutzer erstellt');
        await loadUsers();
        setShowUserModal(false);
        setSelectedUser(null);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fehler beim Speichern des Benutzers');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Fehler beim Speichern des Benutzers');
    }
  };

  const saveRole = async (roleData) => {
    try {
      const url = selectedRole 
        ? `${BACKEND_URL}/api/roles/${selectedRole.role_id}`
        : `${BACKEND_URL}/api/roles/`;
      
      const method = selectedRole ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleData)
      });

      if (response.ok) {
        toast.success(selectedRole ? 'Rolle aktualisiert' : 'Rolle erstellt');
        await loadRoles();
        setShowRoleModal(false);
        setSelectedRole(null);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Fehler beim Speichern der Rolle');
      }
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Fehler beim Speichern der Rolle');
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTenant = filterTenant === 'all' || user.tenant_ids?.includes(filterTenant);
    const matchesRole = filterRole === 'all' || user.roles?.includes(filterRole);
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesTenant && matchesRole && matchesStatus;
  });

  // Filter roles
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTenant = filterTenant === 'all' || role.tenant_id === filterTenant || role.tenant_id === null;

    return matchesSearch && matchesTenant;
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.inactive}`}>
        {status === 'active' ? 'Aktiv' : 'Inaktiv'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c00000]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Users & Roles Management
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Benutzer und Rollen systemweit
          </p>
        </div>
        <div className="flex gap-3">
          {activeSubTab === 'roles' && roles.length === 0 && (
            <button
              onClick={initializeStandardRoles}
              disabled={isInitializingRoles}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isInitializingRoles
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              <Shield className="w-4 h-4" />
              Standard-Rollen initialisieren
            </button>
          )}
          <button
            onClick={() => {
              if (activeSubTab === 'users') {
                setSelectedUser(null);
                setShowUserModal(true);
              } else {
                setSelectedRole(null);
                setShowRoleModal(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-all"
          >
            <Plus className="w-4 h-4" />
            {activeSubTab === 'users' ? 'Neuer Benutzer' : 'Neue Rolle'}
          </button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'users'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-300 hover:bg-[#2a2a2a]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Benutzer ({users.length})
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'roles'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-300 hover:bg-[#2a2a2a]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Shield className="w-4 h-4" />
          Rollen ({roles.length})
        </button>
        <button
          onClick={() => setActiveSubTab('registrations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'registrations'
              ? 'bg-[#c00000] text-white'
              : theme === 'dark'
              ? 'text-gray-300 hover:bg-[#2a2a2a]'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Registrierungen ({registrations.length})
        </button>
      </div>

      {/* Search and Filters */}
      <Card className={`p-4 rounded-xl ${
        theme === 'dark' 
          ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
          : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder={activeSubTab === 'users' ? 'Benutzer suchen...' : 'Rollen suchen...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1f1f1f] text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-200'
                } border focus:outline-none focus:border-[#c00000]`}
              />
            </div>
          </div>

          {/* Filter by Tenant */}
          <div>
            <select
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-[#1f1f1f] text-white border-gray-700'
                  : 'bg-white text-gray-900 border-gray-200'
              } border focus:outline-none focus:border-[#c00000]`}
            >
              <option value="all">Alle Tenants</option>
              {tenants.map(tenant => (
                <option key={tenant.tenant_id} value={tenant.tenant_id}>
                  {tenant.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Role or Status */}
          {activeSubTab === 'users' ? (
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1f1f1f] text-white border-gray-700'
                    : 'bg-white text-gray-900 border-gray-200'
                } border focus:outline-none focus:border-[#c00000]`}
              >
                <option value="all">Alle Status</option>
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </div>
          ) : (
            <div className="flex items-center">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterTenant('all');
                  setFilterRole('all');
                  setFilterStatus('all');
                }}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1f1f1f] text-gray-300 hover:bg-[#2a2a2a]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } transition-all`}
              >
                Filter zurücksetzen
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Content */}
      {activeSubTab === 'users' ? (
        <UsersTable 
          users={filteredUsers}
          theme={theme}
          onEdit={(user) => {
            setSelectedUser(user);
            setShowUserModal(true);
          }}
          onDelete={deleteUser}
          getStatusBadge={getStatusBadge}
          tenants={tenants}
        />
      ) : activeSubTab === 'roles' ? (
        <RolesTable
          roles={filteredRoles}
          theme={theme}
          onEdit={(role) => {
            setSelectedRole(role);
            setShowRoleModal(true);
          }}
          onDelete={deleteRole}
          tenants={tenants}
        />
      ) : (
        <RegistrationsTable
          registrations={registrations}
          theme={theme}
          onApprove={async (regId) => {
            // TODO: Implement approve
            toast.success('Registrierung genehmigt');
            await loadRegistrations();
          }}
          onReject={async (regId) => {
            // TODO: Implement reject
            toast.success('Registrierung abgelehnt');
            await loadRegistrations();
          }}
        />
      )}

      {/* User Modal */}
      <UserModal
        show={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        roles={roles}
        tenants={tenants}
        onSave={saveUser}
      />

      {/* Role Modal */}
      <RoleModal
        show={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        tenants={tenants}
        onSave={saveRole}
      />
    </div>
  );
};

// Users Table Component
const UsersTable = ({ users, theme, onEdit, onDelete, getStatusBadge, tenants }) => {
  const getTenantNames = (tenantIds) => {
    if (!tenantIds || tenantIds.length === 0) return 'Kein Tenant';
    return tenantIds.map(id => {
      const tenant = tenants.find(t => t.tenant_id === id);
      return tenant ? tenant.display_name : id;
    }).join(', ');
  };

  return (
    <Card className={`rounded-xl overflow-hidden ${
      theme === 'dark' 
        ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
        : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Benutzer</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>E-Mail</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Tenant(s)</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Rollen</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Status</th>
              <th className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Aktionen</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center">
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Keine Benutzer gefunden
                  </p>
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.user_id} className={`${
                  theme === 'dark' ? 'hover:bg-[#1f1f1f]' : 'hover:bg-gray-50'
                } transition-colors`}>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      {user.first_name && user.last_name && (
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {user.first_name} {user.last_name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {user.email}
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="text-sm">{getTenantNames(user.tenant_ids)}</div>
                  </td>
                  <td className={`px-6 py-4`}>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`px-6 py-4`}>
                    {getStatusBadge(user.status)}
                  </td>
                  <td className={`px-6 py-4 text-right`}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(user)}
                        className={`p-2 rounded-lg transition-all ${
                          theme === 'dark'
                            ? 'hover:bg-[#3a3a3a] text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(user.user_id)}
                        className={`p-2 rounded-lg transition-all ${
                          theme === 'dark'
                            ? 'hover:bg-red-900/20 text-red-400'
                            : 'hover:bg-red-50 text-red-600'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// Roles Table Component
const RolesTable = ({ roles, theme, onEdit, onDelete, tenants }) => {
  const getTenantName = (tenantId) => {
    if (!tenantId) return 'Global';
    const tenant = tenants.find(t => t.tenant_id === tenantId);
    return tenant ? tenant.display_name : tenantId;
  };

  return (
    <Card className={`rounded-xl overflow-hidden ${
      theme === 'dark' 
        ? 'bg-[#2a2a2a] border-none shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
        : 'bg-white border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
    }`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Rolle</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Beschreibung</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Tenant</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Berechtigungen</th>
              <th className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Typ</th>
              <th className={`px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>Aktionen</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {roles.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center">
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Keine Rollen gefunden. Klicken Sie auf "Standard-Rollen initialisieren".
                  </p>
                </td>
              </tr>
            ) : (
              roles.map(role => (
                <tr key={role.role_id} className={`${
                  theme === 'dark' ? 'hover:bg-[#1f1f1f]' : 'hover:bg-gray-50'
                } transition-colors`}>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <div className="font-medium">{role.name}</div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <div className="text-sm">{role.description || '-'}</div>
                  </td>
                  <td className={`px-6 py-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {getTenantName(role.tenant_id)}
                  </td>
                  <td className={`px-6 py-4`}>
                    <div className="text-sm">
                      {role.permissions?.length || 0} Berechtigungen
                    </div>
                  </td>
                  <td className={`px-6 py-4`}>
                    {role.is_system_role ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        System
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className={`px-6 py-4 text-right`}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(role)}
                        className={`p-2 rounded-lg transition-all ${
                          theme === 'dark'
                            ? 'hover:bg-[#3a3a3a] text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!role.is_system_role && (
                        <button
                          onClick={() => onDelete(role.role_id)}
                          className={`p-2 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'hover:bg-red-900/20 text-red-400'
                              : 'hover:bg-red-50 text-red-600'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default UsersRolesPage;

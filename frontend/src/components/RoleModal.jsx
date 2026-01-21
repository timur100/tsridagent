import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const AVAILABLE_PERMISSIONS = [
  'users.read', 'users.write', 'users.delete', 'users.manage',
  'roles.read', 'roles.write', 'roles.delete', 'roles.manage',
  'tenants.read', 'tenants.write', 'tenants.delete', 'tenants.manage',
  'devices.read', 'devices.write', 'devices.delete', 'devices.manage',
  'inventory.read', 'inventory.write', 'inventory.delete', 'inventory.manage',
  'tickets.read', 'tickets.write', 'tickets.delete', 'tickets.manage',
  'orders.read', 'orders.write', 'orders.delete', 'orders.manage',
  'customers.read', 'customers.write', 'customers.delete', 'customers.manage',
  'reports.read', 'reports.write', 'reports.delete', 'reports.manage',
  'analytics.read', 'analytics.write',
  'settings.read', 'settings.write', 'settings.manage',
  'security.read', 'security.write', 'security.manage',
  'audit.read', 'audit.write',
  'profile.read', 'profile.write',
  'tenant.*'
];

const RoleModal = ({ show, onClose, role, tenants, onSave }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    tenant_id: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || [],
        tenant_id: role.tenant_id || null
      });
    } else {
      setFormData({
        name: '',
        description: '',
        permissions: [],
        tenant_id: null
      });
    }
  }, [role, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name) {
      toast.error('Rollenname ist erforderlich');
      return;
    }

    if (formData.permissions.length === 0) {
      toast.error('Mindestens eine Berechtigung ist erforderlich');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const handleSelectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS
    }));
  };

  const handleClearAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  // Group permissions by category
  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
    const [category] = perm.split('.');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(perm);
    return acc;
  }, {});

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
        theme === 'dark' 
          ? 'bg-[#1f1f1f]' 
          : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#c00000]" />
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {role ? 'Rolle bearbeiten' : 'Neue Rolle'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-all ${
              theme === 'dark'
                ? 'hover:bg-[#2a2a2a] text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Grundinformationen
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Rollenname *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={role?.is_system_role}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-white border-gray-700'
                          : 'bg-white text-gray-900 border-gray-200'
                      } border focus:outline-none focus:border-[#c00000] ${
                        role?.is_system_role ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                    {role?.is_system_role && (
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        System-Rollen können nicht umbenannt werden
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Beschreibung
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-white border-gray-700'
                          : 'bg-white text-gray-900 border-gray-200'
                      } border focus:outline-none focus:border-[#c00000]`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Tenant
                    </label>
                    <select
                      value={formData.tenant_id || ''}
                      onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value || null })}
                      className={`w-full px-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-white border-gray-700'
                          : 'bg-white text-gray-900 border-gray-200'
                      } border focus:outline-none focus:border-[#c00000]`}
                    >
                      <option value="">Global (Alle Tenants)</option>
                      {Array.isArray(tenants) && tenants.map(tenant => (
                        <option key={tenant.tenant_id} value={tenant.tenant_id}>
                          {tenant.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Berechtigungen ({formData.permissions.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllPermissions}
                      className={`text-xs px-3 py-1 rounded ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Alle auswählen
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllPermissions}
                      className={`text-xs px-3 py-1 rounded ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Alle abwählen
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([category, permissions]) => (
                    <div key={category} className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'
                    }`}>
                      <h4 className={`text-sm font-semibold mb-3 capitalize ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {permissions.map(permission => (
                          <label
                            key={permission}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                              formData.permissions.includes(permission)
                                ? theme === 'dark'
                                  ? 'bg-[#c00000]/20'
                                  : 'bg-red-50'
                                : theme === 'dark'
                                ? 'hover:bg-[#3a3a3a]'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission)}
                              onChange={() => handlePermissionToggle(permission)}
                              className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                            />
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                              {permission.split('.')[1] || permission}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`flex items-center justify-end gap-3 p-6 border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg transition-all ${
                theme === 'dark'
                  ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#c00000] hover:bg-[#a00000]'
              } text-white`}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;

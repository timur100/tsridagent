import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Save, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

const UserModal = ({ show, onClose, user, roles, tenants, onSave }) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    phone: '',
    position: '',
    department: '',
    tenant_ids: [],
    roles: [],
    status: 'active'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        password: '',
        phone: user.phone || '',
        position: user.position || '',
        department: user.department || '',
        tenant_ids: user.tenant_ids || [],
        roles: user.roles || [],
        status: user.status || 'active'
      });
    } else {
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        phone: '',
        position: '',
        department: '',
        tenant_ids: [],
        roles: [],
        status: 'active'
      });
    }
  }, [user, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username || !formData.email) {
      toast.error('Benutzername und E-Mail sind erforderlich');
      return;
    }

    if (!user && !formData.password) {
      toast.error('Passwort ist erforderlich für neue Benutzer');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantToggle = (tenantId) => {
    setFormData(prev => ({
      ...prev,
      tenant_ids: prev.tenant_ids.includes(tenantId)
        ? prev.tenant_ids.filter(id => id !== tenantId)
        : [...prev.tenant_ids, tenantId]
    }));
  };

  const handleRoleToggle = (roleName) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleName)
        ? prev.roles.filter(r => r !== roleName)
        : [...prev.roles, roleName]
    }));
  };

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
            <UserPlus className="w-6 h-6 text-[#c00000]" />
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {user ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Benutzername *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                      E-Mail *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                      Vorname
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
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
                      Nachname
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-white border-gray-700'
                          : 'bg-white text-gray-900 border-gray-200'
                      } border focus:outline-none focus:border-[#c00000]`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Passwort {!user && '*'}
                    </label>
                    <input
                      type="password"
                      required={!user}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={user ? 'Leer lassen, um nicht zu ändern' : 'Mindestens 6 Zeichen'}
                      className={`w-full px-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-white border-gray-700'
                          : 'bg-white text-gray-900 border-gray-200'
                      } border focus:outline-none focus:border-[#c00000]`}
                    />
                    {user && (
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Geben Sie nur ein neues Passwort ein, wenn Sie es ändern möchten
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kontaktinformationen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                      Position
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
                      Abteilung
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-4 py-2 rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] text-white border-gray-700'
                          : 'bg-white text-gray-900 border-gray-200'
                      } border focus:outline-none focus:border-[#c00000]`}
                    >
                      <option value="active">Aktiv</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tenants */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Tenants
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tenants.map(tenant => (
                    <label
                      key={tenant.tenant_id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        formData.tenant_ids.includes(tenant.tenant_id)
                          ? theme === 'dark'
                            ? 'bg-[#c00000]/20 border-[#c00000]'
                            : 'bg-red-50 border-[#c00000]'
                          : theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 hover:bg-[#3a3a3a]'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      } border-2`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tenant_ids.includes(tenant.tenant_id)}
                        onChange={() => handleTenantToggle(tenant.tenant_id)}
                        className="w-4 h-4 text-[#c00000] rounded focus:ring-[#c00000]"
                      />
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {tenant.display_name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Rollen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roles.map(role => (
                    <label
                      key={role.role_id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        formData.roles.includes(role.name)
                          ? theme === 'dark'
                            ? 'bg-[#c00000]/20 border-[#c00000]'
                            : 'bg-red-50 border-[#c00000]'
                          : theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 hover:bg-[#3a3a3a]'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      } border-2`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role.name)}
                        onChange={() => handleRoleToggle(role.name)}
                        className="w-4 h-4 mt-1 text-[#c00000] rounded focus:ring-[#c00000]"
                      />
                      <div>
                        <span className={`font-medium block ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {role.name}
                        </span>
                        {role.description && (
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {role.description}
                          </span>
                        )}
                      </div>
                    </label>
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

export default UserModal;

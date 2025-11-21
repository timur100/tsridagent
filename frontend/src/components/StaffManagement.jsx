import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Users, Plus, Edit, Trash2, X, Save, 
  UserCheck, UserX, Briefcase, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const StaffManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffStats, setStaffStats] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'support_agent',
    specialization: [],
    max_active_tickets: 10
  });
  
  useEffect(() => {
    loadStaff();
    loadStaffStats();
  }, []);
  
  const loadStaff = async () => {
    try {
      const result = await apiCall('/api/staff');
      if (result.success) {
        setStaff(result.staff || []);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('Fehler beim Laden der Mitarbeiter');
    } finally {
      setLoading(false);
    }
  };
  
  const loadStaffStats = async () => {
    try {
      const result = await apiCall('/api/staff/tickets/by-staff');
      if (result.success && result.data) {
        setStaffStats(result.data);
      }
    } catch (error) {
      console.error('Error loading staff stats:', error);
    }
  };
  
  const handleCreate = async () => {
    try {
      if (!formData.email || !formData.name) {
        toast.error('Bitte alle Pflichtfelder ausfüllen');
        return;
      }
      
      const result = await apiCall('/api/staff', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        toast.success('Mitarbeiter erfolgreich erstellt');
        setShowCreateModal(false);
        resetForm();
        loadStaff();
        loadStaffStats();
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      toast.error('Fehler beim Erstellen des Mitarbeiters');
    }
  };
  
  const handleUpdate = async () => {
    try {
      if (!editingStaff) return;
      
      const result = await apiCall(`/api/staff/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      
      if (result.success) {
        toast.success('Mitarbeiter aktualisiert');
        setEditingStaff(null);
        resetForm();
        loadStaff();
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };
  
  const handleDeactivate = async (staffId) => {
    if (!confirm('Mitarbeiter wirklich deaktivieren?')) return;
    
    try {
      const result = await apiCall(`/api/staff/${staffId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Mitarbeiter deaktiviert');
        loadStaff();
        loadStaffStats();
      }
    } catch (error) {
      console.error('Error deactivating staff:', error);
      toast.error('Fehler beim Deaktivieren');
    }
  };
  
  const startEdit = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      role: staffMember.role,
      specialization: staffMember.specialization || [],
      max_active_tickets: staffMember.max_active_tickets
    });
  };
  
  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: 'support_agent',
      specialization: [],
      max_active_tickets: 10
    });
  };
  
  const getRoleLabel = (role) => {
    const labels = {
      support_agent: 'Support-Agent',
      support_manager: 'Support-Manager',
      admin: 'Administrator'
    };
    return labels[role] || role;
  };
  
  const getStaffTickets = (email) => {
    if (!staffStats) return null;
    return staffStats.staff_stats.find(s => s.email === email);
  };
  
  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Support-Mitarbeiter
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {staff.filter(s => s.is_active).length} aktive Mitarbeiter
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Mitarbeiter hinzufügen
        </Button>
      </div>
      
      {/* Unassigned Tickets Alert */}
      {staffStats && staffStats.unassigned_tickets > 0 && (
        <Card className={`p-4 border-l-4 border-orange-500 ${
          theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-orange-50'
        }`}>
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-orange-600" />
            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {staffStats.unassigned_tickets} nicht zugewiesene Tickets
            </p>
          </div>
        </Card>
      )}
      
      {/* Staff List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => {
          const tickets = getStaffTickets(member.email);
          
          return (
            <Card key={member.id} className={`p-5 ${
              theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
            } ${!member.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {member.name}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {member.email}
                  </p>
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                    theme === 'dark' ? 'bg-[#1a1a1a] text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {getRoleLabel(member.role)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(member)}
                    className={`p-2 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'hover:bg-[#3a3a3a] text-gray-400'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {member.is_active && (
                    <button
                      onClick={() => handleDeactivate(member.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#3a3a3a] text-red-400'
                          : 'hover:bg-gray-100 text-red-600'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Tickets Stats */}
              {tickets && (
                <div className={`mt-3 pt-3 border-t ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Aktive Tickets
                    </span>
                    <span className={`text-lg font-bold ${
                      tickets.capacity_used_percent > 80
                        ? 'text-red-600'
                        : tickets.capacity_used_percent > 60
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}>
                      {tickets.tickets.total_active} / {member.max_active_tickets}
                    </span>
                  </div>
                  
                  {/* Capacity Bar */}
                  <div className={`h-2 rounded-full overflow-hidden ${
                    theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-200'
                  }`}>
                    <div
                      className={`h-full transition-all ${
                        tickets.capacity_used_percent > 80
                          ? 'bg-red-600'
                          : tickets.capacity_used_percent > 60
                          ? 'bg-orange-600'
                          : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(tickets.capacity_used_percent, 100)}%` }}
                    />
                  </div>
                  
                  {/* Ticket Breakdown */}
                  <div className="flex gap-3 mt-3 text-xs">
                    <div>
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>Offen: </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tickets.tickets.open}
                      </span>
                    </div>
                    <div>
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>In Bearbeitung: </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tickets.tickets.in_progress}
                      </span>
                    </div>
                    <div>
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>Wartet: </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {tickets.tickets.waiting}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Status Badge */}
              <div className="mt-3">
                {member.is_active ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <UserCheck className="h-3 w-3" />
                    Aktiv
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <UserX className="h-3 w-3" />
                    Deaktiviert
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {/* Create/Edit Modal */}
      {(showCreateModal || editingStaff) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-lg ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingStaff ? 'Mitarbeiter bearbeiten' : 'Neuer Mitarbeiter'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingStaff(null);
                  resetForm();
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
            
            {/* Form */}
            <div className="p-6 space-y-4">
              {!editingStaff && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="mitarbeiter@firma.de"
                  />
                </div>
              )}
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Max Mustermann"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Rolle
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="support_agent">Support-Agent</option>
                  <option value="support_manager">Support-Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Max. aktive Tickets
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.max_active_tickets}
                  onChange={(e) => setFormData({...formData, max_active_tickets: parseInt(e.target.value)})}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className={`flex justify-end gap-3 p-6 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingStaff(null);
                  resetForm();
                }}
                variant="outline"
                className={theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
              >
                Abbrechen
              </Button>
              <Button
                onClick={editingStaff ? handleUpdate : handleCreate}
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingStaff ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;

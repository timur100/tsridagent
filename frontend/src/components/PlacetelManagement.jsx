import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Phone, Users, PhoneCall, Settings, Headphones, GitBranch, FileText, UserCircle, Plus, Edit2, Trash2, Eye, PhoneMissed, PhoneIncoming, PhoneOutgoing, Mail, MapPin, Building } from 'lucide-react';
import toast from 'react-hot-toast';

const PlacetelManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab] = useState('numbers');
  const [loading, setLoading] = useState(false);

  // Data states
  const [numbers, setNumbers] = useState([]);
  const [calls, setCalls] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [queues, setQueues] = useState([]);
  const [faxes, setFaxes] = useState([]);
  const [sipUsers, setSipUsers] = useState([]);
  const [routingPlans, setRoutingPlans] = useState([]);

  // Modal states
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callTarget, setCallTarget] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Search for numbers
  const [numberSearch, setNumberSearch] = useState('');
  const [numberStatusFilter, setNumberStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Helper to extract array from nested response
  const extractArrayData = (result) => {
    if (!result || !result.data) return [];
    if (Array.isArray(result.data)) return result.data;
    if (result.data.data && Array.isArray(result.data.data)) return result.data.data;
    return [];
  };

  const tabs = [
    { id: 'numbers', label: 'Rufnummern', icon: Phone },
    { id: 'calls', label: 'Anrufe', icon: PhoneCall },
    { id: 'contacts', label: 'Kontakte', icon: Users },
    { id: 'callcenter', label: 'Call Center', icon: Headphones },
    { id: 'routing', label: 'Routing', icon: GitBranch },
    { id: 'faxes', label: 'Faxe', icon: FileText },
    { id: 'sipusers', label: 'SIP Users', icon: UserCircle },
    { id: 'settings', label: 'Einstellungen', icon: Settings }
  ];

  // Load data functions
  const loadNumbers = async () => {
    setLoading(true);
    try {
      // Load all numbers (all pages)
      const result = await apiCall('/api/placetel/numbers?load_all=true');
      const numbersData = extractArrayData(result);
      console.log(`[Placetel] Loaded ${numbersData.length} numbers`);
      setNumbers(numbersData);
      if (numbersData.length > 0) {
        toast.success(`${numbersData.length} Rufnummern geladen`);
      }
    } catch (error) {
      console.error('[Placetel] Error loading numbers:', error);
      toast.error('Fehler beim Laden der Rufnummern');
    } finally {
      setLoading(false);
    }
  };

  const loadCalls = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await apiCall('/api/placetel/calls?per_page=50');
      const callsData = extractArrayData(result);
      setCalls(callsData);
      setLastUpdate(new Date());
      if (!silent && callsData.length > 0) {
        toast.success(`${callsData.length} Anrufe geladen`);
      }
    } catch (error) {
      console.error('[Placetel] Error loading calls:', error);
      if (!silent) {
        toast.error('Fehler beim Laden der Anrufe');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/placetel/contacts');
      setContacts(extractArrayData(result));
    } catch (error) {
      console.error('[Placetel] Error loading contacts:', error);
      toast.error('Fehler beim Laden der Kontakte');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/placetel/call_center_agents');
      setAgents(extractArrayData(result));
    } catch (error) {
      console.error('[Placetel] Error loading agents:', error);
      toast.error('Fehler beim Laden der Agents');
    } finally {
      setLoading(false);
    }
  };

  const loadQueues = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/placetel/call_center_queues');
      setQueues(extractArrayData(result));
    } catch (error) {
      console.error('[Placetel] Error loading queues:', error);
      toast.error('Fehler beim Laden der Queues');
    } finally {
      setLoading(false);
    }
  };

  const loadFaxes = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/placetel/faxes');
      setFaxes(extractArrayData(result));
    } catch (error) {
      console.error('[Placetel] Error loading faxes:', error);
      toast.error('Fehler beim Laden der Faxe');
    } finally {
      setLoading(false);
    }
  };

  const loadSipUsers = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/placetel/sip_users');
      setSipUsers(extractArrayData(result));
    } catch (error) {
      console.error('[Placetel] Error loading SIP users:', error);
      toast.error('Fehler beim Laden der SIP Users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoutingPlans = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/placetel/routing_plans');
      setRoutingPlans(extractArrayData(result));
    } catch (error) {
      console.error('[Placetel] Error loading routing plans:', error);
      toast.error('Fehler beim Laden der Routing-Pläne');
    } finally {
      setLoading(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    switch (activeTab) {
      case 'numbers':
        loadNumbers();
        break;
      case 'calls':
        loadCalls();
        setAutoRefresh(true); // Enable auto-refresh for calls
        break;
      case 'contacts':
        loadContacts();
        break;
      case 'callcenter':
        loadAgents();
        loadQueues();
        break;
      case 'routing':
        loadRoutingPlans();
        break;
      case 'faxes':
        loadFaxes();
        break;
      case 'sipusers':
        loadSipUsers();
        break;
      default:
        break;
    }
    
    // Disable auto-refresh when leaving calls tab
    if (activeTab !== 'calls') {
      setAutoRefresh(false);
    }
  }, [activeTab]);

  // Auto-refresh for calls tab
  useEffect(() => {
    let interval;
    if (autoRefresh && activeTab === 'calls') {
      interval = setInterval(() => {
        loadCalls(true); // Silent refresh
      }, 5000); // Every 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, activeTab]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCallIcon = (type) => {
    switch (type) {
      case 'inbound':
      case 'incoming':
        return <PhoneIncoming className="h-4 w-4 text-green-500" />;
      case 'outbound':
      case 'outgoing':
        return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
      case 'missed':
        return <PhoneMissed className="h-4 w-4 text-red-500" />;
      default:
        return <PhoneCall className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation - ganz oben */}
      <div className={`flex gap-2 p-2 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-gray-700'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Placetel Integration
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Telefonie-Integration und Rufnummernverwaltung
          </p>
        </div>
        <Button
          onClick={() => {
            setCallTarget('');
            setShowCallModal(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
        >
          <PhoneCall className="h-4 w-4" />
          Anruf tätigen
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'numbers' && (
        <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
          {/* Search & Filter */}
          <div className="p-4 border-b border-gray-700 space-y-3">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Rufnummer suchen..."
              value={numberSearch}
              onChange={(e) => setNumberSearch(e.target.value)}
              className={`w-full px-3 py-2 rounded border text-sm ${
                theme === 'dark'
                  ? 'bg-[#1f1f1f] border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            
            {/* Status Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setNumberStatusFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  numberStatusFilter === 'all'
                    ? 'bg-[#c00000] text-white'
                    : theme === 'dark'
                    ? 'bg-[#1f1f1f] text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Alle ({numbers.length})
              </button>
              <button
                onClick={() => setNumberStatusFilter('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  numberStatusFilter === 'active'
                    ? 'bg-[#c00000] text-white'
                    : theme === 'dark'
                    ? 'bg-[#1f1f1f] text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Aktiv ({numbers.filter(n => n.activated).length})
              </button>
              <button
                onClick={() => setNumberStatusFilter('inactive')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  numberStatusFilter === 'inactive'
                    ? 'bg-[#c00000] text-white'
                    : theme === 'dark'
                    ? 'bg-[#1f1f1f] text-gray-400 hover:bg-gray-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inaktiv ({numbers.filter(n => !n.activated).length})
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nummer
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Typ
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Land
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </th>
                  <th className={`px-6 py-4 text-right text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                      </div>
                    </td>
                  </tr>
                ) : (() => {
                  const filteredNumbers = numbers.filter(number => {
                    // Search filter
                    const matchesSearch = !numberSearch || 
                      number.number?.toLowerCase().includes(numberSearch.toLowerCase()) ||
                      number.type?.toLowerCase().includes(numberSearch.toLowerCase());
                    
                    // Status filter
                    const matchesStatus = 
                      numberStatusFilter === 'all' ||
                      (numberStatusFilter === 'active' && number.activated) ||
                      (numberStatusFilter === 'inactive' && !number.activated);
                    
                    return matchesSearch && matchesStatus;
                  });
                  
                  if (filteredNumbers.length === 0) {
                    return (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <Phone className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {numbers.length === 0 ? 'Keine Rufnummern gefunden' : 'Keine Rufnummern entsprechen der Suche'}
                          </p>
                        </td>
                      </tr>
                    );
                  }
                  
                  return filteredNumbers.map((number) => (
                    <tr
                      key={number.id}
                      className={`border-t cursor-pointer ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold">
                          {number.number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{number.type || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{number.country || 'DE'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${
                          number.activated ? 'bg-green-500' : 'bg-gray-500'
                        }`}>
                          {number.activated ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (number.activated) {
                                const newStatus = !number.activated;
                                try {
                                  setLoading(true);
                                  await apiCall(`/api/placetel/numbers/${number.id}/activate`, {
                                    method: 'POST'
                                  });
                                  toast.success(newStatus ? 'Nummer aktiviert' : 'Nummer deaktiviert');
                                  loadNumbers();
                                } catch (error) {
                                  console.error('Error toggling number:', error);
                                  toast.error('Fehler beim Ändern des Status');
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              number.activated 
                                ? theme === 'dark' ? 'hover:bg-gray-700 text-green-500' : 'hover:bg-gray-200 text-green-600'
                                : theme === 'dark' ? 'hover:bg-gray-700 text-gray-500' : 'hover:bg-gray-200 text-gray-400'
                            }`}
                            title={number.activated ? 'Deaktivieren' : 'Aktivieren'}
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'calls' && (
        <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Typ
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Von
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Zu
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dauer
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                      </div>
                    </td>
                  </tr>
                ) : calls.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <PhoneCall className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Keine Anrufe gefunden
                      </p>
                    </td>
                  </tr>
                ) : (
                  calls.map((call, index) => (
                    <tr
                      key={call.id || index}
                      className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getCallIcon(call.direction)}
                          <span className="font-mono text-sm capitalize">{call.direction || call.status || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{call.from || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{call.to || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{call.duration || '0'}s</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{formatDate(call.start_time || call.end_time)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingContact(null);
                setShowContactModal(true);
              }}
              className="bg-[#c00000] hover:bg-[#a00000] text-white flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Kontakt hinzufügen
            </Button>
          </div>
          <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                    <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Name
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Firma
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Telefon
                    </th>
                    <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      E-Mail
                    </th>
                    <th className={`px-6 py-4 text-right text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                        </div>
                      </td>
                    </tr>
                  ) : contacts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <Users className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Keine Kontakte gefunden
                        </p>
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact) => (
                      <tr
                        key={contact.id}
                        className={`border-t cursor-pointer ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-mono text-sm">
                            <div className="font-semibold">
                              {contact.first_name} {contact.last_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">{contact.company || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{contact.phone || contact.phone_work || contact.mobile || contact.mobile_work || '-'}</span>
                            {(contact.phone || contact.phone_work || contact.mobile || contact.mobile_work) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCallTarget(contact.phone || contact.phone_work || contact.mobile || contact.mobile_work);
                                  setShowCallModal(true);
                                }}
                                className={`p-1 rounded transition-colors text-green-600 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                                title="Anrufen"
                              >
                                <PhoneCall className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm">{contact.email || contact.email_work || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingContact(contact);
                                setShowContactModal(true);
                              }}
                              className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                              title="Bearbeiten"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm(`Möchten Sie den Kontakt "${contact.first_name} ${contact.last_name}" wirklich löschen?`)) {
                                  try {
                                    setLoading(true);
                                    await apiCall(`/api/placetel/contacts/${contact.id}`, {
                                      method: 'DELETE'
                                    });
                                    toast.success('Kontakt erfolgreich gelöscht');
                                    loadContacts();
                                  } catch (error) {
                                    console.error('Error deleting contact:', error);
                                    toast.error('Fehler beim Löschen des Kontakts');
                                  } finally {
                                    setLoading(false);
                                  }
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors text-red-500 ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                              title="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </div>
      )}

      {activeTab === 'callcenter' && (
        <div className="space-y-6">
          {/* Agents */}
          <div>
            <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Agents
            </h3>
            <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Name
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Typ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                          </div>
                        </td>
                      </tr>
                    ) : agents.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <Headphones className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Keine Agents gefunden
                          </p>
                        </td>
                      </tr>
                    ) : (
                      agents.map((agent) => (
                        <tr
                          key={agent.id}
                          className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                        >
                          <td className="px-6 py-4">
                            <div className="font-mono text-sm">
                              <div className="font-semibold">{agent.name}</div>
                              {agent.description && (
                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {agent.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${
                              agent.status === 'online' ? 'bg-green-500' : 'bg-gray-500'
                            }`}>
                              {agent.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                              agent.agent_type === 'Supervisor' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {agent.agent_type || '-'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Queues */}
          <div>
            <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Warteschlangen
            </h3>
            <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Name
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Routing Objekte
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Priorität
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                          </div>
                        </td>
                      </tr>
                    ) : queues.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-6 py-12 text-center">
                          <Headphones className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Keine Queues gefunden
                          </p>
                        </td>
                      </tr>
                    ) : (
                      queues.map((queue) => (
                        <tr
                          key={queue.id}
                          className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                        >
                          <td className="px-6 py-4">
                            <div className="font-mono text-sm">
                              <div className="font-semibold">{queue.name}</div>
                              {queue.description && (
                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {queue.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{queue.routing_object_counts || 0}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{queue.priority || 0}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'routing' && (
        <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    DID
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Klingelt für
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                      </div>
                    </td>
                  </tr>
                ) : routingPlans.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center">
                      <GitBranch className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Keine Routing-Pläne gefunden
                      </p>
                    </td>
                  </tr>
                ) : (
                  routingPlans.map((plan) => (
                    <tr
                      key={plan.id}
                      className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm">
                          <div className="font-semibold">{plan.name}</div>
                          {plan.description && (
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                              {plan.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{plan.did || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm">
                          {plan.rings_for && plan.rings_for.length > 0 ? (
                            <div className="space-y-1">
                              {plan.rings_for.slice(0, 3).map((num, i) => (
                                <div key={i} className="text-xs">{num}</div>
                              ))}
                              {plan.rings_for.length > 3 && (
                                <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                  +{plan.rings_for.length - 3} weitere
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'faxes' && (
        <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Typ
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nummern
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Seiten
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                      </div>
                    </td>
                  </tr>
                ) : faxes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <FileText className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Keine Faxe gefunden
                      </p>
                    </td>
                  </tr>
                ) : (
                  faxes.map((fax) => (
                    <tr
                      key={fax.id}
                      className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {fax.type === 'inbound' ? (
                            <PhoneIncoming className="h-4 w-4 text-green-500" />
                          ) : (
                            <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-mono text-sm capitalize">{fax.type || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm">
                          <div>Von: {fax.from_number || '-'}</div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                            Zu: {fax.to_number || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{fax.pages || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{formatDate(fax.created_at)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'sipusers' && (
        <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    SIP ID
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Rufnummer
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Typ
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]"></div>
                      </div>
                    </td>
                  </tr>
                ) : sipUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <UserCircle className={`h-12 w-12 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Keine SIP Users gefunden
                      </p>
                    </td>
                  </tr>
                ) : (
                  sipUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-t ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/70' : 'border-gray-700 hover:bg-gray-100'} transition-colors`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm">
                          <div className="font-semibold">{user.name}</div>
                          {user.description && (
                            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                              {user.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{user.sipuid || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-500" />
                          <span className="font-mono text-sm font-semibold">
                            {user.callerid || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${
                          user.type === 'blf' 
                            ? 'bg-blue-100 text-blue-800' 
                            : user.type === 'sip'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.type?.toUpperCase() || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${
                          user.online ? 'bg-green-500' : 'bg-gray-500'
                        }`}>
                          {user.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}`}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Einstellungen
              </h2>
            </div>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  API Konfiguration
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Base URL
                    </label>
                    <input
                      type="text"
                      value="https://api.placetel.de/v2/"
                      readOnly
                      className={`w-full mt-1 px-3 py-2 rounded border text-sm font-mono ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 text-gray-300'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      API Key
                    </label>
                    <input
                      type="password"
                      value="de1636b285181b054e5871e25aae99d9ac24c018c177d504010246e964a2b327d20a416f598ecf78525605cf19d281a8c12819c82ae1913935a4a90217aa33aa"
                      readOnly
                      className={`w-full mt-1 px-3 py-2 rounded border text-sm font-mono ${
                        theme === 'dark'
                          ? 'bg-[#2a2a2a] border-gray-700 text-gray-300'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    />
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'}`}>
                <h3 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Webhooks & Subscriptions
                </h3>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Webhook-Subscriptions für Events wie eingehende/ausgehende Anrufe, CTI Events
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Click-to-Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} rounded-lg p-6 w-full max-w-md mx-4`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Anruf tätigen
              </h2>
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setCallTarget('');
                }}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const sipuid = formData.get('sipuid');
              const target = formData.get('target');
              const fromName = formData.get('from_name');

              try {
                setLoading(true);
                await apiCall('/api/placetel/calls', {
                  method: 'POST',
                  body: JSON.stringify({
                    sipuid,
                    target,
                    from_name: fromName || undefined
                  })
                });
                toast.success('Anruf wird eingeleitet...');
                setShowCallModal(false);
                setCallTarget('');
              } catch (error) {
                console.error('Error initiating call:', error);
                toast.error('Fehler beim Einleiten des Anrufs');
              } finally {
                setLoading(false);
              }
            }}>
              <div className="space-y-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    SIP User ID *
                  </label>
                  <input
                    type="text"
                    name="sipuid"
                    required
                    placeholder="z.B. 777c..."
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                    Die SIP User ID finden Sie im "SIP Users" Tab
                  </p>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ziel-Nummer *
                  </label>
                  <input
                    type="tel"
                    name="target"
                    required
                    defaultValue={callTarget}
                    placeholder="+49..."
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Anzeigename (optional)
                  </label>
                  <input
                    type="text"
                    name="from_name"
                    placeholder="Ihr Name"
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCallModal(false);
                    setCallTarget('');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {loading ? 'Ruft an...' : 'Anrufen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl mx-4`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingContact ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}
              </h2>
              <button
                onClick={() => {
                  setShowContactModal(false);
                  setEditingContact(null);
                }}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const contactData = {
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                company: formData.get('company'),
                phone: formData.get('phone'),
                phone_work: formData.get('phone_work'),
                mobile: formData.get('mobile'),
                mobile_work: formData.get('mobile_work'),
                email: formData.get('email'),
                email_work: formData.get('email_work'),
                address: formData.get('address'),
                address_work: formData.get('address_work'),
                fax: formData.get('fax'),
                fax_work: formData.get('fax_work')
              };

              try {
                setLoading(true);
                if (editingContact) {
                  await apiCall(`/api/placetel/contacts/${editingContact.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(contactData)
                  });
                  toast.success('Kontakt erfolgreich aktualisiert');
                } else {
                  await apiCall('/api/placetel/contacts', {
                    method: 'POST',
                    body: JSON.stringify(contactData)
                  });
                  toast.success('Kontakt erfolgreich erstellt');
                }
                setShowContactModal(false);
                setEditingContact(null);
                loadContacts();
              } catch (error) {
                console.error('Error saving contact:', error);
                toast.error('Fehler beim Speichern des Kontakts');
              } finally {
                setLoading(false);
              }
            }}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Vorname *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    defaultValue={editingContact?.first_name || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nachname
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    defaultValue={editingContact?.last_name || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Firma
                  </label>
                  <input
                    type="text"
                    name="company"
                    defaultValue={editingContact?.company || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Telefon Privat
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    defaultValue={editingContact?.phone || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Telefon Geschäftlich
                  </label>
                  <input
                    type="tel"
                    name="phone_work"
                    defaultValue={editingContact?.phone_work || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mobil Privat
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    defaultValue={editingContact?.mobile || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Mobil Geschäftlich
                  </label>
                  <input
                    type="tel"
                    name="mobile_work"
                    defaultValue={editingContact?.mobile_work || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    E-Mail Privat
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingContact?.email || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    E-Mail Geschäftlich
                  </label>
                  <input
                    type="email"
                    name="email_work"
                    defaultValue={editingContact?.email_work || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Adresse Privat
                  </label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={editingContact?.address || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Adresse Geschäftlich
                  </label>
                  <input
                    type="text"
                    name="address_work"
                    defaultValue={editingContact?.address_work || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Fax Privat
                  </label>
                  <input
                    type="tel"
                    name="fax"
                    defaultValue={editingContact?.fax || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Fax Geschäftlich
                  </label>
                  <input
                    type="tel"
                    name="fax_work"
                    defaultValue={editingContact?.fax_work || ''}
                    className={`w-full px-3 py-2 rounded border text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1f1f1f] border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactModal(false);
                    setEditingContact(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg font-medium bg-[#c00000] hover:bg-[#a00000] text-white transition-colors disabled:opacity-50"
                >
                  {loading ? 'Speichert...' : editingContact ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacetelManagement;
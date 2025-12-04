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

  const loadCalls = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/placetel/calls');
      setCalls(extractArrayData(result));
    } catch (error) {
      console.error('[Placetel] Error loading calls:', error);
      toast.error('Fehler beim Laden der Anrufe');
    } finally {
      setLoading(false);
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
  }, [activeTab]);

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
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                            title="Details"
                          >
                            <Eye className="h-4 w-4" />
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
                          <span className="font-mono text-sm">{contact.phone || contact.phone_work || contact.mobile || contact.mobile_work || '-'}</span>
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
                        Queue
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
                        Wartende Anrufe
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Verfügbare Agents
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
                            <span className="font-mono text-sm font-semibold">{queue.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{queue.waiting_calls || 0}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm">{queue.available_agents || 0}</span>
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
                        <span className="font-mono text-sm font-semibold">{plan.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{plan.type || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-white ${
                          plan.active ? 'bg-green-500' : 'bg-gray-500'
                        }`}>
                          {plan.active ? 'Aktiv' : 'Inaktiv'}
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

      {activeTab === 'faxes' && (
        <Card className={`border ${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-700'}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-700'}`}>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Richtung
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-mono font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Von/Zu
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
                        <span className="font-mono text-sm capitalize">{fax.direction || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{fax.number || '-'}</span>
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
    </div>
  );
};

export default PlacetelManagement;
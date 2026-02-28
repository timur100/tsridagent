import React, { useState, useEffect, useCallback } from 'react';
import { 
  Headphones, Plus, Clock, CheckCircle, AlertTriangle, 
  User, MapPin, Monitor, RefreshCw, Filter, Search,
  ChevronRight, MessageSquare, Tag, Building, Wrench,
  Wifi, Code, HelpCircle, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const TechnicalHelpdesk = () => {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [agentName, setAgentName] = useState('Support Agent');
  const [agentId, setAgentId] = useState('agent-1');

  // New ticket form state
  const [newTicket, setNewTicket] = useState({
    tenant_id: '',
    tenant_name: '',
    location_code: '',
    location_name: '',
    device_id: '',
    category_id: '',
    category_name: '',
    priority: 'medium',
    subject: '',
    description: '',
    reporter_name: ''
  });

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    try {
      let url = `${BACKEND_URL}/api/helpdesk/tickets?limit=100`;
      if (filterStatus !== 'all') url += `&status=${filterStatus}`;
      if (filterPriority !== 'all') url += `&priority=${filterPriority}`;
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  }, [filterStatus, filterPriority]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/categories`);
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTickets(), fetchCategories()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTickets, fetchCategories]);

  // Refresh on filter change
  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterPriority, fetchTickets]);

  // Create ticket
  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.category_id) {
      toast.error('Bitte Betreff und Kategorie ausfüllen');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicket)
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Ticket ${data.ticket_number} erstellt`);
        setShowNewTicketForm(false);
        setNewTicket({
          tenant_id: '',
          tenant_name: '',
          location_code: '',
          location_name: '',
          device_id: '',
          category_id: '',
          category_name: '',
          priority: 'medium',
          subject: '',
          description: '',
          reporter_name: ''
        });
        fetchTickets();
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Tickets');
    }
  };

  // Update ticket status
  const updateTicketStatus = async (ticketId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/helpdesk/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: status,
          assigned_to_id: agentId,
          assigned_to_name: agentName
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Status aktualisiert');
        setSelectedTicket(data.ticket);
        fetchTickets();
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Priority badge
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50"><ArrowUp className="w-3 h-3 mr-1" />Kritisch</Badge>;
      case 'high':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50"><ArrowUp className="w-3 h-3 mr-1" />Hoch</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><Minus className="w-3 h-3 mr-1" />Mittel</Badge>;
      case 'low':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50"><ArrowDown className="w-3 h-3 mr-1" />Niedrig</Badge>;
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  // Status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Offen</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">In Bearbeitung</Badge>;
      case 'resolved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Gelöst</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">Geschlossen</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Category icon
  const getCategoryIcon = (icon) => {
    switch (icon) {
      case 'monitor': return <Monitor className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      case 'wifi': return <Wifi className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  // Filter tickets by search
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_number?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query) ||
      ticket.tenant_name?.toLowerCase().includes(query) ||
      ticket.location_name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Header */}
      <div className="bg-[#1a1a1a] border-b border-[#333] px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Headphones className="w-8 h-8 text-[#d50c2d]" />
            <div>
              <h1 className="text-2xl font-bold">Technical Helpdesk</h1>
              <p className="text-gray-400 text-sm">Support & Ticketing</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-lg">
              <span className="text-blue-400 font-bold">{tickets.filter(t => t.status === 'open').length}</span>
              <span className="text-blue-400/70 text-sm">Offen</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1.5 rounded-lg">
              <span className="text-yellow-400 font-bold">{tickets.filter(t => t.status === 'in_progress').length}</span>
              <span className="text-yellow-400/70 text-sm">In Bearbeitung</span>
            </div>
            
            <Button 
              className="bg-[#d50c2d] hover:bg-[#b80a28]"
              onClick={() => setShowNewTicketForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Neues Ticket
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchTickets}
              className="border-[#444]"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] border-b border-[#333] px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Filter:</span>
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#262626] border border-[#444] rounded px-3 py-1.5 text-sm"
          >
            <option value="all">Alle Status</option>
            <option value="open">Offen</option>
            <option value="in_progress">In Bearbeitung</option>
            <option value="resolved">Gelöst</option>
            <option value="closed">Geschlossen</option>
          </select>

          <select 
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#262626] border border-[#444] rounded px-3 py-1.5 text-sm"
          >
            <option value="all">Alle Prioritäten</option>
            <option value="critical">Kritisch</option>
            <option value="high">Hoch</option>
            <option value="medium">Mittel</option>
            <option value="low">Niedrig</option>
          </select>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche nach Ticket-Nr., Betreff..."
                className="pl-10 bg-[#262626] border-[#444]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-160px)]">
        {/* Ticket List */}
        <div className="w-1/3 border-r border-[#333] overflow-y-auto">
          <div className="p-4">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Laden...</div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((ticket) => (
                  <Card 
                    key={ticket.ticket_id}
                    className={`
                      bg-[#1a1a1a] border-[#333] p-4 cursor-pointer transition-all
                      hover:border-[#d50c2d]/50
                      ${selectedTicket?.ticket_id === ticket.ticket_id ? 'border-[#d50c2d] ring-1 ring-[#d50c2d]' : ''}
                    `}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm text-[#d50c2d]">{ticket.ticket_number}</span>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <div className="font-bold mb-2 line-clamp-1">{ticket.subject}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <Building className="w-3 h-3" />
                      {ticket.tenant_name || 'Unbekannt'}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {getCategoryIcon(categories.find(c => c.category_id === ticket.category_id)?.icon)}
                        <span>{ticket.category_name}</span>
                      </div>
                      {getStatusBadge(ticket.status)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {formatTime(ticket.created_at)}
                    </div>
                  </Card>
                ))}
                
                {filteredTickets.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Headphones className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    Keine Tickets gefunden
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedTicket ? (
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-lg text-[#d50c2d]">{selectedTicket.ticket_number}</span>
                    {getPriorityBadge(selectedTicket.priority)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  <h2 className="text-2xl font-bold">{selectedTicket.subject}</h2>
                </div>
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="bg-[#1a1a1a] border-[#333] p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Building className="w-4 h-4" />
                    Tenant
                  </div>
                  <div className="font-bold">{selectedTicket.tenant_name || '-'}</div>
                </Card>
                <Card className="bg-[#1a1a1a] border-[#333] p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <MapPin className="w-4 h-4" />
                    Standort
                  </div>
                  <div className="font-bold">{selectedTicket.location_name || '-'}</div>
                </Card>
                <Card className="bg-[#1a1a1a] border-[#333] p-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Tag className="w-4 h-4" />
                    Kategorie
                  </div>
                  <div className="font-bold flex items-center gap-2">
                    {getCategoryIcon(categories.find(c => c.category_id === selectedTicket.category_id)?.icon)}
                    {selectedTicket.category_name}
                  </div>
                </Card>
              </div>

              {/* Description */}
              <Card className="bg-[#1a1a1a] border-[#333] p-4 mb-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Beschreibung
                </h3>
                <div className="text-gray-300 whitespace-pre-wrap">
                  {selectedTicket.description || 'Keine Beschreibung'}
                </div>
              </Card>

              {/* Assigned To */}
              {selectedTicket.assigned_to_name && (
                <Card className="bg-blue-500/10 border-blue-500/30 p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-sm text-blue-400">Zugewiesen an</div>
                      <div className="font-bold">{selectedTicket.assigned_to_name}</div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Resolution */}
              {selectedTicket.resolution && (
                <Card className="bg-green-500/10 border-green-500/30 p-4 mb-6">
                  <h3 className="font-bold mb-2 text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Lösung
                  </h3>
                  <div className="text-gray-300">{selectedTicket.resolution}</div>
                </Card>
              )}

              {/* Timestamps */}
              <Card className="bg-[#1a1a1a] border-[#333] p-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Erstellt:</span>
                    <span className="ml-2">{formatTime(selectedTicket.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Aktualisiert:</span>
                    <span className="ml-2">{formatTime(selectedTicket.updated_at)}</span>
                  </div>
                  {selectedTicket.resolved_at && (
                    <div>
                      <span className="text-gray-400">Gelöst:</span>
                      <span className="ml-2">{formatTime(selectedTicket.resolved_at)}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                {selectedTicket.status === 'open' && (
                  <Button 
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => updateTicketStatus(selectedTicket.ticket_id, 'in_progress')}
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    Bearbeitung starten
                  </Button>
                )}
                {selectedTicket.status === 'in_progress' && (
                  <>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => updateTicketStatus(selectedTicket.ticket_id, 'resolved')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Als gelöst markieren
                    </Button>
                  </>
                )}
                {selectedTicket.status === 'resolved' && (
                  <Button 
                    className="flex-1 bg-gray-600 hover:bg-gray-700"
                    onClick={() => updateTicketStatus(selectedTicket.ticket_id, 'closed')}
                  >
                    Ticket schließen
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Headphones className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Wählen Sie ein Ticket aus der Liste</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-[#1a1a1a] border-[#333] p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#d50c2d]" />
              Neues Ticket erstellen
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Betreff *</label>
                <Input 
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  placeholder="Kurze Beschreibung des Problems"
                  className="bg-[#262626] border-[#444]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kategorie *</label>
                  <select 
                    value={newTicket.category_id}
                    onChange={(e) => {
                      const cat = categories.find(c => c.category_id === e.target.value);
                      setNewTicket({
                        ...newTicket, 
                        category_id: e.target.value,
                        category_name: cat?.name || ''
                      });
                    }}
                    className="w-full bg-[#262626] border border-[#444] rounded px-3 py-2"
                  >
                    <option value="">Kategorie wählen...</option>
                    {categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Priorität</label>
                  <select 
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                    className="w-full bg-[#262626] border border-[#444] rounded px-3 py-2"
                  >
                    <option value="low">Niedrig</option>
                    <option value="medium">Mittel</option>
                    <option value="high">Hoch</option>
                    <option value="critical">Kritisch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tenant</label>
                  <Input 
                    value={newTicket.tenant_name}
                    onChange={(e) => setNewTicket({...newTicket, tenant_name: e.target.value})}
                    placeholder="z.B. Europcar"
                    className="bg-[#262626] border-[#444]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Standort</label>
                  <Input 
                    value={newTicket.location_name}
                    onChange={(e) => setNewTicket({...newTicket, location_name: e.target.value})}
                    placeholder="z.B. Berlin Hauptbahnhof"
                    className="bg-[#262626] border-[#444]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Beschreibung</label>
                <textarea 
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Detaillierte Beschreibung des Problems..."
                  rows={4}
                  className="w-full bg-[#262626] border border-[#444] rounded px-3 py-2 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Melder</label>
                <Input 
                  value={newTicket.reporter_name}
                  onChange={(e) => setNewTicket({...newTicket, reporter_name: e.target.value})}
                  placeholder="Name des Melders"
                  className="bg-[#262626] border-[#444]"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button 
                variant="outline"
                className="flex-1 border-[#444]"
                onClick={() => setShowNewTicketForm(false)}
              >
                Abbrechen
              </Button>
              <Button 
                className="flex-1 bg-[#d50c2d] hover:bg-[#b80a28]"
                onClick={createTicket}
              >
                Ticket erstellen
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TechnicalHelpdesk;

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Ticket, Plus, MessageSquare, X, AlertCircle, Clock, 
  CheckCircle, AlertTriangle, Send, MapPin, Monitor, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import TicketDetailModal from './TicketDetailModal';

const CustomerTickets = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
    avgResolutionTime: 0 // in hours
  });
  const [statusFilter, setStatusFilter] = useState(null); // null means 'all'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('technical');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  
  // Dropdown data
  const [locations, setLocations] = useState([]);
  const [devices, setDevices] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  
  // Search filters
  const [locationSearch, setLocationSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  
  // Refs for click outside detection
  const locationDropdownRef = useRef(null);
  const deviceDropdownRef = useRef(null);
  
  // Location pre-filters
  const [continentFilter, setContinentFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  
  // Comment state
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchLocations();
    fetchDevices();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTickets, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Use setTimeout to allow click events to complete first
      setTimeout(() => {
        if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
          setShowLocationDropdown(false);
        }
        if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target)) {
          setShowDeviceDropdown(false);
        }
      }, 100);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter devices when location is selected
  useEffect(() => {
    if (selectedLocationId) {
      // Filter devices by location code (selectedLocationId is main_code)
      const filtered = allDevices.filter(device => 
        device.locationcode === selectedLocationId || device.location_code === selectedLocationId
      );
      setDevices(filtered);
      // Reset device selection if current device is not in filtered list
      if (selectedDeviceId && !filtered.find(d => d.device_id === selectedDeviceId)) {
        setSelectedDeviceId('');
      }
    } else {
      setDevices(allDevices);
    }
  }, [selectedLocationId, allDevices, selectedDeviceId]);

  const calculateStats = (ticketsList) => {
    const newStats = {
      open: 0,
      in_progress: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      avgResolutionTime: 0
    };
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    ticketsList.forEach(ticket => {
      const status = ticket.status;
      if (status === 'new' || status === 'open' || status === 'accepted') {
        newStats.open++;
      } else if (status === 'in_progress') {
        newStats.in_progress++;
      } else if (status === 'waiting') {
        newStats.waiting++;
      } else if (status === 'resolved') {
        newStats.resolved++;
        // Calculate resolution time
        if (ticket.created_at && ticket.resolved_at) {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.resolved_at);
          const hours = (resolved - created) / (1000 * 60 * 60);
          totalResolutionTime += hours;
          resolvedCount++;
        }
      } else if (status === 'closed') {
        newStats.closed++;
        // Calculate resolution time for closed tickets too
        if (ticket.created_at && (ticket.resolved_at || ticket.closed_at)) {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.resolved_at || ticket.closed_at);
          const hours = (resolved - created) / (1000 * 60 * 60);
          totalResolutionTime += hours;
          resolvedCount++;
        }
      }
    });
    
    // Calculate average resolution time
    if (resolvedCount > 0) {
      newStats.avgResolutionTime = Math.round(totalResolutionTime / resolvedCount);
    }
    
    setStats(newStats);
  };

  const fetchTickets = async () => {
    try {
      const result = await apiCall('/api/tickets');
      if (result.success && result.data) {
        const ticketsData = result.data.tickets || [];
        setTickets(ticketsData);
        calculateStats(ticketsData);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const result = await apiCall('/api/portal/customer-data/europcar-stations');
      if (result.success && result.data) {
        setLocations(result.data.stations || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const result = await apiCall('/api/portal/europcar-devices');
      if (result.success && result.data) {
        // Handle double-wrapped response
        const responseData = result.data.data || result.data;
        const deviceList = responseData.devices || [];
        setAllDevices(deviceList);
        setDevices(deviceList);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!title || !description) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      const result = await apiCall('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          priority,
          category,
          location_id: selectedLocationId || null,
          device_id: selectedDeviceId || null
        })
      });

      if (result.success) {
        toast.success('Ticket erfolgreich erstellt');
        setShowCreateModal(false);
        resetCreateForm();
        fetchTickets();
      } else {
        toast.error(result.data?.message || 'Fehler beim Erstellen');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Fehler beim Erstellen des Tickets');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Bitte geben Sie einen Kommentar ein');
      return;
    }

    setAddingComment(true);
    try {
      const result = await apiCall(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          comment: newComment,
          internal: false
        })
      });

      if (result.success) {
        toast.success('Kommentar hinzugefügt');
        setNewComment('');
        
        // Reload ticket details
        const ticketResult = await apiCall(`/api/tickets/${selectedTicket.id}`);
        if (ticketResult.success && ticketResult.data) {
          setSelectedTicket(ticketResult.data.ticket);
        }
        
        fetchTickets();
      } else {
        toast.error('Fehler beim Hinzufügen des Kommentars');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Fehler beim Hinzufügen des Kommentars');
    } finally {
      setAddingComment(false);
    }
  };

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('technical');
    setSelectedLocationId('');
    setSelectedDeviceId('');
    setLocationSearch('');
    setDeviceSearch('');
    setContinentFilter('');
    setCountryFilter('');
    setCityFilter('');
  };

  // Get unique values for filters
  const continents = [...new Set(locations.map(loc => loc.kontinent || loc.continent).filter(Boolean))].sort();
  const countries = [...new Set(
    locations
      .filter(loc => !continentFilter || (loc.kontinent === continentFilter || loc.continent === continentFilter))
      .map(loc => loc.land || loc.country)
      .filter(Boolean)
  )].sort();
  const cities = [...new Set(
    locations
      .filter(loc => {
        const locContinent = loc.kontinent || loc.continent;
        const locCountry = loc.land || loc.country;
        if (continentFilter && locContinent !== continentFilter) return false;
        if (countryFilter && locCountry !== countryFilter) return false;
        return true;
      })
      .map(loc => loc.city || loc.stadt || loc.ort)
      .filter(Boolean)
  )].sort();

  // Filter locations based on pre-filters
  const getFilteredLocations = () => {
    return locations.filter(loc => {
      const locContinent = loc.kontinent || loc.continent;
      const locCountry = loc.land || loc.country;
      const locCity = loc.city || loc.stadt || loc.ort;
      
      // Pre-filters
      if (continentFilter && locContinent !== continentFilter) return false;
      if (countryFilter && locCountry !== countryFilter) return false;
      if (cityFilter && locCity !== cityFilter) return false;
      
      // Search filter - check ALL fields
      if (locationSearch) {
        const search = locationSearch.toLowerCase();
        return (
          loc.stationsname?.toLowerCase().includes(search) ||
          loc.name?.toLowerCase().includes(search) ||
          loc.main_code?.toLowerCase().includes(search) ||
          loc.str?.toLowerCase().includes(search) ||
          loc.street?.toLowerCase().includes(search) ||
          loc.strasse?.toLowerCase().includes(search) ||
          locCity?.toLowerCase().includes(search) ||
          loc.postal_code?.toLowerCase().includes(search) ||
          loc.plz?.toLowerCase().includes(search) ||
          loc.zip?.toLowerCase().includes(search) ||
          locCountry?.toLowerCase().includes(search) ||
          // Auch Adresse als Ganzes durchsuchen
          `${loc.str || loc.street || ''} ${loc.plz || loc.postal_code || ''} ${locCity || ''}`.toLowerCase().includes(search)
        );
      }
      
      return true;
    });
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

  const getCategoryLabel = (category) => {
    const labels = {
      technical: 'Technisch',
      billing: 'Abrechnung',
      general: 'Allgemein',
      hardware: 'Hardware',
      software: 'Software'
    };
    return labels[category] || category;
  };

  const openTicketDetails = async (ticket) => {
    try {
      // Fetch full ticket details
      const result = await apiCall(`/api/tickets/${ticket.id}`);
      if (result.success && result.data) {
        setSelectedTicket(result.data.ticket);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      toast.error('Fehler beim Laden der Ticket-Details');
    }
  };

  const handleFilterClick = (filter) => {
    // Toggle filter: if same filter clicked, deselect it
    setStatusFilter(statusFilter === filter ? null : filter);
  };

  // Filter tickets based on status and search query
  const getFilteredTickets = () => {
    let filtered = tickets;
    
    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(ticket => {
        const status = ticket.status;
        
        switch (statusFilter) {
          case 'open':
            return status === 'new' || status === 'open' || status === 'accepted';
          case 'in_progress':
            return status === 'in_progress';
          case 'waiting':
            return status === 'waiting';
          case 'resolved':
            return status === 'resolved';
          case 'closed':
            return status === 'closed';
          default:
            return true;
        }
      });
    }
    
    // Apply search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter(ticket => {
        // Search in ticket number
        if (ticket.ticket_number?.toLowerCase().includes(query)) return true;
        
        // Search in title
        if (ticket.title?.toLowerCase().includes(query)) return true;
        
        // Search in description
        if (ticket.description?.toLowerCase().includes(query)) return true;
        
        // Search in location_id (station code)
        if (ticket.location_id?.toLowerCase().includes(query)) return true;
        
        // Search in device_id
        if (ticket.device_id?.toLowerCase().includes(query)) return true;
        
        // Search in customer name
        if (ticket.customer_name?.toLowerCase().includes(query)) return true;
        
        // Search in customer company
        if (ticket.customer_company?.toLowerCase().includes(query)) return true;
        
        // Search in category
        if (ticket.category?.toLowerCase().includes(query)) return true;
        
        // Search in priority
        if (ticket.priority?.toLowerCase().includes(query)) return true;
        
        // Search in comments
        if (ticket.comments && Array.isArray(ticket.comments)) {
          const hasMatchingComment = ticket.comments.some(comment => 
            comment.comment?.toLowerCase().includes(query) ||
            comment.author?.toLowerCase().includes(query)
          );
          if (hasMatchingComment) return true;
        }
        
        return false;
      });
    }
    
    return filtered;
  };

  const filteredTickets = getFilteredTickets();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Meine Support-Tickets
          </h2>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Erstellen und verfolgen Sie Ihre Support-Anfragen
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Ticket erstellen
        </Button>
      </div>

      {/* Statistics Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Open Tickets */}
        <Card 
          onClick={() => handleFilterClick('open')}
          className={`p-3 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'open' 
              ? 'ring-2 ring-blue-500 shadow-lg' 
              : ''
          } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Offene Tickets
              </p>
              <p className={`text-xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.open}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              statusFilter === 'open' 
                ? 'bg-blue-500' 
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              <AlertCircle className={`h-5 w-5 ${
                statusFilter === 'open' 
                  ? 'text-white' 
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
            </div>
          </div>
        </Card>

        {/* In Progress */}
        <Card 
          onClick={() => handleFilterClick('in_progress')}
          className={`p-3 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'in_progress' 
              ? 'ring-2 ring-orange-500 shadow-lg' 
              : ''
          } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                In Bearbeitung
              </p>
              <p className={`text-xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.in_progress}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              statusFilter === 'in_progress' 
                ? 'bg-orange-500' 
                : 'bg-orange-100 dark:bg-orange-900/30'
            }`}>
              <Clock className={`h-5 w-5 ${
                statusFilter === 'in_progress' 
                  ? 'text-white' 
                  : 'text-orange-600 dark:text-orange-400'
              }`} />
            </div>
          </div>
        </Card>

        {/* Waiting */}
        <Card 
          onClick={() => handleFilterClick('waiting')}
          className={`p-3 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'waiting' 
              ? 'ring-2 ring-yellow-500 shadow-lg' 
              : ''
          } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Wartet
              </p>
              <p className={`text-xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.waiting}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              statusFilter === 'waiting' 
                ? 'bg-yellow-500' 
                : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                statusFilter === 'waiting' 
                  ? 'text-white' 
                  : 'text-yellow-600 dark:text-yellow-400'
              }`} />
            </div>
          </div>
        </Card>

        {/* Resolved */}
        <Card 
          onClick={() => handleFilterClick('resolved')}
          className={`p-3 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'resolved' 
              ? 'ring-2 ring-green-500 shadow-lg' 
              : ''
          } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Gelöst
              </p>
              <p className={`text-xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.resolved}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              statusFilter === 'resolved' 
                ? 'bg-green-500' 
                : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              <CheckCircle className={`h-5 w-5 ${
                statusFilter === 'resolved' 
                  ? 'text-white' 
                  : 'text-green-600 dark:text-green-400'
              }`} />
            </div>
          </div>
        </Card>

        {/* Closed - Second Row */}
        <Card 
          onClick={() => handleFilterClick('closed')}
          className={`p-3 cursor-pointer transition-all hover:shadow-lg ${
            statusFilter === 'closed' 
              ? 'ring-2 ring-gray-500 shadow-lg' 
              : ''
          } ${theme === 'dark' ? 'bg-[#2d2d2d] hover:bg-[#3d3d3d]' : 'bg-white hover:bg-gray-50'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Geschlossen
              </p>
              <p className={`text-xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.closed}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              statusFilter === 'closed' 
                ? 'bg-gray-500' 
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              <CheckCircle className={`h-5 w-5 ${
                statusFilter === 'closed' 
                  ? 'text-white' 
                  : 'text-gray-600 dark:text-gray-400'
              }`} />
            </div>
          </div>
        </Card>

        {/* Average Resolution Time */}
        <Card className={`p-3 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Ø Lösungszeit
              </p>
              <p className={`text-xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {stats.avgResolutionTime}h
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search Field */}
      <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suche nach Ticket-Nr., Stationscode, Titel, Beschreibung, Kommentaren..."
              className={`w-full pl-10 pr-10 py-2 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500 focus:border-[#c00000]'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-[#c00000]'
              } focus:outline-none focus:ring-2 focus:ring-[#c00000]/20`}
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
          {(statusFilter || searchQuery) && (
            <Button
              onClick={() => {
                setStatusFilter(null);
                setSearchQuery('');
              }}
              variant="outline"
              className={`flex-shrink-0 ${
                theme === 'dark'
                  ? 'border-gray-700 text-gray-400 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Alle Filter zurücksetzen
            </Button>
          )}
        </div>
        {(statusFilter || searchQuery) && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
              Aktive Filter:
            </span>
            {statusFilter && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                theme === 'dark'
                  ? 'bg-[#c00000]/20 text-[#c00000]'
                  : 'bg-red-100 text-[#c00000]'
              }`}>
                Status: {
                  statusFilter === 'open' ? 'Offen' :
                  statusFilter === 'in_progress' ? 'In Bearbeitung' :
                  statusFilter === 'waiting' ? 'Wartet' :
                  statusFilter === 'resolved' ? 'Gelöst' :
                  statusFilter === 'closed' ? 'Geschlossen' : statusFilter
                }
              </span>
            )}
            {searchQuery && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                theme === 'dark'
                  ? 'bg-blue-900/20 text-blue-400'
                  : 'bg-blue-100 text-blue-600'
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

      {/* Tickets List */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        {loading ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Lade Tickets...
          </p>
        ) : filteredTickets.length === 0 ? (
          <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            <Ticket className="h-16 w-16 mx-auto mb-4 opacity-50" />
            {tickets.length === 0 ? (
              <>
                <p className="text-lg font-medium">Keine Tickets vorhanden</p>
                <p className="text-sm mt-2">Erstellen Sie ein Ticket, wenn Sie Unterstützung benötigen</p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Erstes Ticket erstellen
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">Keine Tickets gefunden</p>
                <p className="text-sm mt-2">Versuchen Sie, die Filter anzupassen oder die Suche zu ändern</p>
                <Button
                  onClick={() => {
                    setStatusFilter(null);
                    setSearchQuery('');
                  }}
                  className="mt-4 bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  Filter zurücksetzen
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openTicketDetails(ticket)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 hover:border-[#c00000]'
                    : 'bg-white border-gray-200 hover:border-[#c00000]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Ticket Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`font-mono text-sm font-semibold ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`}>
                        {ticket.ticket_number}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(ticket.status)}`}>
                        {getStatusLabel(ticket.status)}
                      </span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        {getCategoryLabel(ticket.category)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {ticket.title}
                    </h3>

                    {/* Description Preview */}
                    <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {ticket.description.substring(0, 150)}
                      {ticket.description.length > 150 ? '...' : ''}
                    </p>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs">
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                        <Clock className="inline h-3 w-3 mr-1" />
                        {new Date(ticket.created_at).toLocaleDateString('de-DE')}
                      </span>
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
                      {ticket.comments && ticket.comments.length > 0 && (
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                          <MessageSquare className="inline h-3 w-3 mr-1" />
                          {ticket.comments.length} Kommentar{ticket.comments.length !== 1 ? 'e' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    ticket.priority === 'critical' ? 'bg-red-600 text-white' :
                    ticket.priority === 'high' ? 'bg-orange-600 text-white' :
                    ticket.priority === 'medium' ? 'bg-blue-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {getPriorityLabel(ticket.priority)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Neues Support-Ticket erstellen
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}
              >
                <X className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Titel *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Kurze Beschreibung des Problems"
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Category */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Kategorie *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="technical">Technisch</option>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="billing">Abrechnung</option>
                  <option value="general">Allgemein</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Priorität *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="critical">Kritisch</option>
                </select>
              </div>

              {/* Location Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Standort (optional)
                </label>

                {/* Pre-filters */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <select
                    value={continentFilter}
                    onChange={(e) => {
                      setContinentFilter(e.target.value);
                      setCountryFilter('');
                      setCityFilter('');
                    }}
                    className={`px-3 py-2 border rounded-lg text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Alle Kontinente</option>
                    {continents.map(continent => (
                      <option key={continent} value={continent}>{continent}</option>
                    ))}
                  </select>

                  <select
                    value={countryFilter}
                    onChange={(e) => {
                      setCountryFilter(e.target.value);
                      setCityFilter('');
                    }}
                    className={`px-3 py-2 border rounded-lg text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Alle Länder</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>

                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className={`px-3 py-2 border rounded-lg text-sm ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Alle Städte</option>
                    {cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Search field */}
                <div className="relative" ref={locationDropdownRef}>
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onFocus={() => setShowLocationDropdown(true)}
                    onClick={() => setShowLocationDropdown(true)}
                    placeholder="Standort suchen (Code, Name, Straße, PLZ, Ort)..."
                    className={`w-full px-4 py-2 pr-10 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  {locationSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocationSearch('');
                      }}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      ✕
                    </button>
                  )}
                  {showLocationDropdown && (
                    <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700'
                        : 'bg-white border-gray-300'
                    } shadow-lg`}>
                      {getFilteredLocations()
                        .slice(0, 20)
                        .map(location => (
                          <div
                            key={location.main_code}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLocationId(location.main_code);
                              setLocationSearch('');
                              setShowLocationDropdown(false);
                            }}
                            className={`px-4 py-3 cursor-pointer border-b ${
                              theme === 'dark'
                                ? 'hover:bg-[#3a3a3a] text-white border-gray-700'
                                : 'hover:bg-gray-100 text-gray-900 border-gray-200'
                            } ${selectedLocationId === location.main_code ? 'bg-[#c00000] text-white' : ''}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-bold text-sm">{location.main_code}</p>
                                <p className="font-medium">{location.stationsname || location.name}</p>
                                <p className="text-xs opacity-75 mt-1">
                                  {location.str || location.street}<br/>
                                  {location.plz || location.postal_code} {location.ort || location.city || location.stadt}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${
                                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                              }`}>
                                {location.land}
                              </span>
                            </div>
                          </div>
                        ))}
                      {getFilteredLocations().length === 0 && (
                        <div className={`px-4 py-3 text-center text-sm ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          Keine Standorte gefunden
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Selected location display */}
                {selectedLocationId && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                    {(() => {
                      const loc = locations.find(l => l.main_code === selectedLocationId);
                      return loc ? (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              Ausgewählter Standort:
                            </p>
                            <p className="font-bold text-sm mt-1">{loc.main_code} - {loc.stationsname || loc.name}</p>
                            <p className="text-xs opacity-75">
                              {loc.str || loc.street}, {loc.plz || loc.postal_code} {loc.ort || loc.city || loc.stadt}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedLocationId('');
                              setLocationSearch('');
                            }}
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Device Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Gerät (optional)
                </label>
                <div className="relative" ref={deviceDropdownRef}>
                  <input
                    type="text"
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    onFocus={() => setShowDeviceDropdown(true)}
                    onClick={() => setShowDeviceDropdown(true)}
                    placeholder="Gerät suchen (Device ID, Station Name)..."
                    className={`w-full px-4 py-2 pr-10 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                  {deviceSearch && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeviceSearch('');
                      }}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      ✕
                    </button>
                  )}
                  {showDeviceDropdown && (
                    <div className={`absolute z-20 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700'
                        : 'bg-white border-gray-300'
                    } shadow-lg`}>
                      {devices
                        .filter(device => 
                          device.device_id?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
                          device.station_name?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
                          device.location_code?.toLowerCase().includes(deviceSearch.toLowerCase())
                        )
                        .slice(0, 10)
                        .map(device => (
                          <div
                            key={device.device_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDeviceId(device.device_id);
                              setDeviceSearch('');
                              setShowDeviceDropdown(false);
                            }}
                            className={`px-4 py-3 cursor-pointer border-b ${
                              theme === 'dark'
                                ? 'hover:bg-[#3a3a3a] text-white border-gray-700'
                                : 'hover:bg-gray-100 text-gray-900 border-gray-200'
                            } ${selectedDeviceId === device.device_id ? 'bg-[#c00000] text-white' : ''}`}
                          >
                            <p className="font-bold text-sm">{device.device_id}</p>
                            <p className="text-xs opacity-75">{device.station_name || device.location_code}</p>
                          </div>
                        ))}
                      {devices.filter(device => 
                        device.device_id?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
                        device.station_name?.toLowerCase().includes(deviceSearch.toLowerCase()) ||
                        device.location_code?.toLowerCase().includes(deviceSearch.toLowerCase())
                      ).length === 0 && (
                        <div className={`px-4 py-3 text-center text-sm ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          Keine Geräte gefunden
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Selected device display */}
                {selectedDeviceId && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                    {(() => {
                      const device = devices.find(d => d.device_id === selectedDeviceId);
                      return device ? (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              Ausgewähltes Gerät:
                            </p>
                            <p className="font-bold text-sm mt-1">{device.device_id}</p>
                            <p className="text-xs opacity-75">{device.station_name}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedDeviceId('');
                              setDeviceSearch('');
                            }}
                            className="text-red-600 hover:text-red-700 ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
                
                {selectedLocationId && devices.length === 0 && (
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`}>
                    ⚠️ Keine Geräte für diesen Standort gefunden
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Beschreibung *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  placeholder="Beschreiben Sie Ihr Problem ausführlich..."
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleCreateTicket}
                  className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
                >
                  Ticket erstellen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
          }}
          devices={[]}
          isAdmin={false}
        />
      )}

      {/* OLD MODAL - REMOVE THIS BLOCK */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTicket.ticket_number}
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(selectedTicket.status)}`}>
                  {getStatusLabel(selectedTicket.status)}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3a3a3a]' : 'hover:bg-gray-100'}`}
              >
                <X className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Ticket Info */}
              <div>
                <h4 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {selectedTicket.title}
                </h4>
                <div className="flex items-center gap-4 text-sm">
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Kategorie: <span className="font-semibold">{getCategoryLabel(selectedTicket.category)}</span>
                  </span>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Priorität: <span className="font-semibold">{getPriorityLabel(selectedTicket.priority)}</span>
                  </span>
                  <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Erstellt: <span className="font-semibold">{new Date(selectedTicket.created_at).toLocaleString('de-DE')}</span>
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <h5 className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Beschreibung
                </h5>
                <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedTicket.description}
                </p>
              </div>

              {/* Comments */}
              <div>
                <h5 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Kommunikation
                </h5>
                
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {selectedTicket.comments
                      .filter(comment => !comment.internal) // Only show non-internal comments to customers
                      .map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-4 rounded-lg ${
                            comment.created_by_role === 'admin'
                              ? theme === 'dark' ? 'bg-blue-900/20 border-l-4 border-blue-600' : 'bg-blue-50 border-l-4 border-blue-600'
                              : theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {comment.created_by_role === 'admin' ? 'Support Team' : comment.created_by_name}
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                              {new Date(comment.created_at).toLocaleString('de-DE')}
                            </span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            {comment.comment}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Noch keine Kommentare vorhanden
                  </p>
                )}

                {/* Add Comment */}
                {selectedTicket.status !== 'closed' && (
                  <div className="space-y-3">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={4}
                      placeholder="Antworten Sie auf dieses Ticket..."
                      className={`w-full px-4 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={addingComment || !newComment.trim()}
                      className="bg-[#c00000] hover:bg-[#a00000] text-white"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {addingComment ? 'Wird gesendet...' : 'Antworten'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTickets;

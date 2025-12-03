import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Lightbulb, Plus, Search, Filter, Edit2, Trash2, 
  Clock, CheckCircle, AlertCircle, TrendingUp, X, Save, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

const IdeasPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [ideas, setIdeas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMenuItem, setFilterMenuItem] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentIdea, setCurrentIdea] = useState(null);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [availableMenuItems, setAvailableMenuItems] = useState([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [menuItem, setMenuItem] = useState('');
  const [customMenuItem, setCustomMenuItem] = useState('');

  // Predefined R&D menu items
  const predefinedMenuItems = [
    'Schnellmenü',
    'Paketversand',
    'Dokumentenscan',
    'Zeiterfassung',
    'Kioskverwaltung',
    'Facematch',
    'Fingerprint',
    'Iris Scan',
    'Kennzeichenerkennung',
    'Fahrzeugverwaltung',
    'Flottenmanagement',
    'Europcar PKW-Vermietung',
    'Parkhaussystem',
    'Parkhaus-Bezahlsystem',
    'Parkzeitüberschreitung',
    'Zutrittssysteme',
    'KI-Suche',
    'Dokumentenanalyse',
    'Anomalieerkennung',
    'Hintergrund-Entfernung',
    'Bildverbesserung',
    'Erweiterte OCR',
    'Kiosk-Konfiguration',
    'Kiosk-Monitoring',
    'Schlüsselautomat',
    'Workflow Builder',
    'Stapelverarbeitung',
    'API Testing',
    'Steuerungssysteme',
    'Überwachungssysteme',
    'Fastfood Bestellsystem',
    'Lieferservice',
    'Mobility Services',
    'DHL'
  ];

  useEffect(() => {
    loadIdeas();
    loadStats();
    loadMenuItems();
  }, [filterStatus, filterMenuItem]);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterMenuItem !== 'all') {
        params.append('menu_item', filterMenuItem);
      }
      
      const queryString = params.toString();
      const result = await apiCall(`/api/ideas/${queryString ? '?' + queryString : ''}`);
      
      if (result.success && Array.isArray(result.data)) {
        setIdeas(result.data);
      } else if (Array.isArray(result)) {
        setIdeas(result);
      }
    } catch (error) {
      console.error('Error loading ideas:', error);
      toast.error('Fehler beim Laden der Ideen');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await apiCall('/api/ideas/stats/summary');
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMenuItems = async () => {
    try {
      const result = await apiCall('/api/ideas/menu-items/list');
      if (result.success && result.data.menu_items) {
        setAvailableMenuItems(result.data.menu_items);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const handleCreateNew = () => {
    setCurrentIdea(null);
    setTitle('');
    setDescription('');
    setMenuItem('');
    setCustomMenuItem('');
    setShowEditor(true);
  };

  const handleRowClick = (idea) => {
    setSelectedIdea(idea);
    setShowDetailModal(true);
  };

  const handleEdit = (idea, e) => {
    if (e) e.stopPropagation();
    setCurrentIdea(idea);
    setTitle(idea.title);
    setDescription(idea.description);
    
    // Check if menu item is in predefined list
    if (predefinedMenuItems.includes(idea.menu_item)) {
      setMenuItem(idea.menu_item);
      setCustomMenuItem('');
    } else {
      setMenuItem('custom');
      setCustomMenuItem(idea.menu_item);
    }
    
    setShowDetailModal(false);
    setShowEditor(true);
  };

  const handleEditFromDetail = () => {
    if (selectedIdea) {
      handleEdit(selectedIdea);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Bitte Titel und Beschreibung ausfüllen');
      return;
    }

    const finalMenuItem = menuItem === 'custom' ? customMenuItem.trim() : menuItem;
    
    if (!finalMenuItem) {
      toast.error('Bitte Menüpunkt auswählen oder eingeben');
      return;
    }

    try {
      if (currentIdea) {
        // Update existing idea
        await apiCall(`/api/ideas/${currentIdea.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            menu_item: finalMenuItem
          })
        });
        toast.success('Idee aktualisiert');
      } else {
        // Create new idea
        await apiCall('/api/ideas/', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            menu_item: finalMenuItem
          })
        });
        toast.success('Idee gespeichert');
      }
      
      setShowEditor(false);
      setTitle('');
      setDescription('');
      setMenuItem('');
      setCustomMenuItem('');
      setCurrentIdea(null);
      loadIdeas();
      loadStats();
      loadMenuItems();
    } catch (error) {
      console.error('Error saving idea:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleStatusChange = async (ideaId, newStatus) => {
    try {
      await apiCall(`/api/ideas/${ideaId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      toast.success('Status aktualisiert');
      loadIdeas();
      loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleDelete = async (ideaId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Möchten Sie diese Idee wirklich löschen?')) {
      return;
    }

    try {
      await apiCall(`/api/ideas/${ideaId}`, {
        method: 'DELETE'
      });
      toast.success('Idee gelöscht');
      setShowDetailModal(false);
      loadIdeas();
      loadStats();
      loadMenuItems();
    } catch (error) {
      console.error('Error deleting idea:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'neu': { bg: 'bg-blue-500', text: 'Neu', icon: AlertCircle },
      'in_entwicklung': { bg: 'bg-yellow-500', text: 'In Entwicklung', icon: TrendingUp },
      'erledigt': { bg: 'bg-green-500', text: 'Erledigt', icon: CheckCircle }
    };
    return badges[status] || badges['neu'];
  };

  const filteredIdeas = ideas.filter(idea =>
    searchQuery === '' ||
    idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    idea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (idea.menu_item && idea.menu_item.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Combine predefined and available menu items
  const allMenuItemOptions = [...new Set([...predefinedMenuItems, ...availableMenuItems])].sort();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'} p-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lightbulb className={`h-8 w-8 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Ideen & Verbesserungsvorschläge
            </h1>
          </div>
          {!showEditor && (
            <Button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4" />
              Neue Idee
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {stats.total}
                  </p>
                </div>
                <Lightbulb className={`h-8 w-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </Card>

          <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Neu</p>
                  <p className={`text-2xl font-bold text-blue-500`}>
                    {stats.neu}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>In Entwicklung</p>
                  <p className={`text-2xl font-bold text-yellow-500`}>
                    {stats.in_entwicklung}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </Card>

          <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Erledigt</p>
                  <p className={`text-2xl font-bold text-green-500`}>
                    {stats.erledigt}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Editor View */}
      {showEditor ? (
        <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {currentIdea ? 'Idee bearbeiten' : 'Neue Idee erstellen'}
              </h2>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setTitle('');
                  setDescription('');
                  setMenuItem('');
                  setCustomMenuItem('');
                  setCurrentIdea(null);
                }}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Menüpunkt *
                </label>
                <select
                  value={menuItem}
                  onChange={(e) => setMenuItem(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">-- Menüpunkt auswählen --</option>
                  {allMenuItemOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value="custom">+ Neuer Menüpunkt</option>
                </select>
              </div>

              {menuItem === 'custom' && (
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Neuer Menüpunkt eingeben *
                  </label>
                  <input
                    type="text"
                    value={customMenuItem}
                    onChange={(e) => setCustomMenuItem(e.target.value)}
                    placeholder="z.B. Neue Funktion"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300'
                    }`}
                    maxLength={200}
                  />
                </div>
              )}

              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Titel / Thema *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. Verbesserte Suchfunktion"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                  maxLength={200}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Detaillierte Beschreibung *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschreiben Sie Ihre Idee im Detail..."
                  rows={15}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="h-4 w-4" />
                  Speichern
                </Button>
                <Button
                  onClick={() => {
                    setShowEditor(false);
                    setTitle('');
                    setDescription('');
                    setMenuItem('');
                    setCustomMenuItem('');
                    setCurrentIdea(null);
                  }}
                  variant="outline"
                  className={theme === 'dark' ? 'border-gray-600 text-gray-300' : ''}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {/* Filters and Search */}
          <Card className={`${theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'} mb-6`}>
            <div className="p-4">
              <div className="space-y-4">
                {/* Menu Item Filter */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Tag className="inline h-4 w-4 mr-1" />
                    Nach Menüpunkt filtern
                  </label>
                  <select
                    value={filterMenuItem}
                    onChange={(e) => setFilterMenuItem(e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="all">Alle Menüpunkte</option>
                    {allMenuItemOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nach Status filtern
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterStatus === 'all'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setFilterStatus('neu')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterStatus === 'neu'
                          ? 'bg-blue-600 text-white'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Neu
                    </button>
                    <button
                      onClick={() => setFilterStatus('in_entwicklung')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterStatus === 'in_entwicklung'
                          ? 'bg-yellow-600 text-white'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      In Entwicklung
                    </button>
                    <button
                      onClick={() => setFilterStatus('erledigt')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterStatus === 'erledigt'
                          ? 'bg-green-600 text-white'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Erledigt
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div>
                  <div className="relative">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                      type="text"
                      placeholder="Ideen durchsuchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white'
                          : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Ideas List/Table */}
          {loading ? (
            <div className="text-center py-12">
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Laden...</p>
            </div>
          ) : filteredIdeas.length === 0 ? (
            <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
              <div className="p-12 text-center">
                <Lightbulb className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {searchQuery || filterMenuItem !== 'all' ? 'Keine Ideen gefunden' : 'Keine Ideen vorhanden'}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                  {searchQuery || filterMenuItem !== 'all' ? 'Versuchen Sie einen anderen Filter' : 'Erstellen Sie Ihre erste Idee!'}
                </p>
              </div>
            </Card>
          ) : (
            <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Menüpunkt
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Titel & Beschreibung
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Status
                      </th>
                      <th className={`px-6 py-4 text-left text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Datum
                      </th>
                      <th className={`px-6 py-4 text-right text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIdeas.map((idea) => {
                      const statusBadge = getStatusBadge(idea.status);
                      const StatusIcon = statusBadge.icon;
                      
                      return (
                        <tr 
                          key={idea.id} 
                          className={`border-b ${theme === 'dark' ? 'border-gray-700 hover:bg-gray-800/50' : 'border-gray-200 hover:bg-gray-50'} transition-colors`}
                        >
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}>
                              <Tag className="h-3 w-3" />
                              {idea.menu_item}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <h3 className={`text-base font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {idea.title}
                              </h3>
                              <p className={`text-sm line-clamp-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {idea.description}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={idea.status}
                              onChange={(e) => handleStatusChange(idea.id, e.target.value)}
                              className={`px-3 py-1 rounded-lg border font-semibold text-sm ${
                                theme === 'dark'
                                  ? 'bg-gray-700 border-gray-600 text-white'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <option value="neu">Neu</option>
                              <option value="in_entwicklung">In Entwicklung</option>
                              <option value="erledigt">Erledigt</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>{formatDate(idea.created_at)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(idea)}
                                className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                title="Bearbeiten"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(idea.id)}
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title="Löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default IdeasPage;

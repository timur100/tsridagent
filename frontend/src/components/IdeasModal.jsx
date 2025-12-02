import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Plus, Save, Trash2, Edit2, Clock, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const IdeasModal = ({ isOpen, onClose, theme }) => {
  const { apiCall } = useAuth();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [currentIdea, setCurrentIdea] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMenuItem, setFilterMenuItem] = useState('all');
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
    if (isOpen) {
      loadIdeas();
      loadMenuItems();
    }
  }, [isOpen, filterStatus, filterMenuItem]);

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
      
      console.log('[IdeasModal] API result:', result);
      
      if (result.success && Array.isArray(result.data)) {
        console.log('[IdeasModal] Setting ideas:', result.data.length, 'items');
        setIdeas(result.data);
      } else if (Array.isArray(result)) {
        console.log('[IdeasModal] Setting ideas (direct array):', result.length, 'items');
        setIdeas(result);
      }
    } catch (error) {
      console.error('[IdeasModal] Error loading ideas:', error);
      toast.error('Fehler beim Laden der Ideen');
    } finally {
      setLoading(false);
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

  const handleEdit = (idea) => {
    setCurrentIdea(idea);
    setTitle(idea.title);
    setDescription(idea.description);
    
    if (predefinedMenuItems.includes(idea.menu_item)) {
      setMenuItem(idea.menu_item);
      setCustomMenuItem('');
    } else {
      setMenuItem('custom');
      setCustomMenuItem(idea.menu_item);
    }
    
    setShowEditor(true);
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
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const handleDelete = async (ideaId) => {
    if (!window.confirm('Möchten Sie diese Idee wirklich löschen?')) {
      return;
    }

    try {
      await apiCall(`/api/ideas/${ideaId}`, {
        method: 'DELETE'
      });
      toast.success('Idee gelöscht');
      loadIdeas();
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

  const allMenuItemOptions = [...new Set([...predefinedMenuItems, ...availableMenuItems])].sort();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-6xl max-h-[90vh] rounded-lg shadow-xl ${theme === 'dark' ? 'bg-[#2a2a2a] text-white' : 'bg-white text-gray-900'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Ideen & Verbesserungsvorschläge</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {!showEditor ? (
            <>
              {/* Filter and New Button */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Filter</h3>
                  <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Neue Idee
                  </button>
                </div>

                {/* Menu Item Filter */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nach Menüpunkt
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
                    Nach Status
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
              </div>

              {/* Ideas List */}
              {loading ? (
                <div className="text-center py-8">
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Laden...</p>
                </div>
              ) : ideas.length === 0 ? (
                <div className="text-center py-8">
                  <Lightbulb className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    Keine Ideen vorhanden. Erstellen Sie Ihre erste Idee!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ideas.map((idea) => (
                    <div
                      key={idea.id}
                      className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                            }`}>
                              <Tag className="h-3 w-3" />
                              {idea.menu_item}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold mb-1">{idea.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(idea.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
                          <button
                            onClick={() => handleEdit(idea)}
                            className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(idea.id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {idea.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Editor View */
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
                  Titel / Thema
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
                  Detaillierte Beschreibung
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschreiben Sie Ihre Idee im Detail..."
                  rows={12}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Speichern
                </button>
                <button
                  onClick={() => {
                    setShowEditor(false);
                    setTitle('');
                    setDescription('');
                    setMenuItem('');
                    setCustomMenuItem('');
                    setCurrentIdea(null);
                  }}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdeasModal;

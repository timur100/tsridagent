import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Lightbulb, Plus, Search, Filter, Edit2, Trash2, 
  Clock, CheckCircle, AlertCircle, TrendingUp, X, Save
} from 'lucide-react';
import toast from 'react-hot-toast';

const IdeasPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [ideas, setIdeas] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [currentIdea, setCurrentIdea] = useState(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadIdeas();
    loadStats();
  }, [filterStatus]);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const result = await apiCall(`/api/ideas/${params}`);
      
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

  const handleCreateNew = () => {
    setCurrentIdea(null);
    setTitle('');
    setDescription('');
    setShowEditor(true);
  };

  const handleEdit = (idea) => {
    setCurrentIdea(idea);
    setTitle(idea.title);
    setDescription(idea.description);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Bitte Titel und Beschreibung ausfüllen');
      return;
    }

    try {
      if (currentIdea) {
        // Update existing idea
        await apiCall(`/api/ideas/${currentIdea.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim()
          })
        });
        toast.success('Idee aktualisiert');
      } else {
        // Create new idea
        await apiCall('/api/ideas/', {
          method: 'POST',
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim()
          })
        });
        toast.success('Idee gespeichert');
      }
      
      setShowEditor(false);
      setTitle('');
      setDescription('');
      setCurrentIdea(null);
      loadIdeas();
      loadStats();
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
      loadStats();
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
    idea.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <div className="flex flex-wrap items-center gap-4">
                {/* Status Filter */}
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

                {/* Search */}
                <div className="flex-1 min-w-[300px]">
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

          {/* Ideas List */}
          {loading ? (
            <div className="text-center py-12">
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Laden...</p>
            </div>
          ) : filteredIdeas.length === 0 ? (
            <Card className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
              <div className="p-12 text-center">
                <Lightbulb className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {searchQuery ? 'Keine Ideen gefunden' : 'Keine Ideen vorhanden'}
                </p>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
                  {searchQuery ? 'Versuchen Sie einen anderen Suchbegriff' : 'Erstellen Sie Ihre erste Idee!'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredIdeas.map((idea) => {
                const statusBadge = getStatusBadge(idea.status);
                const StatusIcon = statusBadge.icon;
                
                return (
                  <Card key={idea.id} className={theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white'}>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {idea.title}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusBadge.bg} flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {statusBadge.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                            <Clock className="h-4 w-4" />
                            <span>{formatDate(idea.created_at)}</span>
                            {idea.created_by && (
                              <>
                                <span>•</span>
                                <span>von {idea.created_by}</span>
                              </>
                            )}
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
                      </div>
                      <p className={`text-sm whitespace-pre-wrap ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        {idea.description}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IdeasPage;

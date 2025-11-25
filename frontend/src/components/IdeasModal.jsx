import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Plus, Save, Trash2, Edit2, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const IdeasModal = ({ isOpen, onClose, theme }) => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [currentIdea, setCurrentIdea] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadIdeas();
    }
  }, [isOpen, filterStatus]);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const result = await apiCall(`/api/ideas/${params}`);
      
      if (Array.isArray(result)) {
        setIdeas(result);
      }
    } catch (error) {
      console.error('Error loading ideas:', error);
      toast.error('Fehler beim Laden der Ideen');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'neu':
        return 'bg-blue-500';
      case 'in_entwicklung':
        return 'bg-yellow-500';
      case 'erledigt':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'neu':
        return 'Neu';
      case 'in_entwicklung':
        return 'In Entwicklung';
      case 'erledigt':
        return 'Erledigt';
      default:
        return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl ${theme === 'dark' ? 'bg-[#2a2a2a] text-white' : 'bg-white text-gray-900'}`}>
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
              <div className="flex items-center justify-between mb-6">
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

                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Neue Idee
                </button>
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

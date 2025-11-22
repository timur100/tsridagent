import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Plus, Edit, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const KnowledgeBaseEditor = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'faq',
    tags: [],
    video_url: '',
    is_public: true,
    order_index: 0
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/api/knowledge-base/articles');
      if (response.success) {
        setArticles(response.articles);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      content: '',
      category: 'faq',
      tags: [],
      video_url: '',
      is_public: true,
      order_index: 0
    });
    setShowEditor(true);
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      category: article.category,
      tags: article.tags,
      video_url: article.video_url || '',
      is_public: article.is_public,
      order_index: article.order_index
    });
    setShowEditor(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editingArticle 
        ? `/api/knowledge-base/articles/${editingArticle.id}`
        : '/api/knowledge-base/articles';
      
      const method = editingArticle ? 'PUT' : 'POST';

      const response = await apiCall(url, {
        method,
        body: JSON.stringify(formData)
      });
      
      if (response.success) {
        toast.success(editingArticle ? 'Artikel aktualisiert' : 'Artikel erstellt');
        setShowEditor(false);
        fetchArticles();
      }
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (articleId) => {
    if (!confirm('Artikel wirklich löschen?')) return;
    
    try {
      const response = await apiCall(`/api/knowledge-base/articles/${articleId}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        toast.success('Artikel gelöscht');
        fetchArticles();
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handlePublish = async (article) => {
    try {
      const response = await apiCall(`/api/knowledge-base/articles/${article.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: article.status === 'published' ? 'draft' : 'published'
        })
      });
      
      if (response.success) {
        toast.success(article.status === 'published' ? 'Als Entwurf gespeichert' : 'Veröffentlicht');
        fetchArticles();
      }
    } catch (error) {
      console.error('Error publishing:', error);
      toast.error('Fehler');
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      faq: 'FAQ',
      how_to: 'Anleitung',
      troubleshooting: 'Fehlerbehebung',
      policy: 'Richtlinie',
      video_tutorial: 'Video-Tutorial',
      quick_guide: 'Schnellstart'
    };
    return labels[category] || category;
  };

  if (showEditor) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {editingArticle ? 'Artikel bearbeiten' : 'Neuer Artikel'}
          </h2>
          <Button variant="outline" onClick={() => setShowEditor(false)}>
            Abbrechen
          </Button>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Titel *</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Inhalt *</label>
              <textarea
                required
                rows={15}
                className="w-full px-4 py-2 bg-card border border-border rounded-lg font-mono text-sm"
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Kategorie</label>
                <select
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="faq">FAQ</option>
                  <option value="how_to">Anleitung</option>
                  <option value="troubleshooting">Fehlerbehebung</option>
                  <option value="policy">Richtlinie</option>
                  <option value="video_tutorial">Video-Tutorial</option>
                  <option value="quick_guide">Schnellstart</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sortierung</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                  value={formData.order_index}
                  onChange={(e) => setFormData({...formData, order_index: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tags (kommagetrennt)</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                value={formData.tags.join(', ')}
                onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim())})}
                placeholder="z.B. Scanner, Drucker, Netzwerk"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Video-URL (optional)</label>
              <input
                type="url"
                className="w-full px-4 py-2 bg-card border border-border rounded-lg"
                value={formData.video_url}
                onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                placeholder="https://youtube.com/embed/..."
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_public"
                checked={formData.is_public}
                onChange={(e) => setFormData({...formData, is_public: e.target.checked})}
                className="w-4 h-4"
              />
              <label htmlFor="is_public" className="text-sm">
                Öffentlich sichtbar (für Kunden)
              </label>
            </div>

            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Knowledge Base Editor</h2>
          <p className="text-muted-foreground mt-1">Verwalten Sie Artikel und Dokumentation</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Neuer Artikel
        </Button>
      </div>

      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-4">
          {(articles || []).length} Artikel • {(articles || []).filter(a => a.status === 'published').length} veröffentlicht
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lädt...</div>
      ) : articles.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Keine Artikel vorhanden</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => (
            <Card key={article.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{article.title}</h3>
                    {article.status === 'published' ? (
                      <Eye className="w-4 h-4 text-green-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-500" />
                    )}
                    {!article.is_public && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs">
                        Nur Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {article.content.substring(0, 150)}...
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{getCategoryLabel(article.category)}</span>
                    <span>•</span>
                    <span>Version {article.version}</span>
                    <span>•</span>
                    <span>{article.views_count} Aufrufe</span>
                    <span>•</span>
                    <span>{article.helpful_count} hilfreich</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePublish(article)}
                  >
                    {article.status === 'published' ? 'Zurückziehen' : 'Veröffentlichen'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(article)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(article.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseEditor;

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Search, BookOpen, Video, FileText, ThumbsUp, HelpCircle, MapPin, Monitor } from 'lucide-react';
import toast from 'react-hot-toast';

const HelpCenter = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await apiCall(`/api/knowledge-base/articles?${params.toString()}`);
      if (response.success && response.articles) {
        setArticles(response.articles);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Fehler beim Laden der Artikel');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = async (article) => {
    setSelectedArticle(article);
  };

  const handleMarkHelpful = async (articleId) => {
    try {
      const response = await apiCall(`/api/knowledge-base/articles/${articleId}/helpful`, {
        method: 'POST'
      });
      if (response.success) {
        toast.success(response.message);
      }
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const categories = [
    { id: 'all', label: 'Alle', icon: BookOpen },
    { id: 'faq', label: 'FAQs', icon: HelpCircle },
    { id: 'how_to', label: 'Anleitungen', icon: FileText },
    { id: 'troubleshooting', label: 'Fehlerbehebung', icon: Monitor },
    { id: 'video_tutorial', label: 'Videos', icon: Video },
    { id: 'quick_guide', label: 'Schnellstart', icon: BookOpen }
  ];

  const filteredArticles = (articles || []).filter(article => {
    if (searchQuery) {
      return article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (article.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return true;
  });

  if (selectedArticle) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="outline" onClick={() => setSelectedArticle(null)}>
          ← Zurück zur Übersicht
        </Button>

        <Card className="p-8">
          <div className="prose prose-invert max-w-none">
            <h1 className="text-3xl font-bold mb-4">{selectedArticle.title}</h1>
            
            <div className="flex gap-2 mb-6">
              {selectedArticle.tags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-accent rounded-full text-sm">
                  {tag}
                </span>
              ))}
            </div>

            {selectedArticle.video_url && (
              <div className="mb-6">
                <div className="aspect-video bg-black rounded-lg">
                  <iframe
                    src={selectedArticle.video_url}
                    className="w-full h-full rounded-lg"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <div className="whitespace-pre-wrap text-foreground">
              {selectedArticle.content}
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">War dieser Artikel hilfreich?</p>
              <div className="flex gap-4 items-center">
                <Button 
                  size="sm" 
                  onClick={() => handleMarkHelpful(selectedArticle.id)}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Ja, hilfreich
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedArticle.helpful_count} Personen fanden dies hilfreich
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hilfe & Dokumentation</h1>
        <p className="text-muted-foreground mt-1">Finden Sie Antworten und Anleitungen</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Suche nach Artikeln, Anleitungen, FAQs..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-lg text-foreground text-lg"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card hover:bg-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
          <MapPin className="w-8 h-8 text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Standort melden</h3>
          <p className="text-sm text-muted-foreground">
            Problem mit einem Standort? Melden Sie es hier.
          </p>
        </Card>

        <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
          <Monitor className="w-8 h-8 text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-2">Gerät melden</h3>
          <p className="text-sm text-muted-foreground">
            Problem mit einem Gerät? Melden Sie es hier.
          </p>
        </Card>
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lädt...</div>
      ) : filteredArticles.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Keine Artikel gefunden</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((article) => (
            <Card 
              key={article.id} 
              className="p-6 hover:bg-accent transition-colors cursor-pointer"
              onClick={() => handleArticleClick(article)}
            >
              <div className="flex items-start gap-4">
                {article.category === 'video_tutorial' ? (
                  <Video className="w-6 h-6 text-primary flex-shrink-0" />
                ) : (
                  <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">{article.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.content.substring(0, 150)}...
                  </p>
                  <div className="flex gap-2 mt-3">
                    {article.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-accent rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{article.views_count} Aufrufe</span>
                    <span>•</span>
                    <span>{article.helpful_count} hilfreich</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HelpCenter;

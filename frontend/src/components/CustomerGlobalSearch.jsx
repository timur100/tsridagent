import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Search, X, Package, Monitor, MapPin, ShoppingCart, Headphones } from 'lucide-react';

const CustomerGlobalSearch = ({ onNavigate }) => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (query.trim().length < 2) {
        setResults(null);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        console.log('[GlobalSearch] Searching for:', query.trim());
        const response = await apiCall(`/api/search/global?query=${encodeURIComponent(query.trim())}`);
        console.log('[GlobalSearch] Response:', response);
        if (response && response.success) {
          // Extract results from response.data or response directly
          const result = response.data || response;
          setResults(result.results);
          setIsOpen(true);
          console.log('[GlobalSearch] Results set:', result.results);
        } else {
          console.log('[GlobalSearch] No success in response');
          setResults(null);
        }
      } catch (error) {
        console.error('[GlobalSearch] Error:', error);
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [query, apiCall]);

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = (result) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);
    
    // Navigate to the appropriate view based on result type
    if (onNavigate) {
      if (result.type === 'geraet') {
        onNavigate('devices', result.id);
      } else if (result.type === 'standort') {
        onNavigate('locations', result.id);
      } else if (result.type === 'bestellung') {
        onNavigate('shop', result.id);
      } else if (result.type === 'artikel') {
        onNavigate('shop', null);
      } else if (result.type === 'ticket') {
        onNavigate('tickets', result.id);
      }
    }
  };

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'artikel': return <Package className="h-4 w-4" />;
      case 'geraet': return <Monitor className="h-4 w-4" />;
      case 'standort': return <MapPin className="h-4 w-4" />;
      case 'bestellung': return <ShoppingCart className="h-4 w-4" />;
      case 'ticket': return <Headphones className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (type) => {
    switch (type) {
      case 'artikel': return 'Artikel';
      case 'geraete': return 'Geräte';
      case 'standorte': return 'Standorte';
      case 'bestellungen': return 'Bestellungen';
      case 'tickets': return 'Tickets';
      default: return type;
    }
  };

  const hasResults = results && (
    results.artikel?.length > 0 ||
    results.geraete?.length > 0 ||
    results.standorte?.length > 0 ||
    results.bestellungen?.length > 0 ||
    results.tickets?.length > 0
  );

  const totalResults = results ? (
    (results.artikel?.length || 0) +
    (results.geraete?.length || 0) +
    (results.standorte?.length || 0) +
    (results.bestellungen?.length || 0) +
    (results.tickets?.length || 0)
  ) : 0;

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      {/* Search Input */}
      <div className={`relative rounded-lg ${
        theme === 'dark' 
          ? 'bg-[#1a1a1a] border border-gray-700' 
          : 'bg-gray-50 border border-gray-300'
      }`}>
        <div className="flex items-center">
          <Search className={`absolute left-3 h-5 w-5 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Geräte, Standorte, Bestellungen, Artikel, Tickets suchen..."
            className={`w-full pl-10 pr-10 py-2 rounded-lg outline-none transition-colors ${
              theme === 'dark'
                ? 'bg-transparent text-white placeholder-gray-500 focus:border-[#c00000]'
                : 'bg-transparent text-gray-900 placeholder-gray-500 focus:border-[#c00000]'
            }`}
          />
          {query && (
            <button
              onClick={handleClear}
              className={`absolute right-3 p-1 rounded-full transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className={`absolute z-50 mt-2 w-full rounded-lg shadow-lg border max-h-96 overflow-y-auto ${
          theme === 'dark'
            ? 'bg-[#2a2a2a] border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          {loading ? (
            <div className="p-4 text-center">
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Suche läuft...
              </div>
            </div>
          ) : hasResults ? (
            <div>
              {/* Results Header */}
              <div className={`px-4 py-2 border-b ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <p className={`text-xs font-medium ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {totalResults} {totalResults === 1 ? 'Ergebnis' : 'Ergebnisse'} gefunden
                </p>
              </div>

              {/* Artikel Results */}
              {results.artikel?.length > 0 && (
                <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-4 py-2 ${
                    theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {getCategoryLabel('artikel')}
                    </p>
                  </div>
                  {results.artikel.slice(0, 5).map((item, index) => (
                    <button
                      key={`artikel-${index}`}
                      onClick={() => handleResultClick(item)}
                      className={`w-full px-4 py-3 text-left flex items-start space-x-3 transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#333333] border-gray-700'
                          : 'hover:bg-gray-50 border-gray-100'
                      } ${index < results.artikel.slice(0, 5).length - 1 ? 'border-b' : ''}`}
                    >
                      <div className={`mt-0.5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`}>
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </p>
                        <p className={`text-xs truncate ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Geräte Results */}
              {results.geraete?.length > 0 && (
                <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-4 py-2 ${
                    theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {getCategoryLabel('geraete')}
                    </p>
                  </div>
                  {results.geraete.slice(0, 5).map((item, index) => (
                    <button
                      key={`geraet-${index}`}
                      onClick={() => handleResultClick(item)}
                      className={`w-full px-4 py-3 text-left flex items-start space-x-3 transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#333333] border-gray-700'
                          : 'hover:bg-gray-50 border-gray-100'
                      } ${index < results.geraete.slice(0, 5).length - 1 ? 'border-b' : ''}`}
                    >
                      <div className={`mt-0.5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`}>
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </p>
                        <p className={`text-xs truncate ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Standorte Results */}
              {results.standorte?.length > 0 && (
                <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-4 py-2 ${
                    theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {getCategoryLabel('standorte')}
                    </p>
                  </div>
                  {results.standorte.slice(0, 5).map((item, index) => (
                    <button
                      key={`standort-${index}`}
                      onClick={() => handleResultClick(item)}
                      className={`w-full px-4 py-3 text-left flex items-start space-x-3 transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#333333] border-gray-700'
                          : 'hover:bg-gray-50 border-gray-100'
                      } ${index < results.standorte.slice(0, 5).length - 1 ? 'border-b' : ''}`}
                    >
                      <div className={`mt-0.5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`}>
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </p>
                        <p className={`text-xs truncate ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Bestellungen Results */}
              {results.bestellungen?.length > 0 && (
                <div className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`px-4 py-2 ${
                    theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {getCategoryLabel('bestellungen')}
                    </p>
                  </div>
                  {results.bestellungen.slice(0, 5).map((item, index) => (
                    <button
                      key={`bestellung-${index}`}
                      onClick={() => handleResultClick(item)}
                      className={`w-full px-4 py-3 text-left flex items-start space-x-3 transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#333333] border-gray-700'
                          : 'hover:bg-gray-50 border-gray-100'
                      } ${index < results.bestellungen.slice(0, 5).length - 1 ? 'border-b' : ''}`}
                    >
                      <div className={`mt-0.5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`}>
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </p>
                        <p className={`text-xs truncate ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Tickets Results */}
              {results.tickets?.length > 0 && (
                <div>
                  <div className={`px-4 py-2 ${
                    theme === 'dark' ? 'bg-[#1f1f1f]' : 'bg-gray-50'
                  }`}>
                    <p className={`text-xs font-semibold uppercase ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {getCategoryLabel('tickets')}
                    </p>
                  </div>
                  {results.tickets.slice(0, 5).map((item, index) => (
                    <button
                      key={`ticket-${index}`}
                      onClick={() => handleResultClick(item)}
                      className={`w-full px-4 py-3 text-left flex items-start space-x-3 transition-colors ${
                        theme === 'dark'
                          ? 'hover:bg-[#333333] border-gray-700'
                          : 'hover:bg-gray-50 border-gray-100'
                      } ${index < results.tickets.slice(0, 5).length - 1 ? 'border-b' : ''}`}
                    >
                      <div className={`mt-0.5 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`}>
                        {getCategoryIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </p>
                        <p className={`text-xs truncate ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Keine Ergebnisse für "{query}" gefunden
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerGlobalSearch;

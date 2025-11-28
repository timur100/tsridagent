import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Package, Monitor, MapPin, Loader, ShoppingBag, X, Ticket, Box, Fingerprint, Car } from 'lucide-react';
import toast from 'react-hot-toast';

const GlobalSearch = ({ onResultSelect }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const lastSearchRef = useRef('');

  // Auto-focus on mount and keyboard shortcut
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    const handleKeyDown = (e) => {
      // Focus search on Ctrl+K or /
      if ((e.ctrlKey && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Global barcode scanner listener with automatic search
  useEffect(() => {
    let barcodeBuffer = '';
    let timeout;
    let scanTimeout;

    const handleGlobalKeyPress = (e) => {
      // Don't interfere if user is typing in an input field (except our search)
      const activeElement = document.activeElement;
      if (activeElement && 
          activeElement.tagName === 'INPUT' && 
          activeElement !== searchInputRef.current &&
          activeElement.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Enter key if scanner sends it
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault();
        
        clearTimeout(scanTimeout);
        clearTimeout(timeout);
        
        const scannedCode = barcodeBuffer;
        barcodeBuffer = '';
        
        // Focus search input and trigger search
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          setSearchQuery(scannedCode);
          // Trigger search with the scanned code
          setTimeout(() => performSearch(scannedCode), 50);
        }
        
        return;
      }
      
      // Accumulate printable characters
      if (e.key.length === 1) {
        barcodeBuffer += e.key;
        
        // Clear previous timeouts
        clearTimeout(timeout);
        clearTimeout(scanTimeout);
        
        // Reset buffer after 100ms of no input (scanner types faster than humans)
        timeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
        
        // Auto-trigger search after 150ms if we have a valid barcode (typically 8+ characters)
        // This handles scanners that don't send Enter
        if (barcodeBuffer.length >= 8) {
          scanTimeout = setTimeout(() => {
            if (barcodeBuffer.length >= 8) {
              e.preventDefault();
              
              const scannedCode = barcodeBuffer;
              barcodeBuffer = '';
              
              // Focus search input and trigger search automatically
              if (searchInputRef.current) {
                searchInputRef.current.focus();
                setSearchQuery(scannedCode);
                // Trigger search with the scanned code
                setTimeout(() => performSearch(scannedCode), 50);
              }
            }
          }, 150);
        }
      }
    };

    document.addEventListener('keypress', handleGlobalKeyPress);
    return () => {
      document.removeEventListener('keypress', handleGlobalKeyPress);
      clearTimeout(timeout);
      clearTimeout(scanTimeout);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Perform search function
  const performSearch = async (query) => {
    if (!query || query.trim().length === 0) {
      setResults(null);
      setShowResults(false);
      return;
    }

    const trimmedQuery = query.trim();
    
    // Avoid duplicate searches
    if (trimmedQuery === lastSearchRef.current) {
      setShowResults(true);
      return;
    }

    lastSearchRef.current = trimmedQuery;
    setSearching(true);

    try {
      const response = await apiCall(`/api/search/global?query=${encodeURIComponent(trimmedQuery)}`);
      console.log('Search response:', response);
      
      // Extract the actual search results from the response
      const result = response.data || response;
      console.log('Search result data:', result);
      
      if (result && result.success) {
        setResults(result);
        setShowResults(true);

        // Auto-open only for barcode scans (8+ characters) or order numbers
        // Short searches (2-7 characters) should only show suggestions
        const isBarcodeSearch = /^\d+$/.test(trimmedQuery) && trimmedQuery.length >= 8;  // 8+ digit barcode
        const isOrderNumberSearch = trimmedQuery.toUpperCase().startsWith('BE.');  // Order numbers
        
        if (result.priority_match && result.total > 0 && (isBarcodeSearch || isOrderNumberSearch)) {
          // Automatically open only for complete barcode scans or order numbers
          setTimeout(() => {
            handleResultClick(result.priority_match);
          }, 100);
        } else if (result.total === 0) {
          toast.error('Keine Ergebnisse gefunden');
        }
        // For all other searches (including short 2-7 char searches), just show suggestions
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Suchfehler');
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Debounced search effect
  React.useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        console.log('Triggering search for:', searchQuery);
        performSearch(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResults(null);
      setShowResults(false);
    }
  }, [searchQuery]);

  const handleResultClick = React.useCallback((result) => {
    setShowResults(false);
    setSearchQuery('');
    
    if (onResultSelect) {
      onResultSelect(result);
    }
  }, [onResultSelect]);

  const getIcon = (type) => {
    switch (type) {
      case 'artikel':
        return <Package className="h-5 w-5 text-blue-500" />;
      case 'bestellung':
        return <ShoppingBag className="h-5 w-5 text-purple-500" />;
      case 'geraet':
        return <Monitor className="h-5 w-5 text-green-500" />;
      case 'standort':
        return <MapPin className="h-5 w-5 text-orange-500" />;
      case 'ticket':
        return <Ticket className="h-5 w-5 text-red-500" />;
      case 'eurobox':
        return <Box className="h-5 w-5 text-[#c00000]" />;
      case 'id-check':
        return <Fingerprint className="h-5 w-5 text-indigo-500" />;
      case 'vehicle':
        return <Car className="h-5 w-5 text-cyan-500" />;
      default:
        return <Search className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div ref={searchContainerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        }`} />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Suche nach Kennzeichen, Kunden, Standorten, Geräten..."
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => results && setShowResults(true)}
          className={`w-full pl-10 pr-10 py-2 rounded-lg border ${
            theme === 'dark'
              ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
          } focus:outline-none focus:ring-2 focus:ring-[#c00000]`}
        />
        {searchQuery && !searching && (
          <button
            onClick={() => {
              setSearchQuery('');
              setResults(null);
              setShowResults(false);
              searchInputRef.current?.focus();
            }}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400'
                : 'hover:bg-gray-200 text-gray-500'
            }`}
            title="Suche löschen"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {searching && (
          <Loader className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results && results.total > 0 && (
        <div className={`absolute top-full mt-2 w-full rounded-lg shadow-lg border max-h-96 overflow-y-auto z-50 ${
          theme === 'dark'
            ? 'bg-[#2d2d2d] border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          {/* Artikel Results */}
          {results.results.artikel && results.results.artikel.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase ${
                theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a]' : 'text-gray-600 bg-gray-50'
              }`}>
                Artikel ({results.results.artikel.length})
              </div>
              {results.results.artikel.map((item, idx) => (
                <button
                  key={`artikel-${idx}`}
                  onClick={() => handleResultClick(item)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors ${
                    theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-50'
                  }`}
                >
                  {getIcon('artikel')}
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.subtitle}
                    </div>
                    {item.barcode && (
                      <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        Barcode: {item.barcode}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Bestellungen Results */}
          {results.results.bestellungen && results.results.bestellungen.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase ${
                theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a]' : 'text-gray-600 bg-gray-50'
              }`}>
                Bestellungen ({results.results.bestellungen.length})
              </div>
              {results.results.bestellungen.map((item, idx) => (
                <button
                  key={`bestellung-${idx}`}
                  onClick={() => handleResultClick(item)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors ${
                    theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-50'
                  }`}
                >
                  {getIcon('bestellung')}
                  <div className="flex-1 text-left">
                    <div className={`font-medium font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.subtitle}
                    </div>
                    {item.status && (
                      <div className={`text-xs mt-1 inline-block px-2 py-0.5 rounded ${
                        item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600' :
                        item.status === 'processing' ? 'bg-blue-500/20 text-blue-600' :
                        item.status === 'shipped' ? 'bg-purple-500/20 text-purple-600' :
                        item.status === 'delivered' ? 'bg-green-500/20 text-green-600' :
                        'bg-red-500/20 text-red-600'
                      }`}>
                        {item.status === 'pending' ? 'Offen' :
                         item.status === 'processing' ? 'In Bearbeitung' :
                         item.status === 'shipped' ? 'Versandt' :
                         item.status === 'delivered' ? 'Geliefert' :
                         'Storniert'}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Geräte Results */}
          {results.results.geraete && results.results.geraete.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase ${
                theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a]' : 'text-gray-600 bg-gray-50'
              }`}>
                Geräte ({results.results.geraete.length})
              </div>
              {results.results.geraete.map((item, idx) => (
                <button
                  key={`geraet-${idx}`}
                  onClick={() => handleResultClick(item)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors ${
                    theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-50'
                  }`}
                >
                  {getIcon('geraet')}
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Standorte Results */}
          {results.results.standorte && results.results.standorte.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase ${
                theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a]' : 'text-gray-600 bg-gray-50'
              }`}>
                Standorte ({results.results.standorte.length})
              </div>
              {results.results.standorte.map((item, idx) => (
                <button
                  key={`standort-${idx}`}
                  onClick={() => handleResultClick(item)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors ${
                    theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-50'
                  }`}
                >
                  {getIcon('standort')}
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ID-Checks Results */}
          {results.results.id_checks && results.results.id_checks.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase ${
                theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a]' : 'text-gray-600 bg-gray-50'
              }`}>
                ID-Checks ({results.results.id_checks.length})
              </div>
              {results.results.id_checks.map((item, idx) => (
                <button
                  key={`id-check-${idx}`}
                  onClick={() => handleResultClick(item)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors ${
                    theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-50'
                  }`}
                >
                  {getIcon('id-check')}
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Tickets Section */}
          {results.results.tickets && results.results.tickets.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase ${
                theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a]' : 'text-gray-600 bg-gray-50'
              }`}>
                Tickets ({results.results.tickets.length})
              </div>
              {results.results.tickets.map((item, idx) => (
                <button
                  key={`ticket-${idx}`}
                  onClick={() => handleResultClick(item)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors ${
                    theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-50'
                  }`}
                >
                  {getIcon('ticket')}
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Euroboxes Section */}
          {results.results.euroboxes && results.results.euroboxes.length > 0 && (
            <div>
              <div className={`px-4 py-2 text-xs font-semibold uppercase ${
                theme === 'dark' ? 'text-gray-400 bg-[#1a1a1a]' : 'text-gray-600 bg-gray-50'
              }`}>
                Euroboxen ({results.results.euroboxes.length})
              </div>
              {results.results.euroboxes.map((item, idx) => (
                <button
                  key={`eurobox-${idx}`}
                  onClick={() => handleResultClick(item)}
                  className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-opacity-50 transition-colors ${
                    theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-50'
                  }`}
                >
                  {getIcon('eurobox')}
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;

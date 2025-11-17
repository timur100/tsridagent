import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, Upload, Save, Trash2, Search, Filter } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { COUNTRIES_BY_LETTER, DOCUMENT_TYPES, ALPHABET } from '../utils/countries';
import toast from 'react-hot-toast';

const CatalogPortal = () => {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const apiCall = useAuth().apiCall;

  // State
  const [selectedLetter, setSelectedLetter] = useState('D'); // Default to D for Deutschland
  const [documentType, setDocumentType] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [issueYear, setIssueYear] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  
  // Image states
  const [frontOriginal, setFrontOriginal] = useState(null);
  const [frontIR, setFrontIR] = useState(null);
  const [frontUV, setFrontUV] = useState(null);
  const [backOriginal, setBackOriginal] = useState(null);
  const [backIR, setBackIR] = useState(null);
  const [backUV, setBackUV] = useState(null);
  
  // Image previews
  const [previews, setPreviews] = useState({});
  
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [statistics, setStatistics] = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load documents and statistics
  useEffect(() => {
    loadDocuments();
    loadStatistics();
  }, [selectedLetter, documentType]);

  const loadDocuments = async () => {
    try {
      const countryCode = selectedCountry?.code;
      const params = new URLSearchParams();
      if (countryCode) params.append('country_code', countryCode);
      if (documentType) params.append('document_type', documentType);
      
      const result = await apiCall(`/api/catalog/documents?${params.toString()}`);
      if (result.success) {
        setDocuments(result.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const result = await apiCall('/api/catalog/statistics');
      if (result.success) {
        setStatistics(result.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleImageUpload = (e, setter, previewKey) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [previewKey]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!documentType) {
      toast.error('Bitte wählen Sie einen Dokumenttyp aus');
      return;
    }
    
    if (!selectedCountry) {
      toast.error('Bitte wählen Sie ein Land aus');
      return;
    }
    
    // Validate required images
    if (!frontOriginal || !frontIR || !frontUV) {
      toast.error('Bitte laden Sie alle Vorderseiten-Bilder hoch (Original, IR, UV)');
      return;
    }
    
    // For non-passport documents, check back side images
    if (documentType !== 'Reisepass') {
      if (!backOriginal || !backIR || !backUV) {
        toast.error('Bitte laden Sie alle Rückseiten-Bilder hoch (Original, IR, UV)');
        return;
      }
    }
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('document_type', documentType);
      formData.append('country', selectedCountry.name);
      formData.append('country_code', selectedCountry.code);
      if (issueYear) formData.append('issue_year', issueYear);
      if (documentNumber) formData.append('document_number', documentNumber);
      if (notes) formData.append('notes', notes);
      if (tags) formData.append('tags', tags);
      
      // Append images
      formData.append('front_original', frontOriginal);
      formData.append('front_ir', frontIR);
      formData.append('front_uv', frontUV);
      
      if (documentType !== 'Reisepass') {
        formData.append('back_original', backOriginal);
        formData.append('back_ir', backIR);
        formData.append('back_uv', backUV);
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/catalog/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Dokument erfolgreich gespeichert!');
        
        // Reset form
        setDocumentType('');
        setSelectedCountry(null);
        setIssueYear('');
        setDocumentNumber('');
        setNotes('');
        setTags('');
        setFrontOriginal(null);
        setFrontIR(null);
        setFrontUV(null);
        setBackOriginal(null);
        setBackIR(null);
        setBackUV(null);
        setPreviews({});
        
        // Reload documents
        loadDocuments();
        loadStatistics();
      } else {
        toast.error(result.detail || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Fehler beim Speichern des Dokuments');
    } finally {
      setLoading(false);
    }
  };

  const availableCountries = COUNTRIES_BY_LETTER[selectedLetter] || [];
  const showBackSide = documentType && documentType !== 'Reisepass';

  if (!user) {
    return null;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow-lg ${theme === 'dark' ? 'bg-gradient-to-r from-[#c00000] to-[#a00000]' : 'bg-white border-b border-gray-200'}`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>
              Dokumenten-Katalog
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-[#c00000]'}`}>{user?.name}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-red-100' : 'text-gray-500'}`}>{user?.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className={`flex items-center space-x-2 ${
                  theme === 'dark'
                    ? 'bg-transparent border-white text-white hover:bg-white hover:text-[#c00000]'
                    : 'border-[#c00000] text-[#c00000] hover:bg-[#c00000] hover:text-white'
                }`}
              >
                <LogOut className="h-4 w-4" />
                <span>Abmelden</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Alphabet Navigation - Left Side */}
        <div className={`w-12 flex flex-col items-center py-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-y-auto`}>
          {ALPHABET.reverse().map((letter) => (
            <button
              key={letter}
              onClick={() => {
                setSelectedLetter(letter);
                setSelectedCountry(null);
              }}
              className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded transition-colors mb-1 ${
                selectedLetter === letter
                  ? theme === 'dark'
                    ? 'bg-[#c00000] text-white'
                    : 'bg-[#c00000] text-white'
                  : theme === 'dark'
                  ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics.total}</p>
              </Card>
              <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Länder</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{statistics.total_countries}</p>
              </Card>
              <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Buchstabe {selectedLetter}</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{availableCountries.length} Länder</p>
              </Card>
              <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ausgewählt</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{documents.length}</p>
              </Card>
            </div>
          )}

          {/* Upload Form */}
          <Card className={`p-6 mb-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Neues Dokument hinzufügen
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Document Type Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Dokumenttyp *
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                >
                  <option value="">Bitte wählen...</option>
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Country Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Land * (Buchstabe: {selectedLetter})
                </label>
                <select
                  value={selectedCountry?.code || ''}
                  onChange={(e) => {
                    const country = availableCountries.find(c => c.code === e.target.value);
                    setSelectedCountry(country);
                  }}
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                >
                  <option value="">Bitte wählen...</option>
                  {availableCountries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Ausstellungsjahr
                  </label>
                  <input
                    type="number"
                    value={issueYear}
                    onChange={(e) => setIssueYear(e.target.value)}
                    placeholder="z.B. 2023"
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dokumentnummer
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="z.B. C01X00T47"
                    className={`w-full px-3 py-2 rounded border ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Notizen
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows="2"
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tags (kommagetrennt)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="z.B. neu, 2023, deutsch"
                  className={`w-full px-3 py-2 rounded border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Image Upload Grid */}
              {documentType && (
                <div className="mt-6">
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Bilder hochladen *
                  </h3>
                  
                  <div className={`grid ${showBackSide ? 'grid-cols-2' : 'grid-cols-1'} gap-6`}>
                    {/* Front Side */}
                    <div>
                      <h4 className={`text-md font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Vorderseite
                      </h4>
                      <div className="space-y-3">
                        {['Original', 'IR', 'UV'].map((type, index) => (
                          <div key={type}>
                            <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {type} *
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const setters = [setFrontOriginal, setFrontIR, setFrontUV];
                                handleImageUpload(e, setters[index], `front_${type.toLowerCase()}`);
                              }}
                              className={`w-full text-sm ${
                                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                              }`}
                              required
                            />
                            {previews[`front_${type.toLowerCase()}`] && (
                              <img
                                src={previews[`front_${type.toLowerCase()}`]}
                                alt={`Front ${type}`}
                                className="mt-2 h-20 object-cover rounded"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Back Side (if not passport) */}
                    {showBackSide && (
                      <div>
                        <h4 className={`text-md font-medium mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                          Rückseite
                        </h4>
                        <div className="space-y-3">
                          {['Original', 'IR', 'UV'].map((type, index) => (
                            <div key={type}>
                              <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {type} *
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const setters = [setBackOriginal, setBackIR, setBackUV];
                                  handleImageUpload(e, setters[index], `back_${type.toLowerCase()}`);
                                }}
                                className={`w-full text-sm ${
                                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                                }`}
                                required
                              />
                              {previews[`back_${type.toLowerCase()}`] && (
                                <img
                                  src={previews[`back_${type.toLowerCase()}`]}
                                  alt={`Back ${type}`}
                                  className="mt-2 h-20 object-cover rounded"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-[#c00000] text-white hover:bg-[#a00000]"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Speichert...' : 'Katalogisieren'}</span>
                </Button>
              </div>
            </form>
          </Card>

          {/* Documents List */}
          {documents.length > 0 && (
            <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <h2 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Katalogisierte Dokumente ({documents.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 rounded border ${
                      theme === 'dark'
                        ? 'border-gray-700 bg-[#1a1a1a]'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {doc.document_type}
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {doc.country} ({doc.country_code})
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        theme === 'dark'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {doc.issue_year || 'N/A'}
                      </span>
                    </div>
                    {doc.front_original && (
                      <img
                        src={`${process.env.REACT_APP_BACKEND_URL}${doc.front_original}`}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded mt-2"
                      />
                    )}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-0.5 rounded ${
                              theme === 'dark'
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CatalogPortal;

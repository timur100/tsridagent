import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  Users, Search, FileText, Fingerprint, Camera, 
  Image as ImageIcon, CheckCircle, XCircle, Eye, X, RefreshCw
} from 'lucide-react';

const FacematchPage = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);

  return (
    <div>
      {/* Sub-Tab Menu */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className={`p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/portal/admin/id-checks')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'text-gray-400 hover:bg-[#3a3a3a]' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText className="h-5 w-5" />
              Dokumentenscan
            </button>
            <button
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-[#c00000] text-white`}
            >
              <Users className="h-5 w-5" />
              Facematch
            </button>
            <button
              onClick={() => navigate('/portal/admin/fingerprint')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'text-gray-400 hover:bg-[#3a3a3a]' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Fingerprint className="h-5 w-5" />
              Fingerprint
            </button>
            <button
              onClick={() => navigate('/portal/admin/ki-search')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                theme === 'dark' ? 'text-gray-400 hover:bg-[#3a3a3a]' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Search className="h-5 w-5" />
              KI-Suche
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Facematch
            </h1>
            <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Vergleichen Sie Gesichter aus ID-Dokumenten mit Live-Aufnahmen
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className={`rounded-lg border-2 border-dashed p-12 text-center mb-6 ${
          theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-300 bg-gray-50'
        }`}>
          <Upload className={`mx-auto h-12 w-12 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Bilder für Facematch hochladen
          </h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Laden Sie ein Dokumentenbild und ein Vergleichsbild hoch
          </p>
          <button
            className="px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors"
          >
            Bilder auswählen
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Gesamt</p>
                <p className={`text-2xl font-bold mt-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>0</p>
              </div>
              <Users className={`h-8 w-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Übereinstimmung</p>
                <p className="text-2xl font-bold mt-1 text-green-500">0</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Keine Übereinstimmung</p>
                <p className="text-2xl font-bold mt-1 text-red-500">0</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Ausstehend</p>
                <p className="text-2xl font-bold mt-1 text-yellow-500">0</p>
              </div>
              <Eye className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className={`text-center py-12 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <ImageIcon className={`mx-auto h-16 w-16 mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Keine Facematch-Vergleiche vorhanden
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Laden Sie Bilder hoch, um den Gesichtsvergleich zu starten
          </p>
        </div>
      </div>
    </div>
  );
};

export default FacematchPage;

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader } from 'lucide-react';
import * as Icons from 'lucide-react';

const EuropcarMenuPage = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();
  const [tiles, setTiles] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenuData();
  }, []);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      
      // Fetch Europcar tenant ID
      const tenantsResponse = await apiCall('/api/tenants');
      const europcar = tenantsResponse.find(t => t.name === 'Europcar');
      
      if (!europcar) {
        console.error('Europcar tenant not found');
        setLoading(false);
        return;
      }

      console.log('Europcar tenant:', europcar);

      // Fetch quick menu tiles for Europcar
      const tilesResponse = await apiCall(`/api/quick-menu/tiles/tenant/${europcar.tenant_id}`);
      console.log('Tiles response:', tilesResponse);
      setTiles(tilesResponse?.tiles || []);

      // Fetch quick menu config for Europcar
      const configResponse = await apiCall(`/api/quick-menu/config/tenant/${europcar.tenant_id}`);
      console.log('Config response:', configResponse);
      setConfig(configResponse?.config || null);

      setLoading(false);
    } catch (error) {
      console.error('Error loading menu data:', error);
      setLoading(false);
    }
  };

  const handleTileClick = (tile) => {
    if (tile.link) {
      if (tile.link.startsWith('http')) {
        window.open(tile.link, '_blank');
      } else {
        navigate(tile.link);
      }
    }
  };

  const getIconComponent = (iconName) => {
    const IconComponent = Icons[iconName];
    return IconComponent || Icons.Grid;
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin mx-auto mb-4 text-[#c00000]" />
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Lade Schnellmenü...
          </p>
        </div>
      </div>
    );
  }

  const gridCols = config?.grid_layout || '3x3';
  const gridClass = {
    '2x2': 'grid-cols-2',
    '3x3': 'grid-cols-3',
    '4x4': 'grid-cols-4'
  }[gridCols] || 'grid-cols-3';

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-[#2a2a2a] text-gray-400'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {config?.title || 'Europcar Schnellmenü'}
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {user?.tenant_name || 'Europcar'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {tiles.length === 0 ? (
          <div className="text-center py-12">
            <Icons.Grid className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-400'}`} />
            <p className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Keine Menüpunkte konfiguriert
            </p>
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Bitte konfigurieren Sie das Schnellmenü im Admin-Bereich
            </p>
          </div>
        ) : (
          <div className={`grid ${gridClass} gap-6`}>
            {tiles
              .sort((a, b) => a.position - b.position)
              .map((tile) => {
                const IconComponent = getIconComponent(tile.icon);
                return (
                  <button
                    key={tile.id}
                    onClick={() => handleTileClick(tile)}
                    disabled={!tile.link}
                    className={`p-8 rounded-xl border-2 transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-800 hover:border-gray-700 hover:bg-[#222222]'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
                    } ${tile.link ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    style={{
                      borderColor: tile.color,
                      borderWidth: '2px'
                    }}
                  >
                    <div className="flex flex-col items-center text-center gap-4">
                      <div
                        className="p-4 rounded-xl"
                        style={{ backgroundColor: `${tile.color}20` }}
                      >
                        <IconComponent
                          className="h-10 w-10"
                          style={{ color: tile.color }}
                        />
                      </div>
                      <div>
                        <h3
                          className="text-lg font-bold mb-1"
                          style={{ color: theme === 'dark' ? '#ffffff' : '#111827' }}
                        >
                          {tile.title}
                        </h3>
                        {tile.description && (
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {tile.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EuropcarMenuPage;

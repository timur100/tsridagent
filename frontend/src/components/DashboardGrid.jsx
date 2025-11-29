import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Settings, RotateCcw, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const DashboardGrid = ({ children }) => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [isEditMode, setIsEditMode] = useState(false);
  const [layout, setLayout] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Default layout configuration
  const getDefaultLayout = () => {
    const childrenArray = React.Children.toArray(children);
    return childrenArray.map((child, index) => ({
      i: `card-${index}`,
      x: index % 4,  // 4 columns
      y: Math.floor(index / 4),
      w: 1,
      h: 1,
      minW: 1,
      minH: 1,
      maxW: 4,
      maxH: 1,
    }));
  };

  const loadLayout = async () => {
    try {
      const defaultLayout = getDefaultLayout();
      console.log('[DashboardGrid] Default layout generated:', defaultLayout);
      
      const result = await apiCall('/api/dashboard/layout');
      console.log('[DashboardGrid] API response:', result);
      
      if (result.success && result.data.layout && result.data.layout.length > 0) {
        console.log('[DashboardGrid] Using saved layout:', result.data.layout);
        setLayout(result.data.layout);
      } else {
        console.log('[DashboardGrid] Using default layout');
        setLayout(defaultLayout);
      }
    } catch (error) {
      console.error('[DashboardGrid] Error loading layout:', error);
      const defaultLayout = getDefaultLayout();
      console.log('[DashboardGrid] Fallback to default layout:', defaultLayout);
      setLayout(defaultLayout);
    }
  };

  // Load layout from backend
  useEffect(() => {
    loadLayout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveLayout = async () => {
    try {
      // Filter layout to only include required fields for backend
      const cleanLayout = layout.map(item => ({
        i: item.i.split('/')[0], // Remove React key suffix (e.g., "card-0/.0" -> "card-0")
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      }));

      const result = await apiCall('/api/dashboard/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ layout: cleanLayout }),
      });

      if (result.success) {
        toast.success('Layout gespeichert!');
        setHasChanges(false);
      } else {
        toast.error('Fehler beim Speichern des Layouts');
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Fehler beim Speichern des Layouts');
    }
  };

  const resetLayout = async () => {
    if (!window.confirm('Möchten Sie das Layout wirklich zurücksetzen?')) {
      return;
    }

    try {
      const result = await apiCall('/api/dashboard/layout/reset', {
        method: 'POST',
      });

      if (result.success) {
        toast.success('Layout zurückgesetzt!');
        setLayout(getDefaultLayout());
        setHasChanges(false);
      } else {
        toast.error('Fehler beim Zurücksetzen');
      }
    } catch (error) {
      console.error('Error resetting layout:', error);
      toast.error('Fehler beim Zurücksetzen');
    }
  };

  const handleLayoutChange = (newLayout) => {
    if (isEditMode) {
      setLayout(newLayout);
      setHasChanges(true);
    }
  };

  const toggleEditMode = () => {
    if (isEditMode && hasChanges) {
      if (window.confirm('Sie haben ungespeicherte Änderungen. Möchten Sie ohne Speichern fortfahren?')) {
        loadLayout(); // Reload original layout
        setIsEditMode(false);
        setHasChanges(false);
      }
    } else {
      setIsEditMode(!isEditMode);
    }
  };

  return (
    <div className="relative">
      {/* Edit Mode Controls */}
      <div className="flex justify-end gap-2 mb-4">
        {isEditMode && (
          <>
            <Button
              onClick={resetLayout}
              variant="outline"
              size="sm"
              className={`flex items-center gap-2 ${
                theme === 'dark'
                  ? 'bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              Zurücksetzen
            </Button>
            <Button
              onClick={saveLayout}
              disabled={!hasChanges}
              size="sm"
              className={`flex items-center gap-2 ${
                hasChanges
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-400 cursor-not-allowed text-gray-200'
              }`}
            >
              <Save className="h-4 w-4" />
              Speichern
            </Button>
          </>
        )}
        <Button
          onClick={toggleEditMode}
          size="sm"
          className={`flex items-center gap-2 ${
            isEditMode
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : theme === 'dark'
              ? 'bg-[#c00000] hover:bg-[#a00000] text-white'
              : 'bg-[#c00000] hover:bg-[#a00000] text-white'
          }`}
        >
          {isEditMode ? (
            <>
              <X className="h-4 w-4" />
              Beenden
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              Bearbeiten
            </>
          )}
        </Button>
      </div>

      {/* Edit Mode Indicator */}
      {isEditMode && (
        <div className={`mb-4 p-3 rounded-lg border ${
          theme === 'dark'
            ? 'bg-blue-900/20 border-blue-500/30 text-blue-300'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p className="text-sm font-medium">
            🔧 Bearbeitungsmodus aktiv - Ziehen Sie die Kacheln, um sie neu anzuordnen
          </p>
        </div>
      )}

      {/* Grid Layout */}
      {layout.length > 0 ? (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout, md: layout, sm: layout, xs: layout, xxs: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 4, md: 4, sm: 2, xs: 1, xxs: 1 }}
          rowHeight={150}
          isDraggable={isEditMode}
          isResizable={false}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          containerPadding={[0, 0]}
          margin={[12, 12]}
        >
        {React.Children.map(children, (child, index) => (
          <div key={`card-${index}`} className="relative">
            {/* Drag Handle - only visible in edit mode */}
            {isEditMode && (
              <div className={`drag-handle absolute top-2 left-2 z-10 cursor-move p-2 rounded ${
                theme === 'dark'
                  ? 'bg-gray-700/80 hover:bg-gray-600/80'
                  : 'bg-gray-200/80 hover:bg-gray-300/80'
              }`}>
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                    <div className="w-1 h-1 rounded-full bg-gray-500"></div>
                  </div>
                </div>
              </div>
            )}
            {/* Card Content */}
            <div className={isEditMode ? 'pointer-events-none' : ''}>
              {child}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Custom CSS for grid items */}
      <style>{`
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
        }
        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
        }
        .react-grid-item.dropping {
          visibility: hidden;
        }
        .react-grid-item.react-grid-placeholder {
          background: ${theme === 'dark' ? 'rgba(192, 0, 0, 0.2)' : 'rgba(192, 0, 0, 0.15)'};
          opacity: 0.5;
          transition-duration: 100ms;
          z-index: 2;
          border-radius: 12px;
          border: 2px dashed ${theme === 'dark' ? '#c00000' : '#c00000'};
        }
      `}</style>
    </div>
  );
};

export default DashboardGrid;

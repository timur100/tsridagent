import React, { useState, useEffect, useRef } from 'react';
import { Settings, Eye, EyeOff, GripVertical, RotateCcw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Reusable Column Settings component for tables
 * 
 * Props:
 * - columns: Array of column definitions { id, label, visible, sortable }
 * - onColumnsChange: Callback when columns change
 * - storageKey: localStorage key for persisting column settings
 * - defaultColumns: Default column configuration for reset
 */
const TableColumnSettings = ({
  columns,
  onColumnsChange,
  storageKey,
  defaultColumns
}) => {
  const { theme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const containerRef = useRef(null);

  // Close settings when clicking outside
  useEffect(() => {
    if (!showSettings) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSettings]);

  // Save columns to localStorage when changed
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(columns));
    }
  }, [columns, storageKey]);

  // Toggle column visibility
  const toggleColumnVisibility = (columnId) => {
    if (columnId === 'select' || columnId === 'actions') return;
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    onColumnsChange(newColumns);
  };

  // Drag & drop handlers
  const handleDragStart = (e, columnId) => {
    if (columnId === 'select' || columnId === 'actions') return;
    setDraggedColumn(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    if (columnId === 'select' || columnId === 'actions' || columnId === draggedColumn) return;

    const dragIndex = columns.findIndex(c => c.id === draggedColumn);
    const hoverIndex = columns.findIndex(c => c.id === columnId);

    if (dragIndex === -1 || hoverIndex === -1) return;

    const newColumns = [...columns];
    const [removed] = newColumns.splice(dragIndex, 1);
    newColumns.splice(hoverIndex, 0, removed);
    onColumnsChange(newColumns);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // Reset columns to default
  const resetColumns = () => {
    if (defaultColumns) {
      onColumnsChange(defaultColumns);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  };

  const visibleCount = columns.filter(c => c.visible && c.id !== 'select' && c.id !== 'actions').length;
  const totalCount = columns.filter(c => c.id !== 'select' && c.id !== 'actions').length;

  return (
    <div ref={containerRef} className="relative" data-column-settings>
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`p-2 rounded-lg transition-colors ${
          showSettings
            ? theme === 'dark'
              ? 'bg-[#c00000] text-white'
              : 'bg-[#c00000] text-white'
            : theme === 'dark'
            ? 'hover:bg-[#3d3d3d] text-gray-400'
            : 'hover:bg-gray-100 text-gray-600'
        }`}
        title="Spalten konfigurieren"
        data-testid="column-settings-btn"
      >
        <Settings className="h-5 w-5" />
      </button>

      {/* Settings Dropdown */}
      {showSettings && (
        <div
          className={`absolute right-0 top-full mt-2 w-72 rounded-lg shadow-xl border z-50 ${
            theme === 'dark'
              ? 'bg-[#2d2d2d] border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          {/* Header */}
          <div className={`px-4 py-3 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Spalten ({visibleCount}/{totalCount})
              </h3>
              <button
                onClick={resetColumns}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-[#3d3d3d]'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Zurücksetzen"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>
            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              Ziehen zum Neuordnen
            </p>
          </div>

          {/* Column List */}
          <div className="max-h-80 overflow-y-auto py-2">
            {columns
              .filter(col => col.id !== 'select' && col.id !== 'actions')
              .map((col) => (
                <div
                  key={col.id}
                  draggable={col.id !== 'select' && col.id !== 'actions'}
                  onDragStart={(e) => handleDragStart(e, col.id)}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-4 py-2 cursor-move transition-colors ${
                    draggedColumn === col.id
                      ? theme === 'dark'
                        ? 'bg-[#3d3d3d]'
                        : 'bg-gray-100'
                      : theme === 'dark'
                      ? 'hover:bg-[#3d3d3d]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <GripVertical className={`h-4 w-4 flex-shrink-0 ${
                    theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  
                  <button
                    onClick={() => toggleColumnVisibility(col.id)}
                    className={`p-1 rounded transition-colors ${
                      col.visible
                        ? 'text-green-500 hover:bg-green-500/20'
                        : theme === 'dark'
                        ? 'text-gray-600 hover:bg-gray-700'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {col.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  
                  <span className={`flex-1 text-sm ${
                    col.visible
                      ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                      : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {col.label}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableColumnSettings;

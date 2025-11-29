import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { Settings, RotateCcw, Save, X, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardGridSimple = ({ children }) => {
  const { apiCall } = useAuth();
  const { theme } = useTheme();
  const [isEditMode, setIsEditMode] = useState(false);
  const [cardOrder, setCardOrder] = useState([]);
  const [dummyCards, setDummyCards] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Initialize card order
  useEffect(() => {
    loadLayout();
  }, [children]);

  const loadLayout = async () => {
    try {
      const result = await apiCall('/api/dashboard/layout');
      const childrenCount = React.Children.count(children);
      
      if (result.success && result.data.layout && result.data.layout.length > 0) {
        // Convert layout to order array
        const sortedLayout = [...result.data.layout].sort((a, b) => {
          if (a.y === b.y) return a.x - b.x;
          return a.y - b.y;
        });
        
        // Separate real cards and dummy cards
        const realCards = sortedLayout.filter(item => !item.i.startsWith('dummy-'));
        const dummyCardItems = sortedLayout.filter(item => item.i.startsWith('dummy-'));
        
        const order = realCards.map(item => parseInt(item.i.replace('card-', '')));
        const dummies = dummyCardItems.map(item => ({
          id: item.i,
          position: sortedLayout.indexOf(item)
        }));
        
        setCardOrder(order);
        setDummyCards(dummies);
      } else {
        // Default order
        setCardOrder(Array.from({ length: childrenCount }, (_, i) => i));
        setDummyCards([]);
      }
    } catch (error) {
      console.error('Error loading layout:', error);
      const childrenCount = React.Children.count(children);
      setCardOrder(Array.from({ length: childrenCount }, (_, i) => i));
      setDummyCards([]);
    }
  };

  const saveLayout = async () => {
    try {
      // Merge real cards and dummy cards
      const allItems = [];
      const totalItems = cardOrder.length + dummyCards.length;
      
      let cardIdx = 0;
      let dummyIdx = 0;
      
      for (let i = 0; i < totalItems; i++) {
        const isDummy = dummyCards.some(d => d.position === i);
        if (isDummy) {
          const dummy = dummyCards.find(d => d.position === i);
          allItems.push({
            i: dummy.id,
            x: i % 4,
            y: Math.floor(i / 4),
            w: 1,
            h: 1
          });
          dummyIdx++;
        } else if (cardIdx < cardOrder.length) {
          allItems.push({
            i: `card-${cardOrder[cardIdx]}`,
            x: i % 4,
            y: Math.floor(i / 4),
            w: 1,
            h: 1
          });
          cardIdx++;
        }
      }

      const result = await apiCall('/api/dashboard/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ layout: allItems }),
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
        const childrenCount = React.Children.count(children);
        setCardOrder(Array.from({ length: childrenCount }, (_, i) => i));
        setDummyCards([]);
        setHasChanges(false);
      } else {
        toast.error('Fehler beim Zurücksetzen');
      }
    } catch (error) {
      console.error('Error resetting layout:', error);
      toast.error('Fehler beim Zurücksetzen');
    }
  };

  const addDummyCard = () => {
    const newDummyId = `dummy-${Date.now()}`;
    const newPosition = cardOrder.length + dummyCards.length;
    setDummyCards([...dummyCards, { id: newDummyId, position: newPosition }]);
    setHasChanges(true);
    toast.success('Dummy-Kachel hinzugefügt');
  };

  const removeDummyCard = (dummyId) => {
    setDummyCards(dummyCards.filter(d => d.id !== dummyId));
    setHasChanges(true);
  };

  const toggleEditMode = () => {
    if (isEditMode && hasChanges) {
      if (window.confirm('Sie haben ungespeicherte Änderungen. Möchten Sie ohne Speichern fortfahren?')) {
        loadLayout();
        setIsEditMode(false);
        setHasChanges(false);
      }
    } else {
      setIsEditMode(!isEditMode);
    }
  };

  const handleDragStart = (e, index) => {
    if (!isEditMode) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    if (!isEditMode || draggedIndex === null) return;
    e.preventDefault();
    
    if (draggedIndex !== index) {
      const newOrder = [...cardOrder];
      const draggedItem = newOrder[draggedIndex];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(index, 0, draggedItem);
      setCardOrder(newOrder);
      setDraggedIndex(index);
      setHasChanges(true);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const childrenArray = React.Children.toArray(children);

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

      {/* Simple CSS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {cardOrder.map((cardIndex, position) => {
          const child = childrenArray[cardIndex];
          if (!child) return null;

          return (
            <div
              key={`card-${cardIndex}`}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, position)}
              onDragOver={(e) => handleDragOver(e, position)}
              onDragEnd={handleDragEnd}
              className={`relative transition-all duration-200 ${
                isEditMode ? 'cursor-move' : ''
              } ${draggedIndex === position ? 'opacity-50' : ''}`}
            >
              {/* Drag Handle */}
              {isEditMode && (
                <div className={`absolute top-2 left-2 z-10 p-2 rounded ${
                  theme === 'dark'
                    ? 'bg-gray-700/80 hover:bg-gray-600/80'
                    : 'bg-gray-200/80 hover:bg-gray-300/80'
                }`}>
                  <GripVertical className="h-4 w-4 text-gray-500" />
                </div>
              )}
              {/* Card Content */}
              <div className={isEditMode ? 'pointer-events-none' : ''}>
                {child}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardGridSimple;

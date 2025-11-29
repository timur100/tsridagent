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
      
      console.log('[DashboardGrid] API result:', result);
      
      if (result.success && result.data.data && result.data.data.layout && result.data.data.layout.length > 0) {
        // Sort by position (y then x)
        const sortedLayout = [...result.data.data.layout].sort((a, b) => {
          if (a.y === b.y) return a.x - b.x;
          return a.y - b.y;
        });
        
        console.log('[DashboardGrid] Sorted layout:', sortedLayout);
        
        // Separate real cards and dummy cards
        const realCards = [];
        const dummyCardItems = [];
        
        sortedLayout.forEach((item, index) => {
          if (item.i.startsWith('dummy-')) {
            dummyCardItems.push({
              id: item.i,
              position: index  // Position in the merged list
            });
          } else {
            realCards.push({
              cardIndex: parseInt(item.i.replace('card-', '')),
              position: index
            });
          }
        });
        
        console.log('[DashboardGrid] Real cards:', realCards);
        console.log('[DashboardGrid] Dummy cards:', dummyCardItems);
        
        // Reconstruct order maintaining positions
        const newCardOrder = [];
        let realCardIdx = 0;
        
        for (let i = 0; i < sortedLayout.length; i++) {
          if (!sortedLayout[i].i.startsWith('dummy-')) {
            newCardOrder.push(parseInt(sortedLayout[i].i.replace('card-', '')));
          }
        }
        
        setCardOrder(newCardOrder);
        setDummyCards(dummyCardItems);
      } else {
        // Default order
        console.log('[DashboardGrid] Using default layout');
        setCardOrder(Array.from({ length: childrenCount }, (_, i) => i));
        setDummyCards([]);
      }
    } catch (error) {
      console.error('[DashboardGrid] Error loading layout:', error);
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
      // Get all items (cards + dummies)
      const allItems = [];
      let cardIdx = 0;
      let dummyIdx = 0;
      const totalItems = cardOrder.length + dummyCards.length;
      
      for (let i = 0; i < totalItems; i++) {
        const dummy = dummyCards.find(d => d.position === i);
        if (dummy) {
          allItems.push({ type: 'dummy', id: dummy.id, originalIndex: i });
        } else if (cardIdx < cardOrder.length) {
          allItems.push({ type: 'card', cardIndex: cardOrder[cardIdx], originalIndex: i });
          cardIdx++;
        }
      }
      
      // Swap items
      const draggedItem = allItems[draggedIndex];
      allItems.splice(draggedIndex, 1);
      allItems.splice(index, 0, draggedItem);
      
      // Reconstruct cardOrder and dummyCards
      const newCardOrder = [];
      const newDummyCards = [];
      
      allItems.forEach((item, pos) => {
        if (item.type === 'card') {
          newCardOrder.push(item.cardIndex);
        } else {
          newDummyCards.push({ id: item.id, position: pos });
        }
      });
      
      setCardOrder(newCardOrder);
      setDummyCards(newDummyCards);
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
              onClick={addDummyCard}
              variant="outline"
              size="sm"
              className={`flex items-center gap-2 ${
                theme === 'dark'
                  ? 'bg-transparent border-blue-700 text-blue-300 hover:bg-blue-900'
                  : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Dummy Kachel Hinzufügen
            </Button>
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

      {/* Simple CSS Grid with equal height cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {(() => {
          const allItems = [];
          let cardIdx = 0;
          const totalItems = cardOrder.length + dummyCards.length;
          
          for (let i = 0; i < totalItems; i++) {
            const dummy = dummyCards.find(d => d.position === i);
            if (dummy) {
              allItems.push({ type: 'dummy', id: dummy.id, position: i });
            } else if (cardIdx < cardOrder.length) {
              allItems.push({ type: 'card', cardIndex: cardOrder[cardIdx], position: i });
              cardIdx++;
            }
          }
          
          return allItems.map((item) => {
            if (item.type === 'dummy') {
              return (
                <div
                  key={item.id}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, item.position)}
                  onDragOver={(e) => handleDragOver(e, item.position)}
                  onDragEnd={handleDragEnd}
                  className={`relative transition-all duration-200 ${
                    isEditMode ? 'cursor-move' : ''
                  } ${draggedIndex === item.position ? 'opacity-50' : ''}`}
                  style={{ minHeight: '180px' }}
                >
                  <div className={`h-full rounded-xl border-2 border-dashed flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-gray-800/30 border-gray-600'
                      : 'bg-gray-100/50 border-gray-300'
                  }`}>
                    {isEditMode && (
                      <div className="flex flex-col items-center gap-2">
                        <GripVertical className="h-6 w-6 text-gray-400" />
                        <span className="text-sm text-gray-400">Dummy</span>
                        <button
                          onClick={() => removeDummyCard(item.id)}
                          className="mt-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Entfernen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            } else {
              const child = childrenArray[item.cardIndex];
              if (!child) return null;

              return (
                <div
                  key={`card-${item.cardIndex}`}
                  draggable={isEditMode}
                  onDragStart={(e) => handleDragStart(e, item.position)}
                  onDragOver={(e) => handleDragOver(e, item.position)}
                  onDragEnd={handleDragEnd}
                  className={`relative transition-all duration-200 ${
                    isEditMode ? 'cursor-move' : ''
                  } ${draggedIndex === item.position ? 'opacity-50' : ''}`}
                  style={{ minHeight: '180px' }}
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
                  {/* Card Content - with equal height */}
                  <div className={`h-full ${isEditMode ? 'pointer-events-none' : ''}`}>
                    {child}
                  </div>
                </div>
              );
            }
          });
        })()}
      </div>

      {/* Custom CSS for equal height cards */}
      <style>{`
        /* Ensure all cards have the same height */
        .grid > div {
          display: flex;
          flex-direction: column;
        }
        
        .grid > div > div:last-child {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        /* Make all Card components fill their container */
        .grid > div > div:last-child > * {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
};

export default DashboardGridSimple;

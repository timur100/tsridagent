import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Virtualized table component for large datasets
 * Only renders visible rows for optimal performance
 * 
 * Props:
 * - data: Array of row data
 * - columns: Column definitions { id, label, visible, render }
 * - rowHeight: Height of each row in pixels (default: 56)
 * - maxHeight: Maximum height of the table container (default: 600)
 * - onRowClick: Callback when a row is clicked
 * - selectedIds: Set of selected row IDs
 * - onSelectRow: Callback for row selection
 * - idField: Field name for row ID (default: 'id')
 * - theme: 'dark' or 'light'
 */
const VirtualizedTable = ({
  data = [],
  columns = [],
  rowHeight = 56,
  maxHeight = 600,
  onRowClick,
  selectedIds = new Set(),
  onSelectRow,
  idField = 'id',
  theme = 'light'
}) => {
  const parentRef = useRef(null);
  const isDark = theme === 'dark';

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10, // Render 10 extra rows above/below viewport
  });

  const visibleColumns = columns.filter(col => col.visible !== false);

  const headerClass = `px-4 py-3 text-left text-xs font-semibold font-mono uppercase tracking-wider ${
    isDark ? 'text-gray-400' : 'text-gray-600'
  }`;

  const cellClass = `px-4 py-3 ${isDark ? 'text-gray-300' : 'text-gray-900'}`;

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Fixed Header */}
      <div className={`${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
        <div className="flex">
          {visibleColumns.map(col => (
            <div
              key={col.id}
              className={headerClass}
              style={{ 
                width: col.width || 'auto',
                flex: col.flex || 1,
                minWidth: col.minWidth || 80
              }}
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className={`overflow-auto ${isDark ? 'bg-[#2a2a2a]' : 'bg-white'}`}
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = data[virtualRow.index];
            const rowId = row[idField];
            const isSelected = selectedIds.has(rowId);

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={`flex border-t cursor-pointer transition-colors ${
                  isSelected
                    ? isDark ? 'bg-[#c00000]/10 border-gray-700' : 'bg-red-50 border-gray-200'
                    : isDark ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-200 hover:bg-gray-50'
                }`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(row)}
              >
                {visibleColumns.map(col => (
                  <div
                    key={col.id}
                    className={cellClass}
                    style={{ 
                      width: col.width || 'auto',
                      flex: col.flex || 1,
                      minWidth: col.minWidth || 80,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onClick={col.id === 'select' ? (e) => {
                      e.stopPropagation();
                      onSelectRow?.(rowId);
                    } : undefined}
                  >
                    {col.render ? col.render(row) : (
                      col.id === 'select' ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(rowId)}
                          className="h-4 w-4 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000]"
                        />
                      ) : (
                        <span className="truncate">{row[col.id] ?? '-'}</span>
                      )
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with row count */}
      <div className={`px-4 py-2 text-sm border-t ${
        isDark ? 'bg-[#1a1a1a] border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'
      }`}>
        {data.length} Einträge • Virtualisiert für optimale Performance
      </div>
    </div>
  );
};

export default VirtualizedTable;

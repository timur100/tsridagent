import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Reusable Selection Header component for tables
 * Shows selection count and provides select all functionality
 * 
 * Props:
 * - selectedCount: Number of selected items
 * - totalCount: Total number of items
 * - onSelectAll: Callback when select all is toggled
 * - label: Label for items (default: 'Einträge')
 */
const TableSelectionHeader = ({
  selectedCount,
  totalCount,
  onSelectAll,
  label = 'Einträge'
}) => {
  const { theme } = useTheme();
  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const isPartialSelected = selectedCount > 0 && selectedCount < totalCount;

  if (selectedCount === 0) return null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${
      theme === 'dark'
        ? 'bg-[#c00000]/20 border border-[#c00000]/30'
        : 'bg-red-50 border border-red-200'
    }`}>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isPartialSelected;
          }}
          onChange={onSelectAll}
          className="h-4 w-4 rounded border-gray-300 text-[#c00000] focus:ring-[#c00000]"
        />
        <span className={`text-sm font-medium ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          {selectedCount} von {totalCount} {label} ausgewählt
        </span>
      </div>
    </div>
  );
};

export default TableSelectionHeader;

import React, { useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

/**
 * Reusable Export/Import component for tables
 * 
 * Props:
 * - data: Array of objects to export
 * - columns: Array of column definitions { id, label }
 * - filename: Base filename for export (without extension)
 * - onImport: Callback function when data is imported (receives parsed data array)
 * - selectedIds: Set of selected IDs for partial export (optional)
 * - idField: Field name for ID (default: 'id')
 */
const TableExportImport = ({ 
  data = [], 
  columns = [], 
  filename = 'export',
  onImport,
  selectedIds,
  idField = 'id'
}) => {
  const { theme } = useTheme();
  const fileInputRef = useRef(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);

  // Get data to export (all or selected)
  const getExportData = () => {
    if (selectedIds && selectedIds.size > 0) {
      return data.filter(item => selectedIds.has(item[idField]));
    }
    return data;
  };

  // Convert data to CSV string
  const toCSV = (exportData) => {
    const visibleColumns = columns.filter(col => col.id !== 'select' && col.id !== 'actions');
    const headers = visibleColumns.map(col => col.label).join(';');
    
    const rows = exportData.map(item => {
      return visibleColumns.map(col => {
        let value = item[col.id];
        // Handle nested objects
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        // Escape semicolons and quotes
        if (value !== null && value !== undefined) {
          value = String(value).replace(/"/g, '""');
          if (value.includes(';') || value.includes('"') || value.includes('\n')) {
            value = `"${value}"`;
          }
        } else {
          value = '';
        }
        return value;
      }).join(';');
    });

    return [headers, ...rows].join('\n');
  };

  // Export as CSV
  const exportCSV = () => {
    const exportData = getExportData();
    if (exportData.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }

    const csv = toCSV(exportData);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`${exportData.length} Einträge als CSV exportiert`);
    setShowExportMenu(false);
  };

  // Export as Excel (XLSX)
  const exportExcel = async () => {
    const exportData = getExportData();
    if (exportData.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }

    try {
      // Dynamic import of xlsx library
      const XLSX = await import('xlsx');
      
      const visibleColumns = columns.filter(col => col.id !== 'select' && col.id !== 'actions');
      
      // Prepare worksheet data
      const wsData = [
        visibleColumns.map(col => col.label), // Headers
        ...exportData.map(item => 
          visibleColumns.map(col => {
            let value = item[col.id];
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value);
            }
            return value ?? '';
          })
        )
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Daten');
      
      // Auto-width columns
      const colWidths = visibleColumns.map((col, idx) => {
        const maxLen = Math.max(
          col.label.length,
          ...exportData.map(item => String(item[col.id] ?? '').length)
        );
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`${exportData.length} Einträge als Excel exportiert`);
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Excel-Export fehlgeschlagen. Versuchen Sie CSV.');
    }
    setShowExportMenu(false);
  };

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));
    const visibleColumns = columns.filter(col => col.id !== 'select' && col.id !== 'actions');
    
    // Map headers to column IDs
    const headerToId = {};
    headers.forEach((header, idx) => {
      const col = visibleColumns.find(c => c.label === header);
      if (col) headerToId[idx] = col.id;
    });

    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim().replace(/^"|"$/g, ''));
      const item = {};
      values.forEach((value, idx) => {
        if (headerToId[idx]) {
          item[headerToId[idx]] = value;
        }
      });
      if (Object.keys(item).length > 0) {
        result.push(item);
      }
    }
    return result;
  };

  // Parse Excel file
  const parseExcel = async (file) => {
    const XLSX = await import('xlsx');
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    
    const visibleColumns = columns.filter(col => col.id !== 'select' && col.id !== 'actions');
    
    // Map Excel column names to column IDs
    return jsonData.map(row => {
      const item = {};
      visibleColumns.forEach(col => {
        if (row[col.label] !== undefined) {
          item[col.id] = row[col.label];
        }
      });
      return item;
    });
  };

  // Handle file import
  const handleFileImport = async (event, format) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let importedData;
      
      if (format === 'csv') {
        const text = await file.text();
        importedData = parseCSV(text);
      } else {
        importedData = await parseExcel(file);
      }

      if (importedData.length === 0) {
        toast.error('Keine gültigen Daten in der Datei gefunden');
        return;
      }

      if (onImport) {
        onImport(importedData);
        toast.success(`${importedData.length} Einträge importiert`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Importieren der Datei');
    }

    // Reset file input
    event.target.value = '';
    setShowImportMenu(false);
  };

  const buttonClass = `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    theme === 'dark'
      ? 'bg-[#2d2d2d] text-gray-300 hover:bg-[#3d3d3d] border border-gray-700'
      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
  }`;

  const menuClass = `absolute top-full mt-1 right-0 z-50 min-w-[160px] rounded-lg shadow-lg border ${
    theme === 'dark'
      ? 'bg-[#2d2d2d] border-gray-700'
      : 'bg-white border-gray-200'
  }`;

  const menuItemClass = `w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
    theme === 'dark'
      ? 'text-gray-300 hover:bg-[#3d3d3d]'
      : 'text-gray-700 hover:bg-gray-50'
  }`;

  return (
    <div className="flex items-center gap-2">
      {/* Export Button */}
      <div className="relative">
        <button
          onClick={() => {
            setShowExportMenu(!showExportMenu);
            setShowImportMenu(false);
          }}
          className={buttonClass}
          data-testid="export-btn"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
          {selectedIds && selectedIds.size > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs rounded bg-[#c00000] text-white">
              {selectedIds.size}
            </span>
          )}
          <ChevronDown className="h-3 w-3 ml-1" />
        </button>

        {showExportMenu && (
          <div className={menuClass}>
            <button onClick={exportCSV} className={`${menuItemClass} rounded-t-lg`}>
              <FileText className="h-4 w-4 text-green-500" />
              <span>CSV exportieren</span>
            </button>
            <button onClick={exportExcel} className={`${menuItemClass} rounded-b-lg`}>
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              <span>Excel exportieren</span>
            </button>
          </div>
        )}
      </div>

      {/* Import Button */}
      {onImport && (
        <div className="relative">
          <button
            onClick={() => {
              setShowImportMenu(!showImportMenu);
              setShowExportMenu(false);
            }}
            className={buttonClass}
            data-testid="import-btn"
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </button>

          {showImportMenu && (
            <div className={menuClass}>
              <label className={`${menuItemClass} rounded-t-lg cursor-pointer`}>
                <FileText className="h-4 w-4 text-green-500" />
                <span>CSV importieren</span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleFileImport(e, 'csv')}
                />
              </label>
              <label className={`${menuItemClass} rounded-b-lg cursor-pointer`}>
                <FileSpreadsheet className="h-4 w-4 text-blue-500" />
                <span>Excel importieren</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileImport(e, 'excel')}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Click outside handler */}
      {(showExportMenu || showImportMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowExportMenu(false);
            setShowImportMenu(false);
          }}
        />
      )}
    </div>
  );
};

export default TableExportImport;

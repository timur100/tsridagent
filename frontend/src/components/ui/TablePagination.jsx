import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './button';

/**
 * Reusable Pagination component for tables
 * 
 * Props:
 * - currentPage: Current page number (1-indexed)
 * - totalPages: Total number of pages
 * - totalItems: Total number of items
 * - pageSize: Items per page
 * - onPageChange: Callback when page changes (page) => void
 * - onPageSizeChange: Callback when page size changes (size) => void
 * - pageSizeOptions: Array of page size options (default: [25, 50, 100])
 * - showPageSizeSelector: Show page size dropdown (default: true)
 * - theme: 'dark' or 'light'
 */
const TablePagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 200],
  showPageSizeSelector = true,
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  
  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const buttonClass = `p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    isDark
      ? 'hover:bg-[#3d3d3d] text-gray-400 hover:text-white'
      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
  }`;

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;
    
    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t ${
      isDark ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'
    }`}>
      {/* Left: Items info */}
      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        <span className="font-medium">{startItem}-{endItem}</span> von <span className="font-medium">{totalItems}</span> Einträgen
      </div>

      {/* Center: Page numbers */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          className={buttonClass}
          title="Erste Seite"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        
        {/* Previous page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className={buttonClass}
          title="Vorherige Seite"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {getPageNumbers().map((page, idx) => (
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className={`px-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-[#c00000] text-white'
                    : isDark
                    ? 'text-gray-400 hover:bg-[#3d3d3d] hover:text-white'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Next page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={buttonClass}
          title="Nächste Seite"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        
        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className={buttonClass}
          title="Letzte Seite"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      {/* Right: Page size selector */}
      {showPageSizeSelector && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Pro Seite:
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={`px-2 py-1 rounded-lg border text-sm ${
              isDark
                ? 'bg-[#2d2d2d] border-gray-700 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default TablePagination;

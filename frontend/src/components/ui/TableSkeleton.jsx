import React from 'react';

/**
 * Skeleton loading component for tables
 * Shows animated placeholder rows while data is loading
 * 
 * Props:
 * - rows: Number of skeleton rows to show (default: 5)
 * - columns: Number of columns (default: 6)
 * - theme: 'dark' or 'light'
 */
const TableSkeleton = ({ rows = 5, columns = 6, theme = 'light' }) => {
  const isDark = theme === 'dark';
  
  const shimmerClass = isDark
    ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800'
    : 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200';

  return (
    <div className={`overflow-hidden rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      <table className="w-full">
        {/* Header skeleton */}
        <thead className={isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
          <tr>
            {Array.from({ length: columns }).map((_, idx) => (
              <th key={idx} className="px-6 py-3">
                <div 
                  className={`h-4 rounded animate-pulse ${shimmerClass}`}
                  style={{ 
                    width: idx === 0 ? '40px' : idx === columns - 1 ? '80px' : `${60 + Math.random() * 40}%`,
                    animationDelay: `${idx * 100}ms`
                  }}
                />
              </th>
            ))}
          </tr>
        </thead>
        
        {/* Body skeleton rows */}
        <tbody className={isDark ? 'bg-[#2a2a2a]' : 'bg-white'}>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr 
              key={rowIdx} 
              className={`border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
            >
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-6 py-4">
                  <div 
                    className={`h-4 rounded animate-pulse ${shimmerClass}`}
                    style={{ 
                      width: colIdx === 0 ? '20px' : colIdx === columns - 1 ? '60px' : `${40 + Math.random() * 50}%`,
                      animationDelay: `${(rowIdx * columns + colIdx) * 50}ms`
                    }}
                  />
                  {/* Second line for some cells */}
                  {colIdx > 0 && colIdx < columns - 1 && Math.random() > 0.5 && (
                    <div 
                      className={`h-3 mt-2 rounded animate-pulse ${shimmerClass}`}
                      style={{ 
                        width: `${30 + Math.random() * 30}%`,
                        animationDelay: `${(rowIdx * columns + colIdx) * 50 + 100}ms`
                      }}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Card skeleton for card-based layouts
 */
export const CardSkeleton = ({ count = 3, theme = 'light' }) => {
  const isDark = theme === 'dark';
  const shimmerClass = isDark
    ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800'
    : 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200';

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx}
          className={`p-4 rounded-xl border ${isDark ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center gap-4">
            {/* Icon placeholder */}
            <div className={`w-12 h-12 rounded-lg animate-pulse ${shimmerClass}`} />
            
            {/* Content */}
            <div className="flex-1 space-y-2">
              <div 
                className={`h-5 rounded animate-pulse ${shimmerClass}`}
                style={{ width: `${50 + Math.random() * 30}%` }}
              />
              <div 
                className={`h-4 rounded animate-pulse ${shimmerClass}`}
                style={{ width: `${70 + Math.random() * 20}%` }}
              />
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <div className={`w-8 h-8 rounded animate-pulse ${shimmerClass}`} />
              <div className={`w-8 h-8 rounded animate-pulse ${shimmerClass}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Stats card skeleton
 */
export const StatsSkeleton = ({ count = 4, theme = 'light' }) => {
  const isDark = theme === 'dark';
  const shimmerClass = isDark
    ? 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800'
    : 'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div 
          key={idx}
          className={`p-6 rounded-xl border ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'}`}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div 
                className={`h-4 w-24 rounded animate-pulse ${shimmerClass}`}
                style={{ animationDelay: `${idx * 100}ms` }}
              />
              <div 
                className={`h-8 w-16 rounded animate-pulse ${shimmerClass}`}
                style={{ animationDelay: `${idx * 100 + 50}ms` }}
              />
            </div>
            <div 
              className={`w-12 h-12 rounded-full animate-pulse ${shimmerClass}`}
              style={{ animationDelay: `${idx * 100 + 100}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;

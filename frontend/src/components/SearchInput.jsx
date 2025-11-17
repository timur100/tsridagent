import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Search, X } from 'lucide-react';

const SearchInput = ({ 
  value, 
  onChange, 
  placeholder = "Suchen...", 
  className = "" 
}) => {
  const { theme } = useTheme();

  const handleClear = () => {
    onChange({ target: { value: '' } });
  };

  return (
    <div className={`relative ${className}`}>
      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
      }`} />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pl-10 pr-10 py-2 rounded-lg border ${
          theme === 'dark'
            ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
        } focus:outline-none focus:ring-2 focus:ring-red-500`}
      />
      {value && (
        <button
          onClick={handleClear}
          className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors ${
            theme === 'dark'
              ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
          title="Löschen"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;

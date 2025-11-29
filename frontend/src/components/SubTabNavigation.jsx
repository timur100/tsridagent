import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const SubTabNavigation = ({ tabs, activeTab, onTabChange }) => {
  const { theme } = useTheme();

  return (
    <div className={`mb-6 p-1 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow`}>
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#c00000] text-white'
                : theme === 'dark'
                ? 'text-gray-400 hover:bg-[#3a3a3a]'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.icon && <tab.icon className="h-5 w-5" />}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubTabNavigation;

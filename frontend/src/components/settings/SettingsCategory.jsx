import React from 'react';

/**
 * Wrapper component for settings categories
 * Adds data attributes for accordion grouping
 */
const SettingsCategory = ({ category, title, icon, children }) => {
  return (
    <div 
      data-category={category}
      data-title={title}
      data-icon={icon}
      className="space-y-4"
    >
      {children}
    </div>
  );
};

export default SettingsCategory;

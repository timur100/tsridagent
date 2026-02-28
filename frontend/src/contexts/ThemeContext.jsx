/**
 * Theme Context - Hetzner Dark Theme (Only)
 * Das Theme ist immer 'dark' - Hetzner Dark Mode
 */

import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Hetzner Dark Theme - immer dark
  const theme = 'dark';

  useEffect(() => {
    // Stelle sicher, dass das HTML-Element immer die 'dark' Klasse hat
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    
    // Setze Meta-Theme-Color für Browser
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#141414');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#141414';
      document.head.appendChild(meta);
    }
  }, []);

  // toggleTheme ist jetzt ein No-Op, da wir nur Dark Mode haben
  const toggleTheme = () => {
    // Hetzner Dark Theme - kein Toggle mehr
    console.log('[Theme] Hetzner Dark Theme ist fest eingestellt');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: true }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

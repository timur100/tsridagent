/**
 * Utility functions for German state (Bundesland) name conversions
 */

// Map of German state abbreviations to full names
const BUNDESLAND_MAP = {
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen'
};

/**
 * Convert state abbreviation to full name
 * @param {string} abbreviation - The state abbreviation (e.g., 'NW')
 * @returns {string} Full state name or original value if not found
 */
export const getFullBundeslandName = (abbreviation) => {
  if (!abbreviation) return '';
  
  // Convert to uppercase for consistent matching
  const abbr = abbreviation.toString().trim().toUpperCase();
  
  // Return full name if found, otherwise return original value
  return BUNDESLAND_MAP[abbr] || abbreviation;
};

/**
 * Get all state abbreviations
 * @returns {Array<string>} Array of all state abbreviations
 */
export const getAllBundeslandAbbreviations = () => {
  return Object.keys(BUNDESLAND_MAP);
};

/**
 * Get all full state names
 * @returns {Array<string>} Array of all full state names
 */
export const getAllBundeslandNames = () => {
  return Object.values(BUNDESLAND_MAP);
};

/**
 * Check if a string is a valid state abbreviation
 * @param {string} value - The value to check
 * @returns {boolean} True if valid abbreviation
 */
export const isValidBundeslandAbbreviation = (value) => {
  if (!value) return false;
  const abbr = value.toString().trim().toUpperCase();
  return abbr in BUNDESLAND_MAP;
};

/**
 * Get all Bundesländer as dropdown options (sorted alphabetically)
 * @returns {Array<{value: string, label: string}>} Array of dropdown options
 */
export const getBundeslandOptions = () => {
  return Object.values(BUNDESLAND_MAP)
    .sort()
    .map(name => ({
      value: name,
      label: name
    }));
};

/**
 * Get the complete Bundesland map
 * @returns {Object} The BUNDESLAND_MAP object
 */
export const getBundeslandMap = () => {
  return { ...BUNDESLAND_MAP };
};

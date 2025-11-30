/**
 * Geografische Zuordnung für deutsche Städte und Bundesländer
 */

// Bundesländer zu Regionen/Kontinent
export const BUNDESLAND_TO_REGION = {
  'Baden-Württemberg': { kontinent: 'Europa', land: 'Deutschland', region: 'Südwesten' },
  'Bayern': { kontinent: 'Europa', land: 'Deutschland', region: 'Süden' },
  'Berlin': { kontinent: 'Europa', land: 'Deutschland', region: 'Osten' },
  'Brandenburg': { kontinent: 'Europa', land: 'Deutschland', region: 'Osten' },
  'Bremen': { kontinent: 'Europa', land: 'Deutschland', region: 'Norden' },
  'Hamburg': { kontinent: 'Europa', land: 'Deutschland', region: 'Norden' },
  'Hessen': { kontinent: 'Europa', land: 'Deutschland', region: 'Mitte' },
  'Mecklenburg-Vorpommern': { kontinent: 'Europa', land: 'Deutschland', region: 'Nordosten' },
  'Niedersachsen': { kontinent: 'Europa', land: 'Deutschland', region: 'Norden' },
  'Nordrhein-Westfalen': { kontinent: 'Europa', land: 'Deutschland', region: 'Westen' },
  'Rheinland-Pfalz': { kontinent: 'Europa', land: 'Deutschland', region: 'Südwesten' },
  'Saarland': { kontinent: 'Europa', land: 'Deutschland', region: 'Südwesten' },
  'Sachsen': { kontinent: 'Europa', land: 'Deutschland', region: 'Osten' },
  'Sachsen-Anhalt': { kontinent: 'Europa', land: 'Deutschland', region: 'Osten' },
  'Schleswig-Holstein': { kontinent: 'Europa', land: 'Deutschland', region: 'Norden' },
  'Thüringen': { kontinent: 'Europa', land: 'Deutschland', region: 'Mitte' }
};

// Besondere Orte Kategorien (Legacy - wird durch API ersetzt)
export const SPECIAL_PLACE_TAGS = {
  airport: 'Airport',
  mainstation: 'Mainstation',
  '24h': '24h Location',
  hotspot: 'Hotspot'
};

// Keywords für automatische Erkennung (Legacy - wird durch API ersetzt)
export const BESONDERE_ORTE_KEYWORDS = {
  airport: ['FLUGHAFEN', 'AIRPORT', 'FLH', 'TERMINAL', '-IKC-', 'IKC'],
  mainstation: ['HAUPTBAHNHOF', 'HBF', 'CENTRAL STATION', 'BAHNHOF', 'TRAIN STATION'],
  '24h': ['24H', '24 H', '24-STUNDEN', '24 STUNDEN', '24-H'],
  hotspot: ['ZENTRUM', 'CITY', 'CENTER', 'EXPRESS', 'HOTSPOT', 'DOWNTOWN']
};

// Cache für Kategorien aus der API
let cachedCategories = null;
let categoriesPromise = null;

/**
 * Lädt Kategorien aus der API (mit Caching)
 */
export const fetchCategories = async () => {
  // Wenn bereits gecacht, direkt zurückgeben
  if (cachedCategories) {
    return cachedCategories;
  }

  // Wenn bereits ein Request läuft, auf diesen warten
  if (categoriesPromise) {
    return categoriesPromise;
  }

  // Neuen Request starten
  categoriesPromise = fetch(`${process.env.REACT_APP_BACKEND_URL || 'https://europcar-rental.preview.emergentagent.com'}/api/categories/list?active_only=true`)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.categories) {
        cachedCategories = data.categories;
        return cachedCategories;
      }
      // Fallback auf Legacy-Daten
      return convertLegacyToCategories();
    })
    .catch(error => {
      console.error('Error fetching categories:', error);
      // Fallback auf Legacy-Daten
      return convertLegacyToCategories();
    })
    .finally(() => {
      categoriesPromise = null;
    });

  return categoriesPromise;
};

/**
 * Konvertiert Legacy-Keywords zu Kategorie-Format
 */
const convertLegacyToCategories = () => {
  return Object.entries(BESONDERE_ORTE_KEYWORDS).map(([id, keywords]) => ({
    id,
    name: SPECIAL_PLACE_TAGS[id] || id,
    keywords,
    active: true
  }));
};

/**
 * Cache zurücksetzen (z.B. nach Kategorie-Änderungen)
 */
export const resetCategoriesCache = () => {
  cachedCategories = null;
  categoriesPromise = null;
};

/**
 * Ermittelt die geografische Region basierend auf Bundesland
 */
export const getRegionFromBundesland = (bundesland) => {
  if (!bundesland) return null;
  return BUNDESLAND_TO_REGION[bundesland] || null;
};

/**
 * Prüft ob ein Standort ein besonderer Ort ist (basierend auf Tags oder Name)
 */
export const isBesondererOrt = (item) => {
  // Wenn item ein String ist (legacy Nutzung), direkt Name verwenden
  if (typeof item === 'string') {
    const tags = detectSpecialPlaceTags(item);
    return tags.length > 0;
  }
  
  // Wenn item ein Objekt ist, erst prüfen ob Tags vorhanden sind
  if (item && typeof item === 'object') {
    if (item.special_place_tags && item.special_place_tags.length > 0) {
      return true;
    }
    
    // Fallback: Name-basierte Erkennung
    const name = item.stationsname || item.device_id || '';
    if (!name) return false;
    
    const tags = detectSpecialPlaceTags(name);
    return tags.length > 0;
  }
  
  return false;
};

/**
 * Ermittelt automatisch besondere Ort-Tags basierend auf dem Namen (Synchron mit Cache)
 */
export const detectSpecialPlaceTags = (name) => {
  if (!name) return [];
  
  const upperName = name.toUpperCase();
  const tags = [];
  
  // Verwende gecachte Kategorien falls vorhanden, sonst Legacy
  const categories = cachedCategories || convertLegacyToCategories();
  
  categories.forEach(category => {
    if (category.active && category.keywords) {
      if (category.keywords.some(keyword => upperName.includes(keyword))) {
        tags.push(category.id);
      }
    }
  });
  
  return tags;
};

/**
 * Ermittelt automatisch besondere Ort-Tags basierend auf dem Namen (Async mit API)
 */
export const detectSpecialPlaceTagsAsync = async (name) => {
  if (!name) return [];
  
  const upperName = name.toUpperCase();
  const tags = [];
  
  // Kategorien aus API laden
  const categories = await fetchCategories();
  
  categories.forEach(category => {
    if (category.active && category.keywords) {
      if (category.keywords.some(keyword => upperName.includes(keyword))) {
        tags.push(category.id);
      }
    }
  });
  
  return tags;
};

/**
 * Extrahiert alle einzigartigen Werte für Filter
 */
export const extractGeoFilterOptions = (items, getBundesland) => {
  const kontinente = new Set();
  const laender = new Set();
  const regionen = new Set();
  const bundeslaender = new Set();
  const staedte = new Set();
  const besondereOrte = [];

  items.forEach(item => {
    const bundesland = getBundesland(item);
    if (bundesland) {
      bundeslaender.add(bundesland);
      const region = getRegionFromBundesland(bundesland);
      if (region) {
        kontinente.add(region.kontinent);
        laender.add(region.land);
        regionen.add(region.region);
      }
    }

    const stadt = item.city || item.ort;
    if (stadt) {
      staedte.add(stadt);
    }

    const name = item.stationsname || item.device_id;
    if (isBesondererOrt(name)) {
      besondereOrte.push(item);
    }
  });

  return {
    kontinente: Array.from(kontinente).sort(),
    laender: Array.from(laender).sort(),
    regionen: Array.from(regionen).sort(),
    bundeslaender: Array.from(bundeslaender).sort(),
    staedte: Array.from(staedte).sort(),
    besondereOrte
  };
};

/**
 * Filtert Items basierend auf geografischen Kriterien
 */
export const filterByGeo = (items, filters, getBundesland) => {
  return items.filter(item => {
    // Null/undefined check
    if (!item) return false;
    // Kontinent Filter
    if (filters.kontinent && filters.kontinent !== 'all') {
      const bundesland = getBundesland(item);
      const region = getRegionFromBundesland(bundesland);
      if (!region || region.kontinent !== filters.kontinent) return false;
    }

    // Land Filter
    if (filters.land && filters.land !== 'all') {
      const bundesland = getBundesland(item);
      const region = getRegionFromBundesland(bundesland);
      if (!region || region.land !== filters.land) return false;
    }

    // Region Filter
    if (filters.region && filters.region !== 'all') {
      const bundesland = getBundesland(item);
      const region = getRegionFromBundesland(bundesland);
      if (!region || region.region !== filters.region) return false;
    }

    // Bundesland Filter
    if (filters.bundesland && filters.bundesland !== 'all') {
      const bundesland = getBundesland(item);
      if (bundesland !== filters.bundesland) return false;
    }

    // Stadt Filter (unterstützt sowohl stadt als auch city)
    const cityFilter = filters.stadt || filters.city;
    if (cityFilter && cityFilter !== 'all') {
      const stadt = item.city || item.ort;
      if (stadt !== cityFilter) return false;
    }

    // Besondere Orte Filter (jetzt mit spezifischen Tags)
    if (filters.specialPlace && filters.specialPlace !== 'all') {
      const tags = item.special_place_tags || [];
      if (!tags.includes(filters.specialPlace)) {
        // Fallback: Name-basierte Erkennung
        const detectedTags = detectSpecialPlaceTags(item.stationsname || item.device_id || '');
        if (!detectedTags.includes(filters.specialPlace)) return false;
      }
    }

    return true;
  });
};

/**
 * Ermittelt verfügbare Länder basierend auf ausgewähltem Kontinent
 */
export const getAvailableCountries = (items, kontinent, getBundesland) => {
  if (!kontinent || kontinent === 'all') {
    // Alle Länder
    const laender = new Set();
    items.forEach(item => {
      const bundesland = getBundesland(item);
      const region = getRegionFromBundesland(bundesland);
      if (region) laender.add(region.land);
    });
    return Array.from(laender).sort();
  }
  
  // Nur Länder des gewählten Kontinents
  const laender = new Set();
  items.forEach(item => {
    const bundesland = getBundesland(item);
    const region = getRegionFromBundesland(bundesland);
    if (region && region.kontinent === kontinent) {
      laender.add(region.land);
    }
  });
  return Array.from(laender).sort();
};

/**
 * Ermittelt verfügbare Bundesländer basierend auf ausgewähltem Land
 */
export const getAvailableBundeslaender = (items, land, getBundesland) => {
  if (!land || land === 'all') {
    // Alle Bundesländer
    const bundeslaender = new Set();
    items.forEach(item => {
      const bundesland = getBundesland(item);
      if (bundesland) bundeslaender.add(bundesland);
    });
    return Array.from(bundeslaender).sort();
  }
  
  // Nur Bundesländer des gewählten Landes
  const bundeslaender = new Set();
  items.forEach(item => {
    const bundesland = getBundesland(item);
    const region = getRegionFromBundesland(bundesland);
    if (region && region.land === land && bundesland) {
      bundeslaender.add(bundesland);
    }
  });
  return Array.from(bundeslaender).sort();
};

/**
 * Ermittelt verfügbare Städte basierend auf ausgewähltem Bundesland
 */
export const getAvailableCities = (items, bundesland, getBundesland) => {
  if (!bundesland || bundesland === 'all') {
    // Alle Städte
    const staedte = new Set();
    items.forEach(item => {
      const stadt = item.city || item.ort;
      if (stadt) staedte.add(stadt);
    });
    return Array.from(staedte).sort();
  }
  
  // Nur Städte des gewählten Bundeslandes
  const staedte = new Set();
  items.forEach(item => {
    const itemBundesland = getBundesland(item);
    if (itemBundesland === bundesland) {
      const stadt = item.city || item.ort;
      if (stadt) staedte.add(stadt);
    }
  });
  return Array.from(staedte).sort();
};

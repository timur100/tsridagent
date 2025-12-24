import { useEffect, useState } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// Cache for metadata to avoid repeated API calls
let metadataCache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

const usePortalMetadata = (portalType = 'verification') => {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndApplyMetadata = async () => {
      try {
        // Check cache first
        const now = Date.now();
        if (metadataCache && (now - lastFetchTime) < CACHE_DURATION) {
          applyMetadata(metadataCache[portalType]);
          setMetadata(metadataCache[portalType]);
          setLoading(false);
          return;
        }

        // Fetch metadata from API (no auth required for public metadata)
        const response = await fetch(`${BACKEND_URL}/api/portal/metadata/public`);
        
        if (response.ok) {
          const data = await response.json();
          const allMetadata = data?.data?.metadata || data?.metadata || null;
          
          if (allMetadata) {
            metadataCache = allMetadata;
            lastFetchTime = now;
            
            const portalMetadata = allMetadata[portalType];
            if (portalMetadata) {
              applyMetadata(portalMetadata);
              setMetadata(portalMetadata);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching portal metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    const applyMetadata = (meta) => {
      if (!meta) return;

      // Set browser tab title
      if (meta.browserTitle) {
        document.title = meta.browserTitle;
      }

      // Set meta description
      if (meta.metaDescription) {
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
          metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          document.head.appendChild(metaDesc);
        }
        metaDesc.content = meta.metaDescription;
      }

      // Set favicon
      if (meta.faviconUrl) {
        let favicon = document.querySelector('link[rel="icon"]');
        if (!favicon) {
          favicon = document.createElement('link');
          favicon.rel = 'icon';
          document.head.appendChild(favicon);
        }
        favicon.href = meta.faviconUrl;
      }

      // Set theme color (primary color)
      if (meta.primaryColor) {
        let themeColor = document.querySelector('meta[name="theme-color"]');
        if (!themeColor) {
          themeColor = document.createElement('meta');
          themeColor.name = 'theme-color';
          document.head.appendChild(themeColor);
        }
        themeColor.content = meta.primaryColor;
      }
    };

    fetchAndApplyMetadata();
  }, [portalType]);

  return { metadata, loading };
};

export default usePortalMetadata;

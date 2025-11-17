import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Package, ShoppingCart, Search, Plus, Minus, CheckCircle, ChevronRight, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import ProductDetailModal from './ProductDetailModal';
import AddStandortModal from './AddStandortModal';
import AddDeviceModal from './AddDeviceModal';

const ShopView = () => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState(() => {
    // Load cart from localStorage on component mount
    const savedCart = localStorage.getItem('shopCart');
    return savedCart ? JSON.parse(savedCart) : [];
  });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [myOrders, setMyOrders] = useState([]);
  const [showOrderHistory, setShowOrderHistory] = useState(false);

  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newLocationCode, setNewLocationCode] = useState('');
  const [cartComponentsAvailability, setCartComponentsAvailability] = useState({});

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('shopCart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    fetchItems();
    fetchLocations();
    fetchMyOrders();
    fetchCategories();
    
    // Auto-refresh items and orders every 30 seconds
    const interval = setInterval(() => {
      fetchItems();
      fetchMyOrders();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, categoryFilter]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showLocationDropdown && !e.target.closest('.relative')) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLocationDropdown]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      // Fetch regular inventory items
      const result = await apiCall('/api/inventory/items/available');
      
      // Fetch component sets
      const setsResult = await apiCall('/api/components/shop/templates');
      
      if (result.success && result.data) {
        let allItems = result.data.items || [];
        
        // Add component sets to items
        if (setsResult.success && setsResult.data) {
          const componentSets = (setsResult.data.templates || []).map(template => ({
            id: template.id,
            article_id: template.id,
            article_name: template.shop_display_name || template.template_name,
            category: "Sets",  // Use "Sets" as main category
            subcategory: template.shop_category || 'Standard',  // Store shop_category as subcategory
            quantity: 999, // Sets don't have quantity in same way
            unit: "Set",
            description: template.shop_description || template.description || '',
            item_type: 'component_set',
            template_data: template,
            available: template.available,
            component_count: template.component_count || 0,
            image_url: template.image_url || null,  // Add component image
            component_images: template.component_images || []  // Add all component images
          }));
          allItems = [...componentSets, ...allItems];
        }
        
        // Filter out items from hidden categories
        if (window.__VISIBLE_CATEGORIES__) {
          allItems = allItems.filter(item => 
            window.__VISIBLE_CATEGORIES__.has(item.category)
          );
        }
        
        setItems(allItems);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Fehler beim Laden der Artikel');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const result = await apiCall('/api/inventory/categories');
      if (result.success && result.data) {
        const allCats = result.data.all_categories || [];
        
        // Build set of visible category names (includes parent + subcategories)
        const visibleCategoryNames = new Set();
        allCats.forEach(cat => {
          if (cat.visible_in_shop !== false) {
            visibleCategoryNames.add(cat.name);
          }
        });
        
        // Store visible category names for filtering items
        window.__VISIBLE_CATEGORIES__ = visibleCategoryNames;
        
        // Filter to only show visible parent categories AND their visible subcategories
        const cats = result.data.categories || [];
        const visibleCats = cats
          .filter(cat => cat.visible_in_shop !== false)
          .map(cat => ({
            ...cat,
            // Filter subcategories to only show visible ones
            subcategories: (cat.subcategories || []).filter(sub => sub.visible_in_shop !== false)
          }));
        
        setCategories(visibleCats);
        // Auto-expand all categories initially
        setExpandedCategories(visibleCats.map(c => c.id).filter(Boolean));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const fetchLocations = async () => {
    try {
      // Get customer's locations
      const result = await apiCall('/api/portal/customer-data/europcar-stations');
      if (result.success && result.data) {
        // Sort locations alphabetically by location code
        const sortedLocations = (result.data.stations || []).sort((a, b) => {
          const codeA = (a.main_code || '').replace(/-+$/, '').toUpperCase();
          const codeB = (b.main_code || '').replace(/-+$/, '').toUpperCase();
          return codeA.localeCompare(codeB);
        });
        setLocations(sortedLocations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const result = await apiCall('/api/orders/list');
      if (result.success && result.data) {
        setMyOrders(result.data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(search) ||
        item.article_name?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    }

    setFilteredItems(filtered);
  };

  const fetchCartComponentsAvailability = async () => {
    const availability = {};
    
    for (const item of cart) {
      if (item.item_type === 'component_set') {
        try {
          const result = await apiCall(`/api/components/shop/template-details/${item.id}`);
          if (result.success && result.data && result.data.template) {
            availability[item.id] = result.data.template.components_detail || [];
          }
        } catch (error) {
          console.error(`Error fetching availability for ${item.id}:`, error);
        }
      }
    }
    
    setCartComponentsAvailability(availability);
  };

  const handleLocationAdded = (newLocation) => {
    console.log('handleLocationAdded called with:', newLocation);
    
    // Add new location to the list immediately for instant UI update
    setLocations(prev => {
      const updated = [...prev, newLocation];
      console.log('Updated locations:', updated);
      return updated;
    });
    
    // Set the new location as selected immediately
    const locationCode = newLocation.main_code || '';
    const locationName = newLocation.stationsname || newLocation.name || '';
    
    setSelectedLocation(locationCode);
    setLocationSearchTerm(`${locationCode} - ${locationName}`);
    setShowLocationDropdown(false); // Close dropdown since location is selected
    setIsNewLocation(false); // Uncheck the checkbox
    
    toast.success(`Standort ${locationCode} erfolgreich hinzugefügt und ausgewählt`);
    
    // Close AddStandortModal first, then open AddDeviceModal
    setShowAddLocationModal(false);
    
    // Wait for AddStandortModal to close before opening AddDeviceModal
    setTimeout(() => {
      setNewLocationCode(locationCode);
      setShowAddDeviceModal(true);
    }, 300);
    
    // Reload locations in background (non-blocking)
    setTimeout(() => {
      fetchLocations();
    }, 1000);
  };

  const handleDeviceAdded = (newDevice) => {
    console.log('handleDeviceAdded called with:', newDevice);
    toast.success(`Gerät erfolgreich hinzugefügt: ${newDevice.article_name || 'Neues Gerät'}`);
    // Device will appear in tables automatically via polling/refresh
  };

  const addToCart = async (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    // Check if this is a component set
    if (item.item_type === 'component_set') {
      try {
        // Fetch availability details
        const result = await apiCall(`/api/components/shop/template-details/${item.id}`);
        if (result.success && result.data && result.data.template) {
          const template = result.data.template;
          const missingCount = template.missing_components_count || 0;
          
          // Prepare components preview (first 3 components)
          const componentsPreview = template.components_detail
            ? template.components_detail.slice(0, 3).map(comp => ({
                name: comp.name,
                quantity: comp.required_quantity
              }))
            : [];
          
          // Add to cart with component details
          const enrichedItem = {
            ...item,
            component_count: template.components_detail?.length || 0,
            components_preview: componentsPreview
          };
          
          if (existingItem) {
            // Update quantity AND add component details if missing
            setCart(cart.map(cartItem =>
              cartItem.id === item.id
                ? { 
                    ...cartItem, 
                    quantity: cartItem.quantity + 1,
                    component_count: enrichedItem.component_count,
                    components_preview: enrichedItem.components_preview
                  }
                : cartItem
            ));
            toast.success('Menge erhöht');
          } else {
            setCart([...cart, { ...enrichedItem, quantity: 1 }]);
            toast.success('Zum Warenkorb hinzugefügt');
          }
          
          // Show warning if components are missing
          if (missingCount > 0) {
            setTimeout(() => {
              toast.error(
                `⚠️ ${missingCount} Komponente(n) nicht verfügbar - Bestellung wird als Rückstand markiert`,
                { duration: 6000 }
              );
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        toast.error('Fehler beim Prüfen der Verfügbarkeit');
      }
    } else {
      // Regular item logic
      if (existingItem) {
        if (existingItem.quantity < item.quantity_in_stock) {
          setCart(cart.map(cartItem =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          ));
          toast.success('Menge erhöht');
        } else {
          toast.error('Nicht genügend Bestand verfügbar');
        }
      } else {
        setCart([...cart, { ...item, quantity: 1 }]);
        toast.success('Zum Warenkorb hinzugefügt');
      }
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.success('Aus Warenkorb entfernt');
  };

  const updateQuantity = (itemId, newQuantity) => {
    const item = items.find(i => i.id === itemId);
    
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    
    if (newQuantity > item.quantity_in_stock) {
      toast.error('Nicht genügend Bestand verfügbar');
      return;
    }

    setCart(cart.map(cartItem =>
      cartItem.id === itemId
        ? { ...cartItem, quantity: newQuantity }
        : cartItem
    ));
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Warenkorb ist leer');
      return;
    }
    setShowOrderModal(true);
    fetchCartComponentsAvailability();
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    if (!selectedLocation) {
      toast.error('Bitte wählen Sie einen Standort');
      return;
    }

    const location = locations.find(loc => loc.main_code === selectedLocation);
    if (!location) {
      toast.error('Standort nicht gefunden');
      return;
    }

    // Check if cart contains component sets
    const hasComponentSets = cart.some(item => item.item_type === 'component_set');

    if (hasComponentSets) {
      // Use new API for component set orders with reservation
      const componentSetItems = cart.map(item => {
        if (item.item_type === 'component_set') {
          return {
            item_type: 'template',
            item_id: item.id,
            item_name: item.article_name,
            quantity: item.quantity
          };
        } else {
          return {
            item_type: 'component',
            item_id: item.id,
            item_name: item.name || item.article_name,
            quantity: item.quantity
          };
        }
      });

      // Check availability first
      try {
        const availCheck = await apiCall('/api/components/shop/check-availability', {
          method: 'POST',
          body: JSON.stringify(componentSetItems.map(item => ({
            type: item.item_type,
            id: item.item_id,
            quantity: item.quantity
          })))
        });

        if (availCheck.success && availCheck.data) {
          const hasShortages = !availCheck.data.all_available;
          
          if (hasShortages) {
            // Show warning about shortages
            const shortageMsg = availCheck.data.results
              .filter(r => !r.available)
              .map(r => {
                if (r.missing_components) {
                  return `${r.template_name}: Fehlende Komponenten - ${r.missing_components.map(c => `${c.component_name} (${c.shortage})`).join(', ')}`;
                }
                return `${r.component_name}: ${r.shortage} Stück fehlen`;
              })
              .join('\n');
            
            const confirmed = window.confirm(
              `⚠️ WARNUNG: Einige Komponenten sind nicht in ausreichender Menge vorhanden:\n\n${shortageMsg}\n\nDie Bestellung wird als "Rückstand" markiert und automatisch ausgeführt, sobald alle Komponenten verfügbar sind.\n\nMöchten Sie fortfahren?`
            );
            
            if (!confirmed) {
              return;
            }
          }
        }

        // Create order with reservation
        const orderData = {
          location_code: location.main_code,
          location_name: location.stationsname || location.name || location.main_code,
          items: componentSetItems,
          notes: orderNotes,
          auto_fulfill: true
        };

        const result = await apiCall('/api/orders/create-with-reservation', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        if (result.success && result.data) {
          if (result.data.has_backorder) {
            toast.success(`Bestellung ${result.data.order_number} aufgegeben (Rückstand)`, { duration: 5000 });
            toast.info('Komponenten werden reserviert, sobald verfügbar', { duration: 5000 });
          } else {
            toast.success(`Bestellung ${result.data.order_number} erfolgreich aufgegeben`, { duration: 5000 });
          }
          
          setCart([]);
          localStorage.removeItem('shopCart');
          setShowOrderModal(false);
          setSelectedLocation('');
          setLocationSearchTerm('');
          setOrderNotes('');
          fetchItems();
          fetchMyOrders();
        } else {
          const errorMsg = result.data?.detail || result.message || 'Fehler beim Erstellen der Bestellung';
          toast.error(errorMsg);
        }
      } catch (error) {
        console.error('Error creating component set order:', error);
        toast.error(error.message || 'Fehler beim Erstellen der Bestellung');
      }
    } else {
      // Use regular order API for inventory items
      const orderData = {
        location_code: location.main_code,
        location_name: location.stationsname || location.name || location.main_code,
        items: cart.map(item => ({
          article_id: item.id,
          article_name: item.name || item.article_name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit || 'Stück'
        })),
        notes: orderNotes
      };

      try {
        const result = await apiCall('/api/orders/create', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        if (result.success) {
          if (result.data.error === 'insufficient_stock') {
            toast.error('Nicht genügend Bestand verfügbar');
            result.data.insufficient_items?.forEach(item => {
              toast.error(`${item.article}: ${item.requested} angefordert, nur ${item.available} verfügbar`);
            });
          } else {
            toast.success('Bestellung erfolgreich aufgegeben');
            setCart([]);
            localStorage.removeItem('shopCart');
            setShowOrderModal(false);
            setSelectedLocation('');
            setLocationSearchTerm('');
            setOrderNotes('');
            fetchItems();
            fetchMyOrders();
          }
        } else {
          const errorMsg = result.data?.detail || result.message || 'Fehler beim Erstellen der Bestellung';
          toast.error(errorMsg);
        }
      } catch (error) {
        console.error('Error creating order:', error);
        toast.error(error.message || 'Fehler beim Erstellen der Bestellung');
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Offen', color: 'yellow' },
      reserved: { label: 'Reserviert', color: 'blue' },
      backorder: { label: 'Rückstand', color: 'orange' },
      in_progress: { label: 'In Bearbeitung', color: 'blue' },
      processing: { label: 'In Bearbeitung', color: 'blue' },
      shipped: { label: 'Versandt', color: 'purple' },
      delivered: { label: 'Geliefert', color: 'green' },
      cancelled: { label: 'Storniert', color: 'red' }
    };

    const config = statusConfig[status] || { label: status, color: 'gray' };
    const colorClasses = {
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[config.color]}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Laden...</div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left Sidebar - Categories */}
      {!showOrderHistory && (
        <div className={`w-64 flex-shrink-0 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'} rounded-lg p-4 h-fit sticky top-4`}>
          <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Kategorien
          </h3>
          <div className="space-y-1">
            {/* All Items */}
            <button
              onClick={() => setCategoryFilter('all')}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-[#c00000] text-white'
                  : theme === 'dark'
                  ? 'text-gray-300 hover:bg-[#1a1a1a]'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">Alle Artikel</div>
            </button>

            {/* Categories with Accordion */}
            {categories.map(cat => {
              const categoryObj = typeof cat === 'string' ? { name: cat } : cat;
              const subcategories = categoryObj.subcategories || [];
              const isExpanded = expandedCategories.includes(categoryObj.id);
              const hasSubcategories = subcategories.length > 0;

              return (
                <div key={categoryObj.id || categoryObj.name} className="space-y-1">
                  {/* Main Category */}
                  <div className="flex items-center">
                    {hasSubcategories && (
                      <button
                        onClick={() => toggleCategory(categoryObj.id)}
                        className={`p-1 rounded ${theme === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-100'}`}
                      >
                        <ChevronRight 
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}
                        />
                      </button>
                    )}
                    <button
                      onClick={() => setCategoryFilter(categoryObj.name)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg transition-colors ${
                        !hasSubcategories ? 'ml-5' : ''
                      } ${
                        categoryFilter === categoryObj.name
                          ? 'bg-[#c00000] text-white'
                          : theme === 'dark'
                          ? 'text-gray-300 hover:bg-[#1a1a1a]'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{categoryObj.name}</div>
                      {categoryObj.description && (
                        <div className={`text-xs mt-1 ${
                          categoryFilter === categoryObj.name 
                            ? 'text-gray-200' 
                            : 'text-gray-500'
                        }`}>
                          {categoryObj.description}
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Subcategories */}
                  {hasSubcategories && isExpanded && (
                    <div className="ml-5 space-y-1">
                      {subcategories.map(subcat => (
                        <button
                          key={subcat.id}
                          onClick={() => setCategoryFilter(subcat.name)}
                          className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm ${
                            categoryFilter === subcat.name
                              ? 'bg-[#c00000] text-white'
                              : theme === 'dark'
                              ? 'text-gray-400 hover:bg-[#1a1a1a]'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <div className="font-medium flex items-center gap-2">
                            <span className="text-gray-500">└</span>
                            {subcat.name}
                          </div>
                          {subcat.description && (
                            <div className={`text-xs mt-1 ml-4 ${
                              categoryFilter === subcat.name 
                                ? 'text-gray-200' 
                                : 'text-gray-500'
                            }`}>
                              {subcat.description}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header with Cart */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Shop
          </h2>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Bestellen Sie Hardware und Zubehör
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowOrderHistory(!showOrderHistory)}
            className="bg-gray-600 hover:bg-gray-700 text-white"
          >
            {showOrderHistory ? 'Zurück zum Shop' : 'Meine Bestellungen'}
          </Button>
          <div className="relative">
            <Button
              onClick={handleCheckout}
              className="bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Warenkorb ({getTotalItems()})
            </Button>
          </div>
        </div>
      </div>

      {!showOrderHistory ? (
        <>
          {/* Search Filter */}
          <Card className={`p-4 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Artikel suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </Card>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className={`overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-105 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}
                onClick={() => {
                  setSelectedProduct(item);
                  setShowProductDetail(true);
                }}
              >
                {/* Product Image with Hover Effect */}
                {item.image_url && (
                  <div className={`relative w-full h-48 overflow-hidden flex-shrink-0 group ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                    {/* First Image */}
                    <img 
                      src={item.image_url} 
                      alt={item.article_name || item.name}
                      className={`w-full h-full object-contain transition-opacity duration-300 ${
                        item.component_images?.[1] ? 'group-hover:opacity-0' : ''
                      }`}
                    />
                    {/* Second Image (shown on hover) */}
                    {item.component_images?.[1] && (
                      <img 
                        src={item.component_images[1]} 
                        alt={`${item.article_name || item.name} (2)`}
                        className="absolute top-0 left-0 w-full h-full object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      />
                    )}
                    {/* Image Count Badge */}
                    {item.component_images?.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {item.component_images.length} Bilder
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <div className="mb-3">
                      <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {item.article_name || item.name}
                      </h3>
                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                        {item.category}
                      </p>
                    </div>

                    {item.description && (
                      <p className={`text-sm line-clamp-2 mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {item.description}
                      </p>
                    )}

                    {/* Show components for component sets */}
                    {item.item_type === 'component_set' && item.template_data && item.template_data.components && (
                      <div className={`mt-2 p-2 rounded ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                        <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Enthält {item.template_data.components.length} Komponenten:
                        </p>
                        <ul className={`text-xs space-y-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                          {item.template_data.components.slice(0, 4).map((comp, idx) => (
                            <li key={idx}>
                              • {comp.component_name || 'Komponente'} ({comp.quantity}x)
                            </li>
                          ))}
                          {item.template_data.components.length > 4 && (
                            <li className="text-gray-500 italic">+{item.template_data.components.length - 4} weitere...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mt-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Verfügbar
                        </p>
                        <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {item.quantity_in_stock} {item.unit}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      disabled={item.quantity_in_stock === 0}
                      className={`w-full ${
                        item.quantity_in_stock === 0
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-[#c00000] hover:bg-[#a00000]'
                      } text-white`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      In den Warenkorb
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Keine Artikel gefunden
              </p>
            </Card>
          )}
        </>
      ) : (
        /* Order History */
        <Card className={`${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="p-6">
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Meine Bestellungen
            </h3>
            <div className="space-y-4">
              {myOrders.map(order => {
                const orderDate = new Date(order.order_date);
                const formattedDate = orderDate.toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                const formattedTime = orderDate.toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div
                    key={order.id}
                    className={`p-5 rounded-lg border ${
                      theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className={`font-mono text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {order.order_number || `#${order.id.substring(0, 8)}`}
                        </p>
                        <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formattedDate} um {formattedTime} Uhr
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className={`space-y-3 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      <div>
                        <p className="font-semibold mb-1">Standort:</p>
                        <p className="ml-3">{order.location_code} - {order.location_name}</p>
                      </div>
                      
                      <div>
                        <p className="font-semibold mb-2">Artikel:</p>
                        <div className="ml-3 space-y-2">
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, idx) => {
                              // Check if this is a component set order
                              if (item.item_type === 'template' && item.reserved_components) {
                                return (
                                  <div key={idx} className="space-y-2">
                                    {/* Set Title */}
                                    <div className={`p-2 rounded ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {item.template_name} (Set)
                                      </p>
                                      {item.set_id && (
                                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                          Set-ID: {item.set_id}
                                        </p>
                                      )}
                                    </div>
                                    {/* Component List */}
                                    <div className="ml-4 space-y-1">
                                      {item.reserved_components.map((comp, compIdx) => (
                                        <div 
                                          key={compIdx}
                                          className={`flex justify-between items-center p-2 rounded text-sm ${
                                            theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                                          }`}
                                        >
                                          <div className="flex-1">
                                            <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                              • {comp.component_name}
                                            </p>
                                          </div>
                                          <div className={`text-right ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {comp.quantity}x
                                          </div>
                                        </div>
                                      ))}
                                      {item.backorder_components && item.backorder_components.length > 0 && (
                                        <div className={`p-2 rounded text-sm ${theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-700'}`}>
                                          <p className="font-medium">Rückstand:</p>
                                          {item.backorder_components.map((comp, compIdx) => (
                                            <p key={compIdx}>• {comp.component_name} ({comp.quantity_needed}x)</p>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              } else {
                                // Regular inventory item
                                return (
                                  <div 
                                    key={idx}
                                    className={`flex justify-between items-center p-2 rounded ${
                                      theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
                                    }`}
                                  >
                                    <div className="flex-1">
                                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                        {item.article_name}
                                      </p>
                                      <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                        {item.category}
                                      </p>
                                    </div>
                                    <div className={`text-right font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                      {item.quantity} {item.unit}
                                    </div>
                                  </div>
                                );
                              }
                            })
                          ) : (
                            <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                              Keine Artikel
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {order.notes && (
                        <div>
                          <p className="font-semibold mb-1">Notiz:</p>
                          <p className={`ml-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {order.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {myOrders.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Noch keine Bestellungen
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-lg shadow-xl max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className="p-6">
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Bestellung aufgeben
              </h2>

              <form onSubmit={handleSubmitOrder} className="space-y-6">
                {/* Cart Items */}
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Warenkorb
                  </h3>
                  <div className="space-y-2">
                    {cart.map(item => {
                      // Check if this is a component set
                      const isComponentSet = item.item_type === 'component_set';
                      
                      return (
                        <div key={item.id} className="space-y-2">
                          {/* Main Item Row */}
                          <div
                            className={`p-3 rounded border flex justify-between items-center ${
                              theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex-1">
                              <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {item.article_name || item.name}
                                {isComponentSet && (
                                  <span className={`ml-2 text-xs px-2 py-1 rounded ${
                                    theme === 'dark' ? 'bg-[#c00000]/20 text-[#c00000]' : 'bg-red-100 text-red-700'
                                  }`}>
                                    Set
                                  </span>
                                )}
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                {item.category}
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              {/* Only show quantity selector for non-set items */}
                              {!isComponentSet ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="p-1 rounded hover:bg-gray-200"
                                  >
                                    <Minus className="h-4 w-4" />
                                  </button>
                                  <span className={`w-12 text-center font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="p-1 rounded hover:bg-gray-200"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <span className={`px-3 py-1 rounded ${
                                  theme === 'dark' ? 'bg-[#c00000]/20 text-[#c00000]' : 'bg-red-100 text-red-700'
                                }`}>
                                  1 Set
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFromCart(item.id)}
                                className="ml-3 text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          {/* Component Set Details with LED Availability */}
                          {isComponentSet && (
                            <div className={`ml-6 p-2 rounded text-sm ${
                              theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
                            }`}>
                              {cartComponentsAvailability[item.id] ? (
                                <>
                                  <p className={`text-xs font-medium mb-2 ${
                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Komponenten ({cartComponentsAvailability[item.id].length})
                                  </p>
                                  <div className="space-y-1">
                                    {cartComponentsAvailability[item.id].map((comp, idx) => (
                                      <div 
                                        key={idx}
                                        className={`flex items-center gap-2 text-xs p-1 rounded ${
                                          theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                                        }`}
                                      >
                                        {/* LED Indicator */}
                                        {comp.is_available ? (
                                          <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-red-500">✕</span>
                                          </div>
                                        )}
                                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}>
                                          {comp.name} ({comp.required_quantity}x)
                                        </span>
                                        <span className={`ml-auto text-xs ${
                                          comp.is_available ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                          {comp.is_available 
                                            ? `${comp.available_quantity} verfügbar`
                                            : `Nur ${comp.available_quantity}`
                                          }
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              ) : item.component_count > 0 ? (
                                <>
                                  <p className={`text-xs font-medium mb-1 ${
                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    Enthält {item.component_count} Komponente(n)
                                  </p>
                                  {item.components_preview && item.components_preview.length > 0 && (
                                    <div className="space-y-1">
                                      {item.components_preview.map((comp, idx) => (
                                        <div 
                                          key={idx}
                                          className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}
                                        >
                                          • {comp.name} ({comp.quantity}x)
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                  Komponenten-Details werden beim Hinzufügen geladen...
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* New Location Question */}
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-gray-50 border-gray-300'
                }`}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNewLocation}
                      onChange={(e) => {
                        setIsNewLocation(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedLocation('');
                          setLocationSearchTerm('');
                        }
                      }}
                      className="w-4 h-4 text-[#c00000] bg-gray-100 border-gray-300 rounded focus:ring-[#c00000]"
                    />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Bestellung für einen neuen Standort?
                    </span>
                  </label>
                  {isNewLocation && (
                    <button
                      type="button"
                      onClick={() => setShowAddLocationModal(true)}
                      className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed transition-colors ${
                        theme === 'dark'
                          ? 'border-[#c00000] bg-[#c00000]/10 text-[#c00000] hover:bg-[#c00000]/20'
                          : 'border-[#c00000] bg-red-50 text-[#c00000] hover:bg-[#c00000]/20'
                      }`}
                    >
                      <MapPin className="h-5 w-5" />
                      Neuen Standort hinzufügen
                    </button>
                  )}
                </div>

                {/* Location Selection with Search */}
                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Standort auswählen *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={locationSearchTerm}
                      onChange={(e) => {
                        setLocationSearchTerm(e.target.value);
                        setShowLocationDropdown(true);
                      }}
                      onFocus={() => setShowLocationDropdown(true)}
                      placeholder="Standort suchen oder auswählen..."
                      className={`w-full px-3 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                      }`}
                    />
                    
                    {showLocationDropdown && (
                      <div className={`absolute z-10 w-full mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700'
                          : 'bg-white border-gray-300'
                      }`}>
                        {locations
                          .filter(loc => {
                            const searchLower = locationSearchTerm.toLowerCase();
                            const code = loc.main_code?.replace(/-+$/, '') || ''; // Remove trailing dashes
                            const name = loc.stationsname || loc.name || '';
                            return code.toLowerCase().includes(searchLower) || 
                                   name.toLowerCase().includes(searchLower);
                          })
                          .map(loc => {
                            const cleanCode = loc.main_code?.replace(/-+$/, '') || ''; // Remove trailing dashes
                            const displayName = loc.stationsname || loc.name || '';
                            return (
                              <button
                                key={loc.main_code}
                                type="button"
                                onClick={() => {
                                  setSelectedLocation(loc.main_code);
                                  setLocationSearchTerm(`${cleanCode} - ${displayName}`);
                                  setShowLocationDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-opacity-80 ${
                                  theme === 'dark'
                                    ? 'hover:bg-gray-800 text-gray-300'
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <div className="font-medium">{cleanCode}</div>
                                <div className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                                  {displayName}
                                </div>
                              </button>
                            );
                          })}
                        {locations.filter(loc => {
                          const searchLower = locationSearchTerm.toLowerCase();
                          const code = loc.main_code?.replace(/-+$/, '') || '';
                          const name = loc.stationsname || loc.name || '';
                          return code.toLowerCase().includes(searchLower) || 
                                 name.toLowerCase().includes(searchLower);
                        }).length === 0 && (
                          <div className={`px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>
                            Keine Standorte gefunden
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedLocation && (
                    <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      ✓ Standort ausgewählt
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Notiz (optional)
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows="3"
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowOrderModal(false);
                      setSelectedLocation('');
                      setLocationSearchTerm('');
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="submit"
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Bestellung aufgeben
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {showProductDetail && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => {
            setShowProductDetail(false);
            setSelectedProduct(null);
          }}
          onAddToCart={addToCart}
        />
      )}

      {/* Add Location Modal */}
      {showAddLocationModal && (
        <AddStandortModal
          onClose={() => setShowAddLocationModal(false)}
          onAdd={handleLocationAdded}
        />
      )}

      {/* Add Device Modal */}
      {showAddDeviceModal && (
        <AddDeviceModal
          onClose={() => {
            setShowAddDeviceModal(false);
            setNewLocationCode('');
          }}
          onAdd={handleDeviceAdded}
          prefilledLocationCode={newLocationCode}
        />
      )}
      </div>
    </div>
  );
};

export default ShopView;

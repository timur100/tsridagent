import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  ShoppingCart, Plus, Minus, X, ChevronRight, Home, Volume2,
  Check, Star, Clock, Flame, Award, Package
} from 'lucide-react';
import toast from 'react-hot-toast';

const KioskTerminal = ({ tenantId = 'default-tenant', locationId = 'default-location' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, language, menu, productDetail, cart, payment, confirmation
  const [language, setLanguage] = useState('de');
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [cart, setCart] = useState([]);
  const [customization, setCustomization] = useState({
    size: 'regular',
    extras: [],
    removals: [],
    makeMeal: false,
    mealDrink: null,
    mealSide: null
  });
  
  const [orderNumber, setOrderNumber] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const catResult = await apiCall(`/api/fastfood/categories?tenant_id=${tenantId}`);
      if (catResult.success) {
        const cats = catResult.data?.data || catResult.data || [];
        setCategories(cats);
      }

      const prodResult = await apiCall(`/api/fastfood/products?tenant_id=${tenantId}&available_only=true`);
      if (prodResult.success) {
        const prods = prodResult.data?.data || prodResult.data || [];
        setProducts(prods);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
    }
  };

  const speak = (text) => {
    if (audioEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStart = () => {
    speak(t.welcomeMessage);
    setCurrentScreen('language');
  };

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    speak(lang === 'de' ? 'Deutsch ausgewählt' : 'English selected');
    setCurrentScreen('menu');
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      speak(t.categorySelected + ' ' + (language === 'en' ? category.name_en || category.name : category.name));
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCustomization({
      size: 'regular',
      extras: [],
      removals: [],
      makeMeal: false,
      mealDrink: null,
      mealSide: null
    });
    setCurrentScreen('productDetail');
    speak((language === 'en' ? product.name_en || product.name : product.name) + ' ' + t.selected);
  };

  const addToCart = () => {
    const item = {
      product_id: selectedProduct.id,
      product_name: language === 'en' ? selectedProduct.name_en || selectedProduct.name : selectedProduct.name,
      quantity: 1,
      unit_price: selectedProduct.price,
      total_price: selectedProduct.price,
      customization: { ...customization }
    };

    // Add meal items if meal option selected
    if (customization.makeMeal) {
      item.total_price += 2.99; // Meal upgrade price
      item.product_name += ' (Meal)';
    }

    setCart([...cart, item]);
    speak(t.addedToCart);
    toast.success(t.addedToCart);
    setCurrentScreen('menu');
    setSelectedProduct(null);
  };

  const updateCartQuantity = (index, delta) => {
    const newCart = [...cart];
    newCart[index].quantity = Math.max(0, newCart[index].quantity + delta);
    newCart[index].total_price = newCart[index].quantity * newCart[index].unit_price;
    
    if (newCart[index].quantity === 0) {
      newCart.splice(index, 1);
    }
    
    setCart(newCart);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error(t.cartEmpty);
      return;
    }
    setCurrentScreen('payment');
  };

  const handlePayment = async (method) => {
    setPaymentMethod(method);
    
    try {
      const orderData = {
        tenant_id: tenantId,
        location_id: locationId,
        terminal_id: 'kiosk-terminal-001',
        items: cart,
        payment_method: method,
        language: language,
        channel: 'kiosk'
      };

      const result = await apiCall('/api/fastfood/orders', 'POST', orderData);

      if (result.success) {
        const order = result.data?.data || result.data;
        
        await apiCall(`/api/fastfood/orders/${order.id}/payment?payment_status=completed`, 'PATCH');

        setOrderNumber(order.order_number);
        setCurrentScreen('confirmation');
        speak(t.orderConfirmed + ' ' + order.order_number);
        
        // Auto-reset after 10 seconds
        setTimeout(() => {
          resetKiosk();
        }, 10000);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(t.orderFailed);
    }
  };

  const resetKiosk = () => {
    setCart([]);
    setCurrentScreen('welcome');
    setSelectedCategory(null);
    setSelectedProduct(null);
    setOrderNumber(null);
    setPaymentMethod(null);
    setLanguage('de');
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : [];

  const t = {
    de: {
      welcome: 'Willkommen',
      start: 'Bestellen',
      selectLanguage: 'Sprache wählen',
      audioPrompts: 'Audio-Ansagen',
      menu: 'Menü',
      cart: 'Warenkorb',
      empty: 'Leer',
      total: 'Gesamt',
      checkout: 'Zur Kasse',
      addToCart: 'In den Warenkorb',
      customize: 'Anpassen',
      makeMeal: 'Als Menü',
      extras: 'Extras',
      remove: 'Entfernen',
      size: 'Größe',
      regular: 'Normal',
      large: 'Groß',
      selectPayment: 'Zahlungsart wählen',
      cash: 'Barzahlung',
      card: 'Kartenzahlung',
      mobile: 'Mobile Payment',
      orderConfirmed: 'Bestellung bestätigt',
      yourOrderNumber: 'Ihre Bestellnummer',
      thankYou: 'Vielen Dank!',
      pickupInfo: 'Bitte merken Sie sich diese Nummer.',
      newOrder: 'Neue Bestellung',
      back: 'Zurück',
      cancel: 'Abbrechen',
      welcomeMessage: 'Willkommen bei unserem Bestellsystem',
      categorySelected: 'Kategorie',
      selected: 'ausgewählt',
      addedToCart: 'Zum Warenkorb hinzugefügt',
      cartEmpty: 'Warenkorb ist leer',
      orderFailed: 'Bestellung fehlgeschlagen',
      popular: 'Beliebt',
      new: 'Neu'
    },
    en: {
      welcome: 'Welcome',
      start: 'Start Order',
      selectLanguage: 'Select Language',
      audioPrompts: 'Audio Prompts',
      menu: 'Menu',
      cart: 'Cart',
      empty: 'Empty',
      total: 'Total',
      checkout: 'Checkout',
      addToCart: 'Add to Cart',
      customize: 'Customize',
      makeMeal: 'Make it a Meal',
      extras: 'Extras',
      remove: 'Remove',
      size: 'Size',
      regular: 'Regular',
      large: 'Large',
      selectPayment: 'Select Payment Method',
      cash: 'Cash',
      card: 'Card',
      mobile: 'Mobile Payment',
      orderConfirmed: 'Order Confirmed',
      yourOrderNumber: 'Your Order Number',
      thankYou: 'Thank You!',
      pickupInfo: 'Please remember this number.',
      newOrder: 'New Order',
      back: 'Back',
      cancel: 'Cancel',
      welcomeMessage: 'Welcome to our ordering system',
      categorySelected: 'Category',
      selected: 'selected',
      addedToCart: 'Added to cart',
      cartEmpty: 'Cart is empty',
      orderFailed: 'Order failed',
      popular: 'Popular',
      new: 'New'
    }
  }[language];

  // Screen: Welcome
  if (currentScreen === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-9xl mb-8 animate-bounce">🍔</div>
          <h1 className="text-7xl font-bold text-white mb-12">
            {t.welcome}
          </h1>
          <Button
            onClick={handleStart}
            className="h-32 w-96 text-4xl bg-white text-red-600 hover:bg-gray-100 rounded-3xl shadow-2xl transform hover:scale-105 transition-all"
          >
            {t.start}
            <ChevronRight className="h-16 w-16 ml-4" />
          </Button>
          
          <div className="mt-12">
            <Button
              onClick={() => setAudioEnabled(!audioEnabled)}
              variant="outline"
              className="bg-white/20 border-white text-white hover:bg-white/30"
            >
              <Volume2 className={`h-6 w-6 mr-2 ${audioEnabled ? 'text-green-400' : ''}`} />
              {t.audioPrompts}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Screen: Language Selection
  if (currentScreen === 'language') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <h2 className="text-6xl font-bold text-white text-center mb-12">
            {t.selectLanguage}
          </h2>
          
          <div className="grid grid-cols-2 gap-8">
            <Button
              onClick={() => handleLanguageSelect('de')}
              className="h-64 text-5xl bg-white hover:bg-gray-100 text-gray-900 rounded-3xl shadow-2xl transform hover:scale-105 transition-all"
            >
              <div className="text-center">
                <div className="text-8xl mb-4">🇩🇪</div>
                <div>Deutsch</div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleLanguageSelect('en')}
              className="h-64 text-5xl bg-white hover:bg-gray-100 text-gray-900 rounded-3xl shadow-2xl transform hover:scale-105 transition-all"
            >
              <div className="text-center">
                <div className="text-8xl mb-4">🇬🇧</div>
                <div>English</div>
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Screen: Menu
  if (currentScreen === 'menu') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
        {/* Header with Cart */}
        <div className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} shadow-lg sticky top-0 z-10`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  onClick={resetKiosk}
                  variant="outline"
                  size="lg"
                  className="h-16 w-16"
                >
                  <Home className="h-8 w-8" />
                </Button>
                <div className="text-5xl">🍔</div>
                <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t.menu}
                </h1>
              </div>
              
              <Button
                onClick={() => setCurrentScreen('cart')}
                className="h-20 px-8 text-2xl bg-red-600 hover:bg-red-700 text-white rounded-2xl relative"
              >
                <ShoppingCart className="h-8 w-8 mr-3" />
                {t.cart}
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-gray-900 h-10 w-10 rounded-full flex items-center justify-center text-xl font-bold">
                    {cart.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Categories */}
          <div className="mb-8">
            <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Kategorien
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map(category => (
                <Card
                  key={category.id}
                  onClick={() => handleCategorySelect(category.id)}
                  className={`cursor-pointer transition-all transform hover:scale-105 hover:shadow-2xl ${
                    selectedCategory === category.id
                      ? 'ring-4 ring-red-500'
                      : ''
                  } ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}
                >
                  <div className="p-8 text-center">
                    <div className="text-6xl mb-4">{category.icon}</div>
                    <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {language === 'en' ? category.name_en || category.name : category.name}
                    </h3>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Products */}
          {selectedCategory && (
            <div>
              <h2 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Produkte
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`cursor-pointer transition-all transform hover:scale-105 hover:shadow-2xl ${
                      theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
                    }`}
                  >
                    <div className={`h-48 flex items-center justify-center ${
                      theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
                    }`}>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-7xl">🍽️</div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'en' ? product.name_en || product.name : product.name}
                      </h3>
                      <p className={`text-lg mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {language === 'en' ? product.description_en || product.description : product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-bold text-green-600">
                          €{product.price.toFixed(2)}
                        </span>
                        <Button className="bg-red-600 hover:bg-red-700 h-14 px-6">
                          <Plus className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Screen: Product Detail (to be continued...)
  if (currentScreen === 'productDetail' && selectedProduct) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'} p-8`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Button
              onClick={() => setCurrentScreen('menu')}
              variant="outline"
              size="lg"
              className="h-16 px-8 text-xl"
            >
              ← {t.back}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Image */}
            <Card className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} overflow-hidden`}>
              <div className={`h-96 flex items-center justify-center ${
                theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
              }`}>
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-9xl">🍽️</div>
                )}
              </div>
              <div className="p-8">
                <h2 className={`text-4xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'en' ? selectedProduct.name_en || selectedProduct.name : selectedProduct.name}
                </h2>
                <p className={`text-xl mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'en' ? selectedProduct.description_en || selectedProduct.description : selectedProduct.description}
                </p>
                <div className="flex items-center gap-4 text-lg">
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {selectedProduct.preparation_time} min
                  </span>
                  <span className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    {Math.floor(Math.random() * 300 + 200)} kcal
                  </span>
                </div>
              </div>
            </Card>

            {/* Customization */}
            <div className="space-y-6">
              <Card className={`p-8 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <h3 className={`text-2xl font-bold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t.customize}
                </h3>

                {/* Make it a Meal */}
                <div className={`p-6 rounded-2xl mb-6 border-2 cursor-pointer transition-all ${
                  customization.makeMeal
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : theme === 'dark' ? 'border-gray-700 bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => setCustomization({...customization, makeMeal: !customization.makeMeal})}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Package className="h-8 w-8 text-green-600" />
                      <div>
                        <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {t.makeMeal}
                        </h4>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          + Pommes + Getränk
                        </p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      +€2.99
                    </div>
                  </div>
                </div>

                {/* Size Selection */}
                <div className="mb-6">
                  <h4 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t.size}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={() => setCustomization({...customization, size: 'regular'})}
                      variant={customization.size === 'regular' ? 'default' : 'outline'}
                      className="h-20 text-xl"
                    >
                      {t.regular}
                    </Button>
                    <Button
                      onClick={() => setCustomization({...customization, size: 'large'})}
                      variant={customization.size === 'large' ? 'default' : 'outline'}
                      className="h-20 text-xl"
                    >
                      {t.large} (+€1.50)
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Add to Cart Button */}
              <Card className={`p-8 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t.total}:
                  </span>
                  <span className="text-4xl font-bold text-green-600">
                    €{(selectedProduct.price + (customization.makeMeal ? 2.99 : 0) + (customization.size === 'large' ? 1.50 : 0)).toFixed(2)}
                  </span>
                </div>
                <Button
                  onClick={addToCart}
                  className="w-full h-20 text-2xl bg-red-600 hover:bg-red-700 text-white rounded-2xl"
                >
                  <Plus className="h-8 w-8 mr-3" />
                  {t.addToCart}
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Screen: Cart
  if (currentScreen === 'cart') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'} p-8`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <ShoppingCart className="inline h-10 w-10 mr-4" />
              {t.cart}
            </h1>
            <Button
              onClick={() => setCurrentScreen('menu')}
              variant="outline"
              size="lg"
              className="h-16 px-8 text-xl"
            >
              {t.back}
            </Button>
          </div>

          {cart.length === 0 ? (
            <Card className={`p-16 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <ShoppingCart className={`h-24 w-24 mx-auto mb-6 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className={`text-2xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {t.empty}
              </p>
            </Card>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                {cart.map((item, index) => (
                  <Card key={index} className={`p-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {item.product_name}
                        </h3>
                        {item.customization?.makeMeal && (
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            + Pommes + Getränk
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4">
                          <Button
                            onClick={() => updateCartQuantity(index, -1)}
                            size="lg"
                            variant="outline"
                            className="h-14 w-14"
                          >
                            <Minus className="h-6 w-6" />
                          </Button>
                          <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {item.quantity}
                          </span>
                          <Button
                            onClick={() => updateCartQuantity(index, 1)}
                            size="lg"
                            variant="outline"
                            className="h-14 w-14"
                          >
                            <Plus className="h-6 w-6" />
                          </Button>
                        </div>
                        
                        <span className="text-3xl font-bold text-green-600 w-32 text-right">
                          €{item.total_price.toFixed(2)}
                        </span>
                        
                        <Button
                          onClick={() => removeFromCart(index)}
                          variant="ghost"
                          size="lg"
                        >
                          <X className="h-6 w-6 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className={`p-8 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-8">
                  <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {t.total}:
                  </span>
                  <span className="text-5xl font-bold text-green-600">
                    €{getCartTotal().toFixed(2)}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full h-24 text-3xl bg-red-600 hover:bg-red-700 text-white rounded-2xl"
                >
                  {t.checkout}
                  <ChevronRight className="h-10 w-10 ml-4" />
                </Button>
              </Card>
            </>
          )}
        </div>
      </div>
    );
  }

  // Screen: Payment
  if (currentScreen === 'payment') {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'} flex items-center justify-center p-8`}>
        <div className="max-w-4xl w-full">
          <h2 className={`text-4xl font-bold text-center mb-12 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {t.selectPayment}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              onClick={() => handlePayment('cash')}
              className={`cursor-pointer transition-all transform hover:scale-105 hover:shadow-2xl p-12 ${
                theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
              }`}
            >
              <div className="text-center">
                <div className="text-7xl mb-6">💵</div>
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t.cash}
                </h3>
              </div>
            </Card>

            <Card
              onClick={() => handlePayment('card')}
              className={`cursor-pointer transition-all transform hover:scale-105 hover:shadow-2xl p-12 ${
                theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
              }`}
            >
              <div className="text-center">
                <div className="text-7xl mb-6">💳</div>
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t.card}
                </h3>
              </div>
            </Card>

            <Card
              onClick={() => handlePayment('mobile')}
              className={`cursor-pointer transition-all transform hover:scale-105 hover:shadow-2xl p-12 ${
                theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
              }`}
            >
              <div className="text-center">
                <div className="text-7xl mb-6">📱</div>
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t.mobile}
                </h3>
              </div>
            </Card>
          </div>

          <Button
            onClick={() => setCurrentScreen('cart')}
            variant="outline"
            size="lg"
            className="w-full h-16 text-xl"
          >
            ← {t.back}
          </Button>
        </div>
      </div>
    );
  }

  // Screen: Confirmation
  if (currentScreen === 'confirmation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <Check className="h-32 w-32 mx-auto text-white animate-bounce" />
          </div>
          <h1 className="text-6xl font-bold text-white mb-8">
            {t.thankYou}
          </h1>
          <p className="text-3xl text-white mb-12">
            {t.yourOrderNumber}
          </p>
          <div className="bg-white rounded-3xl p-16 mb-12 shadow-2xl">
            <div className="text-9xl font-bold text-green-600">
              {orderNumber}
            </div>
          </div>
          <p className="text-2xl text-white mb-12">
            {t.pickupInfo}
          </p>
          <Button
            onClick={resetKiosk}
            className="h-24 px-12 text-3xl bg-white text-green-600 hover:bg-gray-100 rounded-3xl shadow-2xl"
          >
            <Home className="h-10 w-10 mr-4" />
            {t.newOrder}
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default KioskTerminal;

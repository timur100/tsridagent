import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  ShoppingCart, Plus, Minus, X, CreditCard, Banknote, 
  Smartphone, Check, ArrowLeft, Trash2, Receipt, Home, Truck, Store
} from 'lucide-react';
import toast from 'react-hot-toast';

const OrderKiosk = ({ tenantId = 'default-tenant', locationId = 'default-location' }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [currentStep, setCurrentStep] = useState('orderType'); // orderType, menu, delivery, payment, confirmation
  const [orderType, setOrderType] = useState(null); // 'pickup' or 'delivery'
  const [orderNumber, setOrderNumber] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [language, setLanguage] = useState('de');
  
  // Delivery-specific state
  const [deliveryAddress, setDeliveryAddress] = useState({
    customer_name: '',
    phone: '',
    street: '',
    house_number: '',
    postal_code: '',
    city: '',
    additional_info: ''
  });
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState(0);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      // Load categories
      const catResult = await apiCall(`/api/fastfood/categories?tenant_id=${tenantId}`);
      if (catResult.success) {
        const cats = catResult.data?.data || catResult.data || [];
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategory(cats[0].id);
        }
      }

      // Load products
      const prodResult = await apiCall(`/api/fastfood/products?tenant_id=${tenantId}&available_only=true`);
      if (prodResult.success) {
        const prods = prodResult.data?.data || prodResult.data || [];
        setProducts(prods);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
    }
  };

  const loadDeliveryZones = async () => {
    try {
      const result = await apiCall(`/api/fastfood/delivery-zones?tenant_id=${tenantId}&location_id=${locationId}`);
      if (result.success) {
        const zones = result.data?.data || result.data || [];
        setDeliveryZones(zones.filter(z => z.active));
      }
    } catch (error) {
      console.error('Error loading delivery zones:', error);
    }
  };

  const validateDeliveryAddress = async () => {
    // Simple validation for now
    if (!deliveryAddress.customer_name || !deliveryAddress.phone || 
        !deliveryAddress.street || !deliveryAddress.postal_code || !deliveryAddress.city) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return false;
    }
    
    // If zones are available, pick first one as default
    if (deliveryZones.length > 0 && !selectedZone) {
      const zone = deliveryZones[0];
      setSelectedZone(zone);
      setDeliveryFee(zone.delivery_fee);
    }
    
    return true;
  };


  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: language === 'en' ? product.name_en || product.name : product.name,
        quantity: 1,
        unit_price: product.price,
        total_price: product.price
      }]);
    }
    
    toast.success(language === 'de' ? 'Zum Warenkorb hinzugefügt' : 'Added to cart');
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        if (newQuantity === 0) {
          return null;
        }
        return {
          ...item,
          quantity: newQuantity,
          total_price: newQuantity * item.unit_price
        };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    if (window.confirm(language === 'de' ? 'Warenkorb leeren?' : 'Clear cart?')) {
      setCart([]);
    }
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error(language === 'de' ? 'Warenkorb ist leer' : 'Cart is empty');
      return;
    }
    setCurrentStep('payment');
  };

  const handlePayment = async (method) => {
    setSelectedPayment(method);
    
    try {
      // Create order
      const orderData = {
        tenant_id: tenantId,
        location_id: locationId,
        terminal_id: 'kiosk-001',
        items: cart,
        payment_method: method,
        language: language
      };

      const result = await apiCall('/api/fastfood/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      });

      if (result.success) {
        const order = result.data?.data || result.data;
        
        // Update payment status
        await apiCall(`/api/fastfood/orders/${order.id}/payment?payment_status=completed`, {
          method: 'PUT'
        });

        setOrderNumber(order.order_number);
        setCurrentStep('confirmation');
        
        // Print receipt (simulation)
        setTimeout(() => {
          printReceipt(order);
        }, 500);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(language === 'de' ? 'Bestellung fehlgeschlagen' : 'Order failed');
    }
  };

  const printReceipt = (order) => {
    // Simulate receipt printing
    const receiptContent = `
========================================
          ${language === 'de' ? 'BESTELLBON' : 'ORDER RECEIPT'}
========================================

${language === 'de' ? 'Bestellnummer' : 'Order Number'}: ${order.order_number}
${language === 'de' ? 'Datum' : 'Date'}: ${new Date().toLocaleString(language)}

----------------------------------------
${cart.map(item => `
${item.product_name}
  ${item.quantity} x €${item.unit_price.toFixed(2)} = €${item.total_price.toFixed(2)}
`).join('')}
----------------------------------------

${language === 'de' ? 'GESAMT' : 'TOTAL'}: €${getTotal().toFixed(2)}
${language === 'de' ? 'Zahlungsart' : 'Payment'}: ${selectedPayment === 'cash' ? (language === 'de' ? 'Bar' : 'Cash') : selectedPayment === 'card' ? (language === 'de' ? 'Karte' : 'Card') : 'Mobile'}

========================================
${language === 'de' ? 'VIELEN DANK!' : 'THANK YOU!'}
${language === 'de' ? 'Ihre Bestellung wird zubereitet' : 'Your order is being prepared'}
========================================
    `;

    console.log(receiptContent);
    
    // In production: Send to printer via API
    // For now, download as text file
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.order_number}.txt`;
    a.click();
  };

  const startNewOrder = () => {
    setCart([]);
    setCurrentStep('orderType');
    setOrderType(null);
    setOrderNumber(null);
    setSelectedPayment(null);
    setSelectedCategory(categories.length > 0 ? categories[0].id : null);
    setDeliveryAddress({
      customer_name: '',
      phone: '',
      street: '',
      house_number: '',
      postal_code: '',
      city: '',
      additional_info: ''
    });
    setSelectedZone(null);
    setDeliveryFee(0);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const texts = {
    de: {
      selectProduct: 'Produkt auswählen',
      cart: 'Warenkorb',
      empty: 'Leer',
      total: 'Gesamt',
      orderNow: 'Jetzt bestellen',
      selectPayment: 'Zahlungsart wählen',
      cash: 'Barzahlung',
      card: 'Kartenzahlung',
      mobile: 'Mobile Payment',
      back: 'Zurück',
      orderConfirmed: 'Bestellung bestätigt!',
      yourOrderNumber: 'Ihre Bestellnummer',
      pickupInfo: 'Bitte merken Sie sich diese Nummer. Sie wird aufgerufen, wenn Ihre Bestellung fertig ist.',
      newOrder: 'Neue Bestellung',
      receiptPrinted: 'Bon wird gedruckt...'
    },
    en: {
      selectProduct: 'Select Product',
      cart: 'Cart',
      empty: 'Empty',
      total: 'Total',
      orderNow: 'Order Now',
      selectPayment: 'Select Payment Method',
      cash: 'Cash',
      card: 'Card',
      mobile: 'Mobile Payment',
      back: 'Back',
      orderConfirmed: 'Order Confirmed!',
      yourOrderNumber: 'Your Order Number',
      pickupInfo: 'Please remember this number. It will be called when your order is ready.',
      newOrder: 'New Order',
      receiptPrinted: 'Receipt printing...'
    }
  };

  const t = texts[language];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🍔</div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Fastfood Bestellsystem
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setLanguage('de')}
              variant={language === 'de' ? 'default' : 'outline'}
              size="sm"
            >
              🇩🇪 DE
            </Button>
            <Button
              onClick={() => setLanguage('en')}
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
            >
              🇬🇧 EN
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Order Type Selection */}
        {currentStep === 'orderType' && (
          <div className="max-w-4xl mx-auto">
            <h2 className={`text-3xl font-bold mb-8 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {language === 'de' ? 'Wie möchten Sie bestellen?' : 'How would you like to order?'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pickup Option */}
              <Card
                onClick={() => {
                  setOrderType('pickup');
                  setCurrentStep('menu');
                }}
                className={`p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-2 border-gray-700 hover:border-orange-500' : 'bg-white border-2 border-gray-200 hover:border-orange-500'
                }`}
              >
                <div className="text-center">
                  <Store className="h-24 w-24 mx-auto mb-4 text-orange-500" />
                  <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {language === 'de' ? 'Abholung' : 'Pickup'}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {language === 'de' ? 'Bestellen Sie und holen Sie im Restaurant ab' : 'Order and pick up at the restaurant'}
                  </p>
                </div>
              </Card>

              {/* Delivery Option */}
              <Card
                onClick={() => {
                  setOrderType('delivery');
                  loadDeliveryZones();
                  setCurrentStep('menu');
                }}
                className={`p-8 cursor-pointer transition-all hover:scale-105 hover:shadow-2xl ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-2 border-gray-700 hover:border-blue-500' : 'bg-white border-2 border-gray-200 hover:border-blue-500'
                }`}
              >
                <div className="text-center">
                  <Truck className="h-24 w-24 mx-auto mb-4 text-blue-500" />
                  <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {language === 'de' ? 'Lieferung' : 'Delivery'}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {language === 'de' ? 'Lassen Sie sich Ihre Bestellung liefern' : 'Get your order delivered'}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Menu Selection */}
        {currentStep === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products */}
            <div className="lg:col-span-2 space-y-4">
              {/* Category Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="lg"
                    className="text-lg whitespace-nowrap"
                  >
                    {cat.icon} {language === 'en' ? cat.name_en || cat.name : cat.name}
                  </Button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`cursor-pointer transition-all hover:scale-105 hover:shadow-xl ${
                      theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
                    }`}
                  >
                    {/* Product Image */}
                    <div className={`h-32 flex items-center justify-center ${
                      theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
                    }`}>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-5xl">🍽️</div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4 text-center">
                      <h3 className={`font-bold text-lg mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'en' ? product.name_en || product.name : product.name}
                      </h3>
                      <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {language === 'en' ? product.description_en || product.description : product.description}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl font-bold text-green-600">
                          €{product.price.toFixed(2)}
                        </span>
                        <Button size="sm" className="bg-[#c00000] hover:bg-[#a00000]">
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cart Sidebar */}
            <div className="lg:col-span-1">
              <Card className={`sticky top-6 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-xl font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <ShoppingCart className="h-6 w-6" />
                      {t.cart}
                    </h2>
                    {cart.length > 0 && (
                      <Button
                        onClick={clearCart}
                        variant="ghost"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingCart className={`h-16 w-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
                      <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        {t.empty}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                        {cart.map(item => (
                          <div
                            key={item.product_id}
                            className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {item.product_name}
                              </span>
                              <Button
                                onClick={() => removeFromCart(item.product_id)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => updateQuantity(item.product_id, -1)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                  {item.quantity}
                                </span>
                                <Button
                                  onClick={() => updateQuantity(item.product_id, 1)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <span className="font-bold text-green-600">
                                €{item.total_price.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={`border-t pt-4 mb-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between text-xl font-bold mb-4">
                          <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                            {t.total}:
                          </span>
                          <span className="text-green-600">
                            €{getTotal().toFixed(2)}
                          </span>
                        </div>

                        <Button
                          onClick={handleCheckout}
                          className="w-full h-14 text-lg bg-[#c00000] hover:bg-[#a00000] text-white"
                        >
                          {t.orderNow}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Payment Selection */}
        {currentStep === 'payment' && (
          <div className="max-w-2xl mx-auto">
            <Card className={`p-8 ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <h2 className={`text-2xl font-bold mb-6 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t.selectPayment}
              </h2>

              <div className="space-y-4 mb-8">
                <Button
                  onClick={() => handlePayment('cash')}
                  className="w-full h-24 text-xl flex items-center justify-center gap-4 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Banknote className="h-10 w-10" />
                  {t.cash}
                </Button>

                <Button
                  onClick={() => handlePayment('card')}
                  className="w-full h-24 text-xl flex items-center justify-center gap-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="h-10 w-10" />
                  {t.card}
                </Button>

                <Button
                  onClick={() => handlePayment('mobile')}
                  className="w-full h-24 text-xl flex items-center justify-center gap-4 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Smartphone className="h-10 w-10" />
                  {t.mobile}
                </Button>
              </div>

              <Button
                onClick={() => setCurrentStep('menu')}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                {t.back}
              </Button>
            </Card>
          </div>
        )}

        {/* Confirmation */}
        {currentStep === 'confirmation' && (
          <div className="max-w-2xl mx-auto">
            <Card className={`p-12 text-center ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
              <div className="mb-6">
                <Check className="h-24 w-24 mx-auto text-green-600 mb-4" />
                <h2 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {t.orderConfirmed}
                </h2>
              </div>

              <div className={`mb-8 p-8 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <p className={`text-lg mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t.yourOrderNumber}
                </p>
                <div className="text-6xl font-bold text-[#c00000] my-4">
                  {orderNumber}
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t.pickupInfo}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 mb-6 text-green-600">
                <Receipt className="h-5 w-5" />
                <span>{t.receiptPrinted}</span>
              </div>

              <Button
                onClick={startNewOrder}
                className="w-full h-16 text-xl bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Home className="h-6 w-6 mr-2" />
                {t.newOrder}
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderKiosk;

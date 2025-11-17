import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { X, Package, Plus, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ProductDetailModal = ({ product, onClose, onAddToCart }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [templateDetails, setTemplateDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Fetch template details if this is a component set
  useEffect(() => {
    if (product && product.item_type === 'component_set' && product.id) {
      fetchTemplateDetails();
    }
  }, [product]);

  const fetchTemplateDetails = async () => {
    try {
      setLoading(true);
      const result = await apiCall(`/api/components/shop/template-details/${product.id}`);
      if (result.success && result.data) {
        setTemplateDetails(result.data.template);
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      toast.error('Fehler beim Laden der Set-Details');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const isComponentSet = product.item_type === 'component_set';

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 p-6 border-b flex justify-between items-start ${
          theme === 'dark' ? 'bg-[#2a2a2a] border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              theme === 'dark' ? 'bg-[#c00000]/10' : 'bg-red-50'
            }`}>
              <Package className="h-8 w-8 text-[#c00000]" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {product.name}
              </h2>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {product.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-gray-800 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Gallery Section */}
            <div>
              {/* Main Image */}
              {product.image_url || product.component_images?.length > 0 ? (
                <div className="space-y-4">
                  <div className={`w-full aspect-square rounded-xl overflow-hidden ${
                    theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
                  }`}>
                    <img 
                      src={
                        product.component_images?.length > 0 
                          ? product.component_images[selectedImageIndex] 
                          : product.image_url
                      } 
                      alt={`${product.name} - Bild ${selectedImageIndex + 1}`}
                      className="w-full h-full object-contain p-8"
                    />
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  {product.component_images?.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {product.component_images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImageIndex === idx
                              ? 'border-[#c00000] scale-105'
                              : theme === 'dark'
                                ? 'border-gray-700 hover:border-gray-500'
                                : 'border-gray-300 hover:border-gray-400'
                          } ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}
                        >
                          <img 
                            src={img} 
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-contain p-2"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className={`w-full aspect-square rounded-xl flex items-center justify-center ${
                  theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
                }`}>
                  <Package className={`h-24 w-24 ${theme === 'dark' ? 'text-gray-700' : 'text-gray-300'}`} />
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Description */}
              {product.description && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Beschreibung
                  </h3>
                  <p className={`text-sm leading-relaxed ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {product.description}
                  </p>
                </div>
              )}

              {/* Specifications or Components */}
              {isComponentSet && templateDetails ? (
                /* Component Set Details */
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Set-Details
                  </h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                        Artikelnummer
                      </span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {templateDetails.article_number || 'NL-SET-XXX'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                        Anzahl Komponenten
                      </span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {templateDetails.components_detail?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Components List with LED */}
                  <h4 className={`text-md font-semibold mb-3 mt-6 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Enthaltene Komponenten
                  </h4>
                  <div className="space-y-2">
                    {templateDetails.components_detail?.map((comp, idx) => (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          theme === 'dark' ? 'bg-[#1a1a1a] border-gray-800' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {/* LED Indicator */}
                            {comp.is_available ? (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                <XCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <p className={`font-medium text-sm ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>
                                {comp.name}
                              </p>
                              {comp.manufacturer && comp.model && (
                                <p className={`text-xs ${
                                  theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                                }`}>
                                  {comp.manufacturer} - {comp.model}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {comp.required_quantity}x
                            </p>
                            <p className={`text-xs ${
                              comp.is_available 
                                ? 'text-green-500' 
                                : 'text-red-500'
                            }`}>
                              {comp.is_available 
                                ? `${comp.available_quantity} verfügbar`
                                : `Nur ${comp.available_quantity} verfügbar`
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Missing Components Warning */}
                  {templateDetails.missing_components_count > 0 && (
                    <div className={`mt-4 p-4 rounded-lg border-2 ${
                      theme === 'dark' 
                        ? 'bg-orange-900/20 border-orange-700 text-orange-300'
                        : 'bg-orange-50 border-orange-300 text-orange-800'
                    }`}>
                      <p className="text-sm font-medium">
                        ⚠️ {templateDetails.missing_components_count} Komponente(n) nicht verfügbar
                      </p>
                      <p className="text-xs mt-1">
                        Bestellung wird als Rückstand markiert
                      </p>
                    </div>
                  )}
                </div>
              ) : !isComponentSet ? (
                /* Regular Product Specifications */
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Technische Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                        Artikelnummer
                      </span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {product.item_number || product.id}
                      </span>
                    </div>
                    
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                        Einheit
                      </span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {product.unit}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                        Kategorie
                      </span>
                      <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {product.category}
                      </span>
                    </div>

                    {product.supplier && (
                      <div className="flex justify-between py-2 border-b border-gray-700">
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>
                          Lieferant
                        </span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {product.supplier}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c00000]" />
                  </div>
                )
              )}

              {/* Availability */}
              <div className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Verfügbarkeit
                  </span>
                  <span className={`text-2xl font-bold ${
                    product.quantity_in_stock > 0
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}>
                    {product.quantity_in_stock} {product.unit}
                  </span>
                </div>
                {product.quantity_in_stock > 0 && (
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Auf Lager und sofort verfügbar
                  </p>
                )}
                {product.quantity_in_stock === 0 && (
                  <p className="text-xs text-red-500">
                    Derzeit nicht verfügbar
                  </p>
                )}
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                disabled={product.quantity_in_stock === 0}
                className={`w-full py-6 text-lg ${
                  product.quantity_in_stock === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#c00000] hover:bg-[#a00000]'
                } text-white`}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                In den Warenkorb
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;

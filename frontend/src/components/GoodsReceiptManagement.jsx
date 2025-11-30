import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Package, Scan, Plus, Printer, Check, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const GoodsReceiptManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [serialNumbers, setSerialNumbers] = useState(['']);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [generatingLabels, setGeneratingLabels] = useState(false);
  
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    fetchReceipts();
    // Auto-focus barcode input
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const fetchReceipts = async () => {
    try {
      const result = await apiCall('/api/inventory/goods-receipts?limit=20');
      if (result.success && result.data) {
        setReceipts(result.data.receipts || []);
      }
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  };

  const handleBarcodeSearch = async (barcode) => {
    if (!barcode) return;
    
    setLoading(true);
    try {
      const result = await apiCall(`/api/inventory/items?search=${barcode}`);
      if (result.success && result.data && result.data.items && result.data.items.length > 0) {
        const item = result.data.items[0];
        setSelectedItem(item);
        toast.success(`Artikel gefunden: ${item.name}`);
      } else {
        toast.error('Artikel nicht gefunden');
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error searching item:', error);
      toast.error('Fehler bei der Suche');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeSearch(scannedBarcode);
    }
  };

  const handleAddSerialNumber = () => {
    setSerialNumbers([...serialNumbers, '']);
  };

  const handleSerialNumberChange = (index, value) => {
    const newSerials = [...serialNumbers];
    newSerials[index] = value;
    setSerialNumbers(newSerials);
  };

  const handleRemoveSerialNumber = (index) => {
    const newSerials = serialNumbers.filter((_, i) => i !== index);
    setSerialNumbers(newSerials.length > 0 ? newSerials : ['']);
  };

  const handleProcessReceipt = async () => {
    if (!selectedItem) {
      toast.error('Bitte wählen Sie einen Artikel aus');
      return;
    }

    if (quantity <= 0) {
      toast.error('Menge muss größer als 0 sein');
      return;
    }

    setLoading(true);
    try {
      const filteredSerials = serialNumbers.filter(s => s.trim() !== '');
      
      const result = await apiCall('/api/inventory/goods-receipt', {
        method: 'POST',
        body: JSON.stringify({
          item_id: selectedItem.id,
          quantity: parseInt(quantity),
          serial_numbers: filteredSerials,
          notes: notes
        })
      });

      if (result.success) {
        toast.success(result.data.message || 'Wareneingang erfolgreich gebucht');
        
        // Reset form
        setScannedBarcode('');
        setSelectedItem(null);
        setQuantity(1);
        setSerialNumbers(['']);
        setNotes('');
        
        // Refresh receipts
        fetchReceipts();
        
        // Refocus barcode input
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      } else {
        toast.error(result.data?.message || 'Fehler beim Buchen');
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      toast.error('Fehler beim Buchen des Wareneingangs');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLabels = async () => {
    if (!selectedItem) {
      toast.error('Bitte wählen Sie einen Artikel aus');
      return;
    }

    setGeneratingLabels(true);
    try {
      const filteredSerials = serialNumbers.filter(s => s.trim() !== '');
      
      const result = await apiCall('/api/inventory/generate-labels', {
        method: 'POST',
        body: JSON.stringify({
          item_id: selectedItem.id,
          quantity: parseInt(quantity),
          serial_numbers: filteredSerials
        })
      });

      if (result.success && result.data) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.data.pdf_data;
        link.download = result.data.filename;
        link.click();
        
        toast.success('Etiketten generiert und heruntergeladen');
      } else {
        toast.error('Fehler beim Generieren der Etiketten');
      }
    } catch (error) {
      console.error('Error generating labels:', error);
      toast.error('Fehler beim Generieren der Etiketten');
    } finally {
      setGeneratingLabels(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Wareneingang
        </h2>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Artikel scannen, einbuchen und Etiketten drucken
        </p>
      </div>

      {/* Barcode Scanner Section */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Scan className={`h-6 w-6 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`} />
          <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Artikel scannen
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Barcode / Artikelnummer
            </label>
            <div className="flex gap-3">
              <input
                ref={barcodeInputRef}
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                onKeyPress={handleBarcodeKeyPress}
                placeholder="Barcode scannen oder eingeben..."
                className={`flex-1 px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <Button
                onClick={() => handleBarcodeSearch(scannedBarcode)}
                disabled={loading || !scannedBarcode}
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Scan className="h-4 w-4 mr-2" />
                Suchen
              </Button>
            </div>
          </div>

          {/* Selected Item Display */}
          {selectedItem && (
            <div className={`p-4 rounded-lg border-2 ${
              theme === 'dark' ? 'bg-[#1a1a1a] border-green-600' : 'bg-green-50 border-green-500'
            }`}>
              <div className="flex items-start gap-4">
                {selectedItem.image_url && (
                  <img 
                    src={selectedItem.image_url} 
                    alt={selectedItem.name}
                    className="w-20 h-20 object-contain rounded"
                  />
                )}
                <div className="flex-1">
                  <h4 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedItem.name}
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Kategorie: {selectedItem.category}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Aktueller Bestand: <span className="font-semibold">{selectedItem.quantity_in_stock} {selectedItem.unit}</span>
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Barcode: {selectedItem.barcode}
                  </p>
                </div>
                <Check className="h-8 w-8 text-green-500" />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Goods Receipt Form */}
      {selectedItem && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Package className={`h-6 w-6 ${theme === 'dark' ? 'text-[#c00000]' : 'text-[#c00000]'}`} />
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Wareneingang buchen
            </h3>
          </div>

          <div className="space-y-4">
            {/* Quantity */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Menge
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Serial Numbers */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Seriennummern (optional)
              </label>
              <div className="space-y-2">
                {serialNumbers.map((serial, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={serial}
                      onChange={(e) => handleSerialNumberChange(index, e.target.value)}
                      placeholder={`Seriennummer ${index + 1}`}
                      className={`flex-1 px-4 py-2 border rounded-lg ${
                        theme === 'dark'
                          ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    {serialNumbers.length > 1 && (
                      <Button
                        onClick={() => handleRemoveSerialNumber(index)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Entfernen
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  onClick={handleAddSerialNumber}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Seriennummer hinzufügen
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Notizen (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Lieferant, Bestellnummer, etc."
                className={`w-full px-4 py-2 border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-[#1a1a1a] border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleProcessReceipt}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-4 w-4 mr-2" />
                {loading ? 'Wird gebucht...' : 'Wareneingang buchen'}
              </Button>
              <Button
                onClick={handleGenerateLabels}
                disabled={generatingLabels}
                className="flex-1 bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <Printer className="h-4 w-4 mr-2" />
                {generatingLabels ? 'Generiere...' : 'Etiketten drucken'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Receipts */}
      <Card className={`p-6 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
        <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Letzte Wareneingänge
        </h3>
        
        {receipts.length === 0 ? (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Noch keine Wareneingänge vorhanden
          </p>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full">
              <thead className={theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}>
                <tr>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Datum
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Artikel
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Menge
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Bestand
                  </th>
                  <th className={`text-left py-3 px-4 text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Notizen
                  </th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr 
                    key={receipt.id}
                    className={`border-b ${theme === 'dark' ? 'border-gray-700 hover:bg-[#3a3a3a]' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {new Date(receipt.received_at).toLocaleString('de-DE')}
                    </td>
                    <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      {receipt.item_name}
                    </td>
                    <td className={`py-3 px-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}`}>
                      <span className="font-semibold text-green-600">+{receipt.quantity}</span>
                    </td>
                    <td className={`py-3 px-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {receipt.old_stock} → {receipt.new_stock}
                    </td>
                    <td className={`py-3 px-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {receipt.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default GoodsReceiptManagement;

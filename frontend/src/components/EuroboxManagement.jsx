import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Box, Plus, Edit, Trash2, Package, CheckCircle, AlertCircle, X, Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import toast from 'react-hot-toast';

const EuroboxManagement = () => {
  const { theme } = useTheme();
  const [euroboxes, setEuroboxes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEurobox, setSelectedEurobox] = useState(null);
  const [editingEurobox, setEditingEurobox] = useState(null);
  const [formData, setFormData] = useState({
    eurobox_number: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('euroboxes'); // euroboxes, assignments

  useEffect(() => {
    fetchEuroboxes();
    fetchAssignments();
  }, []);

  const fetchEuroboxes = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-portal-174.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/euroboxes/list`);
      const data = await response.json();
      
      if (data.success) {
        setEuroboxes(data.euroboxes || []);
      }
    } catch (error) {
      console.error('Error fetching euroboxes:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-portal-174.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/euroboxes/assignments`);
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleCreate = () => {
    setEditingEurobox(null);
    setFormData({ eurobox_number: '', description: '' });
    setShowModal(true);
  };

  const handleEdit = (eurobox) => {
    setEditingEurobox(eurobox);
    setFormData({
      eurobox_number: eurobox.eurobox_number,
      description: eurobox.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-portal-174.preview.emergentagent.com';
      
      if (editingEurobox) {
        // Update
        const response = await fetch(`${backendUrl}/api/euroboxes/update/${editingEurobox.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: formData.description })
        });
        
        const data = await response.json();
        if (data.success) {
          toast.success('Eurobox aktualisiert');
          fetchEuroboxes();
          setShowModal(false);
        }
      } else {
        // Create
        const response = await fetch(`${backendUrl}/api/euroboxes/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        if (data.success) {
          toast.success('Eurobox erstellt');
          fetchEuroboxes();
          setShowModal(false);
        } else {
          toast.error(data.detail || 'Fehler beim Erstellen');
        }
      }
    } catch (error) {
      console.error('Error saving eurobox:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = async (eurobox) => {
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-portal-174.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/euroboxes/by-number/${eurobox.eurobox_number}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedEurobox({
          ...eurobox,
          order: data.current_order
        });
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching eurobox details:', error);
      toast.error('Fehler beim Laden der Details');
    }
  };

  const handlePrint = (eurobox) => {
    // Create a hidden iframe for printing
    const printWindow = window.open('', '_blank');
    
    // Generate barcode SVG
    const barcodeContainer = document.createElement('div');
    document.body.appendChild(barcodeContainer);
    
    // Render barcode temporarily
    const canvas = document.createElement('canvas');
    const JsBarcode = require('jsbarcode');
    
    JsBarcode(canvas, eurobox.eurobox_number, {
      format: 'CODE128',
      width: 2,
      height: 80,
      displayValue: true,
      fontSize: 14,
      margin: 10
    });
    
    const barcodeDataUrl = canvas.toDataURL('image/png');
    
    // Create print content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Eurobox Barcode - ${eurobox.eurobox_number}</title>
          <style>
            @media print {
              @page {
                size: 62mm 29mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              margin: 0;
              padding: 5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              background: white;
            }
            .label {
              text-align: center;
              width: 100%;
            }
            .barcode-container {
              margin: 2mm 0;
            }
            img {
              max-width: 52mm;
              height: auto;
            }
            .eurobox-number {
              font-size: 10pt;
              font-weight: bold;
              margin-top: 1mm;
            }
            .description {
              font-size: 8pt;
              color: #666;
              margin-top: 1mm;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="barcode-container">
              <img src="${barcodeDataUrl}" alt="${eurobox.eurobox_number}" />
            </div>
            ${eurobox.description ? `<div class="description">${eurobox.description}</div>` : ''}
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
    
    // Clean up
    document.body.removeChild(barcodeContainer);
  };

  const handleDelete = async (eurobox) => {
    if (!window.confirm(`Eurobox ${eurobox.eurobox_number} wirklich löschen?`)) return;

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://admin-portal-174.preview.emergentagent.com';
      const response = await fetch(`${backendUrl}/api/euroboxes/delete/${eurobox.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Eurobox gelöscht');
        fetchEuroboxes();
      } else {
        toast.error(data.detail || 'Fehler beim Löschen');
      }
    } catch (error) {
      console.error('Error deleting eurobox:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      available: 'bg-green-500/20 text-green-500',
      in_use: 'bg-[#c00000]/20 text-[#c00000]',
      maintenance: 'bg-yellow-500/20 text-yellow-500'
    };
    
    const labels = {
      available: 'Verfügbar',
      in_use: 'In Verwendung',
      maintenance: 'Wartung'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || badges.available}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Eurobox-Verwaltung
          </h2>
          <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie Euroboxen und deren Zuordnungen
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors"
        >
          <Plus className="h-5 w-5" />
          Neue Eurobox
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('euroboxes')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'euroboxes'
                ? 'text-[#c00000] border-[#c00000]'
                : theme === 'dark'
                  ? 'text-gray-400 border-transparent hover:text-gray-300'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Box className="h-5 w-5" />
            Euroboxen ({euroboxes.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'assignments'
                ? 'text-[#c00000] border-[#c00000]'
                : theme === 'dark'
                  ? 'text-gray-400 border-transparent hover:text-gray-300'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Package className="h-5 w-5" />
            Zuordnungen ({assignments.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'euroboxes' ? (
        /* Euroboxes List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {euroboxes.map((eurobox) => (
            <div
              key={eurobox.id}
              onClick={() => handleCardClick(eurobox)}
              className={`rounded-xl p-6 border-2 transition-all duration-300 cursor-pointer flex flex-col ${
                theme === 'dark' 
                  ? 'bg-[#2d2d2d] border-gray-700 hover:border-[#c00000] hover:shadow-[0_0_20px_rgba(192,0,0,0.3)] hover:-translate-y-1' 
                  : 'bg-white border-gray-200 hover:border-[#c00000] hover:shadow-[0_8px_24px_rgba(192,0,0,0.2)] hover:-translate-y-1'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Box className="h-6 w-6 text-[#c00000]" />
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {eurobox.eurobox_number}
                  </h3>
                </div>
                {getStatusBadge(eurobox.status)}
              </div>

              {/* Description - fixed height area */}
              <div className="h-10 mb-4">
                {eurobox.description && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {eurobox.description}
                  </p>
                )}
              </div>

              {/* Barcode */}
              <div className="bg-white rounded-lg p-3 mb-4">
                <Barcode 
                  value={eurobox.eurobox_number}
                  format="CODE128"
                  width={1.5}
                  height={60}
                  displayValue={true}
                  fontSize={12}
                  background="#ffffff"
                  lineColor="#000000"
                  margin={5}
                />
              </div>

              {/* Current Order - fixed height area */}
              <div className="h-16 mb-4">
                {eurobox.current_order_number && (
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#c00000]/10' : 'bg-red-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Aktuelle Bestellung:</p>
                    <p className="text-sm font-mono font-bold text-[#c00000]">
                      {eurobox.current_order_number}
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons - always at same position */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(eurobox);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Bearbeiten
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(eurobox);
                  }}
                  className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                  title="Barcode drucken"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(eurobox);
                  }}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Assignments Table */
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          {assignments.length === 0 ? (
            <div className={`text-center py-12 ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
              <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                Keine aktiven Zuordnungen
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1a1a1a]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                    Eurobox
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                    Bestellung
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                    Kunde
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                    Standort
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 font-mono">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 font-mono">
                    Kommissioniert
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#2a2a2a]">
                {assignments.map((assignment, idx) => (
                  <tr key={idx} className="border-t border-gray-700 hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-[#c00000]" />
                        <span className="text-white font-mono font-bold">{assignment.eurobox_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-mono">
                      {assignment.order_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {assignment.customer_company}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">
                      {assignment.location_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(assignment.fulfillment_status === 'picked' ? 'available' : 'in_use')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {assignment.picked_at ? new Date(assignment.picked_at).toLocaleDateString('de-DE') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedEurobox && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div 
            className={`rounded-xl p-6 max-w-2xl w-full ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Box className="h-8 w-8 text-[#c00000]" />
                <div>
                  <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {selectedEurobox.eurobox_number}
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Eurobox Details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-[#3d3d3d]' : 'hover:bg-gray-100'}`}
              >
                <X className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            {/* Eurobox Info */}
            <div className={`p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`text-xs uppercase font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Status
                  </p>
                  {getStatusBadge(selectedEurobox.status)}
                </div>
                {selectedEurobox.description && (
                  <div>
                    <p className={`text-xs uppercase font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Beschreibung
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {selectedEurobox.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Info */}
            {selectedEurobox.order ? (
              <div>
                <h4 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Zugeordnete Bestellung
                </h4>
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className={`text-xs uppercase font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Bestellnummer
                      </p>
                      <p className={`text-sm font-mono font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {selectedEurobox.order.order_number}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs uppercase font-semibold mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Status
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {selectedEurobox.order.fulfillment_status || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className={`p-4 rounded-lg border-2 ${theme === 'dark' ? 'bg-[#c00000]/10 border-[#c00000]' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-xs uppercase font-semibold mb-2 ${theme === 'dark' ? 'text-[#c00000]' : 'text-red-800'}`}>
                      Kunde
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Firma
                        </p>
                        <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {selectedEurobox.order.customer_company || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          E-Mail
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {selectedEurobox.order.customer_email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Standort
                        </p>
                        <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {selectedEurobox.order.location_name || selectedEurobox.order.location_code || 'N/A'}
                        </p>
                      </div>
                      {selectedEurobox.order.order_date && (
                        <div>
                          <p className={`text-xs mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Bestelldatum
                          </p>
                          <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(selectedEurobox.order.order_date).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  {selectedEurobox.order.items && selectedEurobox.order.items.length > 0 && (
                    <div className="mt-4">
                      <p className={`text-xs uppercase font-semibold mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Artikel ({selectedEurobox.order.items.length})
                      </p>
                      <div className="space-y-2">
                        {selectedEurobox.order.items.map((item, idx) => (
                          <div key={idx} className={`p-2 rounded ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                              {item.article_name || item.name || 'Unbekannt'}
                            </p>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              Menge: {item.quantity || 1} {item.unit || 'Stück'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`p-8 text-center rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                <Package className={`h-12 w-12 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Keine Bestellung zugeordnet
                </p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-6 max-w-md w-full ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {editingEurobox ? 'Eurobox bearbeiten' : 'Neue Eurobox'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingEurobox && (
                <div className={`p-4 rounded-lg mb-4 ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>
                    ℹ️ Die Eurobox-Nummer wird automatisch im Format <span className="font-mono font-bold">EB-YYYYMMDD-XXXX</span> generiert (z.B. EB-20251111-0001)
                  </p>
                </div>
              )}
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Eurobox-Nummer {editingEurobox ? '*' : '(wird automatisch generiert)'}
                </label>
                <input
                  type="text"
                  value={formData.eurobox_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, eurobox_number: e.target.value })}
                  disabled={!!editingEurobox}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } ${editingEurobox ? 'opacity-50 cursor-not-allowed' : ''}`}
                  placeholder="Leer lassen für automatische Generierung"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={3}
                  placeholder="Optionale Beschreibung..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-[#c00000] text-white rounded-lg hover:bg-[#a00000] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Speichern...' : 'Speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EuroboxManagement;

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { Card } from './ui/card';

const DeleteOrganizationModal = ({ isOpen, organization, onClose, onSuccess }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const handleDelete = async () => {
    if (confirmText !== organization?.name) {
      setError(`Bitte geben Sie "${organization?.name}" ein, um zu bestätigen`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/organizations/${organization.tenant_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        onSuccess && onSuccess(result);
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Fehler beim Löschen der Organisation');
      }
    } catch (err) {
      setError('Netzwerkfehler: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError('');
    setLoading(false);
    onClose();
  };

  if (!isOpen || !organization) return null;

  const locationCount = organization.locationCount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className={`w-full max-w-lg mx-4 ${
        theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h2 className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Organisation löschen
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className={`p-1 rounded hover:bg-gray-700 transition-colors ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning */}
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                Die gesamte Hierarchie (Kontinente, Länder, Städte) wird gelöscht.
              </p>
            </div>
          </div>

          {/* Organization Info */}
          <div className={`mb-6 p-4 rounded-lg ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Organisation:
                </span>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {organization.name}
                </span>
              </div>
              {locationCount > 0 && (
                <div className="flex justify-between">
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Standorte:
                  </span>
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    {locationCount} (werden behalten)
                  </span>
                </div>
              )}
            </div>
          </div>

          {locationCount > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                ℹ️ Die {locationCount} Standortdaten werden aus Sicherheitsgründen nicht gelöscht.
              </p>
            </div>
          )}

          {/* Confirmation Input */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Geben Sie <span className="font-bold">{organization.name}</span> ein, um zu bestätigen:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={organization.name}
              disabled={loading}
              className={`w-full px-3 py-2 rounded-md border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-red-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={loading}
              className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors ${
                theme === 'dark'
                  ? 'text-gray-300 hover:bg-gray-700 border border-gray-600'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Abbrechen
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || confirmText !== organization.name}
              className={`flex-1 px-4 py-2 text-sm rounded-md transition-colors flex items-center justify-center gap-2 ${
                loading || confirmText !== organization.name
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              } text-white`}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Lösche...' : 'Löschen'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DeleteOrganizationModal;

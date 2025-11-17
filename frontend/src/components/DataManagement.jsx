import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Database, Download, Upload, Trash2, AlertTriangle, CheckCircle, 
  Save, RefreshCw, HardDrive, Archive, XCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';

const DataManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  
  const [collectionsInfo, setCollectionsInfo] = useState({ 
    test_data: [], 
    system_data: [], 
    sensitive_data: [] 
  });
  const [selectedForBackup, setSelectedForBackup] = useState([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState([]);
  const [backups, setBackups] = useState([]);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('backup'); // backup, restore, delete
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    fetchCollectionsInfo();
    fetchBackups();
  }, []);

  const fetchCollectionsInfo = async () => {
    try {
      const result = await apiCall('/api/backup/collections/info');
      console.log('Collections API response:', result);
      
      // Check if response has collections in data property (wrapped by apiCall)
      if (result && result.data && result.data.collections) {
        setCollectionsInfo(result.data.collections);
      } else if (result && result.collections) {
        setCollectionsInfo(result.collections);
      } else {
        console.error('Invalid response:', result);
        setCollectionsInfo({ test_data: [], system_data: [], sensitive_data: [] });
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Fehler beim Laden der Daten');
      setCollectionsInfo({ test_data: [], system_data: [], sensitive_data: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const result = await apiCall('/api/backup/list');
      if (result.success) {
        setBackups(result.backups || []);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };

  const handleBackupSelection = (collectionId) => {
    setSelectedForBackup(prev => 
      prev.includes(collectionId) 
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleDeletionSelection = (collectionId) => {
    setSelectedForDeletion(prev => 
      prev.includes(collectionId) 
        ? prev.filter(id => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const createSelectiveBackup = async () => {
    if (selectedForBackup.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Datenbereich aus');
      return;
    }

    try {
      const result = await apiCall('/api/backup/selective/create', {
        method: 'POST',
        body: JSON.stringify({
          collections: selectedForBackup,
          description: `Selektives Backup (${selectedForBackup.length} Bereiche)`
        })
      });

      if (result.success) {
        toast.success(`Backup erstellt: ${result.total_documents} Dokumente gesichert`);
        setSelectedForBackup([]);
        fetchBackups();
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Fehler beim Erstellen des Backups');
    }
  };

  const restoreBackup = async () => {
    if (!selectedBackupForRestore) {
      toast.error('Bitte wählen Sie ein Backup aus');
      return;
    }

    if (!window.confirm('Möchten Sie dieses Backup wirklich wiederherstellen? Aktuelle Daten werden überschrieben!')) {
      return;
    }

    try {
      const result = await apiCall('/api/backup/selective/restore', {
        method: 'POST',
        body: JSON.stringify({
          backup_id: selectedBackupForRestore,
          collections: null // Restore all collections from backup
        })
      });

      if (result.success) {
        toast.success(`Wiederhergestellt: ${result.total_restored} Dokumente`);
        setSelectedBackupForRestore(null);
        fetchCollectionsInfo();
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Fehler bei der Wiederherstellung');
    }
  };

  const deleteTestData = async () => {
    if (selectedForDeletion.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Datenbereich aus');
      return;
    }

    try {
      const result = await apiCall('/api/backup/data/delete', {
        method: 'POST',
        body: JSON.stringify({
          collections: selectedForDeletion,
          confirm: true
        })
      });

      if (result.success) {
        toast.success(`Gelöscht: ${result.total_deleted} Dokumente`);
        setSelectedForDeletion([]);
        setShowConfirmDialog(false);
        fetchCollectionsInfo();
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      toast.error('Fehler beim Löschen der Daten');
    }
  };

  const selectAllTestData = () => {
    if (!collectionsInfo || !collectionsInfo.test_data) return;
    const testDataIds = collectionsInfo.test_data
      .filter(col => col.deletable)
      .map(col => col.id);
    setSelectedForDeletion(testDataIds);
  };

  const renderCollectionCheckbox = (collection, selected, onToggle, disabled = false) => (
    <label
      key={collection.id}
      className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
        selected
          ? theme === 'dark'
            ? 'bg-[#c00000]/10 border-[#c00000]'
            : 'bg-red-50 border-[#c00000]'
          : theme === 'dark'
            ? 'bg-[#2d2d2d] border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => !disabled && onToggle(collection.id)}
          disabled={disabled}
          className="w-5 h-5 text-[#c00000] rounded focus:ring-[#c00000]"
        />
        <div>
          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {collection.name}
          </p>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {collection.count} Einträge
          </p>
        </div>
      </div>
      {!collection.deletable && (
        <span className="px-3 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded-full">
          Geschützt
        </span>
      )}
    </label>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-[#c00000]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Datenverwaltung & Backup
        </h2>
        <p className={`mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Verwalten Sie Backups und löschen Sie Testdaten vor dem Livebetrieb
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'backup'
                ? 'text-[#c00000] border-[#c00000]'
                : theme === 'dark'
                  ? 'text-gray-400 border-transparent hover:text-gray-300'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Save className="h-5 w-5" />
            Backup Erstellen
          </button>
          <button
            onClick={() => setActiveTab('restore')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'restore'
                ? 'text-[#c00000] border-[#c00000]'
                : theme === 'dark'
                  ? 'text-gray-400 border-transparent hover:text-gray-300'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Upload className="h-5 w-5" />
            Wiederherstellen
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'delete'
                ? 'text-[#c00000] border-[#c00000]'
                : theme === 'dark'
                  ? 'text-gray-400 border-transparent hover:text-gray-300'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <Trash2 className="h-5 w-5" />
            Testdaten Löschen
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                  Selektives Backup
                </p>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-800'}`}>
                  Wählen Sie die Datenbereiche aus, die gesichert werden sollen. Geschützte Bereiche (Geräte, Standorte) können ebenfalls gesichert werden.
                </p>
              </div>
            </div>
          </div>

          {/* Test Data */}
          <div>
            <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Testdaten
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {collectionsInfo && collectionsInfo.test_data && collectionsInfo.test_data.map(collection =>
                renderCollectionCheckbox(
                  collection,
                  selectedForBackup.includes(collection.id),
                  handleBackupSelection
                )
              )}
            </div>
          </div>

          {/* System Data */}
          <div>
            <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Systemdaten (Geschützt)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {collectionsInfo && collectionsInfo.system_data && collectionsInfo.system_data.map(collection =>
                renderCollectionCheckbox(
                  collection,
                  selectedForBackup.includes(collection.id),
                  handleBackupSelection
                )
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <button
              onClick={createSelectiveBackup}
              disabled={selectedForBackup.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" />
              Backup Erstellen ({selectedForBackup.length} ausgewählt)
            </button>
          </div>
        </div>
      )}

      {activeTab === 'restore' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-900'}`}>
                  Achtung: Daten überschreiben
                </p>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-800'}`}>
                  Die Wiederherstellung überschreibt alle aktuellen Daten in den ausgewählten Bereichen. Erstellen Sie zuerst ein Backup!
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Verfügbare Backups
            </h3>
            <div className="space-y-3">
              {backups.filter(b => b.backup_type === 'selective').map(backup => (
                <label
                  key={backup.backup_id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBackupForRestore === backup.backup_id
                      ? theme === 'dark'
                        ? 'bg-[#c00000]/10 border-[#c00000]'
                        : 'bg-red-50 border-[#c00000]'
                      : theme === 'dark'
                        ? 'bg-[#2d2d2d] border-gray-700 hover:border-gray-600'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="backup-restore"
                      checked={selectedBackupForRestore === backup.backup_id}
                      onChange={() => setSelectedBackupForRestore(backup.backup_id)}
                      className="w-5 h-5 text-[#c00000]"
                    />
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {backup.description || 'Backup'}
                      </p>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {new Date(backup.created_at).toLocaleString('de-DE')} • {backup.total_documents} Dokumente
                      </p>
                      <div className="flex gap-2 mt-1">
                        {backup.collections?.map((col, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-gray-600 text-white text-xs rounded">
                            {col.display_name} ({col.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
              {backups.filter(b => b.backup_type === 'selective').length === 0 && (
                <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Keine Backups verfügbar</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={restoreBackup}
              disabled={!selectedBackupForRestore}
              className="flex items-center gap-2 px-6 py-3 bg-[#c00000] text-white rounded-lg font-semibold hover:bg-[#a00000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              Backup Wiederherstellen
            </button>
          </div>
        </div>
      )}

      {activeTab === 'delete' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className={`font-medium ${theme === 'dark' ? 'text-red-300' : 'text-red-900'}`}>
                  Warnung: Unwiderrufliches Löschen
                </p>
                <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-red-400' : 'text-red-800'}`}>
                  Gelöschte Daten können nur durch ein vorher erstelltes Backup wiederhergestellt werden. Erstellen Sie zuerst ein Backup!
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Zu löschende Testdaten
            </h3>
            <button
              onClick={selectAllTestData}
              className="text-sm text-[#c00000] hover:underline"
            >
              Alle Testdaten auswählen
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {collectionsInfo && collectionsInfo.test_data && collectionsInfo.test_data.filter(col => col.deletable).map(collection =>
              renderCollectionCheckbox(
                collection,
                selectedForDeletion.includes(collection.id),
                handleDeletionSelection
              )
            )}
          </div>

          {/* Protected Data Info */}
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-gray-50'}`}>
            <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Geschützte Bereiche (werden nicht gelöscht):
            </p>
            <div className="flex flex-wrap gap-2">
              {collectionsInfo && collectionsInfo.system_data && collectionsInfo.system_data.map(col => (
                <span key={col.id} className="px-3 py-1 bg-blue-500/20 text-blue-500 text-xs font-medium rounded-full">
                  {col.name} ({col.count})
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setSelectedForDeletion([])}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-500 transition-colors"
            >
              Auswahl aufheben
            </button>
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={selectedForDeletion.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-5 w-5" />
              Testdaten Löschen ({selectedForDeletion.length} ausgewählt)
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl p-6 max-w-md w-full ${theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Testdaten wirklich löschen?
              </h3>
            </div>
            
            <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Sie sind dabei, <strong>{selectedForDeletion.length}</strong> Datenbereiche unwiderruflich zu löschen:
            </p>
            
            <ul className={`mb-6 space-y-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {selectedForDeletion.map(id => {
                const col = [...collectionsInfo.test_data, ...collectionsInfo.sensitive_data].find(c => c.id === id);
                return col && (
                  <li key={id} className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {col.name} ({col.count} Einträge)
                  </li>
                );
              })}
            </ul>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={deleteTestData}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-semibold"
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;

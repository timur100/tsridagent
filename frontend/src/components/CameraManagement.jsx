import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Video, Plus, Edit, Trash2, X } from 'lucide-react';
import { Card } from './ui/card';
import toast from 'react-hot-toast';

const CameraManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [viewingCamera, setViewingCamera] = useState(null);
  const [showLiveView, setShowLiveView] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    ip_address: '',
    port: 554,
    stream_url: '',
    username: '',
    password: '',
    resolution: '1920x1080',
    fps: 30,
    status: 'offline',
    tenant_id: 'default'
  });

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      setLoading(true);
      const result = await apiCall('/api/cameras');
      console.log('[CameraManagement] ============ FULL API Response:', JSON.stringify(result, null, 2));
      console.log('[CameraManagement] result.data:', result?.data);
      console.log('[CameraManagement] result.data type:', typeof result?.data);
      console.log('[CameraManagement] result.data keys:', result?.data ? Object.keys(result.data) : 'NO DATA');
      
      // Handle nested response structure from apiCall
      if (result && result.data) {
        console.log('[CameraManagement] Checking nested structure...');
        
        // Check for double-nested response (apiCall wraps backend response)
        if (result.data.data && result.data.data.cameras) {
          console.log('[CameraManagement] ✅ Found cameras at result.data.data.cameras!', result.data.data.cameras.length);
          setCameras(result.data.data.cameras);
        } 
        // Fallback: direct array
        else if (Array.isArray(result.data)) {
          console.log('[CameraManagement] ✅ data is directly an array!', result.data.length);
          setCameras(result.data);
        } 
        // Fallback: data.cameras
        else if (result.data.cameras) {
          console.log('[CameraManagement] ✅ data.cameras exists!', result.data.cameras.length);
          setCameras(result.data.cameras);
        } 
        else {
          console.error('[CameraManagement] ❌ Cannot find cameras in response');
          setCameras([]);
        }
      } else {
        console.error('[CameraManagement] ❌ No result or result.data');
        setCameras([]);
      }
    } catch (error) {
      console.error('[CameraManagement] ❌ Error loading cameras:', error);
      toast.error('Fehler beim Laden der Kameras');
      setCameras([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCamera) {
        // Update existing camera
        const result = await apiCall(`/api/cameras/${editingCamera.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        
        if (result.success) {
          toast.success('Kamera erfolgreich aktualisiert');
          loadCameras();
          closeModal();
        }
      } else {
        // Create new camera
        const result = await apiCall('/api/cameras', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        
        if (result.success) {
          toast.success('Kamera erfolgreich hinzugefügt');
          loadCameras();
          closeModal();
        }
      }
    } catch (error) {
      console.error('Error saving camera:', error);
      toast.error('Fehler beim Speichern der Kamera');
    }
  };

  const handleDelete = async (cameraId) => {
    if (!window.confirm('Möchten Sie diese Kamera wirklich löschen?')) {
      return;
    }

    try {
      const result = await apiCall(`/api/cameras/${cameraId}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Kamera erfolgreich gelöscht');
        loadCameras();
      }
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('Fehler beim Löschen der Kamera');
    }
  };

  const handleEdit = (camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      location: camera.location,
      ip_address: camera.ip_address,
      port: camera.port,
      stream_url: camera.stream_url,
      username: camera.username || '',
      password: camera.password || '',
      resolution: camera.resolution,
      fps: camera.fps,
      status: camera.status,
      tenant_id: camera.tenant_id
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCamera(null);
    setFormData({
      name: '',
      location: '',
      ip_address: '',
      port: 554,
      stream_url: '',
      username: '',
      password: '',
      resolution: '1920x1080',
      fps: 30,
      status: 'offline',
      tenant_id: 'default'
    });
  };

  if (loading) {
    return (
      <div className="text-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className={`mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Kameras werden geladen...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Kamera-Verwaltung
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {cameras.length} {cameras.length === 1 ? 'Kamera' : 'Kameras'} registriert
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Kamera hinzufügen
        </button>
      </div>

      {/* Camera Table */}
      <div className={`overflow-x-auto rounded-xl border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="w-full">
          <thead className={`${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                Name
              </th>
              <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                Standort
              </th>
              <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                IP-Adresse
              </th>
              <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                Auflösung
              </th>
              <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                Status
              </th>
              <th className={`px-6 py-3 text-left text-xs font-semibold font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} uppercase tracking-wider`}>
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody className={theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}>
              {cameras.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Video className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Keine Kameras vorhanden
                    </p>
                  </td>
                </tr>
              ) : (
                cameras.map((camera) => (
                  <tr key={camera.id} className={`border-t cursor-pointer transition-colors ${theme === 'dark' ? 'border-gray-700 hover:bg-[#1a1a1a]' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-blue-500" />
                        <span className="font-semibold">{camera.name}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {camera.location}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {camera.ip_address}:{camera.port}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {camera.resolution} @ {camera.fps}fps
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          camera.status === 'online'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {camera.status === 'online' ? '● Online' : '● Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setViewingCamera(camera);
                            setShowLiveView(true);
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                          title="Live ansehen"
                        >
                          <Video className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(camera)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(camera.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </table>
      </div>

      {/* Add/Edit Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className={`w-full max-w-2xl rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'}`}>
            {/* Modal Header */}
            <div className={`flex justify-between items-center p-6 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {editingCamera ? 'Kamera bearbeiten' : 'Neue Kamera hinzufügen'}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Kamera-Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="z.B. Eingang Hauptgebäude"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Standort *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="z.B. Gebäude A, EG"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    IP-Adresse *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="192.168.1.100"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Stream-URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.stream_url}
                    onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="rtsp://192.168.1.100:554/stream"
                    pattern="^rtsp://.*"
                    title="URL muss mit 'rtsp://' beginnen (nicht 'rstp://')"
                  />
                  {formData.stream_url && !formData.stream_url.startsWith('rtsp://') && (
                    <p className="mt-1 text-xs text-red-500">
                      ⚠️ Die URL muss mit 'rtsp://' beginnen (Sie haben möglicherweise 'rstp://' eingegeben)
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Benutzername
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Passwort
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auflösung
                  </label>
                  <select
                    value={formData.resolution}
                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="1920x1080">1920x1080 (Full HD)</option>
                    <option value="2560x1440">2560x1440 (2K)</option>
                    <option value="3840x2160">3840x2160 (4K)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    FPS
                  </label>
                  <input
                    type="number"
                    value={formData.fps}
                    onChange={(e) => setFormData({ ...formData, fps: parseInt(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      theme === 'dark'
                        ? 'bg-[#1a1a1a] border-gray-700 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`px-4 py-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCamera ? 'Speichern' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraManagement;

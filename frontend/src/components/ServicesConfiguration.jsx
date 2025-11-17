import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter,
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Plus, 
  Settings, 
  RefreshCw,
  Edit2,
  Trash2,
  Server,
  ExternalLink,
  Database,
  Info
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const ServicesConfiguration = () => {
  const [services, setServices] = useState([]);
  const [healthStatus, setHealthStatus] = useState({});
  const [mongodbInfo, setMongodbInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showMongoDetails, setShowMongoDetails] = useState(null);

  const [formData, setFormData] = useState({
    service_name: '',
    service_type: 'id_verification',
    base_url: '',
    api_key: '',
    enabled: true,
    health_check_url: '',
    description: '',
    settings: {}
  });

  const serviceTypes = [
    { value: 'id_verification', label: '📋 ID Verification' },
    { value: 'inventory', label: '📦 Inventory' },
    { value: 'portal', label: '🏢 Portal' },
    { value: 'tickets', label: '🎫 Ticketing' },
    { value: 'other', label: '⚙️ Other' }
  ];

  useEffect(() => {
    fetchServices();
    fetchAllHealthStatus();
    fetchAllMongoDBInfo();
    
    // Auto-refresh health status every 30 seconds
    const interval = setInterval(() => {
      fetchAllHealthStatus();
      fetchAllMongoDBInfo();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/portal/services`);
      setServices(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Fehler beim Laden der Services');
      setLoading(false);
    }
  };

  const fetchAllHealthStatus = async () => {
    try {
      setCheckingHealth(true);
      const response = await axios.get(`${BACKEND_URL}/api/portal/services/health/all`);
      const statusMap = {};
      response.data.forEach(health => {
        statusMap[health.service_id] = health;
      });
      setHealthStatus(statusMap);
    } catch (error) {
      console.error('Error fetching health status:', error);
    } finally {
      setCheckingHealth(false);
    }
  };

  const fetchAllMongoDBInfo = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/portal/mongodb-summary`);
      const infoMap = {};
      response.data.forEach(item => {
        infoMap[item.service_id] = item.mongodb_info;
      });
      setMongodbInfo(infoMap);
    } catch (error) {
      console.error('Error fetching MongoDB info:', error);
    }
  };

  const checkSingleHealth = async (serviceId) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/portal/services/${serviceId}/health`);
      setHealthStatus(prev => ({
        ...prev,
        [serviceId]: response.data
      }));
    } catch (error) {
      console.error('Error checking health:', error);
    }
  };

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({
      service_name: '',
      service_type: 'id_verification',
      base_url: '',
      api_key: '',
      enabled: true,
      health_check_url: '',
      description: '',
      settings: {}
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setFormData({
      service_name: service.service_name,
      service_type: service.service_type,
      base_url: service.base_url,
      api_key: service.api_key || '',
      enabled: service.enabled,
      health_check_url: service.health_check_url || '',
      description: service.description || '',
      settings: service.settings || {}
    });
    setIsModalOpen(true);
  };

  const handleToggleEnabled = async (service) => {
    try {
      const updatedService = {
        ...service,
        enabled: !service.enabled
      };
      
      // Remove fields that shouldn't be in the update payload
      delete updatedService.service_id;
      delete updatedService.created_at;
      delete updatedService.updated_at;
      
      await axios.put(`${BACKEND_URL}/api/portal/services/${service.service_id}`, updatedService);
      toast.success(updatedService.enabled ? 'Service aktiviert' : 'Service deaktiviert');
      fetchServices();
    } catch (error) {
      console.error('Error toggling service:', error);
      toast.error('Fehler beim Umschalten');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingService) {
        await axios.put(`${BACKEND_URL}/api/portal/services/${editingService.service_id}`, formData);
        toast.success('Service aktualisiert');
      } else {
        await axios.post(`${BACKEND_URL}/api/portal/services`, formData);
        toast.success('Service hinzugefügt');
      }
      
      setIsModalOpen(false);
      fetchServices();
      fetchAllHealthStatus();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDelete = async (serviceId) => {
    if (!confirm('Möchten Sie diesen Service wirklich löschen?')) return;
    
    try {
      await axios.delete(`${BACKEND_URL}/api/portal/services/${serviceId}`);
      toast.success('Service gelöscht');
      fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Fehler beim Löschen');
    }
  };

  const handleOpenService = (service) => {
    const currentDomain = window.location.origin;
    let targetUrl;
    
    // Check if service has external_url in settings
    if (service.settings?.external_url) {
      targetUrl = service.settings.external_url;
    } 
    // Special handling for ID Verification - open Scanner App
    else if (service.service_type === 'id_verification') {
      targetUrl = `${currentDomain}/`; // Scanner-App auf Root
    }
    // For other services, use API proxy
    else {
      const portMatch = service.base_url.match(/:(\d+)/);
      const port = portMatch ? portMatch[1] : '8001';
      targetUrl = `${currentDomain}/api/services/${port}`;
    }
    
    // Open service in new tab
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    toast.success(`${service.service_name} wird geöffnet...`);
  };

  const getStatusBadge = (serviceId) => {
    const health = healthStatus[serviceId];
    
    if (!health) {
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" /> Unbekannt</Badge>;
    }
    
    if (health.status === 'healthy') {
      return (
        <Badge variant="success" className="gap-1 bg-green-500 text-white">
          <CheckCircle className="w-3 h-3" /> Online
          {health.response_time_ms && ` (${Math.round(health.response_time_ms)}ms)`}
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" /> Offline
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Microservices Konfiguration</h2>
          <p className="text-muted-foreground">
            Verwalten Sie die Verbindungen zu allen Microservices
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAllHealthStatus}
            disabled={checkingHealth}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checkingHealth ? 'animate-spin' : ''}`} />
            Health Check
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Service hinzufügen
          </Button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.service_id} data-testid={`service-card-${service.service_type}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  <CardTitle className="text-lg">{service.service_name}</CardTitle>
                </div>
                {getStatusBadge(service.service_id)}
              </div>
              <CardDescription className="break-all">
                {service.base_url}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Typ:</span>
                  <span className="font-medium">
                    {serviceTypes.find(t => t.value === service.service_type)?.label || service.service_type}
                  </span>
                </div>
                
                {service.description && (
                  <div className="text-sm text-muted-foreground">
                    {service.description}
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Switch 
                    checked={service.enabled} 
                    onCheckedChange={() => handleToggleEnabled(service)}
                  />
                </div>
                
                {healthStatus[service.service_id]?.error && (
                  <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                    {healthStatus[service.service_id].error}
                  </div>
                )}
                
                {/* MongoDB Info */}
                {mongodbInfo[service.service_id] && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Database className="w-4 h-4" />
                      MongoDB Status
                    </div>
                    {mongodbInfo[service.service_id].connected ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Database:</span>
                          <span className="font-mono">{mongodbInfo[service.service_id].database_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Collections:</span>
                          <span className="font-medium">{mongodbInfo[service.service_id].collections?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dokumente:</span>
                          <span className="font-medium">{mongodbInfo[service.service_id].total_documents || 0}</span>
                        </div>
                        {mongodbInfo[service.service_id].collections && mongodbInfo[service.service_id].collections.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-1 h-7 text-xs"
                            onClick={() => setShowMongoDetails(service.service_id)}
                          >
                            <Info className="w-3 h-3 mr-1" />
                            Details anzeigen
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                        {mongodbInfo[service.service_id].error || 'Nicht verbunden'}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="default"
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => handleOpenService(service)}
                    data-testid={`open-service-${service.service_type}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Öffnen
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => checkSingleHealth(service.service_id)}
                    title="Health Check"
                  >
                    <Activity className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(service)}
                    title="Bearbeiten"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(service.service_id)}
                    title="Löschen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {services.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <Server className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Keine Services konfiguriert</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Fügen Sie Ihren ersten Microservice hinzu
              </p>
              <Button onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-2" />
                Service hinzufügen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Service bearbeiten' : 'Neuer Service'}
            </DialogTitle>
            <DialogDescription>
              Konfigurieren Sie die Verbindung zum Microservice
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="service_name">Service Name *</Label>
                <Input
                  id="service_name"
                  value={formData.service_name}
                  onChange={(e) => setFormData({...formData, service_name: e.target.value})}
                  placeholder="z.B. ID Verification Service"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="service_type">Service Typ *</Label>
                <Select 
                  value={formData.service_type} 
                  onValueChange={(value) => setFormData({...formData, service_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="base_url">Base URL (Intern) *</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({...formData, base_url: e.target.value})}
                  placeholder="http://localhost:8101"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Interne URL für Backend-Kommunikation
                </p>
              </div>
              
              <div>
                <Label htmlFor="external_url">Externe URL (optional)</Label>
                <Input
                  id="external_url"
                  value={formData.settings?.external_url || ''}
                  onChange={(e) => setFormData({
                    ...formData, 
                    settings: {...formData.settings, external_url: e.target.value}
                  })}
                  placeholder="https://service.example.com oder leer für automatisch"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Öffentliche URL zum Öffnen im Browser. Leer = automatische Konvertierung
                </p>
              </div>
              
              <div>
                <Label htmlFor="health_check_url">Health Check URL (optional)</Label>
                <Input
                  id="health_check_url"
                  value={formData.health_check_url}
                  onChange={(e) => setFormData({...formData, health_check_url: e.target.value})}
                  placeholder="http://localhost:8101/health"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leer lassen für Standard: base_url/health
                </p>
              </div>
              
              <div>
                <Label htmlFor="api_key">API Key (optional)</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                  placeholder="Service API Key"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Kurze Beschreibung des Services"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({...formData, enabled: checked})}
                />
                <Label htmlFor="enabled">Service aktiviert</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Abbrechen
              </Button>
              <Button type="submit">
                {editingService ? 'Aktualisieren' : 'Hinzufügen'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MongoDB Details Modal */}
      {showMongoDetails && (
        <Dialog open={!!showMongoDetails} onOpenChange={() => setShowMongoDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                MongoDB Details
              </DialogTitle>
              <DialogDescription>
                {services.find(s => s.service_id === showMongoDetails)?.service_name}
              </DialogDescription>
            </DialogHeader>
            
            {mongodbInfo[showMongoDetails] && (
              <div className="space-y-4">
                {/* Database Info */}
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Database Name:</span>
                    <code className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-3 py-1 rounded font-semibold">
                      {mongodbInfo[showMongoDetails].database_name}
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Verbindung:</span>
                    <Badge variant={mongodbInfo[showMongoDetails].connected ? "success" : "destructive"}>
                      {mongodbInfo[showMongoDetails].connected ? "Verbunden" : "Getrennt"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Gesamt Dokumente:</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {mongodbInfo[showMongoDetails].total_documents?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>

                {/* Collections */}
                {mongodbInfo[showMongoDetails].collections && mongodbInfo[showMongoDetails].collections.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Collections ({mongodbInfo[showMongoDetails].collections.length})</h3>
                    <div className="space-y-2">
                      {mongodbInfo[showMongoDetails].collections.map((collection, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <code className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{collection.name}</code>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {collection.document_count.toLocaleString()} Dokumente
                            </span>
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700">{collection.document_count}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {mongodbInfo[showMongoDetails].error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-100">Fehler</p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {mongodbInfo[showMongoDetails].error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMongoDetails(null)}>
                Schließen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ServicesConfiguration;

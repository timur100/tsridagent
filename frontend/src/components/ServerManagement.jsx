import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Server, Plus, Trash2, RefreshCw, Terminal, Check, Loader, Container } from 'lucide-react';

const ServerManagement = () => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testing, setTesting] = useState({});
  const [serverStatus, setServerStatus] = useState({});
  const [commandOutput, setCommandOutput] = useState({});
  const [commands, setCommands] = useState({});
  const [executing, setExecuting] = useState({});
  
  const [newServer, setNewServer] = useState({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    password: '',
    description: ''
  });

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const result = await apiCall('/api/portal/servers');
      if (result.success && result.data?.data?.servers) {
        setServers(result.data.data.servers);
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.host || !newServer.username) {
      toast.error('Bitte Name, Host und Benutzername eingeben');
      return;
    }

    try {
      const result = await apiCall('/api/portal/servers', {
        method: 'POST',
        body: JSON.stringify(newServer)
      });

      if (result.success) {
        toast.success('Server hinzugefügt');
        setShowAddForm(false);
        setNewServer({ name: '', host: '', port: 22, username: 'root', password: '', description: '' });
        fetchServers();
      } else {
        toast.error(result.data?.detail || 'Fehler beim Hinzufügen');
      }
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Servers');
    }
  };

  const handleTestConnection = async () => {
    setTesting({ new: true });
    try {
      const result = await apiCall('/api/portal/servers/test-connection', {
        method: 'POST',
        body: JSON.stringify(newServer)
      });

      if (result.success && result.data?.data?.status === 'connected') {
        toast.success('Verbindung erfolgreich!');
      } else {
        toast.error(result.data?.message || 'Verbindung fehlgeschlagen');
      }
    } catch (error) {
      toast.error('Verbindungstest fehlgeschlagen');
    } finally {
      setTesting({ new: false });
    }
  };

  const handleGetStatus = async (serverId) => {
    setTesting({ ...testing, [serverId]: true });
    try {
      const result = await apiCall(`/api/portal/servers/${serverId}/status`);
      if (result.success && result.data?.data) {
        setServerStatus({ ...serverStatus, [serverId]: result.data.data });
        if (result.data.data.status === 'online') {
          toast.success('Server ist online');
        } else {
          toast.error('Server ist offline');
        }
      }
    } catch (error) {
      toast.error('Status-Abfrage fehlgeschlagen');
    } finally {
      setTesting({ ...testing, [serverId]: false });
    }
  };

  const handleExecuteCommand = async (serverId) => {
    const command = commands[serverId];
    if (!command) {
      toast.error('Bitte einen Befehl eingeben');
      return;
    }

    setExecuting({ ...executing, [serverId]: true });
    try {
      const result = await apiCall('/api/portal/servers/execute', {
        method: 'POST',
        body: JSON.stringify({ server_id: serverId, command })
      });

      if (result.success && result.data?.data) {
        setCommandOutput({
          ...commandOutput,
          [serverId]: {
            output: result.data.data.output,
            error: result.data.data.error,
            exit_code: result.data.data.exit_code
          }
        });
      }
    } catch (error) {
      toast.error('Befehlsausführung fehlgeschlagen');
    } finally {
      setExecuting({ ...executing, [serverId]: false });
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!window.confirm('Server wirklich löschen?')) return;

    try {
      const result = await apiCall(`/api/portal/servers/${serverId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        toast.success('Server gelöscht');
        fetchServers();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleGetDocker = async (serverId) => {
    try {
      const result = await apiCall(`/api/portal/servers/${serverId}/docker`);
      if (result.success && result.data?.data?.containers) {
        setServerStatus({
          ...serverStatus,
          [serverId]: {
            ...serverStatus[serverId],
            containers: result.data.data.containers
          }
        });
      }
    } catch (error) {
      toast.error('Docker-Status konnte nicht abgerufen werden');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="h-8 w-8 animate-spin text-[#c00000]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Server-Verwaltung
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verwalten Sie SSH-Verbindungen zu Ihren Servern
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#c00000] hover:bg-[#a00000] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Server hinzufügen
        </Button>
      </div>

      {/* Add Server Form */}
      {showAddForm && (
        <Card className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Neuen Server hinzufügen
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Name *
              </label>
              <input
                type="text"
                value={newServer.name}
                onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                placeholder="z.B. Hetzner Production"
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Host/IP *
              </label>
              <input
                type="text"
                value={newServer.host}
                onChange={(e) => setNewServer({ ...newServer, host: e.target.value })}
                placeholder="z.B. 46.4.105.109"
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Port
              </label>
              <input
                type="number"
                value={newServer.port}
                onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Benutzername *
              </label>
              <input
                type="text"
                value={newServer.username}
                onChange={(e) => setNewServer({ ...newServer, username: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div className="col-span-2">
              <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Passwort
              </label>
              <input
                type="password"
                value={newServer.password}
                onChange={(e) => setNewServer({ ...newServer, password: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div className="col-span-2">
              <label className={`block text-sm mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                Beschreibung
              </label>
              <input
                type="text"
                value={newServer.description}
                onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                placeholder="z.B. Production Server für TSRID"
                className={`w-full px-3 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-[#2a2a2a] border-gray-700 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleTestConnection}
              disabled={testing.new}
              variant="outline"
              className={theme === 'dark' ? 'border-gray-600' : ''}
            >
              {testing.new ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Verbindung testen
            </Button>
            <Button
              onClick={handleAddServer}
              className="bg-[#c00000] hover:bg-[#a00000] text-white"
            >
              Speichern
            </Button>
            <Button
              onClick={() => setShowAddForm(false)}
              variant="outline"
              className={theme === 'dark' ? 'border-gray-600' : ''}
            >
              Abbrechen
            </Button>
          </div>
        </Card>
      )}

      {/* Server List */}
      {servers.length === 0 ? (
        <Card className={`p-8 text-center ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
          <Server className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Keine Server konfiguriert
          </p>
        </Card>
      ) : (
        servers.map((server) => (
          <Card
            key={server.id}
            className={`p-6 ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  serverStatus[server.id]?.status === 'online' 
                    ? 'bg-green-500/20' 
                    : theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-100'
                }`}>
                  <Server className={`h-5 w-5 ${
                    serverStatus[server.id]?.status === 'online' ? 'text-green-500' : 'text-[#c00000]'
                  }`} />
                </div>
                <div>
                  <h4 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {server.name}
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {server.username}@{server.host}:{server.port}
                  </p>
                  {server.description && (
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                      {server.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGetStatus(server.id)}
                  disabled={testing[server.id]}
                  className={theme === 'dark' ? 'border-gray-600' : ''}
                >
                  {testing[server.id] ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGetDocker(server.id)}
                  className={theme === 'dark' ? 'border-gray-600' : ''}
                >
                  <Container className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteServer(server.id)}
                  className="text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Server Status */}
            {serverStatus[server.id]?.info && (
              <div className={`grid grid-cols-4 gap-4 mb-4 p-4 rounded-lg ${
                theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'
              }`}>
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Hostname</p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {serverStatus[server.id].info.hostname}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Uptime</p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {serverStatus[server.id].info.uptime}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Memory</p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {serverStatus[server.id].info.memory}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>Disk</p>
                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {serverStatus[server.id].info.disk}
                  </p>
                </div>
              </div>
            )}

            {/* Docker Containers */}
            {serverStatus[server.id]?.containers && (
              <div className={`mb-4 p-4 rounded-lg ${theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-gray-50'}`}>
                <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Docker Container ({serverStatus[server.id].containers.length})
                </p>
                <div className="space-y-2">
                  {serverStatus[server.id].containers.map((container, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                        {container.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        container.status.includes('Up') 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {container.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Command Input - Full Terminal Style */}
            <div className={`rounded-lg ${theme === 'dark' ? 'bg-black' : 'bg-gray-900'}`}>
              <div className={`flex items-center gap-2 px-4 py-2 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-700'}`}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-gray-400 text-xs ml-2">
                  {server.username}@{server.host} - SSH Terminal
                </span>
              </div>
              
              {/* Command Output Area */}
              <div className="p-4 font-mono text-sm min-h-[300px] max-h-[500px] overflow-auto">
                {commandOutput[server.id] ? (
                  <>
                    <div className="text-gray-500 mb-2">
                      $ {commands[server.id]}
                    </div>
                    {commandOutput[server.id].output && (
                      <pre className="text-green-400 whitespace-pre-wrap mb-2">{commandOutput[server.id].output}</pre>
                    )}
                    {commandOutput[server.id].error && (
                      <pre className="text-red-400 whitespace-pre-wrap mb-2">{commandOutput[server.id].error}</pre>
                    )}
                    <div className={`text-xs ${
                      commandOutput[server.id].exit_code === 0 ? 'text-green-500' : 'text-red-500'
                    }`}>
                      [Exit Code: {commandOutput[server.id].exit_code}]
                    </div>
                  </>
                ) : (
                  <div className="text-gray-600">
                    Geben Sie einen Befehl ein und drücken Sie Enter...
                  </div>
                )}
              </div>
              
              {/* Command Input */}
              <div className={`flex items-center gap-2 px-4 py-3 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-700'}`}>
                <span className="text-green-400 font-mono">$</span>
                <input
                  type="text"
                  value={commands[server.id] || ''}
                  onChange={(e) => setCommands({ ...commands, [server.id]: e.target.value })}
                  placeholder="Befehl eingeben (z.B. docker ps, ls -la, cat /etc/os-release)"
                  className="flex-1 bg-transparent text-green-400 font-mono text-sm outline-none placeholder-gray-600"
                  onKeyPress={(e) => e.key === 'Enter' && handleExecuteCommand(server.id)}
                />
                <Button
                  onClick={() => handleExecuteCommand(server.id)}
                  disabled={executing[server.id]}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {executing[server.id] ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Terminal className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
};

export default ServerManagement;

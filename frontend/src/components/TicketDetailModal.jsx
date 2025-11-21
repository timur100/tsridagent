import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  X, MapPin, Phone, Mail, User, Clock, CheckCircle, 
  PlayCircle, XCircle, RotateCcw, AlertCircle, MessageSquare,
  Video, Circle as CircleIcon, Monitor, FolderOpen, ChevronDown, ChevronRight,
  FileText, Download
} from 'lucide-react';
import { Button } from './ui/button';
import RichTextEditor from './RichTextEditor';
import toast from 'react-hot-toast';

const TicketDetailModal = ({ ticket, onClose, onUpdate, devices = [], isAdmin = false }) => {
  const { theme } = useTheme();
  const { apiCall } = useAuth();
  const [locationDetails, setLocationDetails] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [resources, setResources] = useState({});
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [staff, setStaff] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignNotes, setAssignNotes] = useState('');
  const [selectedStaffEmail, setSelectedStaffEmail] = useState('');

  useEffect(() => {
    if (ticket?.location_id) {
      fetchLocationDetails();
    }
    // Fetch resources only for admins
    if (isAdmin) {
      fetchResources();
      fetchStaff();
    }
  }, [ticket, isAdmin]);
  
  const fetchStaff = async () => {
    try {
      const result = await apiCall('/api/staff?is_active=true');
      if (result.success) {
        setStaff(result.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };
  
  const handleAssignTicket = async () => {
    if (!selectedStaffEmail) {
      toast.error('Bitte Mitarbeiter auswählen');
      return;
    }
    
    try {
      const result = await apiCall(`/api/staff/tickets/${ticket.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          staff_email: selectedStaffEmail,
          notes: assignNotes
        })
      });
      
      if (result.success) {
        toast.success('Ticket erfolgreich zugewiesen');
        setShowAssignModal(false);
        setAssignNotes('');
        setSelectedStaffEmail('');
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast.error(error.message || 'Fehler beim Zuweisen');
    }
  };

  const fetchResources = async () => {
    setLoadingResources(true);
    try {
      const result = await apiCall('/api/resources/categories');
      if (result.success && result.data) {
        const apiResponse = result.data;
        if (apiResponse.success) {
          // Convert array to object for easier lookup
          const resourcesObj = {};
          apiResponse.categories.forEach(cat => {
            resourcesObj[cat.category] = cat;
          });
          setResources(resourcesObj);
        }
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoadingResources(false);
    }
  };

  const fetchLocationDetails = async () => {
    setLoadingLocation(true);
    try {
      const result = await apiCall(`/api/tickets/${ticket.id}/location-details`);
      console.log('Location details result:', result);
      
      if (result.success && result.data) {
        const apiResponse = result.data;
        if (apiResponse.success && apiResponse.location) {
          setLocationDetails(apiResponse.location);
          console.log('Location set:', apiResponse.location);
        }
      }
    } catch (error) {
      console.error('Error fetching location details:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleStatusAction = async (action) => {
    setActionLoading(true);
    try {
      const result = await apiCall(`/api/tickets/${ticket.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ notes: actionNotes })
      });

      console.log('Status action result:', result);

      // Check for success in the nested data structure
      if (result.success && result.data) {
        const apiResponse = result.data;
        if (apiResponse.success) {
          toast.success(apiResponse.message || 'Status aktualisiert');
          setActionNotes('');
          if (onUpdate) onUpdate();
          // Close modal after successful action
          setTimeout(() => {
            if (onClose) onClose();
          }, 500);
        } else {
          toast.error(apiResponse.message || 'Fehler beim Aktualisieren');
        }
      } else {
        toast.error('Fehler beim Aktualisieren');
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
      case 'new':
        return 'bg-blue-500';
      case 'accepted':
        return 'bg-yellow-500';
      case 'in_progress':
        return 'bg-orange-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open':
      case 'new':
        return 'Offen';
      case 'accepted':
        return 'Angenommen';
      case 'in_progress':
        return 'In Bearbeitung';
      case 'resolved':
        return 'Gelöst';
      case 'closed':
        return 'Geschlossen';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error('Bitte Nachricht eingeben');
      return;
    }

    setReplyLoading(true);
    try {
      const result = await apiCall(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ 
          comment: replyText,
          internal: false 
        })
      });

      console.log('Reply result:', result);

      if (result.success && result.data) {
        const apiResponse = result.data;
        if (apiResponse.success) {
          toast.success('Antwort gesendet');
          setReplyText('');
          
          // Update parent and close/reopen modal to refresh
          if (onUpdate) {
            onUpdate();
            // Small delay then close and reopen would be handled by parent
            setTimeout(() => {
              if (onClose) {
                onClose();
              }
            }, 1000);
          }
        } else {
          toast.error('Fehler beim Senden');
        }
      }
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Fehler beim Senden');
    } finally {
      setReplyLoading(false);
    }
  };

  const deviceInfo = ticket?.device_id ? devices.find(d => d.device_id === ticket.device_id) : null;
  
  // Use live device status from backend if available, otherwise fallback to deviceInfo
  const getDeviceOnlineStatus = () => {
    // Priority 1: Live status from backend
    if (ticket?.device_status_live) {
      return ticket.device_status_live === 'online';
    }
    // Priority 2: Local deviceInfo
    if (deviceInfo) {
      return deviceInfo.status === 'online' || deviceInfo.teamviewer_online === true || deviceInfo.online === true;
    }
    // Priority 3: Default to false
    return false;
  };
  
  const isDeviceOnline = getDeviceOnlineStatus();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className={`w-full max-w-7xl h-[90vh] rounded-lg overflow-hidden flex flex-col ${
          theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {ticket.ticket_number}
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(ticket.status)}`}>
              {getStatusLabel(ticket.status)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority.toUpperCase()}
            </span>
            {ticket.assigned_to && (
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
              }`}>
                <User className="h-3 w-3" />
                {ticket.assigned_to_name || ticket.assigned_to}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && !ticket.assigned_to && (
              <Button
                onClick={() => setShowAssignModal(true)}
                size="sm"
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                <User className="h-4 w-4 mr-2" />
                Zuweisen
              </Button>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark' 
                  ? 'hover:bg-gray-800 text-gray-400' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content: Two-column layout (Jitbit style) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Conversation/Messages (70%) */}
          <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ width: '70%' }}>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Original Ticket - Highlighted */}
              <div className={`p-5 rounded-lg border ${
                theme === 'dark' 
                  ? 'bg-[#c00000]/5 border-[#c00000]/30' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    theme === 'dark' ? 'bg-[#c00000]/20' : 'bg-red-100'
                  }`}>
                    <AlertCircle className="h-5 w-5 text-[#c00000]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {ticket.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Von: {ticket.customer_name}
                      </span>
                      <span className={theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}>•</span>
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                        {new Date(ticket.created_at).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <div 
                      className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}
                      dangerouslySetInnerHTML={{ __html: ticket.description }}
                    />
                  </div>
                </div>
              </div>

              {/* Conversation Section */}
              <div className={`border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-[#c00000]" />
                  <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Antworten
                  </h3>
                  {ticket.comments && ticket.comments.length > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {ticket.comments.length}
                    </span>
                  )}
                </div>
                
                {/* Chat Messages */}
                <div className="space-y-4">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment, index) => {
                  const isSupport = comment.author !== ticket.customer_name;
                  return (
                    <div
                      key={index}
                      className={`flex ${isSupport ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[75%] ${isSupport ? 'items-start' : 'items-end'} flex flex-col gap-1`}>
                        {/* Author & Timestamp */}
                        <div className="flex items-center gap-2">
                          {isSupport && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              theme === 'dark' ? 'bg-[#c00000]/20' : 'bg-red-100'
                            }`}>
                              <User className="h-3 w-3 text-[#c00000]" />
                            </div>
                          )}
                          <span className={`text-xs font-medium ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {comment.author}
                          </span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                            {comment.timestamp ? new Date(comment.timestamp).toLocaleString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'Gerade eben'}
                          </span>
                          {comment.internal && (
                            <span className="px-2 py-0.5 text-[10px] bg-yellow-500 text-black rounded-full font-bold">
                              INTERN
                            </span>
                          )}
                        </div>
                        
                        {/* Message Bubble */}
                        <div className={`rounded-lg px-4 py-3 ${
                          isSupport
                            ? theme === 'dark'
                              ? 'bg-[#2a2a2a] border border-gray-700'
                              : 'bg-white border border-gray-200'
                            : theme === 'dark'
                            ? 'bg-[#c00000]/20 border border-[#c00000]/30'
                            : 'bg-red-50 border border-red-200'
                        }`}>
                          <div 
                            className={`text-sm leading-relaxed ${
                              theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                            }`}
                            dangerouslySetInnerHTML={{ __html: comment.comment }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className={`h-12 w-12 mx-auto mb-2 ${
                    theme === 'dark' ? 'text-gray-700' : 'text-gray-300'
                  }`} />
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                    Noch keine Antworten auf dieses Ticket
                  </p>
                </div>
              )}
            </div>

              </div>

              {/* Reply Form */}
              {ticket.status !== 'closed' && (
                <div className={`mt-4 border-t pt-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="mb-3">
                    <RichTextEditor
                      value={replyText}
                      onChange={setReplyText}
                      placeholder="Ihre Nachricht... (Sie können auch Bilder einfügen)"
                    />
                  </div>
                  <Button
                    onClick={handleReply}
                    disabled={replyLoading || !replyText.trim()}
                    size="sm"
                    className="bg-[#c00000] hover:bg-[#a00000] text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {replyLoading ? 'Wird gesendet...' : 'Antwort senden'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Details (30%) - Jitbit Style */}
          <div className={`w-[30%] overflow-y-auto border-l ${theme === 'dark' ? 'bg-[#0a0a0a] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="p-4 space-y-4">
              {/* Details Header */}
              <div>
                <h3 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Details
                </h3>
              </div>

              {/* Time Info */}
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-[#c00000]" />
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Zeitverlauf
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">Erstellt:</span><br />
                    {new Date(ticket.created_at).toLocaleString('de-DE')}
                    <span className="ml-1 text-[#c00000]">({getTimeSince(ticket.created_at)})</span>
                  </div>
                  {ticket.accepted_at && (
                    <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      <span className="font-medium">Angenommen:</span><br />
                      {new Date(ticket.accepted_at).toLocaleString('de-DE')}
                    </div>
                  )}
                  {ticket.started_at && (
                    <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      <span className="font-medium">Bearbeitung:</span><br />
                      {new Date(ticket.started_at).toLocaleString('de-DE')}
                    </div>
                  )}
                  {ticket.resolved_at && (
                    <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      <span className="font-medium">Gelöst:</span><br />
                      {new Date(ticket.resolved_at).toLocaleString('de-DE')}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-[#c00000]" />
                  <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Kundeninformationen
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">Name:</span><br />
                    {ticket.customer_name}
                  </div>
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">Firma:</span><br />
                    {ticket.customer_company}
                  </div>
                  <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                    <span className="font-medium">E-Mail:</span><br />
                    <span className="text-blue-400">{ticket.customer_email}</span>
                  </div>
                </div>
              </div>

              {/* Device Info */}
              {deviceInfo && (
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-[#c00000]" />
                      <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Betroffenes Gerät
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CircleIcon className={`h-2 w-2 ${isDeviceOnline ? 'text-green-500 fill-green-500' : 'text-red-500 fill-red-500'}`} />
                      <span className={`text-xs font-medium ${isDeviceOnline ? 'text-green-500' : 'text-red-500'}`}>
                        {isDeviceOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs font-mono mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {ticket.device_id}
                  </p>
                  {deviceInfo.teamviewer_id && isDeviceOnline && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://start.teamviewer.com/${deviceInfo.teamviewer_id}`, '_blank');
                      }}
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                    >
                      <Video className="h-3 w-3 mr-1" />
                      TeamViewer
                    </Button>
                  )}
                </div>
              )}

              {/* Location Details */}
              {locationDetails ? (
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-[#c00000]" />
                    <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Standortdetails
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div>
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {locationDetails.stationsname}
                      </p>
                      <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}>
                        {locationDetails.main_code}
                      </p>
                    </div>
                    <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                      <p>{locationDetails.str}</p>
                      <p>{locationDetails.plz} {locationDetails.ort}</p>
                    </div>
                    {locationDetails.telefon && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span>{locationDetails.telefon}</span>
                      </div>
                    )}
                    {locationDetails.mgr && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{locationDetails.mgr}</span>
                      </div>
                    )}
                    {/* Öffnungszeiten */}
                    {locationDetails.opening_hours && typeof locationDetails.opening_hours === 'object' && (
                      <div className={`mt-2 p-2 rounded ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-1 mb-2">
                          <Clock className="h-3 w-3 text-[#c00000]" />
                          <span className="font-medium">Öffnungszeiten:</span>
                        </div>
                        <div className="space-y-0.5 text-xs">
                          {Object.entries(locationDetails.opening_hours).map(([day, hours]) => {
                            const dayNames = {
                              monday: 'Mo',
                              tuesday: 'Di',
                              wednesday: 'Mi',
                              thursday: 'Do',
                              friday: 'Fr',
                              saturday: 'Sa',
                              sunday: 'So'
                            };
                            const displayDay = dayNames[day] || day;
                            const displayHours = hours.closed 
                              ? 'Geschlossen' 
                              : `${hours.open} - ${hours.close}`;
                            
                            return (
                              <div key={day} className="flex justify-between">
                                <span className="font-medium">{displayDay}:</span>
                                <span>{displayHours}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : loadingLocation ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin h-5 w-5 border-2 border-[#c00000] border-t-transparent rounded-full"></div>
                </div>
              ) : null}

              {/* Resources & Tools (Admin Only) - Collapsible */}
              {isAdmin && (
                <div className={`rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button
                    onClick={() => setResourcesExpanded(!resourcesExpanded)}
                    className={`w-full p-3 flex items-center justify-between transition-colors ${
                      theme === 'dark' ? 'hover:bg-[#2a2a2a]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-[#c00000]" />
                      <span className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Ressourcen & Hilfsmittel
                      </span>
                    </div>
                    {resourcesExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  
                  {resourcesExpanded && (
                    <div className="p-3 pt-0 space-y-3">
                      {loadingResources ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin h-4 w-4 border-2 border-[#c00000] border-t-transparent rounded-full"></div>
                        </div>
                      ) : (
                        <>
                          {/* Anleitungen */}
                          {resources.anleitungen && resources.anleitungen.count > 0 && (
                            <div>
                              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                📖 Anleitungen ({resources.anleitungen.count})
                              </p>
                              <div className="space-y-1">
                                {resources.anleitungen.files.slice(0, 3).map((file, idx) => (
                                  <a
                                    key={idx}
                                    href={file.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-1.5 rounded text-xs transition-colors ${
                                      theme === 'dark'
                                        ? 'hover:bg-[#2a2a2a] text-blue-400'
                                        : 'hover:bg-gray-100 text-blue-600'
                                    }`}
                                  >
                                    <FileText className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate flex-1">{file.name}</span>
                                    <Download className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Treiber */}
                          {resources.treiber && resources.treiber.count > 0 && (
                            <div>
                              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                💾 Treiber ({resources.treiber.count})
                              </p>
                              <div className="space-y-1">
                                {resources.treiber.files.slice(0, 3).map((file, idx) => (
                                  <a
                                    key={idx}
                                    href={file.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-1.5 rounded text-xs transition-colors ${
                                      theme === 'dark'
                                        ? 'hover:bg-[#2a2a2a] text-blue-400'
                                        : 'hover:bg-gray-100 text-blue-600'
                                    }`}
                                  >
                                    <FileText className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate flex-1">{file.name}</span>
                                    <Download className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Tools */}
                          {resources.tools && resources.tools.count > 0 && (
                            <div>
                              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                🔧 Tools ({resources.tools.count})
                              </p>
                              <div className="space-y-1">
                                {resources.tools.files.slice(0, 3).map((file, idx) => (
                                  <a
                                    key={idx}
                                    href={file.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-1.5 rounded text-xs transition-colors ${
                                      theme === 'dark'
                                        ? 'hover:bg-[#2a2a2a] text-blue-400'
                                        : 'hover:bg-gray-100 text-blue-600'
                                    }`}
                                  >
                                    <FileText className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate flex-1">{file.name}</span>
                                    <Download className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Troubleshooting */}
                          {resources.troubleshooting && resources.troubleshooting.count > 0 && (
                            <div>
                              <p className={`text-xs font-medium mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                🔍 Troubleshooting ({resources.troubleshooting.count})
                              </p>
                              <div className="space-y-1">
                                {resources.troubleshooting.files.slice(0, 3).map((file, idx) => (
                                  <a
                                    key={idx}
                                    href={file.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 p-1.5 rounded text-xs transition-colors ${
                                      theme === 'dark'
                                        ? 'hover:bg-[#2a2a2a] text-blue-400'
                                        : 'hover:bg-gray-100 text-blue-600'
                                    }`}
                                  >
                                    <FileText className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate flex-1">{file.name}</span>
                                    <Download className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* No resources message */}
                          {Object.keys(resources).length === 0 && (
                            <p className={`text-xs text-center py-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                              Keine Ressourcen verfügbar
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons (Admin Only) */}
              {isAdmin && (
                <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h3 className={`text-xs font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Aktionen
                  </h3>
                  <div className="space-y-2">
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Notizen..."
                      rows={2}
                      className={`w-full px-2 py-1 rounded border text-xs ${
                        theme === 'dark'
                          ? 'bg-[#0a0a0a] border-gray-700 text-white'
                          : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    />
                    <div className="flex flex-col gap-2">
                      {(ticket.status === 'open' || ticket.status === 'new') && (
                        <Button
                          onClick={() => handleStatusAction('accept')}
                          disabled={actionLoading}
                          size="sm"
                          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Annehmen
                        </Button>
                      )}
                      {(ticket.status === 'accepted' || ticket.status === 'open') && (
                        <Button
                          onClick={() => handleStatusAction('start')}
                          disabled={actionLoading}
                          size="sm"
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs"
                        >
                          <PlayCircle className="h-3 w-3 mr-1" />
                          Starten
                        </Button>
                      )}
                      {ticket.status === 'in_progress' && (
                        <Button
                          onClick={() => handleStatusAction('resolve')}
                          disabled={actionLoading}
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Gelöst
                        </Button>
                      )}
                      {ticket.status === 'resolved' && (
                        <Button
                          onClick={() => handleStatusAction('close')}
                          disabled={actionLoading}
                          size="sm"
                          className="w-full bg-gray-600 hover:bg-gray-700 text-white text-xs"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Schließen
                        </Button>
                      )}
                      {ticket.status === 'closed' && (
                        <Button
                          onClick={() => handleStatusAction('reopen')}
                          disabled={actionLoading}
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Öffnen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Close Button */}
              {!isAdmin && ticket.status === 'resolved' && (
                <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'bg-[#1a1a1a] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Problem gelöst?
                  </p>
                  <Button
                    onClick={() => handleStatusAction('close')}
                    disabled={actionLoading}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Bestätigen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className={`w-full max-w-md rounded-lg ${
            theme === 'dark' ? 'bg-[#2d2d2d]' : 'bg-white'
          }`}>
            <div className={`flex items-center justify-between p-6 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Ticket zuweisen
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignNotes('');
                  setSelectedStaffEmail('');
                }}
                className={`p-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'hover:bg-[#3a3a3a] text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Mitarbeiter auswählen *
                </label>
                <select
                  value={selectedStaffEmail}
                  onChange={(e) => setSelectedStaffEmail(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">-- Bitte wählen --</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.email}>
                      {member.name} ({member.active_tickets || 0}/{member.max_active_tickets})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Notiz (optional)
                </label>
                <textarea
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-[#1a1a1a] border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Zusätzliche Informationen..."
                />
              </div>
            </div>
            
            <div className={`flex justify-end gap-3 p-6 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <Button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignNotes('');
                  setSelectedStaffEmail('');
                }}
                variant="outline"
                className={theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleAssignTicket}
                className="bg-[#c00000] hover:bg-[#a00000] text-white"
              >
                Zuweisen
              </Button>
            </div>
          </div>
        </div>
      )}

export default TicketDetailModal;

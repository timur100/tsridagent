import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Edit2, Trash2, Copy, CheckCheck, Check, 
  FileText, Download, Image as ImageIcon, Volume2 
} from 'lucide-react';
import toast from 'react-hot-toast';

const MessageItem = ({ message, isOwnMessage, theme, onDelete, onEdit }) => {
  const { apiCall } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.message);
  const [showActions, setShowActions] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.message);
    toast.success('Nachricht kopiert');
  };
  
  const handleDelete = async () => {
    if (!window.confirm('Nachricht wirklich löschen?')) return;
    
    try {
      const result = await apiCall(`/api/chat/messages/${message.id}`, {
        method: 'DELETE'
      });
      
      if (result.success) {
        toast.success('Nachricht gelöscht');
        if (onDelete) onDelete();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Fehler beim Löschen');
    }
  };
  
  const handleEdit = async () => {
    if (!editedText.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('new_message', editedText);
      
      const result = await apiCall(`/api/chat/messages/${message.id}`, {
        method: 'PUT',
        body: formData,
        headers: {}
      });
      
      if (result.success) {
        toast.success('Nachricht aktualisiert');
        setIsEditing(false);
        if (onEdit) onEdit();
      }
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error(error.message || 'Fehler beim Bearbeiten');
    }
  };
  
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  const isWithinEditWindow = () => {
    const createdAt = new Date(message.created_at);
    const now = new Date();
    const diffMinutes = (now - createdAt) / 1000 / 60;
    return diffMinutes <= 5;
  };
  
  const [attachmentData, setAttachmentData] = useState({});
  
  // Fetch attachment metadata when component mounts
  React.useEffect(() => {
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach(async (attachmentId) => {
        try {
          const result = await apiCall(`/api/chat/download/${attachmentId}`);
          if (result.success) {
            setAttachmentData(prev => ({
              ...prev,
              [attachmentId]: result.file
            }));
          }
        } catch (error) {
          console.error('Error fetching attachment:', error);
        }
      });
    }
  }, [message.attachments]);
  
  const renderAttachment = (attachmentId) => {
    const fileData = attachmentData[attachmentId];
    
    if (!fileData) {
      return (
        <div
          key={attachmentId}
          className={`flex items-center gap-2 p-2 rounded-lg mt-2 ${
            theme === 'dark' ? 'bg-[#3a3a3a]' : 'bg-gray-100'
          }`}
        >
          <FileText className="h-4 w-4 text-blue-500" />
          <span className="text-sm">Laden...</span>
        </div>
      );
    }
    
    // Check if it's an audio file
    const isAudio = fileData.file_type?.startsWith('audio/') || 
                    fileData.filename?.match(/\.(mp3|wav|ogg|webm|m4a)$/i);
    
    if (isAudio) {
      return (
        <div
          key={attachmentId}
          className={`mt-2 p-3 rounded-lg ${
            theme === 'dark' ? 'bg-[#3a3a3a]' : 'bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Sprachnachricht</span>
          </div>
          <audio
            controls
            className="w-full"
            style={{ maxWidth: '300px' }}
          >
            <source src={`/api/chat/files/${fileData.unique_filename}`} type={fileData.file_type} />
            Ihr Browser unterstützt das Audio-Element nicht.
          </audio>
        </div>
      );
    }
    
    // Regular file attachment
    return (
      <div
        key={attachmentId}
        className={`flex items-center gap-2 p-2 rounded-lg mt-2 ${
          theme === 'dark' ? 'bg-[#3a3a3a]' : 'bg-gray-100'
        }`}
      >
        <FileText className="h-4 w-4 text-blue-500" />
        <span className="text-sm">{fileData.filename}</span>
        <span className={`text-xs ml-2 ${
          theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
        }`}>
          ({(fileData.file_size / 1024).toFixed(1)} KB)
        </span>
        <button
          onClick={() => {
            window.open(`/api/chat/files/${fileData.unique_filename}`, '_blank');
          }}
          className="ml-auto text-blue-500 hover:text-blue-600"
          title="Herunterladen"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    );
  };
  
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <div className={`px-4 py-2 rounded-full text-sm ${
          theme === 'dark'
            ? 'bg-[#3a3a3a] text-gray-400'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {message.message}
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Sender info */}
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1 px-2">
            <span className={`text-xs font-medium ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {message.sender_name}
            </span>
            <span className={`text-xs ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {message.sender_role === 'admin' ? '(Support)' : '(Kunde)'}
            </span>
          </div>
        )}
        
        {/* Message bubble */}
        <div className="relative">
          <div
            className={`px-4 py-3 rounded-2xl ${
              isOwnMessage
                ? 'bg-blue-600 text-white rounded-br-sm'
                : theme === 'dark'
                ? 'bg-[#3a3a3a] text-gray-200 rounded-bl-sm'
                : 'bg-gray-200 text-gray-900 rounded-bl-sm'
            }`}
          >
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className={`w-full px-2 py-1 rounded ${
                    theme === 'dark'
                      ? 'bg-[#2a2a2a] text-white'
                      : 'bg-white text-gray-900'
                  } border ${
                    theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedText(message.message);
                    }}
                    className={`px-3 py-1 rounded text-sm ${
                      theme === 'dark'
                        ? 'bg-[#2a2a2a] text-gray-300 hover:bg-[#4a4a4a]'
                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                    }`}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap break-words">
                  {message.message}
                </p>
                
                {message.edited && (
                  <span className={`text-xs italic mt-1 block ${
                    isOwnMessage ? 'text-blue-100' : theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    (bearbeitet)
                  </span>
                )}
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2">
                    {message.attachments.map(attachmentId => renderAttachment(attachmentId))}
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Action buttons */}
          {showActions && !isEditing && (
            <div className={`absolute ${
              isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
            } top-0 flex items-center gap-1 px-2`}>
              <button
                onClick={handleCopy}
                className={`p-1 rounded hover:bg-opacity-10 ${
                  theme === 'dark' ? 'hover:bg-white' : 'hover:bg-black'
                }`}
                title="Kopieren"
              >
                <Copy className={`h-4 w-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
              </button>
              
              {isOwnMessage && isWithinEditWindow() && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-1 rounded hover:bg-opacity-10 ${
                      theme === 'dark' ? 'hover:bg-white' : 'hover:bg-black'
                    }`}
                    title="Bearbeiten"
                  >
                    <Edit2 className={`h-4 w-4 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                  </button>
                  <button
                    onClick={handleDelete}
                    className={`p-1 rounded hover:bg-opacity-10 hover:bg-red-500`}
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Timestamp and read status */}
        <div className="flex items-center gap-2 mt-1 px-2">
          <span className={`text-xs ${
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {formatTime(message.created_at)}
          </span>
          
          {isOwnMessage && (
            <div className="flex items-center">
              {message.read_by && message.read_by.length > 1 ? (
                <CheckCheck className="h-3 w-3 text-blue-400" title="Gelesen" />
              ) : (
                <Check className="h-3 w-3 text-gray-400" title="Gesendet" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;

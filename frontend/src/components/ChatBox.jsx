import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Button } from './ui/button';
import { 
  Send, Paperclip, Smile, Mic, X, StopCircle, 
  FileText, Download, Image as ImageIcon, File 
} from 'lucide-react';
import toast from 'react-hot-toast';
import MessageItem from './MessageItem';
import EmojiPicker from 'emoji-picker-react';

const ChatBox = ({ ticketId, tenantId }) => {
  const { theme } = useTheme();
  const { apiCall, user } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Use provided tenantId or fallback to user's tenant_id or 'all' for admins
  const effectiveTenantId = tenantId || (user?.role === 'admin' ? 'all' : user?.tenant_ids?.[0]);
  
  // WebSocket for real-time updates
  const { connectionStatus } = useWebSocket(effectiveTenantId, {
    chat_message_created: (data) => {
      console.log('📨 [Chat] New message received:', data);
      if (data.ticket_id === ticketId) {
        fetchMessages();
      }
    },
    user_typing: (data) => {
      console.log('⌨️ [Chat] User typing:', data);
      if (data.ticket_id === ticketId && data.user_email !== user?.email) {
        if (data.is_typing) {
          setTypingUsers(prev => {
            if (!prev.includes(data.user_email)) {
              return [...prev, data.user_email];
            }
            return prev;
          });
          
          // Remove after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(email => email !== data.user_email));
          }, 3000);
        } else {
          setTypingUsers(prev => prev.filter(email => email !== data.user_email));
        }
      }
    }
  });
  
  useEffect(() => {
    fetchMessages();
  }, [ticketId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const result = await apiCall(`/api/chat/messages/${ticketId}`);
      if (result.success) {
        setMessages(result.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Fehler beim Laden der Nachrichten');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() && uploadedFiles.length === 0) return;
    
    try {
      setSending(true);
      
      const result = await apiCall('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: ticketId,
          message: newMessage,
          message_type: uploadedFiles.length > 0 ? 'file' : 'text',
          attachments: uploadedFiles.map(f => f.id)
        })
      });
      
      if (result.success) {
        setNewMessage('');
        setUploadedFiles([]);
        await fetchMessages();
        sendTypingIndicator(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Fehler beim Senden der Nachricht');
    } finally {
      setSending(false);
    }
  };
  
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    try {
      setUploading(true);
      
      for (const file of files) {
        // Check file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Datei zu groß: ${file.name} (max. 10MB)`);
          continue;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ticket_id', ticketId);
        
        const result = await apiCall('/api/chat/upload', {
          method: 'POST',
          body: formData,
          headers: {} // Let browser set Content-Type for FormData
        });
        
        if (result.success) {
          setUploadedFiles(prev => [...prev, result.file]);
          toast.success(`Datei hochgeladen: ${file.name}`);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Fehler beim Hochladen der Datei');
    } finally {
      setUploading(false);
    }
  };
  
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks = [];
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      });
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Auto-stop after 2 minutes
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          handleStopRecording();
        }
      }, 120000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Fehler beim Starten der Aufnahme');
    }
  };
  
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleSendAudio = async () => {
    if (!audioBlob) return;
    
    try {
      const audioFile = new File([audioBlob], 'audio-message.webm', { type: 'audio/webm' });
      await handleFileUpload([audioFile]);
      setAudioBlob(null);
    } catch (error) {
      console.error('Error sending audio:', error);
      toast.error('Fehler beim Senden der Sprachnachricht');
    }
  };
  
  const sendTypingIndicator = async (isTyping) => {
    try {
      const formData = new FormData();
      formData.append('ticket_id', ticketId);
      formData.append('is_typing', isTyping.toString());
      
      await apiCall('/api/chat/typing', {
        method: 'POST',
        body: formData
        // Let apiCall handle headers automatically
      });
    } catch (error) {
      // Silently fail for typing indicator - not critical
      console.log('Typing indicator not sent:', error.message);
    }
  };
  
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    sendTypingIndicator(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };
  
  const handleEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };
  
  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };
  
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${
        theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
            Nachrichten werden geladen...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`flex flex-col h-[600px] ${
      theme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-white'
    } rounded-lg`}>
      {/* Messages area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
        theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-gray-50'
      }`}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
              Noch keine Nachrichten. Schreibe die erste!
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwnMessage={message.sender_email === user?.email}
              theme={theme}
              onDelete={fetchMessages}
              onEdit={fetchMessages}
            />
          ))
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className={`flex items-center space-x-2 px-4 py-2 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">
              {typingUsers.length === 1 ? 'Jemand' : `${typingUsers.length} Personen`} tippt...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Uploaded files preview */}
      {uploadedFiles.length > 0 && (
        <div className={`border-t px-4 py-2 ${
          theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  theme === 'dark' ? 'bg-[#3a3a3a]' : 'bg-white border border-gray-200'
                }`}
              >
                <FileText className="h-4 w-4 text-blue-500" />
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {file.filename}
                </span>
                <button
                  onClick={() => removeUploadedFile(file.id)}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Audio preview */}
      {audioBlob && (
        <div className={`border-t px-4 py-2 ${
          theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-4">
            <audio src={URL.createObjectURL(audioBlob)} controls className="flex-1" />
            <Button
              onClick={handleSendAudio}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Senden
            </Button>
            <button
              onClick={() => setAudioBlob(null)}
              className="text-red-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Input area */}
      <div className={`border-t p-4 ${
        theme === 'dark' ? 'border-gray-700 bg-[#2a2a2a]' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-end gap-2">
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'hover:bg-[#3a3a3a] text-gray-400 hover:text-gray-300'
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-700'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Datei anhängen"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          
          {/* Emoji picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-[#3a3a3a] text-gray-400 hover:text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-700'
              }`}
              title="Emoji hinzufügen"
            >
              <Smile className="h-5 w-5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                />
              </div>
            )}
          </div>
          
          {/* Audio recording */}
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-[#3a3a3a] text-gray-400 hover:text-gray-300'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-700'
              }`}
              title="Sprachnachricht aufnehmen"
            >
              <Mic className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors animate-pulse"
              title="Aufnahme beenden"
            >
              <StopCircle className="h-5 w-5" />
            </button>
          )}
          
          {/* Message input */}
          <textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Nachricht schreiben..."
            rows={1}
            className={`flex-1 px-4 py-2 rounded-lg resize-none ${
              theme === 'dark'
                ? 'bg-[#3a3a3a] text-white border-gray-600 focus:border-blue-500'
                : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
            } border focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
            disabled={sending}
          />
          
          {/* Send button */}
          <Button
            onClick={handleSendMessage}
            disabled={sending || (!newMessage.trim() && uploadedFiles.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import io from 'socket.io-client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Send, 
  Image, 
  FileText, 
  Download, 
  Trash2, 
  Smile,
  Paperclip, 
  Check, 
  X, 
  AlertCircle,
  Clock,
  Wifi,
  WifiOff,
  Users,
  MoreVertical,
  Eye
} from 'lucide-react';

// Configuration
const API_URL = process.env.REACT_APP_API_URL || 'https://mini-soutenance.onrender.com/api';
const SOCKET_URL = API_URL.replace('/api', '');
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Constantes
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSize: 10 * 1024 * 1024 // 10MB
};

const EMOJI_CATEGORIES = [
  { 
    name: 'Visages', 
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'] 
  },
  { 
    name: 'Animaux', 
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'] 
  },
  { 
    name: 'Nourriture', 
    emojis: ['🍎', '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🎂', '🍦', '🍩', '🍪', '☕', '🍵', '🥤', '🍺'] 
  },
  { 
    name: 'Activités', 
    emojis: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓', '🎮', '🎯', '🎨', '🎭', '🎤'] 
  },
  { 
    name: 'Objets', 
    emojis: ['📱', '💻', '🖥️', '⌚', '📷', '🎥', '📺', '📻', '💡', '🔦', '💰', '💎', '✉️', '📦', '🎁'] 
  },
  { 
    name: 'Symboles', 
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '👍', '👎', '👏', '🙌', '🤝'] 
  }
];

const Chat = () => {
  // États
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);

  // Références
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const optionsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Chargement initial
  useEffect(() => {
    const loadUserData = () => {
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(userData);
        return userData;
      } catch (error) {
        console.error('Erreur de chargement utilisateur:', error);
        return null;
      }
    };

    const loadChatHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          return;
        }

        const response = await fetch(`${API_URL}/chat`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Erreur de chargement');
        
        const data = await response.json();
        setMessages(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Impossible de charger les messages');
      } finally {
        setIsLoading(false);
      }
    };

    const userData = loadUserData();
    if (userData?.id) {
      loadChatHistory();
    }

    // Gestionnaire de connexion réseau
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Socket.IO
  useEffect(() => {
    const handleNewMessage = (msg) => {
      setMessages(prev => {
        // Éviter les doublons
        if (prev.some(m => m.id === msg.id || m.tempId === msg.tempId)) {
          return prev.map(m => m.tempId === msg.tempId ? msg : m);
        }
        return [...prev, msg];
      });

      // Notification si pas dans le chat
      if (msg.userId !== user?.id && document.hidden) {
        const notification = msg.file 
          ? `${msg.username} a envoyé un fichier`
          : `Nouveau message de ${msg.username}`;
        
        toast.info(notification, {
          onClick: () => window.focus()
        });
      }
    };

    const handleDeletedMessage = (deletedMsg) => {
      setMessages(prev => prev.map(m => 
        m.id === deletedMsg.id 
          ? { ...m, message: '[Message supprimé]', file: null, isDeleted: true }
          : m
      ));
    };

    const handleUserTyping = ({ userId, username, isTyping }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    };

    const handleOnlineUsers = (count) => {
      setOnlineUsers(count);
    };

    // Événements Socket.IO
    socket.on('connect', () => {
      setIsOnline(true);
      console.log('Socket connecté');
    });

    socket.on('disconnect', () => {
      setIsOnline(false);
      console.log('Socket déconnecté');
    });

    socket.on('nouveau-message', handleNewMessage);
    socket.on('message-supprime', handleDeletedMessage);
    socket.on('user-typing', handleUserTyping);
    socket.on('online-users', handleOnlineUsers);
    socket.on('reconnect', () => {
      toast.success('Reconnecté au chat');
      setIsOnline(true);
    });

    // Rejoindre le chat
    if (user?.id) {
      socket.emit('join-chat', { userId: user.id, username: user.nom || 'Utilisateur' });
    }

    return () => {
      socket.off('nouveau-message', handleNewMessage);
      socket.off('message-supprime', handleDeletedMessage);
      socket.off('user-typing', handleUserTyping);
      socket.off('online-users', handleOnlineUsers);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
    };
  }, [user]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  }, [messages, typingUsers.size]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojis(false);
      }
      if (optionsRef.current && !optionsRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gestionnaire de saisie avec debounce
  const handleTyping = useCallback(() => {
    if (!user?.id || !isTyping) {
      socket.emit('typing', { 
        userId: user.id, 
        username: user.nom || 'Utilisateur', 
        isTyping: true 
      });
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (user?.id) {
        socket.emit('typing', { 
          userId: user.id, 
          username: user.nom || 'Utilisateur', 
          isTyping: false 
        });
        setIsTyping(false);
      }
    }, 1000);
  }, [user, isTyping]);

  // Fonctions utilitaires
  const getAvatarColor = useCallback((username) => {
    const colors = [
      '#1e3c72', '#2a5298', '#6a11cb', '#2575fc', 
      '#ff6b6b', '#48c78e', '#f39c12', '#9b59b6',
      '#2ecc71', '#3498db', '#9b59b6', '#34495e'
    ];
    const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, []);

  
  const formatFileSize = useCallback((bytes) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }, []);

  const formatTime = useCallback((dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const formatFullDate = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: days > 365 ? 'numeric' : undefined
    });
  }, []);

  const isMessageFromMe = useCallback((msg) => msg.userId === user?.id, [user]);
  const canDeleteMessage = useCallback((msg) => 
    isMessageFromMe(msg) || user?.type === 'admin', 
    [isMessageFromMe, user]
  );

  // Gestion des fichiers
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > ALLOWED_FILE_TYPES.maxSize) {
      toast.error('Fichier trop volumineux (max 10MB)');
      return;
    }

    const isImage = ALLOWED_FILE_TYPES.image.includes(file.type);
    const isDocument = ALLOWED_FILE_TYPES.document.includes(file.type);

    if (!isImage && !isDocument) {
      toast.error('Type de fichier non autorisé');
      return;
    }

    setSelectedFile(file);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    event.target.value = '';
  }, []);

  const removeSelectedFile = useCallback(() => {
    setSelectedFile(null);
    setFilePreview(null);
  }, []);

  // Gestion des emojis
  const addEmoji = useCallback((emoji) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  }, []);

  // Upload fichier
  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: formData
      });

      if (!response.ok) throw new Error('Échec de l\'upload');
      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, []);

  // Envoi message
  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    const messageContent = newMessage.trim();
    let fileData = null;

    // Upload fichier si présent
    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadResult = await uploadFile(selectedFile);
        fileData = {
          url: uploadResult.fileUrl,
          name: uploadResult.fileName,
          type: selectedFile.type.includes('image') ? 'image' : 'document',
          size: selectedFile.size
        };
      } catch (error) {
        toast.error('Erreur lors de l\'upload du fichier');
        setIsUploading(false);
        return;
      }
    }

    // Message temporaire
    const tempId = Date.now();
    const tempMessage = {
      tempId,
      userId: user.id,
      username: user.type === 'admin' ? 'Administrateur' : user.nom,
      message: messageContent,
      type: user.type,
      created_at: new Date().toISOString(),
      isSending: true,
      file: fileData
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSelectedFile(null);
    setFilePreview(null);
    setIsUploading(false);
    setShowEmojis(false);

    // Arrêter l'indicateur de saisie
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('typing', { 
      userId: user.id, 
      username: user.nom || 'Utilisateur', 
      isTyping: false 
    });

    try {
      const response = await fetch(`${API_URL}/chat/with-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          message: messageContent, 
          file: fileData 
        })
      });

      if (!response.ok) throw new Error('Erreur d\'envoi');
      
      const sentMessage = await response.json();
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...sentMessage, isSending: false } : msg
      ));
      
      toast.success('Message envoyé');
    } catch (error) {
      console.error('Send error:', error);
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, isSending: false, hasError: true } 
          : msg
      ));
      toast.error('Échec de l\'envoi');
    }
  }, [newMessage, selectedFile, user, uploadFile]);

  // Suppression message
  const deleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Supprimer ce message ? Cette action est irréversible.')) return;

    try {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isDeleting: true } : m
      ));

      const response = await fetch(`${API_URL}/chat/${messageId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error();
      
      setMessages(prev => prev.map(m =>
        m.id === messageId 
          ? { ...m, message: '[Message supprimé]', file: null, isDeleted: true, isDeleting: false }
          : m
      ));
      
      toast.success('Message supprimé');
    } catch (error) {
      console.error('Delete error:', error);
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isDeleting: false } : m
      ));
      toast.error('Erreur lors de la suppression');
    }
  }, []);

  // Grouper les messages par date
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentDate = null;
    
    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.created_at).toDateString();
      
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({
          type: 'date',
          date: msg.created_at,
          id: `date-${msgDate}`
        });
      }
      
      groups.push({
        ...msg,
        type: 'message'
      });
    });
    
    return groups;
  }, [messages]);

  // Render functions
  const renderMessage = useCallback((msg) => {
    const isMine = isMessageFromMe(msg);
    const isDeleted = msg.isDeleted || msg.message === '[Message supprimé]';

    return (
      <div 
        key={msg.id || msg.tempId} 
        className={`message-wrapper ${isMine ? 'own-message' : 'other-message'} ${isDeleted ? 'deleted-message' : ''}`}
      >
        {!isMine && !isDeleted && (
          <div 
            className="avatar" 
            style={{ 
              background: `linear-gradient(135deg, ${getAvatarColor(msg.username)}, ${getAvatarColor(msg.username)}99)` 
            }}
            title={msg.username}
          >
            {getInitials(msg.username)}
          </div>
        )}

        <div className="message-content">
          <div className="message-bubble">
            {/* En-tête pour messages des autres */}
            {!isMine && !isDeleted && (
              <div className="message-header">
                <strong className="username">{msg.username || 'Utilisateur'}</strong>
                {msg.type === 'admin' && (
                  <span className="badge admin-badge">Admin</span>
                )}
                <span className="message-time">
                  {formatFullDate(msg.created_at)}
                </span>
              </div>
            )}

            {/* Contenu du message */}
            {isDeleted ? (
              <div className="deleted-content">
                <X size={14} />
                <span>Message supprimé</span>
              </div>
            ) : (
              <>
                {/* Fichier joint */}
                {msg.file && (
                  <div className="file-attachment">
                    {msg.file.type === 'image' ? (
                      <div className="image-attachment">
                        <img 
                          src={msg.file.url} 
                          alt="Image envoyée" 
                          loading="lazy"
                        />
                        <div className="image-overlay">
                          <button 
                            className="view-btn"
                            onClick={() => window.open(msg.file.url, '_blank')}
                          >
                            <Eye size={16} />
                            <span>Agrandir</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <a 
                        href={msg.file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="document-attachment"
                      >
                        <FileText size={24} />
                        <div className="document-info">
                          <span className="filename">{msg.file.name}</span>
                          <span className="filesize">{formatFileSize(msg.file.size)}</span>
                        </div>
                        <Download size={20} className="download-icon" />
                      </a>
                    )}
                  </div>
                )}

                {/* Texte du message */}
                {msg.message && (
                  <div className="message-text">
                    {msg.message}
                  </div>
                )}
              </>
            )}

            {/* Pied de message */}
            <div className="message-footer">
              {isMine && !isDeleted && (
                <span className="message-time">
                  {formatFullDate(msg.created_at)}
                </span>
              )}
              
              {/* Indicateurs d'état */}
              <div className="message-status">
                {msg.isSending && (
                  <span className="status sending">
                    <Clock size={12} />
                  </span>
                )}
                {msg.isDeleting && (
                  <span className="status deleting">
                    <Clock size={12} />
                  </span>
                )}
                {msg.hasError && (
                  <span className="status error">
                    <AlertCircle size={12} />
                  </span>
                )}
                {!msg.hasError && !msg.isSending && isMine && (
                  <span className="status sent">
                    <Check size={12} />
                  </span>
                )}
              </div>

              {/* Bouton de suppression */}
              {canDeleteMessage(msg) && !isDeleted && !msg.isDeleting && (
                <button 
                  className="delete-btn"
                  onClick={() => deleteMessage(msg.id)}
                  title="Supprimer le message"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {isMine && !isDeleted && (
          <div 
            className="avatar own-avatar"
            style={{ 
              background: `linear-gradient(135deg, ${getAvatarColor(msg.username)}, ${getAvatarColor(msg.username)}99)` 
            }}
            title="Vous"
          >
            {getInitials(msg.username)}
          </div>
        )}
      </div>
    );
  }, [isMessageFromMe, getAvatarColor, getInitials, formatFullDate, formatFileSize, canDeleteMessage, deleteMessage]);

  const renderDateSeparator = useCallback((date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateObj = new Date(date);
    let label;
    
    if (dateObj.toDateString() === today.toDateString()) {
      label = "Aujourd'hui";
    } else if (dateObj.toDateString() === yesterday.toDateString()) {
      label = 'Hier';
    } else {
      label = dateObj.toLocaleDateString('fr-FR', { 
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
    
    return (
      <div key={date} className="date-separator">
        <div className="separator-line"></div>
        <span className="separator-label">{label}</span>
        <div className="separator-line"></div>
      </div>
    );
  }, []);

  return (
    <>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <div className="chat-container">
        {/* En-tête */}
        <header className="chat-header">
          <div className="header-content">
            <div className="chat-info">
              <div className="chat-icon">
                <Users size={32} />
              </div>
              <div className="chat-title">
                <h1>Chat Général</h1>
                <p className="chat-subtitle">
                  {onlineUsers} {onlineUsers === 1 ? 'personne en ligne' : 'personnes en ligne'}
                </p>
              </div>
            </div>
            
            <div className="header-actions">
              <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
                {isOnline ? (
                  <>
                    <Wifi size={16} />
                    <span>En ligne</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} />
                    <span>Hors ligne</span>
                  </>
                )}
              </div>
              
              <div className="options-container" ref={optionsRef}>
                <button 
                  className="options-btn"
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <MoreVertical size={20} />
                </button>
                
                {showOptions && (
                  <div className="options-dropdown">
                    <button className="dropdown-item">
                      Paramètres du chat
                    </button>
                    <button className="dropdown-item">
                      Effacer l'historique
                    </button>
                    <button className="dropdown-item">
                      Exporter les messages
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Indicateur de saisie */}
          {typingUsers.size > 0 && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">
                {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'est en train d\'écrire' : 'sont en train d\'écrire'}...
              </span>
            </div>
          )}
        </header>

        {/* Zone des messages */}
        <main className="messages-container">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Chargement des messages...</p>
            </div>
          ) : groupedMessages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Send size={48} />
              </div>
              <h3>Commencez la conversation !</h3>
              <p>Soyez le premier à envoyer un message.</p>
            </div>
          ) : (
            <>
              {groupedMessages.map((item) => {
                if (item.type === 'date') {
                  return renderDateSeparator(item.date);
                }
                return renderMessage(item);
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </main>

        {/* Prévisualisation fichier */}
        {selectedFile && (
          <div className="file-preview">
            <div className="preview-header">
              <span>Fichier sélectionné :</span>
              <button 
                type="button" 
                className="remove-btn"
                onClick={removeSelectedFile}
              >
                <X size={20} />
              </button>
            </div>
            <div className="preview-content">
              {filePreview ? (
                <div className="image-preview">
                  <img src={filePreview} alt="Aperçu" />
                  <div className="file-info">
                    <span className="filename">{selectedFile.name}</span>
                    <span className="filesize">{formatFileSize(selectedFile.size)}</span>
                  </div>
                </div>
              ) : (
                <div className="document-preview">
                  <FileText size={32} />
                  <div className="file-info">
                    <span className="filename">{selectedFile.name}</span>
                    <span className="filesize">{formatFileSize(selectedFile.size)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zone de saisie */}
        <form onSubmit={sendMessage} className="input-container">
          <div className="input-wrapper">
            <div className="input-actions">
              <button 
                type="button" 
                className="action-btn attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isOnline || isUploading}
                title="Joindre un fichier"
              >
                <Paperclip size={20} />
              </button>
              
              <button 
                type="button" 
                className="action-btn emoji-btn"
                onClick={() => setShowEmojis(!showEmojis)}
                disabled={!isOnline || isUploading}
                title="Insérer un emoji"
              >
                <Smile size={20} />
              </button>
              
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
            </div>
            
            <input
              ref={inputRef}
              type="text"
              className="message-input"
              placeholder={isOnline ? "Écrivez votre message..." : "Connexion perdue..."}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (newMessage.trim() || selectedFile) {
                    sendMessage(e);
                  }
                }
              }}
              disabled={!isOnline || isUploading}
            />
            
            <button
              type="submit"
              className="send-btn"
              disabled={(!newMessage.trim() && !selectedFile) || !isOnline || isUploading}
            >
              {isUploading ? (
                <div className="upload-spinner"></div>
              ) : (
                <>
                  <Send size={20} />
                  <span className="send-text">Envoyer</span>
                </>
              )}
            </button>
          </div>
          
          {/* Sélecteur d'emojis */}
          {showEmojis && (
            <div className="emoji-picker" ref={emojiPickerRef}>
              <div className="emoji-header">
                <div className="emoji-categories">
                  {EMOJI_CATEGORIES.map((category, index) => (
                    <button
                      key={category.name}
                      className={`category-btn ${activeEmojiCategory === index ? 'active' : ''}`}
                      onClick={() => setActiveEmojiCategory(index)}
                    >
                      {category.emojis[0]}
                    </button>
                  ))}
                </div>
                <button 
                  className="close-emoji-btn"
                  onClick={() => setShowEmojis(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="emoji-grid">
                {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    className="emoji-item"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Informations */}
          <div className="input-footer">
            {!isOnline && (
              <div className="offline-notice">
                <AlertCircle size={16} />
                <span>Vous êtes hors ligne. Reconnexion...</span>
              </div>
            )}
            <div className="file-info">
              Formats supportés : JPEG, PNG, GIF, WebP, PDF, Word • Max 10MB
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        /* Variables CSS */
        :root {
          --primary: #1e3c72;
          --primary-light: #2a5298;
          --secondary: #6a11cb;
          --success: #48c78e;
          --danger: #ef4444;
          --warning: #f39c12;
          --info: #3498db;
          --light: #f8fafc;
          --dark: #1e293b;
          --gray-100: #f1f5f9;
          --gray-200: #e2e8f0;
          --gray-300: #cbd5e1;
          --gray-400: #94a3b8;
          --gray-500: #64748b;
          --gray-600: #475569;
          --gray-700: #334155;
          --gray-800: #1e293b;
          --gray-900: #0f172a;
          
          --radius-sm: 8px;
          --radius-md: 12px;
          --radius-lg: 16px;
          --radius-xl: 24px;
          
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.1);
          --shadow-md: 0 4px 20px rgba(0,0,0,0.15);
          --shadow-lg: 0 8px 40px rgba(0,0,0,0.2);
          --shadow-inner: inset 0 2px 4px rgba(0,0,0,0.1);
        }

        /* Reset & Base */
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          margin: 0;
        }

        /* Container principal */
        .chat-container {
          max-width: 1000px;
          height: 90vh;
          margin: 5vh auto;
          background: white;
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        /* En-tête */
        .chat-header {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          padding: 1.5rem 2rem;
          position: relative;
          z-index: 10;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .chat-info {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
        }

        .chat-icon {
          background: rgba(255,255,255,0.2);
          border-radius: var(--radius-lg);
          padding: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
        }

        .chat-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          line-height: 1.2;
        }

        .chat-subtitle {
          font-size: 0.875rem;
          opacity: 0.9;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          backdrop-filter: blur(10px);
        }

        .connection-status.online {
          background: rgba(72, 199, 142, 0.2);
          border: 1px solid rgba(72, 199, 142, 0.3);
        }

        .connection-status.offline {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .options-container {
          position: relative;
        }

        .options-btn {
          background: rgba(255,255,255,0.2);
          border: none;
          border-radius: var(--radius-md);
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: white;
        }

        .options-btn:hover {
          background: rgba(255,255,255,0.3);
          transform: rotate(90deg);
        }

        .options-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          min-width: 200px;
          overflow: hidden;
          z-index: 1000;
          margin-top: 0.5rem;
        }

        .dropdown-item {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          text-align: left;
          border: none;
          background: transparent;
          color: var(--gray-800);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .dropdown-item:hover {
          background: var(--gray-100);
          color: var(--primary);
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.1);
          border-radius: var(--radius-md);
          backdrop-filter: blur(10px);
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .typing-dots {
          display: flex;
          gap: 2px;
        }

        .typing-dots span {
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          animation: typing 1.4s infinite;
        }

        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }

        .typing-text {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        /* Zone des messages */
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem 2rem;
          background: linear-gradient(180deg, var(--gray-100) 0%, white 100%);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: relative;
        }

        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: var(--gray-300);
          border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: var(--gray-400);
        }

        /* États de chargement/vide */
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--gray-500);
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--gray-200);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        .empty-icon {
          opacity: 0.3;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: var(--gray-700);
        }

        .empty-state p {
          margin: 0;
          font-size: 0.875rem;
        }

        /* Séparateur de date */
        .date-separator {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1rem 0;
        }

        .separator-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gray-300), transparent);
        }

        .separator-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--gray-500);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 0.25rem 1rem;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--gray-200);
          white-space: nowrap;
        }

        /* Message */
        .message-wrapper {
          display: flex;
          gap: 0.75rem;
          max-width: 80%;
          animation: messageAppear 0.3s ease;
        }

        @keyframes messageAppear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .own-message {
          margin-left: auto;
          flex-direction: row-reverse;
        }

        .other-message {
          margin-right: auto;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
          flex-shrink: 0;
          border: 2px solid white;
          box-shadow: var(--shadow-sm);
        }

        .own-avatar {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
        }

        .message-content {
          flex: 1;
          min-width: 0;
        }

        .message-bubble {
          padding: 0.75rem 1rem;
          border-radius: var(--radius-lg);
          position: relative;
          background: white;
          border: 1px solid var(--gray-200);
          box-shadow: var(--shadow-sm);
          transition: all 0.3s ease;
        }

        .own-message .message-bubble {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          border: none;
          border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
        }

        .other-message .message-bubble {
          border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .username {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-700);
        }

        .admin-badge {
          background: var(--danger);
          color: white;
          padding: 0.125rem 0.5rem;
          border-radius: 10px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .message-text {
          line-height: 1.5;
          font-size: 0.9375rem;
          word-wrap: break-word;
        }

        .own-message .message-text {
          color: white;
        }

        .message-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .message-time {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .message-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .status {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status.sending, .status.deleting {
          color: var(--gray-400);
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status.sent {
          color: var(--success);
        }

        .status.error {
          color: var(--danger);
        }

        .delete-btn {
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
          opacity: 0;
        }

        .message-bubble:hover .delete-btn {
          opacity: 1;
        }

        .delete-btn:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }

        /* Message supprimé */
        .deleted-message .message-bubble {
          background: var(--gray-100);
          border-color: var(--gray-200);
          color: var(--gray-500);
        }

        .deleted-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-style: italic;
          font-size: 0.875rem;
        }

        /* Fichiers joints */
        .file-attachment {
          margin-bottom: 0.75rem;
        }

        .image-attachment {
          position: relative;
          border-radius: var(--radius-md);
          overflow: hidden;
          max-width: 300px;
          cursor: pointer;
          border: 1px solid var(--gray-200);
        }

        .image-attachment img {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-attachment:hover .image-overlay {
          opacity: 1;
        }

        .image-attachment:hover img {
          transform: scale(1.02);
        }

        .view-btn {
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: var(--radius-md);
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--gray-800);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .view-btn:hover {
          background: white;
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .document-attachment {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          text-decoration: none;
          color: var(--gray-800);
          transition: all 0.3s ease;
          max-width: 300px;
        }

        .document-attachment:hover {
          background: var(--gray-100);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .document-info {
          flex: 1;
          min-width: 0;
        }

        .filename {
          display: block;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .filesize {
          display: block;
          font-size: 0.75rem;
          color: var(--gray-500);
          margin-top: 0.25rem;
        }

        .download-icon {
          color: var(--gray-400);
          transition: color 0.3s ease;
        }

        .document-attachment:hover .download-icon {
          color: var(--primary);
        }

        /* Prévisualisation fichier */
        .file-preview {
          background: var(--gray-100);
          border-top: 1px solid var(--gray-200);
          padding: 1rem 2rem;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .preview-header span {
          font-size: 0.875rem;
          color: var(--gray-600);
          font-weight: 500;
        }

        .remove-btn {
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all 0.3s ease;
        }

        .remove-btn:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }

        .preview-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .image-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .image-preview img {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          object-fit: cover;
          border: 2px solid var(--gray-200);
        }

        .document-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--gray-200);
        }

        /* Zone de saisie */
        .input-container {
          padding: 1.5rem 2rem;
          background: white;
          border-top: 1px solid var(--gray-200);
          position: relative;
        }

        .input-wrapper {
          display: flex;
          gap: 0.75rem;
          align-items: flex-end;
        }

        .input-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          background: transparent;
          border: none;
          color: var(--gray-500);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-md);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover:not(:disabled) {
          background: var(--gray-100);
          color: var(--primary);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message-input {
          flex: 1;
          padding: 0.875rem 1.25rem;
          border: 2px solid var(--gray-200);
          border-radius: var(--radius-lg);
          font-size: 0.9375rem;
          font-family: inherit;
          transition: all 0.3s ease;
          background: white;
          resize: none;
          min-height: 48px;
          max-height: 120px;
        }

        .message-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(30, 60, 114, 0.1);
        }

        .message-input:disabled {
          background: var(--gray-100);
          cursor: not-allowed;
        }

        .send-btn {
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          padding: 0.875rem 1.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .send-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(30, 60, 114, 0.4);
        }

        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .upload-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .send-text {
          font-size: 0.9375rem;
        }

        /* Sélecteur d'emojis */
        .emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 2rem;
          background: white;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          width: 350px;
          max-height: 300px;
          overflow: hidden;
          z-index: 1000;
          margin-bottom: 1rem;
          animation: slideUp 0.3s ease;
        }

        .emoji-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--gray-200);
          background: var(--gray-100);
        }

        .emoji-categories {
          display: flex;
          gap: 0.5rem;
        }

        .category-btn {
          background: transparent;
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all 0.3s ease;
        }

        .category-btn:hover {
          background: var(--gray-200);
        }

        .category-btn.active {
          background: var(--primary);
          color: white;
        }

        .close-emoji-btn {
          background: transparent;
          border: none;
          color: var(--gray-500);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          transition: all 0.3s ease;
        }

        .close-emoji-btn:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 0.5rem;
          padding: 1rem;
          max-height: 250px;
          overflow-y: auto;
        }

        .emoji-grid::-webkit-scrollbar {
          width: 6px;
        }

        .emoji-grid::-webkit-scrollbar-track {
          background: var(--gray-100);
          border-radius: 3px;
        }

        .emoji-grid::-webkit-scrollbar-thumb {
          background: var(--gray-300);
          border-radius: 3px;
        }

        .emoji-grid::-webkit-scrollbar-thumb:hover {
          background: var(--gray-400);
        }

        .emoji-item {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emoji-item:hover {
          background: var(--gray-100);
          transform: scale(1.2);
        }

        /* Pied de la zone de saisie */
        .input-footer {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .offline-notice {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fef3c7;
          color: #92400e;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          border: 1px solid #fcd34d;
        }

        .file-info {
          font-size: 0.75rem;
          color: var(--gray-500);
          text-align: center;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .chat-container {
            margin: 0;
            height: 100vh;
            border-radius: 0;
          }

          .chat-header {
            padding: 1rem 1.25rem;
          }

          .header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .header-actions {
            justify-content: space-between;
          }

          .messages-container {
            padding: 1rem 1.25rem;
          }

          .message-wrapper {
            max-width: 90%;
          }

          .emoji-picker {
            left: 1.25rem;
            right: 1.25rem;
            width: auto;
          }

          .emoji-grid {
            grid-template-columns: repeat(6, 1fr);
          }

          .input-container {
            padding: 1rem 1.25rem;
          }

          .send-text {
            display: none;
          }

          .message-input {
            min-height: 44px;
            padding: 0.75rem 1rem;
          }

          .send-btn {
            padding: 0.75rem;
          }
        }

        @media (max-width: 480px) {
          .chat-title h1 {
            font-size: 1.25rem;
          }

          .chat-subtitle {
            font-size: 0.75rem;
          }

          .connection-status span {
            display: none;
          }

          .emoji-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .message-bubble {
            padding: 0.75rem;
          }

          .document-attachment, .image-attachment {
            max-width: 100%;
          }
        }
      `}</style>
    </>
  );
};

export default Chat;

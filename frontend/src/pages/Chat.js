import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { 
  Send, Image as ImageIcon, File, Smile, Paperclip, 
  X, Download, Trash2, CheckCircle, AlertCircle, 
  Clock, Wifi, WifiOff, Users, Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://mini-soutenance.onrender.com/api';
const socket = io(API_URL.replace('/api', ''));

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [nouveauMessage, setNouveauMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [activeUsers, setActiveUsers] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const ALLOWED_FILE_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024
  };

  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
    '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
    '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
    '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
    '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
    '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '👍', '👎', '👏', '🙌', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘',
    '👊', '✊', '🤛', '🤜', '💪', '👀', '👁️', '🧠', '👅', '👄',
    '🎉', '🎊', '🎁', '🎂', '🎈', '🎀', '🏆', '🥇', '🥈', '🥉',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓'
  ];

  const handleNouveauMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
    if (msg.userId !== user?.id && !document.hidden) {
      const notification = msg.file 
        ? `${msg.username} a envoyé un fichier` 
        : `${msg.username}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`;
      toast.info(notification);
    }
  };

  const handleMessageSupprime = (msgMisAJour) => {
    setMessages(prev => prev.map(m =>
      m.id === msgMisAJour.id ? { ...m, message: 'Message supprimé', file: null, isDeleted: true } : m
    ));
  };

  const supprimerMessage = async (messageId) => {
    if (!window.confirm('Supprimer ce message ? Cette action est irréversible.')) return;

    try {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isDeleting: true } : m
      ));

      const response = await fetch(`${API_URL}/chat/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error();
      
      toast.success('Message supprimé avec succès');
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      toast.error('Erreur lors de la suppression');
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, isDeleting: false } : m
      ));
    }
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);

    const chargerHistorique = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/chat`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
        
        // Simuler des utilisateurs actifs
        setActiveUsers(Math.floor(Math.random() * 15) + 5);
      } catch (error) {
        toast.error('Erreur lors du chargement des messages');
      } finally {
        setIsLoading(false);
      }
    };

    chargerHistorique();

    socket.on('nouveau-message', handleNouveauMessage);
    socket.on('message-supprime', handleMessageSupprime);
    socket.on('connect', () => {
      setIsOnline(true);
      toast.success('Connecté au chat');
    });
    socket.on('disconnect', () => {
      setIsOnline(false);
      toast.warning('Déconnecté du chat');
    });
    socket.on('user-count', (count) => {
      setActiveUsers(count);
    });

    return () => {
      socket.off('nouveau-message', handleNouveauMessage);
      socket.off('message-supprime', handleMessageSupprime);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('user-count');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojis(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > ALLOWED_FILE_TYPES.maxSize) {
      toast.error('Fichier trop volumineux (maximum 10MB)');
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
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const addEmoji = (emoji) => {
    setNouveauMessage(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (!response.ok) throw new Error('Erreur upload');
      return await response.json();
    } catch (error) {
      throw new Error('Échec upload');
    }
  };

  const envoyerMessage = async (e) => {
    e.preventDefault();
    if (!nouveauMessage.trim() && !selectedFile) return;

    const messageContent = nouveauMessage.trim();
    let fileData = null;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadResult = await uploadFile(selectedFile);
        fileData = {
          url: uploadResult.fileUrl,
          name: uploadResult.fileName,
          type: uploadResult.fileType,
          size: uploadResult.fileSize
        };
      } catch (error) {
        toast.error('Erreur lors de l\'envoi du fichier');
        setIsUploading(false);
        return;
      }
    }

    const tempId = Date.now();
    const monMessage = {
      id: tempId,
      userId: user.id,
      username: user.type === 'admin' ? 'Administrateur' : user.nom,
      message: messageContent,
      type: user.type,
      date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      created_at: new Date().toISOString(),
      isSending: true,
      file: fileData
    };

    setMessages(prev => [...prev, monMessage]);
    setNouveauMessage('');
    setSelectedFile(null);
    setFilePreview(null);
    setIsUploading(false);

    try {
      const response = await fetch(`${API_URL}/chat/with-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: messageContent, file: fileData })
      });

      if (!response.ok) throw new Error('Erreur envoi');
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, isSending: false } : msg));
      toast.success('Message envoyé');
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, isSending: false, hasError: true } : msg
      ));
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const getAvatarColor = (username) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)'
    ];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const getInitials = (username) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getFileIcon = (fileType) => {
    return fileType === 'image' ? <ImageIcon size={20} /> : <File size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatHeure = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateComplete = (dateString) => {
    const date = new Date(dateString);
    const aujourdhui = new Date();
    const hier = new Date(aujourdhui);
    hier.setDate(hier.getDate() - 1);

    if (date.toDateString() === aujourdhui.toDateString()) {
      return `Aujourd'hui à ${formatHeure(dateString)}`;
    } else if (date.toDateString() === hier.toDateString()) {
      return `Hier à ${formatHeure(dateString)}`;
    } else {
      return `${date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      })} à ${formatHeure(dateString)}`;
    }
  };

  const formatDateSeparateur = (dateString) => {
    const date = new Date(dateString);
    const aujourdhui = new Date();
    const hier = new Date(aujourdhui);
    hier.setDate(hier.getDate() - 1);

    if (date.toDateString() === aujourdhui.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === hier.toDateString()) return "Hier";
    
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long', day: 'numeric', month: 'long'
    });
  };

  const isMessageFromMe = (msg) => msg.userId === user?.id;
  const canDeleteMessage = (msg) => (isMessageFromMe(msg) || user?.type === 'admin') && !msg.isDeleted;

  const messagesAvecSeparateurs = [];
  messages.forEach((message, index) => {
    const messageDate = new Date(message.created_at).toDateString();
    const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
    
    if (index === 0 || messageDate !== prevDate) {
      messagesAvecSeparateurs.push({ 
        type: 'dateSeparator', 
        date: message.created_at, 
        id: `date-${messageDate}` 
      });
    }
    messagesAvecSeparateurs.push({ ...message, type: 'message' });
  });

  return (
    <div className="chat-container">
      {/* En-tête amélioré */}
      <div className="chat-header">
        <div className="header-content">
          <div className="chat-info">
            <div className="chat-icon-wrapper">
              <div className="chat-icon">
                <Users size={24} />
              </div>
              <div className="online-indicator"></div>
            </div>
            <div>
              <h1>Discussion Générale</h1>
              <p>Chat collaboratif en temps réel</p>
            </div>
          </div>
          
          <div className="header-stats">
            <div className="stat-item">
              <div className="stat-icon">
                <Users size={16} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{activeUsers}</span>
                <span className="stat-label">En ligne</span>
              </div>
            </div>
            
            <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
              <div className="status-dot" />
              <span>{isOnline ? 'Connecté' : 'Hors ligne'}</span>
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            </div>
          </div>
        </div>
      </div>

      {/* Zone des messages */}
      <div className="messages-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Chargement des messages...</p>
          </div>
        ) : messagesAvecSeparateurs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={64} />
            </div>
            <h3>Bienvenue dans le chat !</h3>
            <p>Soyez le premier à envoyer un message.</p>
            <div className="empty-tips">
              <p>💡 Conseil : Partagez des fichiers, utilisez des émojis</p>
            </div>
          </div>
        ) : (
          <>
            {messagesAvecSeparateurs.map((item, index) => {
              if (item.type === 'dateSeparator') {
                return (
                  <div key={item.id} className="date-separator">
                    <div className="separator-line"></div>
                    <span className="separator-text">{formatDateSeparateur(item.date)}</span>
                    <div className="separator-line"></div>
                  </div>
                );
              }

              const msg = item;
              const isMine = isMessageFromMe(msg);
              const isDeleted = msg.isDeleted;

              return (
                <div 
                  key={msg.id} 
                  className={`message-wrapper ${isMine ? 'own-message' : 'other-message'} ${isDeleted ? 'deleted-message' : ''}`}
                >
                  {!isMine && (
                    <div className="avatar" style={{ background: getAvatarColor(msg.username) }}>
                      {getInitials(msg.username)}
                      {msg.type === 'admin' && (
                        <div className="admin-badge-icon">
                          <Shield size={10} />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="message-content">
                    <div className="message-bubble">
                      {!isMine && !isDeleted && (
                        <div className="message-header">
                          <strong className="username">{msg.username}</strong>
                          {msg.type === 'admin' && <span className="admin-badge">Administrateur</span>}
                        </div>
                      )}

                      {msg.file && !isDeleted && (
                        <div className="file-attachment">
                          {msg.file.type === 'image' ? (
                            <div className="image-preview">
                              <img 
                                src={msg.file.url} 
                                alt="Image" 
                                className="uploaded-image"
                                onClick={() => window.open(msg.file.url, '_blank')}
                              />
                              <div className="image-overlay">
                                <div className="overlay-content">
                                  <ImageIcon size={24} />
                                  <span className="view-text">Agrandir</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <a 
                              href={msg.file.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="document-link"
                            >
                              <div className="document-preview">
                                <div className="file-icon-wrapper">
                                  {getFileIcon('document')}
                                </div>
                                <div className="file-info">
                                  <span className="file-name">{msg.file.name}</span>
                                  <span className="file-size">{formatFileSize(msg.file.size)}</span>
                                </div>
                                <div className="download-icon-wrapper">
                                  <Download size={18} />
                                </div>
                              </div>
                            </a>
                          )}
                        </div>
                      )}

                      {isDeleted ? (
                        <div className="deleted-message-content">
                          <AlertCircle size={16} />
                          <span>Message supprimé</span>
                        </div>
                      ) : (
                        msg.message && (
                          <div className="message-text">
                            {msg.message.split(' ').map((word, i) => 
                              emojis.includes(word) ? (
                                <span key={i} className="emoji-in-message">{word}</span>
                              ) : (
                                <span key={i}>{word} </span>
                              )
                            )}
                          </div>
                        )
                      )}

                      <div className="message-footer">
                        <span className="message-time" title={formatDateComplete(msg.created_at)}>
                          <Clock size={12} />
                          {formatHeure(msg.created_at)}
                        </span>
                        
                        {msg.isSending && (
                          <span className="message-status sending">
                            <div className="sending-dots">
                              <div className="dot"></div>
                              <div className="dot"></div>
                              <div className="dot"></div>
                            </div>
                          </span>
                        )}
                        
                        {msg.hasError && (
                          <span className="message-status error" title="Échec de l'envoi">
                            <AlertCircle size={14} />
                          </span>
                        )}
                        
                        {!msg.isSending && !msg.hasError && isMine && (
                          <span className="message-status sent">
                            <CheckCircle size={14} />
                          </span>
                        )}
                        
                        {msg.file && !isDeleted && (
                          <span className="file-indicator">
                            <Paperclip size={12} />
                          </span>
                        )}
                      </div>
                    </div>

                    {canDeleteMessage(msg) && !msg.isDeleting && (
                      <button 
                        onClick={() => supprimerMessage(msg.id)}
                        className="delete-message-btn"
                        title="Supprimer le message"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {msg.isDeleting && (
                      <div className="deleting-overlay">
                        <div className="deleting-spinner"></div>
                      </div>
                    )}
                  </div>

                  {isMine && (
                    <div className="avatar own-avatar" style={{ background: getAvatarColor(msg.username) }}>
                      {getInitials(msg.username)}
                      {msg.type === 'admin' && (
                        <div className="admin-badge-icon">
                          <Shield size={10} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Prévisualisation du fichier */}
      {selectedFile && (
        <div className="file-preview">
          <div className="preview-header">
            <span>Fichier sélectionné</span>
            <button type="button" onClick={removeSelectedFile} className="remove-file-btn">
              <X size={20} />
            </button>
          </div>
          <div className="preview-content">
            {filePreview ? (
              <div className="image-preview-small">
                <img src={filePreview} alt="Aperçu" />
                <div className="file-info">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                </div>
              </div>
            ) : (
              <div className="document-preview-small">
                <div className="file-icon-wrapper">
                  <File size={24} />
                </div>
                <div className="file-info">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">{formatFileSize(selectedFile.size)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulaire d'envoi */}
      <form onSubmit={envoyerMessage} className="input-container">
        <div className="input-wrapper">
          <div className="input-actions">
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              className="action-btn attach-file-btn"
              disabled={isUploading}
              title="Joindre un fichier"
            >
              <Paperclip size={20} />
            </button>
            
            <button 
              type="button" 
              onClick={() => setShowEmojis(!showEmojis)} 
              className="action-btn emoji-btn"
              title="Émojis"
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

          <div className="input-field-wrapper">
            <input
              ref={inputRef}
              type="text"
              placeholder={isOnline ? "Tapez votre message..." : "Hors ligne - Reconnexion..."}
              value={nouveauMessage}
              onChange={e => setNouveauMessage(e.target.value)}
              className="message-input"
              disabled={!isOnline || isUploading}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && envoyerMessage(e)}
            />
            
            {nouveauMessage && (
              <button 
                type="button" 
                onClick={() => setNouveauMessage('')} 
                className="clear-input-btn"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button 
            type="submit" 
            className="send-button"
            disabled={(!nouveauMessage.trim() && !selectedFile) || !isOnline || isUploading}
          >
            {isUploading ? (
              <div className="uploading-indicator"></div>
            ) : (
              <>
                <Send size={18} />
                <span>Envoyer</span>
              </>
            )}
          </button>
        </div>

        {/* Sélecteur d'émojis */}
        {showEmojis && (
          <div ref={emojiPickerRef} className="emoji-picker">
            <div className="emoji-picker-header">
              <h4>Émojis</h4>
              <button type="button" onClick={() => setShowEmojis(false)} className="close-emoji-btn">
                <X size={20} />
              </button>
            </div>
            <div className="emoji-grid">
              {emojis.map((emoji, i) => (
                <button 
                  key={i} 
                  type="button" 
                  className="emoji-item" 
                  onClick={() => addEmoji(emoji)}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Infos bas de formulaire */}
        <div className="input-footer">
          {!isOnline && (
            <div className="offline-warning">
              <WifiOff size={16} />
              <span>Vous êtes hors ligne - Reconnexion automatique</span>
            </div>
          )}
          
          {isUploading && (
            <div className="uploading-message">
              <div className="uploading-spinner"></div>
              <span>Envoi du fichier en cours...</span>
            </div>
          )}
          
          <div className="file-info-text">
            <File size={12} />
            <span>Formats acceptés : Images, PDF, Word (max 10MB)</span>
          </div>
        </div>
      </form>

      <style jsx>{`
        .chat-container {
          max-width: 1200px;
          margin: 2rem auto;
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.15);
          height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
        }

        /* En-tête amélioré */
        .chat-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem 2rem;
          position: relative;
          overflow: hidden;
          z-index: 10;
        }

        .chat-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1));
          border-radius: 50%;
          transform: translate(30%, -30%);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          z-index: 2;
        }

        .chat-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .chat-icon-wrapper {
          position: relative;
        }

        .chat-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .online-indicator {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 12px;
          height: 12px;
          background: #48c78e;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(72, 199, 142, 0.5);
        }

        .chat-info h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff, rgba(255, 255, 255, 0.9));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .chat-info p {
          margin: 0.25rem 0 0 0;
          opacity: 0.9;
          font-size: 0.95rem;
        }

        .header-stats {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.5rem 1rem;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .stat-value {
          font-weight: 700;
          font-size: 1.1rem;
        }

        .stat-label {
          font-size: 0.75rem;
          opacity: 0.8;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        .status-indicator.online {
          background: rgba(72, 199, 142, 0.2);
          border-color: rgba(72, 199, 142, 0.3);
        }

        .status-indicator.offline {
          background: rgba(231, 76, 60, 0.2);
          border-color: rgba(231, 76, 60, 0.3);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
          background: currentColor;
        }

        .status-indicator.online .status-dot {
          background: #48c78e;
          box-shadow: 0 0 10px rgba(72, 199, 142, 0.5);
        }

        .status-indicator.offline .status-dot {
          background: #e74c3c;
        }

        /* Zone des messages */
        .messages-container {
          flex: 1;
          padding: 1rem 2rem;
          overflow-y: auto;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #cbd5e1, #94a3b8);
          border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #94a3b8, #64748b);
        }

        /* Séparateur de date */
        .date-separator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1.5rem 0;
          gap: 1rem;
          position: sticky;
          top: 0;
          z-index: 5;
        }

        .separator-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
        }

        .separator-text {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        /* États de chargement et vide */
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
          text-align: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-icon {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.5rem;
        }

        .empty-tips {
          margin-top: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          font-size: 0.9rem;
          color: #64748b;
        }

        /* Messages */
        .message-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 0.75rem;
          margin-bottom: 1rem;
          max-width: 70%;
          position: relative;
          animation: slideIn 0.3s ease;
        }

        @keyframes slideIn {
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

        /* Avatar */
        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          position: relative;
          transition: transform 0.3s ease;
        }

        .avatar:hover {
          transform: scale(1.05);
        }

        .own-avatar {
          background: linear-gradient(135deg, #667eea, #764ba2) !important;
        }

        .admin-badge-icon {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #e74c3c;
          color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        /* Contenu du message */
        .message-content {
          flex: 1;
          min-width: 0;
          position: relative;
        }

        .message-bubble {
          padding: 1rem 1.25rem;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          position: relative;
          word-wrap: break-word;
          transition: all 0.3s ease;
        }

        .own-message .message-bubble {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-bottom-right-radius: 6px;
        }

        .other-message .message-bubble {
          background: white;
          color: #333;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 6px;
        }

        .deleted-message .message-bubble {
          background: #f8fafc;
          color: #94a3b8;
          font-style: italic;
          box-shadow: none;
          border: 1px solid #e2e8f0;
        }

        /* En-tête du message */
        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .username {
          font-size: 0.9rem;
          opacity: 0.9;
          font-weight: 600;
        }

        .admin-badge {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }

        /* Texte du message */
        .message-text {
          line-height: 1.5;
          margin: 0.5rem 0;
          font-size: 1rem;
          word-break: break-word;
        }

        .emoji-in-message {
          font-size: 1.2rem;
          display: inline-block;
          margin: 0 2px;
          vertical-align: middle;
        }

        .deleted-message-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #94a3b8;
          font-size: 0.9rem;
        }

        /* Pied de message */
        .message-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.5rem;
          font-size: 0.75rem;
        }

        .message-time {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          opacity: 0.7;
          cursor: help;
          transition: opacity 0.3s ease;
        }

        .message-time:hover {
          opacity: 1;
        }

        .message-status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .message-status.sending .sending-dots {
          display: flex;
          gap: 2px;
        }

        .message-status.sending .dot {
          width: 4px;
          height: 4px;
          background: currentColor;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .message-status.sending .dot:nth-child(1) { animation-delay: -0.32s; }
        .message-status.sending .dot:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .message-status.error {
          color: #e74c3c;
        }

        .message-status.sent {
          color: #48c78e;
        }

        /* Fichiers joints */
        .file-attachment {
          margin-bottom: 0.75rem;
        }

        .image-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          max-width: 300px;
          transition: all 0.3s ease;
        }

        .uploaded-image {
          width: 100%;
          max-height: 250px;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .image-preview:hover .uploaded-image {
          transform: scale(1.02);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-preview:hover .image-overlay {
          opacity: 1;
        }

        .overlay-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: white;
        }

        .view-text {
          font-weight: 600;
          font-size: 0.9rem;
        }

        /* Documents */
        .document-link {
          text-decoration: none;
          color: inherit;
        }

        .document-preview {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          max-width: 300px;
        }

        .document-preview:hover {
          background: #e2e8f0;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .file-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .download-icon-wrapper {
          opacity: 0.7;
          transition: opacity 0.3s ease;
        }

        .document-preview:hover .download-icon-wrapper {
          opacity: 1;
        }

        .file-info {
          flex: 1;
          min-width: 0;
        }

        .file-name {
          display: block;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.9rem;
        }

        .file-size {
          display: block;
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        /* Bouton de suppression */
        .delete-message-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .message-wrapper:hover .delete-message-btn {
          opacity: 1;
          transform: scale(1.1);
        }

        .delete-message-btn:hover {
          background: #dc2626;
          transform: scale(1.2);
        }

        .deleting-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(2px);
        }

        .deleting-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Prévisualisation du fichier */
        .file-preview {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-top: 1px solid #e2e8f0;
          padding: 1rem 2rem;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
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
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .remove-file-btn {
          background: #ef4444;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .remove-file-btn:hover {
          background: #dc2626;
          transform: rotate(90deg);
        }

        .preview-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .image-preview-small {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .image-preview-small img {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          object-fit: cover;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .document-preview-small {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        /* Zone de saisie */
        .input-container {
          position: relative;
          padding: 1.5rem 2rem;
          background: white;
          border-top: 1px solid #e2e8f0;
        }

        .input-wrapper {
          display: flex;
          gap: 1rem;
          align-items: flex-end;
        }

        .input-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-btn {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover:not(:disabled) {
          background: #f1f5f9;
          color: #667eea;
          transform: scale(1.1);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-field-wrapper {
          flex: 1;
          position: relative;
        }

        .message-input {
          width: 100%;
          padding: 1rem 3rem 1rem 1.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 25px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
          resize: none;
          min-height: 50px;
          max-height: 120px;
          font-family: inherit;
        }

        .message-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .message-input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .clear-input-btn {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 50%;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .clear-input-btn:hover {
          background: #f1f5f9;
          color: #64748b;
        }

        .send-button {
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          border-radius: 25px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .uploading-indicator {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Sélecteur d'émojis */
        .emoji-picker {
          position: absolute;
          bottom: calc(100% + 1rem);
          left: 1rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
          width: 350px;
          animation: fadeInUp 0.3s ease;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .emoji-picker-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 16px 16px 0 0;
          position: sticky;
          top: 0;
        }

        .emoji-picker-header h4 {
          margin: 0;
          color: #1e3c72;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .close-emoji-btn {
          background: #ef4444;
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .close-emoji-btn:hover {
          background: #dc2626;
          transform: rotate(90deg);
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 0.5rem;
          padding: 1rem;
          max-height: 250px;
          overflow-y: auto;
        }

        .emoji-item {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .emoji-item:hover {
          background: #f1f5f9;
          transform: scale(1.2);
        }

        .emoji-grid::-webkit-scrollbar {
          width: 6px;
        }

        .emoji-grid::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .emoji-grid::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .emoji-grid::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        /* Pied de formulaire */
        .input-footer {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .offline-warning {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fef3c7;
          color: #92400e;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          font-size: 0.9rem;
          border: 1px solid #fcd34d;
        }

        .uploading-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #f39c12;
          font-size: 0.9rem;
          padding: 0.75rem 1rem;
          background: #fef9c3;
          border-radius: 12px;
          border: 1px solid #fde047;
        }

        .uploading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid #f39c12;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .file-info-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #94a3b8;
          justify-content: center;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .chat-container {
            margin: 0;
            height: 100vh;
            border-radius: 0;
            max-width: 100%;
          }

          .chat-header {
            padding: 1rem 1.25rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .header-stats {
            width: 100%;
            justify-content: space-between;
          }

          .messages-container {
            padding: 0.75rem 1.25rem;
          }

          .message-wrapper {
            max-width: 85%;
          }

          .date-separator {
            margin: 1rem 0;
          }

          .separator-text {
            font-size: 0.7rem;
            padding: 0.4rem 0.8rem;
          }

          .input-container {
            padding: 1rem 1.25rem;
          }

          .input-wrapper {
            flex-direction: column;
            gap: 1rem;
          }

          .send-button {
            align-self: flex-end;
            padding: 0.75rem 1.25rem;
          }

          .emoji-picker {
            left: 1.25rem;
            right: 1.25rem;
            width: auto;
          }

          .emoji-grid {
            grid-template-columns: repeat(6, 1fr);
          }

          .file-preview {
            padding: 1rem 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .messages-container {
            padding: 0.5rem 1rem;
          }

          .message-wrapper {
            max-width: 90%;
          }

          .avatar {
            width: 32px;
            height: 32px;
            font-size: 0.7rem;
          }

          .message-bubble {
            padding: 0.75rem 1rem;
            border-radius: 16px;
          }

          .emoji-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .header-stats {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .stat-item, .status-indicator {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default Chat;

import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || 'https://mini-soutenance.onrender.com/api';
const socket = io(API_URL.replace('/api', '')); // socket.io sur le bon domaine

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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const ALLOWED_FILE_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
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
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🪀', '🏓',
    '🍕', '🍔', '🍟', '🌭', '🍿', '🧁', '🎂', '🍦', '🍩', '🍪',
    '☕', '🍵', '🥤', '🍺', '🍷', '🥂', '🍾', '🧃', '🧉', '🧊',
    '🚗', '🚙', '🚕', '🚌', '🏎️', '🚓', '🚑', '🚒', '✈️', '🚀',
    '🛸', '🚁', '⛵', '🚤', '🛳️', '🎠', '🎡', '🎢', '🚂', '🚊',
    '🌍', '🌎', '🌏', '🗺️', '🏔️', '⛰️', '🌋', '🏕️', '🏖️', '🏜️',
    '🏝️', '📱', '💻', '🖥', '⌚', '📷', '📹', '🎥', '📺', '📻',
    '💾', '📀', '📼', '📸', '🔍', '💡', '🔦', '🕯️', '💰', '💎',
    '🛒', '🎁', '📦', '✉️', '📨', '📩', '📤', '📥', '📆', '📅',
    '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙'
  ];

// FONCTIONS DÉPLACÉES AU BON ENDROIT
  const handleNouveauMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
    if (msg.userId !== user?.id && !document.hidden) {
      const notification = msg.file ? `Fichier ${msg.username} a envoyé un fichier` : `Nouveau message de ${msg.username}`;
      toast.info(notification);
    }
  };

  const handleMessageSupprime = (msgMisAJour) => {
    setMessages(prev => prev.map(m =>
      m.id === msgMisAJour.id ? { ...m, message: msgMisAJour.message, file: null } : m
    ));
  };

  const supprimerMessage = async (messageId) => {
    if (!window.confirm('Supprimer ce message ? Cette action est irréversible.')) return;

    try {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, message: 'Suppression...', isSending: true } : m
      ));

      const response = await fetch(`${API_URL}/chat/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error();
      toast.success('Message supprimé !');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
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
      } catch (error) {
        toast.error('Erreur lors du chargement des messages');
      } finally {
        setIsLoading(false);
      }
    };

    chargerHistorique();

    socket.on('nouveau-message', handleNouveauMessage);
    socket.on('message-supprime', handleMessageSupprime);
    socket.on('connect', () => setIsOnline(true));
    socket.on('disconnect', () => setIsOnline(false));

    return () => {
      socket.off('nouveau-message', handleNouveauMessage);
      socket.off('message-supprime', handleMessageSupprime);
      socket.off('connect');
      socket.off('disconnect');
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
    } catch (error) {
      setMessages(prev => prev.map(msg => msg.id === tempId ? { ...msg, isSending: false, hasError: true } : msg));
      toast.error('Erreur lors de l\'envoi');
      if (messageContent) setNouveauMessage(messageContent);
      if (selectedFile) setSelectedFile(selectedFile);
    }
  };

  const getAvatarColor = (username) => {
    const colors = ['#1e3c72', '#2a5298', '#6a11cb', '#2575fc', '#ff6b6b', '#48c78e', '#f39c12', '#9b59b6'];
    const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const getInitials = (username) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getFileIcon = (fileType) => {
    return fileType === 'image' ? 'Photo' : 'Document';
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
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  };

  const isMessageFromMe = (msg) => msg.userId === user?.id;
  const canDeleteMessage = (msg) => isMessageFromMe(msg) || user?.type === 'admin';

  const messagesAvecSeparateurs = [];
  messages.forEach((message, index) => {
    if (index === 0 || new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString()) {
      messagesAvecSeparateurs.push({ type: 'dateSeparator', date: message.created_at, id: `date-${index}` });
    }
    messagesAvecSeparateurs.push({ ...message, type: 'message' });
  });

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="chat-info">
            <div className="chat-icon">Chat</div>
            <div>
              <h1>Discussion Générale</h1>
              <p>Chat entre établissements et administrateur</p>
            </div>
          </div>
          <div className="status-indicator">
            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
            <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Chargement des messages...</p>
          </div>
        ) : messagesAvecSeparateurs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">Chat</div>
            <h3>Aucun message</h3>
            <p>Soyez le premier à envoyer un message !</p>
          </div>
        ) : (
          <>
            {messagesAvecSeparateurs.map((item) => {
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

              return (
                <div key={msg.id} className={`message-wrapper ${isMine ? 'own-message' : 'other-message'}`} style={{ position: 'relative' }}>
                  {!isMine && (
                    <div className="avatar" style={{ backgroundColor: getAvatarColor(msg.username) }}>
                      {getInitials(msg.username)}
                    </div>
                  )}

                  <div className="message-content">
                    <div className="message-bubble">
                      {/* BOUTON DE SUPPRESSION */}
                      {canDeleteMessage(msg) && !msg.message?.includes('supprimé') && (
                        <button onClick={() => supprimerMessage(msg.id)} className="delete-message-btn" title="Supprimer">
                          Trash
                        </button>
                      )}

                      {!isMine && (
                        <div className="message-header">
                          <strong className="username">{msg.username}</strong>
                          {msg.type === 'admin' && <span className="admin-badge">Admin</span>}
                        </div>
                      )}

                      {msg.file && (
                        <div className="file-attachment">
                          {msg.file.type === 'image' ? (
                            <div className="image-preview">
                              <img src={msg.file.url} alt="Image" className="uploaded-image" onClick={() => window.open(msg.file.url, '_blank')} />
                              <div className="image-overlay"><span className="view-text">Voir l'image</span></div>
                            </div>
                          ) : (
                            <a href={msg.file.url} target="_blank" rel="noopener noreferrer" className="document-link">
                              <div className="document-preview">
                                <span className="file-icon">{getFileIcon(msg.file.type)}</span>
                                <div className="file-info">
                                  <span className="file-name">{msg.file.name}</span>
                                  <span className="file-size">{formatFileSize(msg.file.size)}</span>
                                </div>
                                <span className="download-icon">Download</span>
                              </div>
                            </a>
                          )}
                        </div>
                      )}

                      {msg.message && (
                        <div className="message-text">
                          {msg.message.split(' ').map((word, i) => 
                            emojis.includes(word) ? <span key={i} className="emoji-in-message">{word}</span> : word + ' '
                          )}
                        </div>
                      )}

                      <div className="message-footer">
                        <span className="message-time" title={formatDateComplete(msg.created_at)}>
                          {formatHeure(msg.created_at)}
                        </span>
                        {msg.isSending && <span className="sending-indicator">Envoi</span>}
                        {msg.hasError && <span className="error-indicator">Échec</span>}
                        {msg.file && <span className="file-indicator">Fichier</span>}
                      </div>
                    </div>
                  </div>

                  {isMine && (
                    <div className="avatar own-avatar" style={{ backgroundColor: getAvatarColor(msg.username) }}>
                      {getInitials(msg.username)}
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
            <span>Fichier sélectionné :</span>
            <button type="button" onClick={removeSelectedFile} className="remove-file-btn">×</button>
          </div>
          <div className="preview-content">
            {filePreview ? (
              <div className="image-preview-small">
                <img src={filePreview} alt="Aperçu" />
                <span>{selectedFile.name}</span>
              </div>
            ) : (
              <div className="document-preview-small">
                <span className="file-icon">{getFileIcon('document')}</span>
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
            <button type="button" onClick={() => fileInputRef.current?.click()} className="attach-file-btn" disabled={isUploading}>
              Attach
            </button>
            <button type="button" onClick={() => setShowEmojis(!showEmojis)} className="emoji-btn">
              Emoji
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} />
          </div>

          <input
            ref={inputRef}
            type="text"
            placeholder="Tapez votre message..."
            value={nouveauMessage}
            onChange={e => setNouveauMessage(e.target.value)}
            className="message-input"
            disabled={!isOnline || isUploading}
          />

          <button type="submit" className="send-button" disabled={(!nouveauMessage.trim() && !selectedFile) || !isOnline || isUploading}>
            {isUploading ? <div className="uploading-indicator"></div> : <>Send Envoyer</>}
          </button>
        </div>

        {showEmojis && (
          <div ref={emojiPickerRef} className="emoji-picker">
            <div className="emoji-picker-header">
              <span>Choisissez un émoji</span>
              <button type="button" onClick={() => setShowEmojis(false)} className="close-emoji-btn">×</button>
            </div>
            <div className="emoji-grid">
              {emojis.map((emoji, i) => (
                <button key={i} type="button" className="emoji-item" onClick={() => addEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="input-footer">
          {!isOnline && <div className="offline-warning">Vous êtes hors ligne</div>}
          {isUploading && <div className="uploading-message">Envoi en cours...</div>}
          <div className="file-info-text">Formats : JPEG, PNG, GIF, WebP, PDF, Word (max 10MB)</div>
        </div>
      </form>

      <style jsx>{`
        .chat-container {
          max-width: 1000px;
          margin: 2rem auto;
          background: white;
          border-radius: 24px;
          box-shadow: 
            0 20px 60px rgba(0,0,0,0.1),
            0 8px 30px rgba(0,0,0,0.05);
          height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          position: relative;
        }

        .chat-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(30,60,114,0.1), transparent);
        }

        /* Header amélioré */
        .chat-header {
          background: linear-gradient(135deg, 
            rgba(30,60,114,0.95) 0%, 
            rgba(42,82,152,0.95) 100%);
          color: white;
          padding: 1.25rem 2rem;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .chat-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 50%);
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

        .chat-icon {
          font-size: 2rem;
          background: rgba(255,255,255,0.15);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }

        .chat-icon:hover {
          transform: scale(1.05);
        }

        .chat-info h1 {
          margin: 0;
          font-size: 1.35rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.9) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .chat-info p {
          margin: 0.25rem 0 0 0;
          opacity: 0.9;
          font-size: 0.85rem;
          font-weight: 400;
        }

        /* Status Indicator amélioré */
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.15);
          padding: 0.6rem 1rem;
          border-radius: 16px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.2);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .status-indicator:hover {
          background: rgba(255,255,255,0.2);
          transform: translateY(-1px);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: relative;
        }

        .status-dot.online {
          background: #10b981;
          box-shadow: 
            0 0 0 2px rgba(16,185,129,0.2),
            0 0 20px rgba(16,185,129,0.4);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .status-dot.offline {
          background: #ef4444;
          box-shadow: 0 0 10px rgba(239,68,68,0.3);
        }

        /* Messages Container amélioré */
        .messages-container {
          flex: 1;
          padding: 1.5rem 2rem;
          overflow-y: auto;
          background: linear-gradient(135deg, 
            #f8fafc 0%,
            #f1f5f9 50%,
            #e2e8f0 100%);
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.05);
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #cbd5e1, #94a3b8);
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #94a3b8, #64748b);
        }

        /* Date Separator amélioré */
        .date-separator {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1.5rem 0;
          gap: 1rem;
        }

        .separator-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(203,213,225,0.8), 
            transparent);
        }

        .separator-text {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.9);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(226,232,240,0.6);
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.3s ease;
        }

        .separator-text:hover {
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        /* Loading et Empty States améliorés */
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
          text-align: center;
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(226,232,240,0.8);
          border-top: 3px solid #1e3c72;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
          position: relative;
        }

        .loading-spinner::after {
          content: '';
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border: 3px solid transparent;
          border-top: 3px solid rgba(30,60,114,0.3);
          border-radius: 50%;
          animation: spin 1.5s linear infinite reverse;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.25rem;
          font-weight: 600;
        }

        /* Message Wrapper amélioré */
        .message-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 0.75rem;
          margin-bottom: 1rem;
          max-width: 80%;
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

        /* Avatar amélioré */
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
          box-shadow: 
            0 4px 12px rgba(0,0,0,0.15),
            0 0 0 2px white;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .avatar::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(255,255,255,0.2) 0%,
            transparent 50%);
        }

        .own-avatar {
          background: linear-gradient(135deg, 
            #1e3c72 0%,
            #2a5298 100%) !important;
        }

        .avatar:hover {
          transform: scale(1.05) rotate(5deg);
        }

        /* Message Bubble amélioré */
        .message-content {
          flex: 1;
          min-width: 0;
          position: relative;
        }

        .message-bubble {
          padding: 0.875rem 1.125rem;
          border-radius: 18px;
          position: relative;
          word-wrap: break-word;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          border: 1px solid transparent;
        }

        .own-message .message-bubble {
          background: linear-gradient(135deg, 
            #1e3c72 0%,
            #2a5298 100%);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 
            0 4px 20px rgba(30,60,114,0.2),
            0 0 0 1px rgba(255,255,255,0.1) inset;
        }

        .other-message .message-bubble {
          background: rgba(255,255,255,0.95);
          color: #333;
          border: 1px solid rgba(226,232,240,0.8);
          border-bottom-left-radius: 4px;
          box-shadow: 
            0 2px 12px rgba(0,0,0,0.08),
            0 0 0 1px rgba(255,255,255,0.5) inset;
        }

        /* Message Header amélioré */
        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.375rem;
        }

        .username {
          font-size: 0.85rem;
          opacity: 0.9;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .admin-badge {
          background: linear-gradient(135deg, 
            #ef4444 0%,
            #dc2626 100%);
          color: white;
          padding: 0.15rem 0.5rem;
          border-radius: 10px;
          font-size: 0.65rem;
          font-weight: 600;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255,255,255,0.2);
        }

        /* Message Text amélioré */
        .message-text {
          line-height: 1.5;
          margin: 0.375rem 0;
          font-size: 0.95rem;
          word-break: break-word;
        }

        .emoji-in-message {
          font-size: 1.1rem;
          display: inline-block;
          margin: 0 1px;
          vertical-align: middle;
          transition: transform 0.2s ease;
        }

        .emoji-in-message:hover {
          transform: scale(1.2);
        }

        /* Message Footer amélioré */
        .message-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.375rem;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }

        .message-bubble:hover .message-footer {
          opacity: 1;
        }

        .message-time {
          font-size: 0.7rem;
          cursor: help;
          font-weight: 500;
        }

        .sending-indicator, .error-indicator, .file-indicator {
          font-size: 0.75rem;
          padding: 0.1rem 0.4rem;
          border-radius: 8px;
          font-weight: 500;
        }

        .sending-indicator {
          background: rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.9);
        }

        .other-message .sending-indicator {
          background: rgba(226,232,240,0.8);
          color: #64748b;
        }

        /* File Attachment amélioré */
        .file-attachment {
          margin-bottom: 0.5rem;
          border-radius: 12px;
          overflow: hidden;
        }

        .image-preview {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          max-width: 280px;
          transition: all 0.4s ease;
          border: 1px solid rgba(226,232,240,0.8);
        }

        .uploaded-image {
          width: 100%;
          max-height: 220px;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }

        .image-preview:hover .uploaded-image {
          transform: scale(1.03);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(30,60,114,0.9) 0%,
            rgba(42,82,152,0.8) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .image-preview:hover .image-overlay {
          opacity: 1;
        }

        .view-text {
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.2);
          border-radius: 20px;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255,255,255,0.3);
        }

        /* Document Preview amélioré */
        .document-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }

        .document-preview {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem;
          background: rgba(248,250,252,0.9);
          border-radius: 12px;
          border: 1px solid rgba(226,232,240,0.8);
          transition: all 0.3s ease;
          max-width: 280px;
          backdrop-filter: blur(5px);
        }

        .document-preview:hover {
          background: white;
          transform: translateY(-2px);
          box-shadow: 
            0 8px 30px rgba(0,0,0,0.12),
            0 0 0 1px rgba(30,60,114,0.1);
          border-color: rgba(30,60,114,0.2);
        }

        .file-icon {
          font-size: 1.25rem;
          color: #64748b;
        }

        .download-icon {
          font-size: 1.1rem;
          color: #64748b;
          opacity: 0.7;
          transition: all 0.3s ease;
        }

        .document-preview:hover .download-icon {
          opacity: 1;
          color: #1e3c72;
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

        /* Delete Button amélioré */
        .delete-message-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          background: linear-gradient(135deg, 
            #ef4444 0%,
            #dc2626 100%);
          color: white;
          border: none;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          cursor: pointer;
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 10;
          box-shadow: 0 2px 8px rgba(239,68,68,0.3);
          border: 1px solid rgba(255,255,255,0.3);
        }

        .delete-message-btn:hover {
          opacity: 1 !important;
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(239,68,68,0.4);
        }

        .message-wrapper:hover .delete-message-btn {
          opacity: 0.8;
        }

        /* File Preview amélioré */
        .file-preview {
          background: linear-gradient(135deg, 
            rgba(248,250,252,0.95) 0%,
            rgba(241,245,249,0.95) 100%);
          border-top: 1px solid rgba(226,232,240,0.8);
          padding: 1rem 2rem;
          backdrop-filter: blur(10px);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .remove-file-btn {
          background: linear-gradient(135deg, 
            #ef4444 0%,
            #dc2626 100%);
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          line-height: 1;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(239,68,68,0.3);
        }

        .remove-file-btn:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 4px 12px rgba(239,68,68,0.4);
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
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .document-preview-small {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        /* Input Container amélioré */
        .input-container {
          position: relative;
          padding: 1.25rem 2rem;
          background: rgba(255,255,255,0.95);
          border-top: 1px solid rgba(226,232,240,0.8);
          backdrop-filter: blur(10px);
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

        .attach-file-btn, .emoji-btn {
          background: rgba(241,245,249,0.8);
          border: none;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          color: #64748b;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(226,232,240,0.8);
        }

        .attach-file-btn:hover:not(:disabled), .emoji-btn:hover:not(:disabled) {
          background: white;
          color: #1e3c72;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(30,60,114,0.1);
          border-color: rgba(30,60,114,0.2);
        }

        .attach-file-btn:disabled, .emoji-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Message Input amélioré */
        .message-input {
          flex: 1;
          padding: 0.875rem 1.25rem;
          border: 2px solid rgba(226,232,240,0.8);
          border-radius: 20px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.9);
          resize: none;
          min-height: 44px;
          max-height: 100px;
          font-family: inherit;
          backdrop-filter: blur(5px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.05) inset;
        }

        .message-input:focus {
          outline: none;
          border-color: #1e3c72;
          box-shadow: 
            0 0 0 4px rgba(30,60,114,0.1),
            0 2px 8px rgba(0,0,0,0.05) inset;
          background: white;
        }

        .message-input:disabled {
          background: rgba(248,250,252,0.8);
          cursor: not-allowed;
        }

        /* Send Button amélioré */
        .send-button {
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, 
            #1e3c72 0%,
            #2a5298 100%);
          color: white;
          border: none;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          white-space: nowrap;
          box-shadow: 
            0 4px 15px rgba(30,60,114,0.3),
            0 0 0 1px rgba(255,255,255,0.1) inset;
          position: relative;
          overflow: hidden;
        }

        .send-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255,255,255,0.2), 
            transparent);
          transition: left 0.5s ease;
        }

        .send-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 
            0 8px 25px rgba(30,60,114,0.4),
            0 0 0 1px rgba(255,255,255,0.1) inset;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none;
        }

        .uploading-indicator {
          width: 18px;
          height: 18px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Emoji Picker amélioré */
        .emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(226,232,240,0.8);
          border-radius: 16px;
          box-shadow: 
            0 20px 60px rgba(0,0,0,0.15),
            0 0 0 1px rgba(0,0,0,0.05);
          max-height: 280px;
          overflow-y: auto;
          z-index: 1000;
          margin-bottom: 0.75rem;
          width: 320px;
          backdrop-filter: blur(20px);
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
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(226,232,240,0.8);
          background: rgba(248,250,252,0.9);
          border-radius: 16px 16px 0 0;
          position: sticky;
          top: 0;
          backdrop-filter: blur(10px);
        }

        .emoji-picker-header span {
          font-weight: 600;
          color: #1e3c72;
          font-size: 0.85rem;
        }

        .close-emoji-btn {
          background: linear-gradient(135deg, 
            #ef4444 0%,
            #dc2626 100%);
          color: white;
          border: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          line-height: 1;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(239,68,68,0.3);
        }

        .close-emoji-btn:hover {
          transform: scale(1.1) rotate(90deg);
          box-shadow: 0 4px 12px rgba(239,68,68,0.4);
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 0.375rem;
          padding: 1rem;
          max-height: 220px;
          overflow-y: auto;
        }

        .emoji-item {
          background: rgba(241,245,249,0.8);
          border: none;
          font-size: 1.35rem;
          cursor: pointer;
          padding: 0.375rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
          border: 1px solid transparent;
        }

        .emoji-item:hover {
          background: white;
          transform: scale(1.15);
          border-color: rgba(30,60,114,0.2);
          box-shadow: 0 4px 12px rgba(30,60,114,0.1);
        }

        .emoji-grid::-webkit-scrollbar {
          width: 6px;
        }

        .emoji-grid::-webkit-scrollbar-track {
          background: rgba(241,245,249,0.8);
          border-radius: 3px;
        }

        .emoji-grid::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #cbd5e1, #94a3b8);
          border-radius: 3px;
        }

        .emoji-grid::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #94a3b8, #64748b);
        }

        /* Input Footer amélioré */
        .input-footer {
          margin-top: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .offline-warning {
          background: linear-gradient(135deg, 
            rgba(254,243,199,0.9) 0%,
            rgba(252,211,77,0.8) 100%);
          color: #92400e;
          padding: 0.625rem 1rem;
          border-radius: 12px;
          font-size: 0.85rem;
          text-align: center;
          border: 1px solid rgba(252,211,77,0.5);
          backdrop-filter: blur(5px);
          animation: pulse 2s infinite;
        }

        .uploading-message {
          color: #f39c12;
          font-size: 0.85rem;
          text-align: center;
          padding: 0.5rem;
          background: rgba(254,249,195,0.9);
          border-radius: 12px;
          border: 1px solid rgba(253,224,71,0.5);
        }

        .file-info-text {
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
          opacity: 0.8;
          transition: opacity 0.3s ease;
        }

        .file-info-text:hover {
          opacity: 1;
        }

        /* Responsive amélioré */
        @media (max-width: 768px) {
          .chat-container {
            margin: 0;
            height: 100vh;
            border-radius: 0;
            border: none;
          }

          .chat-header {
            padding: 1rem 1.25rem;
          }

          .header-content {
            flex-direction: column;
            gap: 0.875rem;
            align-items: flex-start;
          }

          .status-indicator {
            align-self: flex-end;
          }

          .messages-container {
            padding: 1rem 1.25rem;
          }

          .message-wrapper {
            max-width: 90%;
          }

          .date-separator {
            margin: 1rem 0;
          }

          .separator-text {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem;
          }

          .input-container {
            padding: 1rem 1.25rem;
          }

          .input-wrapper {
            flex-direction: column;
            gap: 0.875rem;
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
        }

        @media (max-width: 480px) {
          .chat-icon {
            width: 40px;
            height: 40px;
            font-size: 1.5rem;
          }

          .chat-info h1 {
            font-size: 1.1rem;
          }

          .chat-info p {
            font-size: 0.8rem;
          }

          .avatar {
            width: 32px;
            height: 32px;
            font-size: 0.7rem;
          }

          .message-bubble {
            padding: 0.75rem 1rem;
          }

          .emoji-grid {
            grid-template-columns: repeat(5, 1fr);
          }

          .attach-file-btn, .emoji-btn {
            width: 36px;
            height: 36px;
            font-size: 1.1rem;
          }

          .message-input {
            padding: 0.75rem 1rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Chat;

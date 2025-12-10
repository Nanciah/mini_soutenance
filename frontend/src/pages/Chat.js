import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const socket = io();

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
    '🏝️', '📱', '💻', '🖥️', '⌚', '📷', '📹', '🎥', '📺', '📻',
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

      const response = await fetch(`http://localhost:5000/api/chat/${messageId}`, {
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
        const res = await fetch('http://localhost:5000/api/chat', {
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
      const response = await fetch('http://localhost:5000/api/chat/upload', {
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
      const response = await fetch('http://localhost:5000/api/chat/with-file', {
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

      .message-bubble {
  position: relative; /* Nécessaire pour positionner le bouton à l'intérieur */
}

.delete-message-btn {
  position: absolute;
  top: -5px; /* Ajuster la position */
  right: -5px; /* Ajuster la position */
  background: #ef4444; /* Rouge pour danger */
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
  z-index: 10;
}

.delete-message-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.deleted-message .message-bubble {
  background: #f1f5f9 !important; /* Arrière-plan gris clair */
  color: #94a3b8 !important; /* Texte gris */
  font-style: italic;
  box-shadow: none;
  border: 1px solid #e2e8f0;
}

/* Masquer le contenu non pertinent pour les messages supprimés */
.deleted-message .message-text, 
.deleted-message .message-footer {
  color: #94a3b8 !important;
}
.deleted-message .file-attachment,
.deleted-message .message-header {
  display: none;
}
        .chat-container {
          max-width: 1000px;
          margin: 2rem auto;
          background: white;
          border-radius: 24px;
          box-shadow: 0 25px 70px rgba(0,0,0,0.15);
          height: 85vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .chat-header {
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          color: white;
          padding: 1.5rem 2rem;
          position: relative;
          overflow: hidden;
        }

        .chat-header::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 150px;
          height: 150px;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1));
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

        .chat-icon {
          font-size: 2.5rem;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
        }

        .chat-info h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .chat-info p {
          margin: 0.25rem 0 0 0;
          opacity: 0.9;
          font-size: 0.95rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255,255,255,0.2);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.3);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
        }

        .status-dot.online {
          background: #48c78e;
          box-shadow: 0 0 10px rgba(72,199,142,0.5);
        }

        .status-dot.offline {
          background: #e74c3c;
        }

        .messages-container {
          flex: 1;
          padding: 1rem 2rem;
          overflow-y: auto;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          display: flex;
          flex-direction: column;
        }

        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

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
          background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
        }

        .separator-text {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
          padding: 0.5rem 1rem;
          background: rgba(255,255,255,0.8);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #64748b;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #1e3c72;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
        }

        .message-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 0.75rem;
          margin-bottom: 1rem;
          max-width: 80%;
        }

        .own-message {
          margin-left: auto;
          flex-direction: row-reverse;
        }

        .other-message {
          margin-right: auto;
        }

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
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .own-avatar {
          background: linear-gradient(135deg, #1e3c72, #2a5298) !important;
        }

        .message-content {
          flex: 1;
          min-width: 0;
        }

        .message-bubble {
          padding: 1rem 1.25rem;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          position: relative;
          word-wrap: break-word;
        }

        .own-message .message-bubble {
          background: linear-gradient(135deg, #1e3c72, #2a5298);
          color: white;
          border-bottom-right-radius: 6px;
        }

        .other-message .message-bubble {
          background: white;
          color: #333;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 6px;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .username {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .admin-badge {
          background: #e74c3c;
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .message-text {
          line-height: 1.5;
          margin: 0.5rem 0;
          font-size: 1rem;
        }

        .emoji-in-message {
          font-size: 1.2rem;
          display: inline-block;
          margin: 0 2px;
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
          cursor: help;
        }

        .sending-indicator, .error-indicator, .file-indicator {
          font-size: 0.8rem;
        }

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
          max-height: 200px;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .image-preview:hover .uploaded-image {
          transform: scale(1.05);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
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
        }

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
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .file-icon {
          font-size: 1.5rem;
        }

        .download-icon {
          font-size: 1.2rem;
          opacity: 0.7;
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
        }

        .file-size {
          display: block;
          font-size: 0.8rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        .file-preview {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 1rem 2rem;
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
        }

        .remove-file-btn:hover {
          background: #dc2626;
          transform: scale(1.1);
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
          border: 2px solid #e2e8f0;
        }

        .document-preview-small {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }

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

        .attach-file-btn, .emoji-btn {
          background: transparent;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 50%;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .attach-file-btn:hover:not(:disabled), .emoji-btn:hover:not(:disabled) {
          background: #f1f5f9;
          transform: scale(1.1);
        }

        .attach-file-btn:disabled, .emoji-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message-input {
          flex: 1;
          padding: 1rem 1.5rem;
          border: 2px solid #e2e8f0;
          border-radius: 25px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: white;
          resize: none;
          min-height: 50px;
          max-height: 120px;
        }

        .message-input:focus {
          outline: none;
          border-color: #1e3c72;
          box-shadow: 0 0 0 4px rgba(30,60,114,0.1);
        }

        .message-input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
        }

        .send-button {
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #1e3c72, #2a5298);
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
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(30,60,114,0.4);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .send-icon {
          font-size: 1.1rem;
        }

        .uploading-indicator {
          width: 20px;
          height: 20px;
          border: 2px solid transparent;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .emoji-picker {
          position: absolute;
          bottom: 100%;
          left: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          max-height: 300px;
          overflow-y: auto;
          z-index: 1000;
          margin-bottom: 1rem;
          width: 350px;
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

        .emoji-picker-header span {
          font-weight: 600;
          color: #1e3c72;
          font-size: 0.9rem;
        }

        .close-emoji-btn {
          background: #ef4444;
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
        }

        .close-emoji-btn:hover {
          background: #dc2626;
          transform: scale(1.1);
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
          background: #1e3c72;
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

        .input-footer {
          margin-top: 0.75rem;
        }

        .offline-warning {
          background: #fef3c7;
          color: #92400e;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          text-align: center;
          border: 1px solid #fcd34d;
        }

        .uploading-message {
          color: #f39c12;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
          text-align: center;
        }

        .file-info-text {
          font-size: 0.8rem;
          color: #94a3b8;
          text-align: center;
        }

        @media (max-width: 768px) {
          .chat-container {
            margin: 0;
            height: 100vh;
            border-radius: 0;
          }

          .chat-header {
            padding: 1rem 1.5rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .messages-container {
            padding: 0.5rem 1rem;
          }

          .message-wrapper {
            max-width: 90%;
          }

          .date-separator {
            margin: 1rem 0;
          }

          .separator-text {
            font-size: 0.7rem;
            padding: 0.4rem 0.8rem;
          }

          .input-container {
            padding: 1rem 1.5rem;
          }

          .input-wrapper {
            flex-direction: column;
            gap: 1rem;
          }

          .send-button {
            align-self: flex-end;
          }

          

          .emoji-picker {
            left: 1rem;
            right: 1rem;
            width: auto;
          }

          .emoji-grid {
            grid-template-columns: repeat(6, 1fr);
          }

          
        }
      `}</style>
    </div>
  );
};

export default Chat;
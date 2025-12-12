// backend/server.js – VERSION COMPLÈTE AVEC CHAT AMÉLIORÉ
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// ==================== CONFIG ====================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Username", "X-Type"],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Configuration Multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, 'file-' + uniqueSuffix + '-' + safeName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

// ==================== AUTH MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  jwt.verify(token, 'sisco_super_secret_2024', (err, user) => {
    if (err) {
      console.error('Erreur de vérification JWT:', err.message);
      return res.status(403).json({ error: 'Token invalide ou expiré' });
    }
    
    req.user = user;
    console.log('Utilisateur authentifié:', { 
      id: user.id, 
      type: user.type, 
      login: user.login 
    });
    next();
  });
};

// ==================== STOCKAGE TEMPORAIRE ====================
let inscriptions = [];        // Toutes les inscriptions
let messagesChat = [];        // Tous les messages du chat
let connectedUsers = new Map(); // Utilisateurs connectés au chat

// ==================== ROUTES ====================

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ 
    message: "Backend SISCO en ligne !", 
    date: new Date().toISOString(),
    chatMessages: messagesChat.length,
    inscriptions: inscriptions.length,
    connectedUsers: connectedUsers.size
  });
});

// Login admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign(
      { 
        id: 1, 
        username: 'admin', 
        type: 'admin',
        nom: 'Administrateur'
      }, 
      'sisco_super_secret_2024', 
      { expiresIn: '24h' }
    );
    
    return res.json({ 
      success: true,
      token, 
      user: { 
        id: 1, 
        username: 'admin', 
        type: 'admin',
        nom: 'Administrateur'
      } 
    });
  }
  
  res.status(401).json({ 
    success: false,
    error: 'Identifiants administrateur incorrects' 
  });
});

// Login établissement
app.post('/api/etablissements/login', (req, res) => {
  const { login, password } = req.body;
  
  if (login && password === 'sisco2024') {
    const token = jwt.sign(
      { 
        id: login.includes('etab_') ? parseInt(login.split('_')[1]) || 999 : 999,
        login: login,
        type: 'etablissement',
        nom: `Établissement ${login}`
      }, 
      'sisco_super_secret_2024', 
      { expiresIn: '24h' }
    );
    
    return res.json({
      success: true,
      token,
      user: { 
        id: login.includes('etab_') ? parseInt(login.split('_')[1]) || 999 : 999,
        login: login,
        nom: `Établissement ${login}`,
        type: 'etablissement'
      }
    });
  }
  
  res.status(401).json({ 
    success: false,
    error: 'Identifiants établissement incorrects' 
  });
});

// Créer un nouvel établissement (admin seulement)
app.post('/api/etablissements', authenticateToken, (req, res) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  
  const { code, nom } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code d\'établissement requis' });
  }
  
  const login = `etab_${code}`;
  const password = 'sisco2024';
  
  res.json({ 
    success: true,
    message: 'Établissement créé avec succès',
    credentials: { login, password }
  });
});

// ==================== INSCRIPTIONS ====================

// Inscrire des élèves
app.post('/api/inscriptions', upload.array('files'), (req, res) => {
  try {
    const { examen_id, eleves } = req.body;
    
    if (!eleves || !Array.isArray(eleves) || eleves.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Aucun élève envoyé' 
      });
    }
    
    const newInscriptions = eleves.map(eleve => {
      const examen_nom = 
        examen_id == 1 ? "CEPE 2025" :
        examen_id == 2 ? "BEPC 2025" : "BAC 2025";
      
      return {
        id: Date.now() + Math.floor(Math.random() * 10000),
        eleve_nom: eleve.nom || '',
        eleve_prenom: eleve.prenom || '',
        date_naissance: eleve.date_naissance || '',
        examen_id: parseInt(examen_id) || 1,
        examen_nom: examen_nom,
        etablissement_nom: req.body.etablissement_nom || "Établissement Test",
        statut: "en_attente",
        salle_examen: "",
        centre_examen: "",
        date_inscription: new Date().toISOString(),
        files: req.files ? req.files.map(f => f.filename) : []
      };
    });
    
    inscriptions.push(...newInscriptions);
    
    res.json({ 
      success: true, 
      message: `${eleves.length} élève(s) inscrit(s) avec succès !`,
      count: newInscriptions.length
    });
    
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'inscription' 
    });
  }
});

// ADMIN – Liste des inscriptions
app.get('/api/admin/inscriptions', authenticateToken, (req, res) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  
  res.json({ 
    success: true,
    data: inscriptions,
    count: inscriptions.length
  });
});

// Établissement – Liste des inscriptions
app.get('/api/etablissement/inscriptions', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: inscriptions.filter(ins => 
      ins.etablissement_nom.includes(req.user.login) || 
      ins.etablissement_nom.includes('Test')
    ),
    count: inscriptions.length
  });
});

// Stats admin
app.get('/api/admin/stats', authenticateToken, (req, res) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  
  const total = inscriptions.length;
  const en_attente = inscriptions.filter(i => i.statut === 'en_attente').length;
  const accepte = inscriptions.filter(i => i.statut === 'accepte').length;
  const refuse = inscriptions.filter(i => i.statut === 'refuse').length;
  
  res.json({
    success: true,
    inscriptions: { total, en_attente, accepte, refuse },
    chat: {
      totalMessages: messagesChat.length,
      withFiles: messagesChat.filter(m => m.file).length
    }
  });
});

// Liste des examens
app.get('/api/examens', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, nom: "CEPE 2025", date_examen: "2025-06-05", actif: 1 },
      { id: 2, nom: "BEPC 2025", date_examen: "2025-06-15", actif: 1 },
      { id: 3, nom: "BAC 2025",  date_examen: "2025-06-25", actif: 1 }
    ]
  });
});

// ==================== CHAT EN TEMPS RÉEL ====================

// Obtenir l'historique des messages
app.get('/api/chat', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: messagesChat,
    count: messagesChat.length,
    user: {
      id: req.user.id,
      type: req.user.type,
      name: req.user.nom || req.user.username || req.user.login
    }
  });
});

// Upload de fichier
app.post('/api/chat/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'Aucun fichier téléchargé' 
      });
    }
    
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype.startsWith('image/') ? 'image' : 'document',
      fileSize: req.file.size,
      mimetype: req.file.mimetype
    });
    
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du téléchargement du fichier' 
    });
  }
});

// Envoyer un message (avec ou sans fichier)
app.post('/api/chat/with-file', authenticateToken, (req, res) => {
  try {
    const { message, file } = req.body;
    
    if (!message && !file) {
      return res.status(400).json({ 
        success: false,
        error: 'Message ou fichier requis' 
      });
    }
    
    const username = req.user.type === 'admin' 
      ? 'Administrateur' 
      : (req.user.nom || req.user.login || 'Établissement');
    
    const newMsg = {
      id: Date.now(),
      userId: req.user.id,
      username: username,
      message: message || '',
      type: req.user.type,
      file: file || null,
      created_at: new Date().toISOString(),
      user: {
        id: req.user.id,
        type: req.user.type,
        name: username
      }
    };
    
    messagesChat.push(newMsg);
    
    // Notifier tous les clients via Socket.IO
    io.emit('nouveau-message', newMsg);
    
    res.json({
      success: true,
      message: 'Message envoyé avec succès',
      data: newMsg
    });
    
  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'envoi du message' 
    });
  }
});

// Supprimer un message
app.delete('/api/chat/:id', authenticateToken, (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    const messageIndex = messagesChat.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Message non trouvé' 
      });
    }
    
    const message = messagesChat[messageIndex];
    
    // Vérifier les permissions
    const canDelete = req.user.type === 'admin' || req.user.id === message.userId;
    
    if (!canDelete) {
      return res.status(403).json({ 
        success: false,
        error: 'Vous n\'êtes pas autorisé à supprimer ce message' 
      });
    }
    
    // Marquer comme supprimé (soft delete)
    const deletedMessage = {
      ...message,
      message: '[Message supprimé]',
      file: null,
      isDeleted: true,
      deletedBy: req.user.id,
      deletedAt: new Date().toISOString()
    };
    
    messagesChat[messageIndex] = deletedMessage;
    
    // Notifier tous les clients
    io.emit('message-supprime', deletedMessage);
    
    res.json({
      success: true,
      message: 'Message supprimé avec succès',
      data: deletedMessage
    });
    
  } catch (error) {
    console.error('Erreur suppression:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la suppression du message' 
    });
  }
});

// ADMIN – Accepter ou refuser une inscription
app.put('/api/admin/inscriptions/:id', authenticateToken, (req, res) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  
  const id = parseInt(req.params.id);
  const { statut, salle_examen, centre_examen } = req.body;
  
  const inscription = inscriptions.find(i => i.id === id);
  if (!inscription) {
    return res.status(404).json({ error: 'Inscription non trouvée' });
  }
  
  if (statut) inscription.statut = statut;
  if (salle_examen !== undefined) inscription.salle_examen = salle_examen;
  if (centre_examen !== undefined) inscription.centre_examen = centre_examen;
  
  res.json({ 
    success: true,
    message: 'Inscription mise à jour avec succès',
    data: inscription
  });
});

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log('Nouvelle connexion Socket.IO:', socket.id);
  
  // Envoyer le nombre d'utilisateurs connectés
  const updateOnlineUsers = () => {
    const onlineCount = Array.from(connectedUsers.values()).length;
    io.emit('online-users', onlineCount);
    console.log(`Utilisateurs en ligne: ${onlineCount}`);
  };
  
  // Rejoindre le chat
  socket.on('join-chat', (userData) => {
    console.log('Join chat:', userData);
    
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId: userData.userId,
      username: userData.username,
      type: userData.type,
      joinedAt: new Date().toISOString()
    });
    
    // Notifier les autres utilisateurs
    socket.broadcast.emit('user-connected', {
      userId: userData.userId,
      username: userData.username
    });
    
    updateOnlineUsers();
  });
  
  // Indicateur de saisie
  socket.on('typing', (data) => {
    socket.broadcast.emit('user-typing', {
      ...data,
      timestamp: new Date().toISOString()
    });
  });
  
  // Arrêt de saisie
  socket.on('stop-typing', (data) => {
    socket.broadcast.emit('user-stopped-typing', data);
  });
  
  // Déconnexion
  socket.on('disconnect', () => {
    console.log('Déconnexion Socket.IO:', socket.id);
    
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user-disconnected', {
        userId: user.userId,
        username: user.username
      });
    }
    
    connectedUsers.delete(socket.id);
    updateOnlineUsers();
  });
  
  // Gestion des erreurs
  socket.on('error', (error) => {
    console.error('Erreur Socket.IO:', error);
  });
});

// ==================== GESTION DES ERREURS ====================

// Middleware pour erreurs Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Fichier trop volumineux (max 10MB)'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Erreur Multer: ${error.message}`
    });
  } else if (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur serveur'
    });
  }
  next();
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  });
});

// ==================== DÉMARRAGE ====================
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
  ================================================
  🚀 SERVEUR SISCO EN LIGNE
  ================================================
  🔗 URL: https://mini-soutenance.onrender.com
  📡 Port: ${PORT}
  🗄️  Host: ${HOST}
  💾 Messages en mémoire: ${messagesChat.length}
  📝 Inscriptions: ${inscriptions.length}
  ================================================
  📋 Test: https://mini-soutenance.onrender.com/api/test
  💬 Chat: https://mini-soutenance.onrender.com/api/chat
  📊 Stats: https://mini-soutenance.onrender.com/api/admin/stats
  ================================================
  `);
});

module.exports = app;

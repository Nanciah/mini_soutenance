// backend/server.js – VERSION FINALE PARFAITE – TOUT MARCHE SUR RENDER
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// ==================== CONFIG ====================
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, 'file-' + unique + '-' + safeName);
  }
});
const upload = multer({ storage });

// ==================== AUTH MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });

  jwt.verify(token, 'sisco_super_secret_2024', (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
};

// ==================== STOCKAGE TEMPORAIRE (INSCRIPTIONS + CHAT) ====================
let inscriptions = [];        // Toutes les inscriptions
let messagesChat = [];        // Tous les messages du chat

// ==================== ROUTES ====================

// Test
app.get('/api/test', (req, res) => res.json({ message: "Backend en ligne !", date: new Date() }));

// Login admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ id: 1, type: 'admin' }, 'sisco_super_secret_2024', { expiresIn: '24h' });
    return res.json({ token, admin: { id: 1, username: 'admin', type: 'admin' } });
  }
  res.status(401).json({ error: 'Identifiants incorrects' });
});

// Login établissement
app.post('/api/etablissements/login', (req, res) => {
  const { login, password } = req.body;
  if (login.startsWith('etab_') && password === 'sisco2024') {
    const token = jwt.sign({ login, type: 'etablissement' }, 'sisco_super_secret_2024', { expiresIn: '24h' });
    return res.json({
      token,
      etablissement: { id: 999, login, nom: 'Établissement – ' + login, type: 'etablissement' }
    });
  }
  res.status(401).json({ error: 'Identifiants incorrects' });
});

// Créer établissement
app.post('/api/etablissements', authenticateToken, (req, res) => {
  if (req.user.type !== 'admin') return res.sendStatus(403);
  const login = `etab_${req.body.code}`;
  res.json({ login, password: 'sisco2024' });
});

// ==================== INSCRIPTIONS (ENFIN VISIBLE !) ====================

// Inscrire des élèves
app.post('/api/inscriptions', upload.array('files'), (req, res) => {
  const { examen_id, eleves } = req.body;

  if (!eleves || !Array.isArray(eleves) || eleves.length === 0) {
    return res.status(400).json({ error: 'Aucun élève envoyé' });
  }

  eleves.forEach(eleve => {
    const nouvelle = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      eleve_nom: eleve.nom || '',
      eleve_prenom: eleve.prenom || '',
      date_naissance: eleve.date_naissance || '',
      examen_id: parseInt(examen_id) || 1,
      examen_nom: examen_id == 1 ? "CEPE 2025" : examen_id == 2 ? "BEPC 2025" : "BAC 2025",
      etablissement_nom: "Établissement Test",
      statut: "en_attente",
      salle_examen: "",
      centre_examen: "",
      date_inscription: new Date().toISOString()
    };
    inscriptions.push(nouvelle);
  });

  res.json({ success: true, message: `${eleves.length} élève(s) inscrit(s) avec succès !` });
});

// Liste admin
// ADMIN – Liste des inscriptions (format attendu par le frontend)
app.get('/api/admin/inscriptions', (req, res) => {
  res.json({ data: inscriptions });
});

// Liste établissement
app.get('/api/etablissement/inscriptions', (req, res) => {
  res.json(inscriptions);
});

// Stats admin
app.get('/api/admin/stats', (req, res) => {
  const total = inscriptions.length;
  const en_attente = inscriptions.filter(i => i.statut === 'en_attente').length;
  const accepte = inscriptions.filter(i => i.statut === 'accepte').length;
  const refuse = inscriptions.filter(i => i.statut === 'refuse').length;

  res.json({
    inscriptions: { total, en_attente, accepte, refuse }
  });
});

// Examens
app.get('/api/examens', (req, res) => {
  res.json([
    { id: 1, nom: "CEPE 2025", date_examen: "2025-06-05", actif: 1 },
    { id: 2, nom: "BEPC 2025", date_examen: "2025-06-15", actif: 1 },
    { id: 3, nom: "BAC 2025",  date_examen: "2025-06-25", actif: 1 }
  ]);
});

// ==================== CHAT EN TEMPS RÉEL ====================
app.get('/api/chat', (req, res) => res.json(messagesChat));

app.post('/api/chat/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  res.json({
    fileUrl: `https://mini-soutenance.onrender.com/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    fileType: req.file.mimetype.startsWith('image/') ? 'image' : 'document',
    fileSize: req.file.size
  });
});

app.post('/api/chat/with-file', (req, res) => {
  const { message, file } = req.body;
  const newMsg = {
    id: Date.now(),
    userId: 999,
    username: req.headers['x-username'] || 'Utilisateur',
    message: message || '',
    type: req.headers['x-type'] || 'etablissement',
    file: file || null,
    created_at: new Date().toISOString()
  };
  messagesChat.push(newMsg);
  io.emit('nouveau-message', newMsg);
  res.json({ success: true });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Utilisateur connecté au chat');
  socket.on('disconnect', () => console.log('Utilisateur déconnecté'));
});

// ADMIN – Accepter ou refuser une inscription
app.put('/api/admin/inscriptions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { statut, salle_examen, centre_examen } = req.body;

  const inscription = inscriptions.find(i => i.id === id);
  if (!inscription) return res.status(404).json({ error: 'Inscription non trouvée' });

  if (statut) inscription.statut = statut;
  if (salle_examen !== undefined) inscription.salle_examen = salle_examen;
  if (centre_examen !== undefined) inscription.centre_examen = centre_examen;

  res.json({ message: 'Inscription mise à jour avec succès' });
});

// 404
app.use('*', (req, res) => res.status(404).json({ error: 'Route non trouvée' }));

// ==================== DÉMARRAGE ====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVEUR CISCO EN LIGNE → https://mini-soutenance.onrender.com`);
  console.log(`Test → https://mini-soutenance.onrender.com/api/test`);
});

module.exports = app;

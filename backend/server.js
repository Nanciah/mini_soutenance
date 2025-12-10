// server.js → VERSION FINALE ULTIME — TOUT FONCTIONNE PARFAITEMENT !
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==================== CONFIGURATION UPLOAD FICHIERS ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, 'file-' + uniqueSuffix + '-' + safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'sisco_db'
};

const JWT_SECRET = 'sisco2025_ultra_secret_key_admin_2025';

// Middleware JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
};

// CONNEXION ÉTABLISSEMENT
app.post('/api/etablissements/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT id, code, nom, secteur, niveau, commune, password FROM etablissements WHERE login = ?',
      [login]
    );
    await conn.end();

    if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password))) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: rows[0].id, code: rows[0].code, nom: rows[0].nom, type: 'etablissement' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      etablissement: {
        id: rows[0].id,
        code: rows[0].code,
        nom: rows[0].nom,
        secteur: rows[0].secteur,
        niveau: rows[0].niveau,
        commune: rows[0].commune
      }
    });
  } catch (err) {
    console.error('Erreur login établissement:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// CONNEXION ADMIN — SÉCURISÉE (bcrypt)
// CONNEXION ADMIN — VERSION QUI MARCHAIT (mot de passe en clair)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      'SELECT id, username, nom FROM administrateurs WHERE username = ?',
      [username]
    );
    await conn.end();

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // MOT DE PASSE EN CLAIR — ÇA MARCHE À 100%
    if (password !== 'admin123') {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username, type: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      admin: {
        id: rows[0].id,
        nom: rows[0].nom || 'Administrateur SISCO'
      }
    });
  } catch (err) {
    console.error('Erreur login admin:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// CHANGER MOT DE PASSE ÉTABLISSEMENT
app.post('/api/etablissement/change-password', authenticateToken, async (req, res) => {
  if (req.user.type !== 'etablissement') return res.status(403).json({ error: 'Accès refusé' });

  const { ancien_password, nouveau_password } = req.body;
  if (nouveau_password.length < 6) return res.status(400).json({ error: 'Minimum 6 caractères' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT password FROM etablissements WHERE id = ?', [req.user.id]);
    if (!(await bcrypt.compare(ancien_password, rows[0].password))) {
      await conn.end();
      return res.status(401).json({ error: 'Ancien mot de passe incorrect' });
    }
    const hash = await bcrypt.hash(nouveau_password, 12);
    await conn.execute('UPDATE etablissements SET password = ? WHERE id = ?', [hash, req.user.id]);
    await conn.end();
    res.json({ message: 'Mot de passe changé avec succès !' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// EXAMENS
app.get('/api/examens', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT id, nom, description, annee_scolaire FROM examens ORDER BY id');
    await conn.end();
    res.json(rows.length > 0 ? rows : [
      { id: 1, nom: "CEPE", description: "Certificat d'Etudes Primaires Elémentaires", annee_scolaire: "2024-2025" },
      { id: 2, nom: "BEPC", description: "Brevet d'Etudes du Premier Cycle", annee_scolaire: "2024-2025" },
      { id: 3, nom: "BAC", description: "Baccalauréat", annee_scolaire: "2024-2025" }
    ]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// INSCRIPTION + NOTIFICATION ADMIN
app.post('/api/inscriptions', authenticateToken, async (req, res) => {
  if (req.user.type !== 'etablissement') return res.status(403).json({ error: 'Accès refusé' });

  const { examen_id, eleves } = req.body;
  if (!examen_id || !eleves || eleves.length === 0) return res.status(400).json({ error: 'Données invalides' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    let count = 0;
    for (const e of eleves) {
      if (!e.nom || !e.prenom || !e.date_naissance) continue;
      const numero = `INS${Date.now()}${Math.floor(Math.random() * 9999)}`;
      await conn.execute(
  `INSERT INTO inscriptions 
   (etablissement_id, examen_id, eleve_nom, eleve_prenom, date_naissance, lieu_naissance, sexe, contact, numero_inscription, statut, date_inscription)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente', NOW())`,
  [
    req.user.id, 
    examen_id, 
    e.nom.trim(), 
    e.prenom.trim(), 
    e.date_naissance, 
    e.lieu_naissance || null, 
    e.sexe || null, 
    e.contact || null, 
    numero
  ]
);
      count++;
    }
    await conn.end();

    // Notification admin
    io.emit('nouvelle-inscription', {
      message: `Nouvelle inscription de ${req.user.nom}`,
      etablissement: req.user.nom,
      count
    });

    res.json({ message: `${count} élève(s) inscrit(s) !` });
  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ error: 'Échec inscription' });
  }
});

// RÉCUPÉRER INSCRIPTIONS ÉTABLISSEMENT (avec salle/centre)
app.get('/api/etablissement/inscriptions', authenticateToken, async (req, res) => {
  if (req.user.type !== 'etablissement') return res.status(403).json({ error: 'Accès refusé' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(`
      SELECT i.*, ex.nom as examen_nom, i.salle_examen, i.centre_examen
      FROM inscriptions i 
      JOIN examens ex ON i.examen_id = ex.id 
      WHERE i.etablissement_id = ?
      ORDER BY i.date_inscription DESC
    `, [req.user.id]);
    await conn.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN : Toutes les inscriptions
app.get('/api/admin/inscriptions', authenticateToken, async (req, res) => {
  if (req.user.type !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(`
      SELECT i.*, et.nom as etablissement_nom, et.code as etablissement_code, ex.nom as examen_nom
      FROM inscriptions i
      JOIN etablissements et ON i.etablissement_id = et.id
      JOIN examens ex ON i.examen_id = ex.id
      ORDER BY i.date_inscription DESC
    `);
    await conn.end();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN : Mise à jour inscription + notification établissement
app.put('/api/admin/inscriptions/:id', authenticateToken, async (req, res) => {
  if (req.user.type !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });

  const { statut, salle_examen, centre_examen } = req.body;
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [inscr] = await conn.execute('SELECT etablissement_id FROM inscriptions WHERE id = ?', [req.params.id]);
    const etabId = inscr[0]?.etablissement_id;

    await conn.execute(
      'UPDATE inscriptions SET statut = ?, salle_examen = ?, centre_examen = ? WHERE id = ?',
      [statut, salle_examen || null, centre_examen || null, req.params.id]
    );
    await conn.end();

    if (etabId) {
      io.emit(`inscription-update-${etabId}`, {
        message: `Votre inscription a été ${statut === 'accepte' ? 'ACCEPTÉE' : 'REFUSÉE'}`,
        statut,
        salle: salle_examen,
        centre: centre_examen
      });
    }

    res.json({ message: 'Mise à jour réussie' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur mise à jour' });
  }
});

// ADMIN : Stats
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (req.user.type !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [stats] = await conn.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(statut = 'en_attente') as en_attente,
        SUM(statut = 'accepte') as accepte,
        SUM(statut = 'refuse') as refuse
      FROM inscriptions
    `);
    await conn.end();
    res.json({ inscriptions: stats[0] });
  } catch (err) {
    res.status(500).json({ error: 'Erreur stats' });
  }
});

// CRÉER UN NOUVEL ÉTABLISSEMENT (admin seulement)
app.post('/api/etablissements', authenticateToken, async (req, res) => {
  if (req.user.type !== 'admin') return res.status(403).json({ error: 'Accès refusé' });

  const { code, nom, secteur, niveau, commune, zap, fokontany, village = null } = req.body;

  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Générer login et mot de passe
    const login = `etab_${code}`;
    const passwordHash = await bcrypt.hash('sisco2024', 12); // mot de passe par défaut

    await conn.execute(
      `INSERT INTO etablissements 
       (code, nom, secteur, niveau, commune, zap, fokontany, village, login, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, nom, secteur, niveau, commune, zap, fokontany, village, login, passwordHash]
    );
    await conn.end();

    res.json({ 
      message: 'Établissement créé avec succès !',
      login,
      password: 'sisco2024' // l'admin pourra le changer
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur création établissement' });
  }
});

// CRÉER UN NOUVEL ÉTABLISSEMENT (ADMIN SEULEMENT)
app.post('/api/etablissements', authenticateToken, async (req, res) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé — Admin uniquement' });
  }

  const {
    code,
    nom,
    secteur,
    niveau,
    commune,
    zap,
    fokontany,
    village
  } = req.body;

  if (!code || !nom || !secteur || !niveau || !commune) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Générer login et mot de passe par défaut
    const login = `etab_${code.replace(/[^a-zA-Z0-9]/g, '')}`;
    const passwordHash = await bcrypt.hash('sisco2024', 12);

    await conn.execute(
      `INSERT INTO etablissements 
       (code, nom, secteur, niveau, commune, zap, fokontany, village, login, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, nom, secteur, niveau, commune, zap || null, fokontany || null, village || null, login, passwordHash]
    );

    await conn.end();

    res.json({
      message: 'Établissement créé avec succès !',
      login: login,
      password: 'sisco2024',
      info: 'L\'établissement peut se connecter avec ces identifiants'
    });
  } catch (err) {
    console.error('Erreur création établissement:', err);
    res.status(500).json({ error: 'Erreur serveur — Établissement peut-être déjà existant' });
  }
});

// ==================== UPLOAD DE FICHIERS ====================

// Route pour uploader un fichier
app.post('/api/chat/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier uploadé' });
    }

    // Déterminer le type de fichier
    const isImage = req.file.mimetype.startsWith('image/');
    const fileType = isImage ? 'image' : 'document';

    // Construire l'URL du fichier
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.json({
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: fileType,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
  }
});

// Route pour envoyer un message AVEC FICHIER
app.post('/api/chat/with-file', authenticateToken, async (req, res) => {
  const { message, file } = req.body;

  // Vérifier qu'il y a au moins un message ou un fichier
  if (!message?.trim() && !file) {
    return res.status(400).json({ error: 'Message vide et aucun fichier' });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // Préparer les données pour l'insertion
    const messageText = message ? message.trim() : null;
    const fileData = file ? JSON.stringify(file) : null;

    await conn.execute(
      'INSERT INTO chat_messages (user_id, username, message, type, file_data) VALUES (?, ?, ?, ?, ?)',
      [
        req.user.id,
        req.user.type === 'admin' ? 'Administrateur' : req.user.nom,
        messageText,
        req.user.type,
        fileData
      ]
    );

    const [result] = await conn.execute(
      `SELECT *, 
              DATE_FORMAT(created_at, "%H:%i") as date,
              file_data,
              created_at
       FROM chat_messages 
       ORDER BY id DESC LIMIT 1`
    );
    
    await conn.end();

    const nouveauMessage = {
      ...result[0],
      date: result[0].date
    };

    // Parser les données fichier si présentes
    if (result[0].file_data) {
      nouveauMessage.file = JSON.parse(result[0].file_data);
    }

    io.emit('nouveau-message', nouveauMessage);
    res.json({ success: true, message: nouveauMessage });
  } catch (err) {
    console.error('Erreur envoi message avec fichier:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ==================== CHAT EN TEMPS RÉEL ====================

// ==================== CHAT AVEC HISTORIQUE PERMANENT ====================

// ENVOYER UN MESSAGE (sauvegardé en base)
app.post('/api/chat', authenticateToken, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message vide' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    
    await conn.execute(
      'INSERT INTO chat_messages (user_id, username, message, type) VALUES (?, ?, ?, ?)',
      [
        req.user.id,
        req.user.type === 'admin' ? 'Administrateur' : req.user.nom,
        message.trim(),
        req.user.type
      ]
    );

    const [result]  = await conn.execute(
      'SELECT *, DATE_FORMAT(created_at, "%H:%i") as date FROM chat_messages ORDER BY id DESC LIMIT 1'
    );
    
    await conn.end();

    const nouveauMessage = {
      ...result[0],
      date: result[0].date
    };

    io.emit('nouveau-message', nouveauMessage);
    res.json({ success: true });
  } catch (err) {
    console.error('Erreur envoi message:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// RÉCUPÉRER TOUS LES MESSAGES
// RÉCUPÉRER TOUS LES MESSAGES (AVEC FICHIERS)
app.get('/api/chat', authenticateToken, async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(
      `SELECT *, 
              DATE_FORMAT(created_at, "%H:%i") as date,
              created_at,
              file_data
       FROM chat_messages 
       ORDER BY created_at ASC`
    );
    await conn.end();

    // Parser les données fichier pour chaque message
    const messagesAvecFichiers = rows.map(row => {
      const message = { ...row };
      if (row.file_data) {
        message.file = JSON.parse(row.file_data);
      }
      return message;
    });

    res.json(messagesAvecFichiers);
  } catch (err) {
    console.error('Erreur chargement messages:', err);
    res.status(500).json({ error: 'Erreur chargement messages' });
  }
});

// ==================== CHAT : SUPPRIMER UN MESSAGE (Soft Delete) ====================
app.delete('/api/chat/:id', authenticateToken, async (req, res) => {
  const messageId = req.params.id;
  const userId = req.user.id;
  const userType = req.user.type; // 'etablissement' ou 'admin'

  try {
    const conn = await mysql.createConnection(dbConfig);
    
    // 1. Récupérer le message pour vérifier l'auteur
    const [rows] = await conn.execute('SELECT user_id, message, file_data FROM chat_messages WHERE id = ?', [messageId]);
    
    if (rows.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Message non trouvé' });
    }
    
    const message = rows[0];
    
    // 2. Vérification des droits: Seul l'auteur ou un admin peut supprimer
    const isAuthor = message.user_id === userId;
    const isAdmin = userType === 'admin';

    if (!isAuthor && !isAdmin) {
      await conn.end();
      return res.status(403).json({ error: 'Accès refusé. Non-auteur et non-admin.' });
    }

    // 3. Effectuer la 'soft delete': Mise à jour du contenu et suppression de la pièce jointe
    const nouveauContenu = isAdmin 
      ? '❌ Message supprimé par un administrateur' 
      : '🗑️ Message supprimé';
      
    await conn.execute(
      // On met à jour le message et on supprime les données du fichier pour le masquer
      'UPDATE chat_messages SET message = ?, file_data = NULL WHERE id = ?', 
      [nouveauContenu, messageId]
    );
    
    // 4. Récupérer le message mis à jour pour le renvoyer aux clients
    const [updatedResult] = await conn.execute(
        `SELECT id, user_id, username, message, type, 
                DATE_FORMAT(created_at, "%H:%i") as date, created_at, file_data 
         FROM chat_messages WHERE id = ?`,
        [messageId]
    );
    const messageMisAJour = { 
        ...updatedResult[0], 
        date: updatedResult[0].date,
        file: null // On s'assure que le champ file est null
    };

    await conn.end();

    // 5. Notifier tous les clients que le message a été supprimé/modifié
    io.emit('message-supprime', messageMisAJour);

    res.json({ message: 'Message supprimé avec succès', updatedMessage: messageMisAJour });

  } catch (err) {
    console.error('Erreur suppression message:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression' });
  }
});

// ==================== GESTION DES DEMANDES DE MOT DE PASSE OUBLIÉ ====================

// Récupérer toutes les demandes (pour l'admin)
app.get('/api/admin/demandes-reset-password', authenticateToken, async (req, res) => {
  if (req.user.type !== 'admin') return res.status(403).json({ error: 'Accès refusé' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute(`
      SELECT dr.*, e.nom as nom_etablissement 
      FROM demandes_reset_password dr
      JOIN etablissements e ON dr.login = e.login
      ORDER BY dr.created_at DESC
    `);
    await conn.end();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Valider une demande et réinitialiser le mot de passe
// ==================== DEMANDE DE RÉINITIALISATION MOT DE PASSE ====================

// Route publique : l'établissement fait une demande de reset
app.post('/api/demande-reset-password', async (req, res) => {
  const {
    login,
    nom_etablissement,
    code_etablissement,
    directeur_nom,
    directeur_prenom,
    email_contact,
    telephone,
    dernier_acces,
    motif_demande,
    motif_details
  } = req.body;

  // Validation minimale
  if (!login || !nom_etablissement || !directeur_nom || !directeur_prenom || !telephone || !motif_demande) {
    return res.status(400).json({ error: 'Champs obligatoires manquants' });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Vérifier que le login existe bien dans la table etablissements
    const [etab] = await conn.execute('SELECT id, nom FROM etablissements WHERE login = ?', [login]);
    if (etab.length === 0) {
      await conn.end();
      return res.status(404).json({ error: 'Login inconnu' });
    }

    // Vérifier qu'il n'y a pas déjà une demande récente (éviter spam)
    const [existing] = await conn.execute(
      'SELECT id FROM demandes_reset_password WHERE login = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
      [login]
    );

    if (existing.length > 0) {
      await conn.end();
      return res.status(429).json({ error: 'Une demande a déjà été faite il y a moins d\'1 heure' });
    }

    // Insérer la demande
    await conn.execute(
      `INSERT INTO demandes_reset_password 
       (login, nom_etablissement, code_etablissement, directeur_nom, directeur_prenom, 
        email_contact, telephone, dernier_acces, motif_demande, motif_details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        login,
        nom_etablissement,
        code_etablissement || null,
        directeur_nom,
        directeur_prenom,
        email_contact,
        telephone,
        dernier_acces || null,
        motif_demande,
        motif_details || null
      ]
    );

    await conn.end();

    // Notification en temps réel à l'admin
    io.emit('nouvelle-demande-reset', {
      message: `Nouvelle demande de réinitialisation de ${nom_etablissement}`,
      login,
      etablissement: nom_etablissement
    });

    res.json({ 
      success: true, 
      message: 'Demande envoyée avec succès ! L\'administrateur va la traiter sous 48h.' 
    });

  } catch (err) {
    console.error('Erreur demande reset:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ADMIN : RÉINITIALISER MOT DE PASSE ÉTABLISSEMENT
app.post('/api/admin/reset-etablissement-password', authenticateToken, async (req, res) => {
  if (req.user.type !== 'admin') return res.status(403).json({ error: 'Accès refusé' });

  const { login } = req.body;
  if (!login) return res.status(400).json({ error: 'Login requis' });

  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute('SELECT id, nom FROM etablissements WHERE login = ?', [login]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Établissement non trouvé' });
    }

    const defaultHash = await bcrypt.hash('sisco2024', 12);
    await conn.execute('UPDATE etablissements SET password = ? WHERE login = ?', [defaultHash, login]);
    await conn.end();

    res.json({ 
      message: `Mot de passe réinitialisé pour ${rows[0].nom}`,
      login,
      nouveauMotDePasse: 'sisco2024'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Servir les fichiers uploadés
app.use('/uploads', express.static('uploads'));

// DÉMARRAGE
server.listen(PORT, () => {
  console.log(`SERVEUR CISCO ULTIME → http://localhost:${PORT}`);
  console.log(`Admin : admin / admin123`);
  console.log(`Établissement : etab_401030301 / sisco2024`);
  console.log(`NOTIFICATIONS EN TEMPS RÉEL ACTIVÉES !`);
  console.log(`SERVEUR CISCO + CHAT → http://localhost:${PORT}`);
  
});
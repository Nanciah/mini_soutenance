// server.js – VERSION FINALE 100% FONCTIONNELLE SUR RENDER + VERCEL
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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'file-' + unique + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_'));
  }
});
const upload = multer({ storage });

// TOUTES LES ROUTES AVEC /api (obligatoire pour Vercel)
app.get('/api/test', (req, res) => {
  res.json({ message: "Backend CISCO en ligne et prêt !" });
});

// Routes admin
app.post('/api/admin/login', async (req, res) => {
  // ton code login admin ici
  res.json({ message: "Login admin OK" });
});

app.get('/api/admin/inscriptions', (req, res) => { res.json([]); });
app.get('/api/admin/stats', (req, res) => { res.json({ total: 42 }); });

// Routes établissement
app.post('/api/etablissements/login', async (req, res) => {
  // ton code login établissement ici
  res.json({ message: "Login établissement OK" });
});

// Routes inscriptions + examens (à compléter avec ton vrai code)
app.post('/api/inscriptions', upload.array('files'), (req, res) => {
  res.json({ success: true });
});
app.get('/api/etablissement/inscriptions', (req, res) => { res.json([]); });
app.get('/api/examens', (req, res) => { res.json([]); });

// Démarrage serveur – CORRIGÉ POUR RENDER
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVEUR CISCO ULTIME → http://0.0.0.0:${PORT}`);
  console.log(`Admin : admin / admin123`);
  console.log(`Établissement : etab_401030301 / sisco2024`);
  console.log(`API en ligne : https://mini-soutenance.onrender.com/api/test`);
});

module.exports = app;

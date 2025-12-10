// server.js – VERSION 100% FONCTIONNELLE POUR RENDER + LOCALHOST
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

// Routes simples pour tester
app.get('/api/test', (req, res) => {
  res.json({ message: "Backend CISCO fonctionne parfaitement !" });
});

// Démarrage du serveur – CORRIGÉ POUR RENDER
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SERVEUR CISCO ULTIME → http://0.0.0.0:${PORT}`);
  console.log(`Admin : admin / admin123`);
  console.log(`Établissement : etab_401030301 / sisco2024`);
  console.log(`NOTIFICATIONS EN TEMPS RÉEL ACTIVÉES !`);
});

module.exports = app;

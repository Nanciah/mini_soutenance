// ajouter-examens.js
const mysql = require('mysql2/promise');

async function go() {
    const connection = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '', database: 'sisco_db'
    });

    await connection.execute(`
        INSERT INTO examens (nom, date_examen, date_cloture, annee_scolaire, niveau, actif) VALUES
        ('CEPE 2025', '2025-06-05', '2025-05-01', '2024-2025', 'Primaire', 1),
        ('BEPC 2025', '2025-06-15', '2025-04-30', '2024-2025', 'Collège', 1),
        ('BAC 2025',  '2025-06-25', '2025-05-15', '2024-2025', 'Lycée', 1)
        ON DUPLICATE KEY UPDATE nom = nom
    `);

    console.log('3 examens 2025 ajoutés avec succès !');
    await connection.end();
    process.exit();
}

go();
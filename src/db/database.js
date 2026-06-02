require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:aura.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const initDB = async () => {
    try {
        await client.execute(`
            CREATE TABLE IF NOT EXISTS habits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                streak INTEGER DEFAULT 0,
                completed_today BOOLEAN DEFAULT 0
            )
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                is_redeemed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Base de datos inicializada correctamente.');
    } catch (err) {
        console.error('Error inicializando la base de datos:', err);
    }
};

initDB();

module.exports = client;

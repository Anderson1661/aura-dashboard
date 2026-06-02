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
                completed_today BOOLEAN DEFAULT 0,
                last_completed_at DATETIME
            )
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                is_redeemed BOOLEAN DEFAULT 0,
                required_streak INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // SEEDING: Insertar datos por defecto si está vacío
        const habitCheck = await client.execute("SELECT COUNT(*) as count FROM habits");
        if (habitCheck.rows[0].count === 0) {
            console.log('Insertando hábitos por defecto...');
            const defaultHabits = [
                "Meditar 10 minutos",
                "Leer 20 páginas",
                "Hacer ejercicio",
                "Tomar 2L de agua"
            ];
            for (const title of defaultHabits) {
                await client.execute({
                    sql: "INSERT INTO habits (title) VALUES (?)",
                    args: [title]
                });
            }
        }

        const couponCheck = await client.execute("SELECT COUNT(*) as count FROM coupons");
        if (couponCheck.rows[0].count === 0) {
            console.log('Insertando cupones por defecto...');
            await client.execute({
                sql: "INSERT INTO coupons (title, required_streak, created_at) VALUES (?, ?, ?)",
                args: ["Vale por un café especial ☕", 2, new Date().toISOString()]
            });
            await client.execute({
                sql: "INSERT INTO coupons (title, required_streak, created_at) VALUES (?, ?, ?)",
                args: ["Noche de película y palomitas 🎬", 3, new Date().toISOString()]
            });
        }

        console.log('Base de datos inicializada y poblada.');
    } catch (err) {
        console.error('Error inicializando la base de datos:', err);
    }
};

initDB();

module.exports = client;

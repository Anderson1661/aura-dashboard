const client = require('../db/database');

exports.getAllHabits = async (req, res, next) => {
    try {
        const result = await client.execute("SELECT * FROM habits");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

exports.createHabit = async (req, res, next) => {
    try {
        const { title } = req.body;
        if (!title || typeof title !== 'string' || title.trim() === '') {
            const error = new Error("El título del hábito es obligatorio.");
            error.statusCode = 400;
            throw error;
        }

        const result = await client.execute({
            sql: "INSERT INTO habits (title) VALUES (?)",
            args: [title.trim()]
        });

        res.status(201).json({
            success: true,
            message: "¡Hábito creado con éxito!",
            data: { id: Number(result.lastInsertRowid), title, streak: 0 }
        });
    } catch (err) {
        next(err);
    }
};

exports.completeHabit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const habitResult = await client.execute({
            sql: "SELECT * FROM habits WHERE id = ?",
            args: [id]
        });

        if (habitResult.rows.length === 0) {
            const error = new Error("Hábito no encontrado.");
            error.statusCode = 404;
            throw error;
        }

        const habit = habitResult.rows[0];
        
        if (habit.completed_today) {
            const error = new Error("Este hábito ya ha sido completado hoy.");
            error.statusCode = 400;
            throw error;
        }

        let newStreak = habit.streak + 1;
        let couponGenerated = false;

        if (newStreak >= 7) {
            const couponTitle = `Premio de Constancia: ${habit.title}`;
            await client.execute({
                sql: "INSERT INTO coupons (title, created_at) VALUES (?, ?)",
                args: [couponTitle, new Date().toISOString()]
            });
            
            await client.execute({
                sql: "UPDATE habits SET streak = 0, completed_today = 1 WHERE id = ?",
                args: [id]
            });
            couponGenerated = true;
            newStreak = 0;
        } else {
            await client.execute({
                sql: "UPDATE habits SET streak = ?, completed_today = 1 WHERE id = ?",
                args: [newStreak, id]
            });
        }

        res.json({
            success: true,
            message: couponGenerated ? "¡Felicidades! Has ganado un cupón." : "Hábito completado.",
            data: {
                streak: newStreak,
                couponGenerated
            }
        });
    } catch (err) {
        next(err);
    }
};

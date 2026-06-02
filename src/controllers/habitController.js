const client = require('../db/database');

exports.getAllHabits = async (req, res, next) => {
    try {
        const result = await client.execute("SELECT * FROM habits");
        const habits = result.rows;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        // Lógica de reseteo diario y verificación de racha
        const updatedHabits = await Promise.all(habits.map(async (habit) => {
            if (!habit.last_completed_at) return habit;

            const lastDate = new Date(habit.last_completed_at);
            const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
            
            const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));

            if (diffDays > 0) {
                let newStreak = habit.streak;
                // Si pasó más de un día sin completar, racha a 0
                if (diffDays > 1) {
                    newStreak = 0;
                }
                
                // Resetear completed_today para el nuevo día
                await client.execute({
                    sql: "UPDATE habits SET completed_today = 0, streak = ? WHERE id = ?",
                    args: [newStreak, habit.id]
                });
                return { ...habit, completed_today: 0, streak: newStreak };
            }
            return habit;
        }));

        res.json({ success: true, data: updatedHabits });
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

        // Validación: No duplicados
        const check = await client.execute({
            sql: "SELECT id FROM habits WHERE LOWER(title) = LOWER(?)",
            args: [title.trim()]
        });
        if (check.rows.length > 0) {
            const error = new Error("Ya tienes un hábito con este nombre.");
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

        const now = new Date().toISOString();
        let newStreak = habit.streak + 1;
        let couponGenerated = false;

        if (newStreak >= 7) {
            const couponTitle = `Premio de Constancia: ${habit.title}`;
            await client.execute({
                sql: "INSERT INTO coupons (title, created_at) VALUES (?, ?)",
                args: [couponTitle, now]
            });
            
            await client.execute({
                sql: "UPDATE habits SET streak = 0, completed_today = 1, last_completed_at = ? WHERE id = ?",
                args: [now, id]
            });
            couponGenerated = true;
            newStreak = 0;
        } else {
            await client.execute({
                sql: "UPDATE habits SET streak = ?, completed_today = 1, last_completed_at = ? WHERE id = ?",
                args: [newStreak, now, id]
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

exports.deleteHabit = async (req, res, next) => {
    try {
        const { id } = req.params;
        await client.execute({
            sql: "DELETE FROM habits WHERE id = ?",
            args: [id]
        });
        res.json({ success: true, message: "Hábito eliminado correctamente." });
    } catch (err) {
        next(err);
    }
};

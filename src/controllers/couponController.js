const client = require('../db/database');

exports.getAllCoupons = async (req, res, next) => {
    try {
        const result = await client.execute("SELECT * FROM coupons ORDER BY created_at DESC");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        next(err);
    }
};

exports.redeemCoupon = async (req, res, next) => {
    try {
        const { id } = req.params;

        const couponResult = await client.execute({
            sql: "SELECT * FROM coupons WHERE id = ?",
            args: [id]
        });

        if (couponResult.rows.length === 0) {
            const error = new Error("Cupón no encontrado.");
            error.statusCode = 404;
            throw error;
        }

        const coupon = couponResult.rows[0];

        // VALIDACIÓN DE ESFUERZO PERSONALIZADA
        const activeStreaks = await client.execute("SELECT MAX(streak) as maxStreak FROM habits");
        const maxStreak = activeStreaks.rows[0].maxStreak || 0;

        if (maxStreak < coupon.required_streak) {
            const error = new Error(`Este premio requiere una racha de ${coupon.required_streak} días. ¡Tú puedes!`);
            error.statusCode = 403;
            throw error;
        }

        if (coupon.is_redeemed) {
            const error = new Error("Este cupón ya ha sido canjeado.");
            error.statusCode = 400;
            throw error;
        }

        await client.execute({
            sql: "UPDATE coupons SET is_redeemed = 1 WHERE id = ?",
            args: [id]
        });

        res.json({
            success: true,
            message: "¡Cupón canjeado con éxito!",
            data: { id }
        });
    } catch (err) {
        next(err);
    }
};

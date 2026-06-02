require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const habitRoutes = require('./routes/habitRoutes');
const couponRoutes = require('./routes/couponRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API
app.use('/api/habits', habitRoutes);
app.use('/api/coupons', couponRoutes);

// Manejo de errores centralizado
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

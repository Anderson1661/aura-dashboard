const express = require('express');
const router = express.Router();
const habitController = require('../controllers/habitController');

router.get('/', habitController.getAllHabits); 
router.post('/', habitController.createHabit); 

// NUEVA RUTA: Usamos PUT para actualizar, pasándole el ID del hábito
router.put('/:id/complete', habitController.completeHabit); 

module.exports = router;

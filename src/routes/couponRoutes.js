const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');

router.get('/', couponController.getAllCoupons);

// NUEVA RUTA: Canjear cupón con su ID
router.put('/:id/redeem', couponController.redeemCoupon);

module.exports = router;

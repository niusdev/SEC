const express = require('express');
const loginRoutes = require('./loginRoutes');
const userRoutes = require('./userRoutes');
const stockRoutes = require('./stockRoutes');
const revenuesRoutes = require('./revenuesRoutes');
const orderRoutes = require('./orderRoutes');

const router = express.Router();

router.use(loginRoutes);
router.use(userRoutes);
router.use(stockRoutes);
router.use(revenuesRoutes);
router.use(orderRoutes);

module.exports = router;
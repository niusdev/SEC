const express = require('express');
const StockController = require('../controllers/StockController');
const checkToken = require('../controllers/middlewares/checkToken'); 

const router = express.Router();
router.post('/super/estoque', checkToken, StockController.createIngredient);
router.get('/super/estoque', checkToken, StockController.getIngredients);
router.get('/super/estoque/ingrediente/:id', checkToken, StockController.getIngredientById);
router.put('/super/estoque/ingrediente/:id', checkToken, StockController.updateIngredient);
router.delete('/super/estoque/ingrediente/:id', checkToken, StockController.deleteIngredient);

module.exports = router;
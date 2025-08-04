const express = require('express');
const RevenuesController = require('../controllers/RevenuesController');
const RevenuesIngredientController = require('../controllers/RevenuesIngredientController');
const checkToken = require('../controllers/middlewares/checkToken'); 

const router = express.Router();

router.post('/super/receitas/:idReceita/ingredientes', checkToken, RevenuesIngredientController.addIngredientInRecipe);
router.put('/super/receitas/:idReceita/ingredientes/:idIngrediente', checkToken, RevenuesIngredientController.updateRecipeIngredient);
router.delete('/super/receitas/:idReceita/ingredientes/:idIngrediente', checkToken, RevenuesIngredientController.deleteRecipeIngredient);

router.get('/receitas/:id/checar-uso-para-edicao', RevenuesController.checkRecipeUsageForEdit);

router.post('/super/receitas', checkToken, RevenuesController.createRecipe);
router.get('/super/receitas', checkToken, RevenuesController.getRecipes);
router.get('/super/receitas/:id', checkToken, RevenuesController.getRecipeById);
router.put('/super/receitas/:id', checkToken, RevenuesController.updateRecipe);
router.delete('/super/receitas/:id', checkToken, RevenuesController.deleteRecipe);

module.exports = router;
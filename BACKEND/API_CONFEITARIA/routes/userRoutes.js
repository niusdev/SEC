const express = require('express');
const UserController = require('../controllers/UserController');
const checkToken = require('../controllers/middlewares/checkToken'); 

const router = express.Router();
//rota base: /api_confeitaria
router.post('/usuario', UserController.createUser);
router.get('/super/usuarios', checkToken, UserController.getUsers);
router.get('/super/usuarios/:id', checkToken, UserController.getUserById);
router.put('/usuario/:id', checkToken, UserController.updateUser);
router.put('/super/usuarios/:id/perfil', checkToken, UserController.updateProfile);
router.delete('/super/usuario/:id', checkToken, UserController.delete);

module.exports = router; 
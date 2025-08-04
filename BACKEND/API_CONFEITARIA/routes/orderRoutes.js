const express = require('express');
const OrderController = require('../controllers/OrderController');
const checkToken = require('../controllers/middlewares/checkToken'); 

//rota base: /api_confeitaria
const router = express.Router();
// Cria um novo pedido
router.post('/pedidos', checkToken, OrderController.createOrder);

// Obtém todos os pedidos ou filtra por nome
router.get('/pedidos', checkToken, OrderController.getOrders);

// Obtém um pedido por ID
router.get('/pedidos/:id', checkToken, OrderController.getOrderById);

// Atualiza a quantidade de uma receita específica em um pedido
router.put('/pedidos/:id/receita/:receitaId/quantidade', checkToken, OrderController.updateOrder);

// Atualiza o status de um pedido
router.put('/super/pedidos/:id/status', checkToken, OrderController.updateOrderStatus);

// Exclui um pedido completamente
router.delete('/pedidos/:id', checkToken, OrderController.deleteOrder);

// Remove uma receita específica de um pedido
router.delete('/pedidos/:id/receita/:receitaId', checkToken, OrderController.removeRecipeFromOrder);

module.exports = router;
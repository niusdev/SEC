const express = require('express');
const routes = require('./routes');
const cors = require('cors');

const app = express();

app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json());
app.use('/api_confeitaria', routes);

module.exports = app; 

require('dotenv').config()
const secretKey = process.env.SECRET_KEY;

const jwt = require('jsonwebtoken')

function checkToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) return res.status(401).json({ msg: "Acesso negado!" });
  
    try {
      jwt.verify(token, secretKey)
      next();
    } catch (err) {
      res.status(400).json({ msg: "O Token é inválido!" });
    }
}

module.exports = checkToken;
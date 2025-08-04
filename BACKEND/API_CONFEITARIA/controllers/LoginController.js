require('dotenv').config()
const secretKey = process.env.SECRET_KEY;
 
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const jwt = require('jsonwebtoken')

const exclude = require("./utils/excludeKey");

class LoginController {
    static async login(req, res) {
        const { 
            email, 
            senha 
        } = req.body;
    
        if (!email) {
            return res.status(422).send({ msg: "O email é obrigatório!" });
        }
    
        if (!senha) {
            return res.status(422).send({ msg: "A senha é obrigatória!" });
        }
    
        const user = await prisma.tbUsuario.findUnique({
            where:{
                email:email
            }
        })
    
        if(user == null){
            return res.status(400).send({msg: "Email e/ou senha incorretos!"});
        }
    
        const checkPassword = req.body.senha == user.senha;
    
        if(!checkPassword){
            res.send({msg: "Email e/ou senha incorretos!"});
        } 
    
        const userWithoutPass = exclude(user, ['senha'])
    
        try {
            const expiresIn = 1200; //20min
            const token = jwt.sign({id: user.iduser}, secretKey, { 
                expiresIn: expiresIn 
            });
    
            res.status(200).send({ msg: "Login realizado com sucesso!", token, expiresIn, userWithoutPass });
    
        } catch (error) {
            res.status(500).send()
        }
    }
}

module.exports = LoginController;


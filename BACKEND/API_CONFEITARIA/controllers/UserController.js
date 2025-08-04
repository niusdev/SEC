const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient();

const { v4: uuidv4 } = require('uuid'); 

class UserController {
    
    static async createUser(req, res) {
        try {
            const { 
                nome, 
                email,
                senha,
                senha_confirmacao,
                telefone,
                perfil,
                senhaValidacaoSup,
            } = req.body;

            if (!nome) {
                return res.status(422).json({ msg: "Informe seu nome completo!" });
            }
            if (!email) {
                return res.status(422).json({ msg: "Informe seu e-mail!" });
            }
            if (!telefone) {
                return res.status(422).json({ msg: "Informe seu número de telefone!" });
            }
            if (!perfil) {
                return res.status(422).json({ msg: "Selecione sua função/perl!" });
            }
            if (!senha) {
                return res.status(422).json({ msg: "Informe sua senha de acesso!" });
            }
            if (!senha_confirmacao) {
                return res.status(422).json({ msg: "Confirme sua senha de acesso!" });
            }
            if (senha != senha_confirmacao) {
                return res
                .status(422)
                .json({ msg: "As semhas não coincidem!" });
            }
            if (perfil === "SUPERVISOR_JUNIOR" || perfil === "SUPERVISOR_SENIOR") {
                if (!senhaValidacaoSup) {
                    return res.status(422).json({ msg: "A senha de validação do supervisor é obrigatória!" });
                }
                const passwordSent =
                    perfil === "SUPERVISOR_JUNIOR"
                        ? process.env.SENHA_VALIDACAO_SUP_JUNIOR
                        : process.env.SENHA_VALIDACAO_SUP_SENIOR;
                if (senhaValidacaoSup !== passwordSent) {
                    return res.status(401).json({ msg: "Senha de validação de supervisor inválida!" });
                }
            }

            const id = uuidv4();
            await prisma.tbUsuario.create({
                data: {                  
                    id: id,
                    nome: req.body.nome, 
                    email: req.body.email,
                    senha: req.body.senha,
                    telefone: req.body.telefone,
                    perfil: req.body.perfil,
                }
            })
            res.status(201).json({ msg: "Usuário criado com sucesso!" });
        } catch (error) {
            let err = ''
            error.meta? err = error.meta.target : ''
            if(err != ''){
                if(err == 'unique_email'){ //não retorno erro de email duplicado
                    return res.status(400).json({msg: "Este e-mail já está cadastrado. Tente outro ou recupere sua conta"})
                }
            }
            res.status(500).json({msg: 'Já existe um usuário com este e-mail.', error})
        }
    }

    static async getUsers(req, res) {
        try {
            const { nome } = req.query;
            if (nome && nome.trim() !== "") {
                const users = await prisma.tbUsuario.findMany({
                    where: {
                        nome: {
                            contains: nome
                        }
                    }
                });

                if (users.length === 0) {
                    return res.status(404).json({ msg: "Nenhum usuário encontrado com esse nome." });
                }

                return res.status(200).json({ msg: 'Usuários encontrados!', users });
            }

            const allUsers = await prisma.tbUsuario.findMany();
            res.status(200).json({ msg: 'Todos os usuários', users: allUsers });

        } catch (error) {
            res.status(500).json({ msg: "Erro ao buscar usuários.", erro: error.message });
        }
    }

    static async getUserById(req, res) {
        try {
            const id = req.params.id;
            const user = await prisma.tbUsuario.findUnique({
                where: {
                    id: id
                }
            })
            
            if (!user) {
                return res.status(400).json({ msg: "Usuário não encontrado!" });
            }
            res.status(200).json({msg: 'Usuário encontrado!', user})
        } catch (error) {
            res.status(500).json({msg: "Erro interno!"}) //não retorno erro de usuário não encontrado, pois a rota retorna um usuário nulo
        }
    }

    static async updateUser(req, res) {
        try {
            const id = req.params.id;
            const updatedData = {};
            const allowedFields = ["nome", "email", "senha", "telefone"];
            allowedFields.forEach((field) => {
                if (req.body[field] !== undefined) {
                    updatedData[field] = req.body[field];
                }
            });
            if (Object.keys(updatedData).length === 0) {
                return res.status(400).json({ msg: "Nenhum campo válido para atualização foi fornecido." });
            }
            const user = await prisma.tbUsuario.update({
                where: { id },
                data: updatedData
            });
            res.status(200).json({
                msg: "Usuário editado com sucesso!",
                user
            });
        } catch (error) {
            res.status(400).json({ msg: "Usuário não encontrado ou erro na atualização!", error });
        }
    }
 
    static async updateProfile(req, res) {
        try {
            const targetUserID = req.params.id;
            const { novoPerfil, solicitanteId } = req.body;
            if (targetUserID === solicitanteId) {
                return res.status(403).json({ msg: "Você não pode alterar o seu próprio perfil." });
            }
            const solicitante = await prisma.tbUsuario.findUnique({
                where: { id: solicitanteId }
            });
            if (!solicitante) {
                return res.status(404).json({ msg: "Solicitante não encontrado!" });
            }
            if (solicitante.perfil !== "SUPERVISOR_SENIOR") {
                return res.status(403).json({ msg: "Apenas Supervisores Sênior podem alterar o perfil de outros usuários." });
            }
            await prisma.tbUsuario.update({
                where: { id: targetUserID },
                data: {
                    perfil: novoPerfil
                }
            });
            res.status(200).json({
                msg: "Perfil do usuário atualizado com sucesso!",
            });

        } catch (error) {
            res.status(400).json({ msg: "Erro ao atualizar perfil!", error });
        }
    }

    static async delete(req, res) {
        try {
            const targetUserID = req.params.id;
            const { solicitanteId } = req.body;
            if (!solicitanteId) {
                return res.status(400).json({ msg: "ID do solicitante é obrigatório!" });
            }
            const solicitante = await prisma.tbUsuario.findUnique({
                where: { id: solicitanteId }
            });
            if (!solicitante) {
                return res.status(404).json({ msg: "Solicitante não encontrado!" });
            }
            if (solicitante.perfil !== "SUPERVISOR_SENIOR") {
                return res.status(403).json({ msg: "Apenas Supervisores Sênior podem excluir usuários." });
            }
            if (solicitanteId === targetUserID) {
                return res.status(403).json({ msg: "Você não pode excluir a si mesmo." });
            }
            await prisma.tbUsuario.delete({
                where: { id: targetUserID }
            });
            res.status(200).json({ msg: 'Usuário deletado com sucesso!' });
        } catch (error) {
            res.status(400).json({ msg: "Erro ao excluir usuário!", error });
        }
    }   

}

module.exports = UserController;



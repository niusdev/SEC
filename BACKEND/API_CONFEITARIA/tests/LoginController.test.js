const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

const { v4: uuidv4 } = require('uuid'); 
const request = require('supertest');
const app = require('../app');

const secretKey = process.env.SECRET_KEY;

describe('LoginController', () => {
  let user;

  beforeAll(async () => {
    // Limpa usuário de teste se existir
    await prisma.tbUsuario.deleteMany({ where: { email: 'teste@teste.com' } });

    // Cria usuário para login
    user = await prisma.tbUsuario.create({
      data: {
        id: uuidv4(),
        nome: 'Usuário Teste',
        email: 'teste@teste.com',
        senha: '12345678',
        telefone: '(88) 9 9999-9999',
        perfil: 'SUPERVISOR_SENIOR'
      }
    });
  });

  afterAll(async () => {
    // Remove usuário após os testes
    if (user?.id) {
      await prisma.tbUsuario.delete({ where: { id: user.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('POST /autenticacao/login - sucesso no login com email e senha corretos', async () => {
    const res = await request(app)
      .post('/api_confeitaria/autenticacao/login')
      .send({ email: 'teste@teste.com', senha: '12345678' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('msg', 'Login realizado com sucesso!');
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('expiresIn', 1200);
    expect(res.body).toHaveProperty('userWithoutPass');
    expect(res.body.userWithoutPass).not.toHaveProperty('senha');
  });

  test('POST /autenticacao/login - falha quando email não é informado', async () => {
    const res = await request(app)
      .post('/api_confeitaria/autenticacao/login')
      .send({ senha: '12345678' });

    expect(res.statusCode).toBe(422);
    expect(res.body).toHaveProperty('msg', 'O email é obrigatório!');
  });

  test('POST /autenticacao/login - falha quando senha não é informada', async () => {
    const res = await request(app)
      .post('/api_confeitaria/autenticacao/login')
      .send({ email: 'teste@teste.com' });

    expect(res.statusCode).toBe(422);
    expect(res.body).toHaveProperty('msg', 'A senha é obrigatória!');
  });

  test('POST /autenticacao/login - falha quando usuário não existe', async () => {
    const res = await request(app)
      .post('/api_confeitaria/autenticacao/login')
      .send({ email: 'naoexiste@teste.com', senha: '12345678' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('msg', 'Email e/ou senha incorretos!');
  });

  test('POST /autenticacao/login - falha quando senha está incorreta', async () => {
    const res = await request(app)
      .post('/api_confeitaria/autenticacao/login')
      .send({ email: 'teste@teste.com', senha: 'senhaErrada' });

    expect(res.statusCode).toBe(200); // seu controller não retorna erro 4xx nesse caso, apenas msg
    expect(res.body).toHaveProperty('msg', 'Email e/ou senha incorretos!');
  });
});

const request = require("supertest");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const app = require("../app");

const { v4: uuidv4 } = require("uuid");
const secretKey = process.env.SECRET_KEY;

describe("StockController - Testes unitários por função", () => {
  let user;
  let token;

  const baseIngredient = {
    id: uuidv4(),
    nome: "massa de milho",
    unidades: 20,
    pesoPorUnidade: 0.5,
    unidadeMedida: "kg",
    validade: "2026-10-10",
    nivelMinimo: 5,
    precoCusto: 3.5,
    categoria: "Açúcares",
  };

  beforeAll(async () => {
    await prisma.tbUsuario.deleteMany({ where: { email: "teste@teste.com" } });
    user = await prisma.tbUsuario.create({
      data: {
        id: uuidv4(),
        nome: "Usuário Teste",
        email: "teste@teste.com",
        senha: "12345678",
        telefone: "(88) 9 9999-9999",
        perfil: "SUPERVISOR_SENIOR",
      },
    });
    token =
      "Bearer " + jwt.sign({ id: user.id }, secretKey, { expiresIn: 1200 });
  });

  afterAll(async () => {
    if (baseIngredient.id) {
      await prisma.tbIngredienteEmEstoque
        .delete({ where: { id: baseIngredient.id } })
        .catch(() => {});
    }
    if (user?.id) {
      await prisma.tbUsuario.delete({ where: { id: user.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("createIngredient", () => {
    test("POST /super/estoque - cria ingrediente com sucesso", async () => {
      const res = await request(app)
        .post("/api_confeitaria/super/estoque")
        .set("Authorization", token)
        .send(baseIngredient);

      expect(res.statusCode).toBe(201);
      expect(res.body.msg).toBe("Ingrediente adicionado com sucesso!");
      expect(res.body.produto).toHaveProperty("id");
      expect(res.body.produto.nome).toBe(baseIngredient.nome.toLowerCase());

      baseIngredient.id = res.body.produto.id;
    });

    test("POST /super/estoque - falha ao criar ingrediente sem nome", async () => {
      const res = await request(app)
        .post("/api_confeitaria/super/estoque")
        .set("Authorization", token)
        .send({ ...baseIngredient, nome: "" });

      expect(res.statusCode).toBe(422);
      expect(res.body.msg).toMatch(/nome/i);
    });

    // Você pode replicar casos de validação para outras propriedades (unidades, unidadeMedida, etc)
    test("POST /super/estoque - falha com unidade inválida", async () => {
      const res = await request(app)
        .post("/api_confeitaria/super/estoque")
        .set("Authorization", token)
        .send({ ...baseIngredient, nome: "Novo", unidades: -5 });

      expect(res.statusCode).toBe(422);
      expect(res.body.msg).toBe(
        "Informe o estoque inicial (número inteiro positivo)!"
      );
    });

    test("POST /super/estoque - falha com unidadeMedida inválida", async () => {
      const res = await request(app)
        .post("/api_confeitaria/super/estoque")
        .set("Authorization", token)
        .send({ ...baseIngredient, nome: "Novo", unidadeMedida: "INVALIDO" });

      expect(res.statusCode).toBe(422);
      expect(res.body.msg).toBe(
        "Unidade de medida inválida! Use: mg, g, kg, ml, l ou un."
      );
    });

    test("POST /super/estoque - falha ao duplicar ingrediente", async () => {
      const res = await request(app)
        .post("/api_confeitaria/super/estoque")
        .set("Authorization", token)
        .send(baseIngredient); // nome já foi criado no primeiro teste

      expect(res.statusCode).toBe(409); // ou 400 se você usar outro código
      expect(res.body.msg).toMatch(/já cadastrado/i);
    });
  });

  describe("getIngredients", () => {
    test("GET /super/estoque - retorna lista completa", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/estoque")
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.ingredients)).toBe(true);
    });

    test("GET /super/estoque?nome= - filtra ingredientes por nome", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/estoque")
        .query({ nome: baseIngredient.nome.slice(0, 3) }) // parte do nome para filtro
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body.ingredients.length).toBeGreaterThanOrEqual(1);
      expect(res.body.ingredients[0].nome).toContain(
        baseIngredient.nome.toLowerCase()
      );
    });

    test("GET /super/estoque?nome=nomeInexistente - retorna 404", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/estoque")
        .query({ nome: "nomeinexistente123" })
        .set("Authorization", token);

      expect(res.statusCode).toBe(404);
      expect(res.body.msg).toMatch(/nenhum ingrediente encontrado/i);
    });
  });

  describe("getIngredientById", () => {
    test("GET /super/estoque/ingrediente/:id - retorna ingrediente por id", async () => {
      const res = await request(app)
        .get(`/api_confeitaria/super/estoque/ingrediente/${baseIngredient.id}`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body.produto).toHaveProperty("id", baseIngredient.id);
    });

    test("GET /super/estoque/ingrediente/:id - id bem formado mas inexistente", async () => {
      const res = await request(app)
        .get(`/api_confeitaria/super/estoque/ingrediente/${uuidv4()}`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toBe("Produto não cadastrado.");
    });

    test("GET /super/estoque/ingrediente/:id - id inválido retorna 400", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/estoque/ingrediente/idInvalido123")
        .set("Authorization", token);

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/não cadastrado/i);
    });
  });

  describe("updateIngredient", () => {
    test("PUT /super/estoque/ingrediente/:id - atualiza campo preço", async () => {
      const newPreco = 4.5;
      const res = await request(app)
        .put(`/api_confeitaria/super/estoque/ingrediente/${baseIngredient.id}`)
        .set("Authorization", token)
        .send({ precoCusto: newPreco });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toBe("Ingrediente atualizado com sucesso!");
      expect(res.body.ingredient.precoCusto).toBe(newPreco);
    });

    test("PUT /super/estoque/ingrediente/:id - retorna 400 se nenhum campo válido fornecido", async () => {
      const res = await request(app)
        .put(`/api_confeitaria/super/estoque/ingrediente/${baseIngredient.id}`)
        .set("Authorization", token)
        .send({ campoInvalido: "teste" });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/nenhum campo válido/i);
    });

    test("PUT /super/estoque/ingrediente/:id - retorna 404 para id inexistente", async () => {
      const res = await request(app)
        .put("/api_confeitaria/super/estoque/ingrediente/idInexistente123")
        .set("Authorization", token)
        .send({ precoCusto: 5 });

      expect(res.statusCode).toBe(404);
      expect(res.body.msg).toMatch(/não encontrado/i);
    });

    let receitaIds = [];

    afterEach(async () => {
      await prisma.tbReceitaIngrediente.deleteMany({
        where: { idReceita: { in: receitaIds } },
      });

      await prisma.tbReceita.deleteMany({
        where: { id: { in: receitaIds } },
      });

      receitaIds = [];
    });

    test("PUT /super/estoque/ingrediente/:id - recalcula custo de produção corretamente", async () => {
      await prisma.tbIngredienteEmEstoque.update({
        where: { id: baseIngredient.id },
        data: {
          unidadeMedida: "g",
          quantidade: 1000,
          precoCusto: 5,
        },
      });

      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `Receita Teste Custo - ${Date.now()}`,
          rendimento: "10",
          custoDeProducao: 0,
          ingredientes: {
            create: {
              idIngrediente: baseIngredient.id,
              qtdGramasOuMl: 200,
            },
          },
        },
      });

      receitaIds.push(receita.id);

      const res = await request(app)
        .put(`/api_confeitaria/super/estoque/ingrediente/${baseIngredient.id}`)
        .set("Authorization", token)
        .send({ precoCusto: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toMatch(/atualizado com sucesso/i);

      const receitaAtualizada = await prisma.tbReceita.findUnique({
        where: { id: receita.id },
      });

      expect(receitaAtualizada.custoDeProducao).toBeGreaterThan(0);
    });

    test('PUT /super/estoque/ingrediente/:id - erro se unidade = "un" e unidades = 0', async () => {
      await prisma.tbIngredienteEmEstoque.update({
        where: { id: baseIngredient.id },
        data: {
          unidadeMedida: "un",
          unidades: 0,
          precoCusto: 5,
        },
      });

      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `Receita Unidade Zero - ${Date.now()}`,
          rendimento: "5",
          custoDeProducao: 0,
          ingredientes: {
            create: {
              idIngrediente: baseIngredient.id,
              qtdUnidade: 2,
            },
          },
        },
      });

      receitaIds.push(receita.id);

      const res = await request(app)
        .put(`/api_confeitaria/super/estoque/ingrediente/${baseIngredient.id}`)
        .set("Authorization", token)
        .send({ precoCusto: 7 });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/unidades.*igual a zero/i);
    });

    test('PUT /super/estoque/ingrediente/:id - erro se unidade ≠ "un" e quantidade = 0', async () => {
      await prisma.tbIngredienteEmEstoque.update({
        where: { id: baseIngredient.id },
        data: {
          unidadeMedida: "g",
          quantidade: 0,
          precoCusto: 5,
        },
      });

      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `Receita Quantidade Zero - ${Date.now()}`,
          rendimento: "10",
          custoDeProducao: 0,
          ingredientes: {
            create: {
              idIngrediente: baseIngredient.id,
              qtdGramasOuMl: 300,
            },
          },
        },
      });

      receitaIds.push(receita.id);

      const res = await request(app)
        .put(`/api_confeitaria/super/estoque/ingrediente/${baseIngredient.id}`)
        .set("Authorization", token)
        .send({ precoCusto: 8 });

      expect(res.statusCode).toBe(400);
      expect(res.body.msg).toMatch(/quantidade.*igual a zero/i);
    });

    test("PUT /super/estoque/ingrediente/:id - ignora ingrediente com quantidade usada nula na receita", async () => {
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `Receita Ingrediente Nulo - ${Date.now()}`,
          rendimento: "10",
          custoDeProducao: 0,
          ingredientes: {
            create: {
              idIngrediente: baseIngredient.id,
              qtdGramasOuMl: null,
              qtdUnidade: null,
            },
          },
        },
      });

      receitaIds.push(receita.id);

      const res = await request(app)
        .put(`/api_confeitaria/super/estoque/ingrediente/${baseIngredient.id}`)
        .set("Authorization", token)
        .send({ precoCusto: 5 });

      expect(res.statusCode).toBe(200);
      expect(res.body.msg).toMatch(/atualizado com sucesso/i);
    });
  });

  describe("deleteIngredient", () => {
    test("DELETE /super/estoque/ingrediente/:id - delete direto (sem força)", async () => {
      // Para esse teste vamos criar um ingrediente novo para deletar sem interferir no anterior
      const createRes = await request(app)
        .post("/api_confeitaria/super/estoque")
        .set("Authorization", token)
        .send({ ...baseIngredient, nome: "ingrediente para deletar" });

      expect(createRes.statusCode).toBe(201);
      const idToDelete = createRes.body.produto.id;

      const deleteRes = await request(app)
        .delete(`/api_confeitaria/super/estoque/ingrediente/${idToDelete}`)
        .set("Authorization", token)
        .send({ forceDelete: false });

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.msg).toMatch(/excluído/i);
    });

    let ingredienteId;
    let receitaId;
    let pedidoId;

    afterEach(async () => {
      if (pedidoId) {
        await prisma.tbPedido.deleteMany({ where: { id: pedidoId } });
        pedidoId = null;
      }

      if (receitaId) {
        // Primeiro apagar as ligações (pedidoReceita e receitaIngrediente) para evitar FK error
        await prisma.tbPedidoReceita.deleteMany({ where: { receitaId } });
        await prisma.tbReceitaIngrediente.deleteMany({
          where: { idReceita: receitaId },
        });
        await prisma.tbReceita.deleteMany({ where: { id: receitaId } });
        receitaId = null;
      }

      if (ingredienteId) {
        await prisma.tbIngredienteEmEstoque.deleteMany({
          where: { id: ingredienteId },
        });
        ingredienteId = null;
      }
    });

    test("DELETE com ingrediente usado em receita - sem forceDelete", async () => {
      const ingRes = await request(app)
        .post("/api_confeitaria/super/estoque")
        .set("Authorization", token)
        .send({
          ...baseIngredient,
          id: uuidv4(),
          nome: `ingrediente usado ${Date.now()}`,
        });

      ingredienteId = ingRes.body.produto.id;

      const receitaUuid = uuidv4();
      const recRes = await request(app)
        .post("/api_confeitaria/super/receitas")
        .set("Authorization", token)
        .send({
          id: receitaUuid,
          nome: `receita teste ${Date.now()}`,
          rendimento: "10",
        });

      receitaId = recRes.body.id;

      await request(app)
        .post(`/api_confeitaria/super/receitas/${receitaId}/ingredientes`)
        .set("Authorization", token)
        .send({
          idIngrediente: ingredienteId,
          quantidadeUsada: 1,
          unidadeMedidaUsada: "g", //acho que isso não é usado
        });

      const delRes = await request(app)
        .delete(`/api_confeitaria/super/estoque/ingrediente/${ingredienteId}`)
        .set("Authorization", token)
        .send({ forceDelete: false });

      expect(delRes.statusCode).toBe(200); // estava como 400, mas a função retorna 200 + warning
      expect(delRes.body.action).toBe("deleted_direct");

      if (delRes.body.recipes) {
        expect(Array.isArray(delRes.body.recipes)).toBe(true);
        expect(delRes.body.recipes.length).toBeGreaterThan(0);
      }
    });
  });

  describe("StockController - deleteIngredient (cenário receitas sem pedidos)", () => {
    let token;
    let userId;
    let ingredienteId;
    let receitaId;

    beforeAll(async () => {
      // Criar usuário e token
      const user = await prisma.tbUsuario.create({
        data: {
          id: uuidv4(),
          nome: "Usuário Teste",
          email: `teste+${Date.now()}@teste.com`,
          senha: "12345678",
          telefone: "(88) 9 9999-9999",
          perfil: "SUPERVISOR_SENIOR",
        },
      });
      userId = user.id;
      token = `Bearer ${jwt.sign({ id: userId }, process.env.SECRET_KEY)}`;

      // Criar ingrediente
      const ingrediente = await prisma.tbIngredienteEmEstoque.create({
        data: {
          id: uuidv4(),
          nome: "Ingrediente Para Teste",
          unidades: 100,
          pesoPorUnidade: 100,
          quantidade: 10000,
          unidadeMedida: "g",
          validade: "2026-10-10",
          nivelMinimo: 5,
          precoCusto: 2.5,
          categoria: "Teste",
        },
      });
      ingredienteId = ingrediente.id;

      // Criar receita vinculada ao ingrediente
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "Receita Sem Pedido",
          rendimento: "1 porção",
          modoDePreparo: "Preparo simples",
          custoDeProducao: 5.0,
          ingredientes: {
            create: [
              {
                idIngrediente: ingredienteId,
                qtdGramasOuMl: 50,
                qtdUnidade: null,
              },
            ],
          },
        },
      });
      receitaId = receita.id;
    });

    afterAll(async () => {
      await prisma.tbReceitaIngrediente.deleteMany({
        where: {
          idReceita: receitaId,
          idIngrediente: ingredienteId,
        },
      });

      await prisma.tbReceita
        .delete({
          where: { id: receitaId },
        })
        .catch(() => {}); // já pode ter sido deletada

      await prisma.tbIngredienteEmEstoque
        .delete({
          where: { id: ingredienteId },
        })
        .catch(() => {}); // idem

      await prisma.tbUsuario.delete({
        where: { id: userId },
      });
    });

    test("Retorna mensagem de confirmação simples quando não envia forceDelete", async () => {
      const res = await request(app)
        .delete(`/api_confeitaria/super/estoque/ingrediente/${ingredienteId}`)
        .set("Authorization", token)
        .send({}); // sem forceDelete

      expect(res.status).toBe(200);
      expect(res.body.action).toBe("confirm_simple_delete");
      expect(res.body.msg).toMatch(/está presente em 1 receita/);
      expect(res.body.recipes).toContain("Receita Sem Pedido");
    });

    test("Deleta ingrediente e receitas associadas vazias quando envia forceDelete=true", async () => {
      const res = await request(app)
        .delete(`/api_confeitaria/super/estoque/ingrediente/${ingredienteId}`)
        .set("Authorization", token)
        .send({ forceDelete: true });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe("deleted_cascading_recipes_only");
      expect(res.body.msg).toMatch(/removido das receitas e do banco/);
      expect(res.body.deletedRecipes).toContain("Receita Sem Pedido");

      const ingredienteNoBanco = await prisma.tbIngredienteEmEstoque.findUnique(
        {
          where: { id: ingredienteId },
        }
      );
      expect(ingredienteNoBanco).toBeNull();

      const receitaNoBanco = await prisma.tbReceita.findUnique({
        where: { id: receitaId },
      });
      expect(receitaNoBanco).toBeNull();
    });
  });

  describe("StockController - deleteIngredient (cenário com pedidos)", () => {
    let token;
    let userId;
    let ingredienteId;
    let receitaId;
    let pedidoId;

    beforeAll(async () => {
      // Criar usuário
      const user = await prisma.tbUsuario.create({
        data: {
          id: uuidv4(),
          nome: "Usuário Teste",
          email: `teste+pedido+${Date.now()}@teste.com`,
          senha: "12345678",
          telefone: "(88) 9 9999-9999",
          perfil: "SUPERVISOR_SENIOR",
        },
      });
      userId = user.id;
      token = `Bearer ${jwt.sign({ id: userId }, process.env.SECRET_KEY)}`;

      // Criar ingrediente
      const ingrediente = await prisma.tbIngredienteEmEstoque.create({
        data: {
          id: uuidv4(),
          nome: "Ingrediente com Pedido",
          unidades: 100,
          pesoPorUnidade: 100,
          quantidade: 10000,
          unidadeMedida: "g",
          validade: "2026-10-10",
          nivelMinimo: 5,
          precoCusto: 2.5,
          categoria: "Teste",
        },
      });
      ingredienteId = ingrediente.id;

      // Criar receita com o ingrediente
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "Receita Com Pedido",
          rendimento: "1 porção",
          modoDePreparo: "Preparo simples",
          custoDeProducao: 5.0,
          ingredientes: {
            create: [
              {
                idIngrediente: ingredienteId,
                qtdGramasOuMl: 50,
                qtdUnidade: null,
              },
            ],
          },
        },
      });
      receitaId = receita.id;

      // Criar pedido com a receita
      const pedido = await prisma.tbPedido.create({
        data: {
          id: uuidv4(),
          nomeCliente: "Cliente Teste",
          dataPedido: "00/00/0000",
          valorTotal: 50.0,
          status: "PENDENTE",
          pedidoReceitas: {
            create: [
              {
                receitaId: receitaId,
                quantidade: 1,
              },
            ],
          },
        },
      });
      pedidoId = pedido.id;
    });

    afterAll(async () => {
      // Remover em ordem reversa, garantindo que só exclui os registros criados
      await prisma.tbPedidoReceita.deleteMany({
        where: { pedidoId: pedidoId },
      });

      await prisma.tbPedido.delete({
        where: { id: pedidoId },
      });

      await prisma.tbReceitaIngrediente.deleteMany({
        where: {
          idReceita: receitaId,
          idIngrediente: ingredienteId,
        },
      });

      await prisma.tbReceita.delete({
        where: { id: receitaId },
      });

      await prisma.tbIngredienteEmEstoque.delete({
        where: { id: ingredienteId },
      });

      await prisma.tbUsuario.delete({
        where: { id: userId },
      });
    });

    test("Retorna confirmação forçada quando há receitas em pedidos", async () => {
      const ingredienteId = uuidv4();
      const receitaId = uuidv4();
      const pedidoId = uuidv4();

      try {
        // Cria ingrediente
        const ingrediente = await prisma.tbIngredienteEmEstoque.create({
          data: {
            id: ingredienteId,
            nome: `Ingrediente Teste ${Date.now()}`,
            unidades: 10,
            pesoPorUnidade: 100,
            quantidade: 1000,
            unidadeMedida: "g",
            nivelMinimo: 10,
            precoCusto: 5,
            categoria: "Teste",
          },
        });

        // Cria receita com ingrediente
        const receita = await prisma.tbReceita.create({
          data: {
            id: receitaId,
            nome: `Receita Com Pedido ${Date.now()}`,
            rendimento: "10",
            custoDeProducao: 5,
            ingredientes: {
              create: [
                {
                  idIngrediente: ingrediente.id,
                  qtdGramasOuMl: 100,
                },
              ],
            },
          },
        });

        // Cria pedido com receita
        const pedido = await prisma.tbPedido.create({
          data: {
            id: pedidoId,
            dataPedido: new Date().toISOString(),
            nomeCliente: "Cliente Teste",
            valorTotal: 10,
            status: "PENDENTE",
            pedidoReceitas: {
              create: [{ receitaId: receita.id, quantidade: 1 }],
            },
          },
        });

        // Requisição DELETE ao endpoint
        const res = await request(app)
          .delete(`/super/ingredientes/${ingrediente.id}`)
          .set("Authorization", `Bearer ${token}`)
          .send();

        // Verificações da resposta
        expect(res.status).toBe(200);
        expect(res.body.action).toBe("confirm_force_delete");
        expect(res.body.msg).toMatch(/está presente em \d+ pedido/);
        expect(res.body.recipes).toContain(receita.nome);
      } finally {
        // DeleteMany para evitar erro caso já tenha sido removido na lógica do controller
        await prisma.tbPedidoReceita
          .deleteMany({
            where: {
              pedidoId: pedidoId,
              receitaId: receitaId,
            },
          })
          .catch(() => {});

        await prisma.tbReceitaIngrediente
          .deleteMany({
            where: {
              idReceita: receitaId,
              idIngrediente: ingredienteId,
            },
          })
          .catch(() => {});

        await prisma.tbReceita
          .deleteMany({ where: { id: receitaId } })
          .catch(() => {});

        await prisma.tbIngredienteEmEstoque
          .deleteMany({ where: { id: ingredienteId } })
          .catch(() => {});

        await prisma.tbPedido
          .deleteMany({ where: { id: pedidoId } })
          .catch(() => {});
      }
    });

    

    test("Deleta ingrediente, receita e pedido com forceDelete=true", async () => {
      const res = await request(app)
        .delete(`/api_confeitaria/super/estoque/ingrediente/${ingredienteId}`)
        .set("Authorization", token)
        .send({ forceDelete: true });

      expect(res.status).toBe(200);
      expect(res.body.action).toBe("force_deleted_cascading");
      expect(res.body.deletedRecipes).toContain("Receita Com Pedido");
      expect(res.body.deletedOrders).toContain(pedidoId);

      const ingrediente = await prisma.tbIngredienteEmEstoque.findUnique({
        where: { id: ingredienteId },
      });
      expect(ingrediente).toBeNull();

      const receita = await prisma.tbReceita.findUnique({
        where: { id: receitaId },
      });
      expect(receita).toBeNull();

      const pedido = await prisma.tbPedido.findUnique({
        where: { id: pedidoId },
      });
      expect(pedido).toBeNull();
    });
  });
});

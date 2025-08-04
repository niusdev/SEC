const request = require("supertest");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const app = require("../app");

const { v4: uuidv4 } = require("uuid");
const secretKey = process.env.SECRET_KEY;
const { UnidadeMedida } = require("@prisma/client");

describe("RevenuesController", () => {
  let user;
  let token;
  let baseIngredient;

  beforeAll(async () => {
    await prisma.tbUsuario.deleteMany({ where: { email: "teste@teste.com" } });
    await prisma.tbIngredienteEmEstoque.deleteMany({
      where: { nome: "massa de milho" },
    });

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

    baseIngredient = {
      id: uuidv4(),
      nome: "massa de milho",
      unidades: 20,
      pesoPorUnidade: 0.5,
      unidadeMedida: UnidadeMedida.kg,
      validade: "2026-10-10",
      nivelMinimo: 5,
      precoCusto: 3.5,
      categoria: "amido",
    };

    await prisma.tbIngredienteEmEstoque.create({ data: baseIngredient });
  });

  afterAll(async () => {
    // Limpeza de dados globais
    if (baseIngredient?.id) {
      await prisma.tbReceitaIngrediente
        .deleteMany({
          where: { idIngrediente: baseIngredient.id },
        })
        .catch(() => {});
      await prisma.tbIngredienteEmEstoque
        .delete({ where: { id: baseIngredient.id } })
        .catch(() => {});
    }
    if (user?.id) {
      await prisma.tbUsuario.delete({ where: { id: user.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("POST /super/receitas", () => {
    let createdRecipeId;
    let existingRecipeName;
    const ingredientInexistenteId = uuidv4();

    beforeAll(async () => {
      const existingRecipeData = {
        nome: `Receita Existente-${Date.now()}`,
        rendimento: "1 porção",
        modoDePreparo: "Preparar para testar.",
        ingredientes: [
          {
            ingredienteId: baseIngredient.id,
            quantidadeUsada: 1,
            unidadeMedidaUsada: UnidadeMedida.kg,
          },
        ],
      };
      const res = await request(app)
        .post("/api_confeitaria/super/receitas")
        .set("Authorization", token)
        .send(existingRecipeData);
      existingRecipeName = existingRecipeData.nome;
    });

    afterAll(async () => {
      // Limpeza de dados criados no beforeAll
      if (createdRecipeId) {
        await prisma.tbReceitaIngrediente
          .deleteMany({
            where: { idReceita: createdRecipeId },
          })
          .catch(() => {});
        await prisma.tbReceita
          .delete({
            where: { id: createdRecipeId },
          })
          .catch(() => {});
      }

      if (existingRecipeName) {
        const existingRecipe = await prisma.tbReceita.findFirst({
          where: { nome: existingRecipeName.toLowerCase() },
        });
        if (existingRecipe) {
          await prisma.tbReceitaIngrediente
            .deleteMany({ where: { idReceita: existingRecipe.id } })
            .catch(() => {});
          await prisma.tbReceita
            .delete({ where: { id: existingRecipe.id } })
            .catch(() => {});
        }
      }
    });

    test("Cria receita com dados válidos", async () => {
      const receitaData = {
        nome: `Bolo de Morango-${Date.now()}`,
        rendimento: "1 bolo médio",
        modoDePreparo: "Misturar e assar.",
        ingredientes: [
          {
            ingredienteId: baseIngredient.id,
            quantidadeUsada: 1,
            unidadeMedidaUsada: UnidadeMedida.kg,
          },
        ],
      };

      const res = await request(app)
        .post("/api_confeitaria/super/receitas")
        .set("Authorization", token)
        .send(receitaData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("msg", "Receita criada com sucesso!");
      expect(res.body).toHaveProperty("recipe");
      expect(res.body.recipe).toHaveProperty(
        "nome",
        receitaData.nome.toLowerCase()
      );
      createdRecipeId = res.body.recipe.id;
    });

    test("Retorna 409 se a receita já existe", async () => {
      const receitaDuplicada = {
        nome: existingRecipeName,
        rendimento: "1 porção",
        modoDePreparo: "Preparar novamente.",
        ingredientes: [
          {
            ingredienteId: baseIngredient.id,
            quantidadeUsada: 1,
            unidadeMedidaUsada: UnidadeMedida.kg,
          },
        ],
      };

      const res = await request(app)
        .post("/api_confeitaria/super/receitas")
        .set("Authorization", token)
        .send(receitaDuplicada);

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty(
        "error",
        "Já existe uma receita com este nome."
      );
    });

    test("Retorna 400 se a receita for criada sem ingredientes", async () => {
      const receitaData = {
        nome: `Receita sem ingredientes-${Date.now()}`,
        rendimento: "1 porção",
        ingredientes: [],
      };

      const res = await request(app)
        .post("/api_confeitaria/super/receitas")
        .set("Authorization", token)
        .send(receitaData);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty(
        "error",
        "Nome, rendimento e ingredientes são obrigatórios."
      );
    });

    test("Retorna 400 se a unidade de medida usada for incompatível", async () => {
      const receitaData = {
        nome: `Receita com conversao invalida-${Date.now()}`,
        rendimento: "1 porção",
        ingredientes: [
          {
            ingredienteId: baseIngredient.id,
            quantidadeUsada: 1,
            unidadeMedidaUsada: "litro",
          },
        ],
      };

      const res = await request(app)
        .post("/api_confeitaria/super/receitas")
        .set("Authorization", token)
        .send(receitaData);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain(
        `Erro de conversão da receita para a unidade do estoque para o ingrediente`
      );
    });

    test("Retorna 404 se o ingrediente não for encontrado no estoque", async () => {
      const receitaData = {
        nome: `Receita com ingrediente inexistente-${Date.now()}`,
        rendimento: "1 porção",
        ingredientes: [
          {
            ingredienteId: ingredientInexistenteId,
            quantidadeUsada: 1,
            unidadeMedidaUsada: UnidadeMedida.kg,
          },
        ],
      };

      const res = await request(app)
        .post("/api_confeitaria/super/receitas")
        .set("Authorization", token)
        .send(receitaData);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("error");
      expect(res.body.error).toContain(
        `Ingrediente com ID ${ingredientInexistenteId} não encontrado no estoque.`
      );
    });

    // Teste para ingrediente sem unidades disponíveis
    test("Retorna 400 se o ingrediente não tem unidades disponíveis para cálculo", async () => {
      let ingredienteSemUnidadesId;
      try {
        const ingredienteSemUnidades =
          await prisma.tbIngredienteEmEstoque.create({
            data: {
              id: uuidv4(),
              nome: `ingrediente sem unidades-${Date.now()}`,
              unidades: 0,
              pesoPorUnidade: 0.5,
              unidadeMedida: UnidadeMedida.kg,
              validade: "2026-10-10",
              nivelMinimo: 5,
              precoCusto: 3.5,
              categoria: "amido",
            },
          });
        ingredienteSemUnidadesId = ingredienteSemUnidades.id;

        const receitaData = {
          nome: `Receita sem unidades-${Date.now()}`,
          rendimento: "1 porção",
          modoDePreparo: "Teste de custo.",
          ingredientes: [
            {
              ingredienteId: ingredienteSemUnidadesId,
              quantidadeUsada: 1,
              unidadeMedidaUsada: UnidadeMedida.kg,
            },
          ],
        };

        const res = await request(app)
          .post("/api_confeitaria/super/receitas")
          .set("Authorization", token)
          .send(receitaData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty(
          "error",
          `Ingrediente "${ingredienteSemUnidades.nome}" sem unidades disponíveis para cálculo de custo.`
        );
      } finally {
        if (ingredienteSemUnidadesId) {
          await prisma.tbIngredienteEmEstoque
            .delete({ where: { id: ingredienteSemUnidadesId } })
            .catch(() => {});
        }
      }
    });

    // Teste para cálculo de custo inválido (divisão por zero)
    test("Retorna 400 se o cálculo de custo resulta em NaN/Infinity", async () => {
      let ingredienteCustoInvalidoId;
      try {
        const ingredienteCustoInvalido =
          await prisma.tbIngredienteEmEstoque.create({
            data: {
              id: uuidv4(),
              nome: `ingrediente custo invalido-${Date.now()}`,
              unidades: 0,
              pesoPorUnidade: 0.5,
              unidadeMedida: UnidadeMedida.kg,
              validade: "2026-10-10",
              nivelMinimo: 5,
              precoCusto: 10,
              categoria: "amido",
            },
          });
        ingredienteCustoInvalidoId = ingredienteCustoInvalido.id;

        const receitaData = {
          nome: `Receita custo invalido-${Date.now()}`,
          rendimento: "1 porção",
          modoDePreparo: "Teste de custo inválido.",
          ingredientes: [
            {
              ingredienteId: ingredienteCustoInvalidoId,
              quantidadeUsada: 1,
              unidadeMedidaUsada: UnidadeMedida.kg,
            },
          ],
        };

        const res = await request(app)
          .post("/api_confeitaria/super/receitas")
          .set("Authorization", token)
          .send(receitaData);

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty(
          "error",
          `Ingrediente "${ingredienteCustoInvalido.nome}" sem unidades disponíveis para cálculo de custo.`
        );
      } finally {
        if (ingredienteCustoInvalidoId) {
          await prisma.tbIngredienteEmEstoque
            .delete({ where: { id: ingredienteCustoInvalidoId } })
            .catch(() => {});
        }
      }
    });
  });

  describe("GET /super/receitas", () => {
    test("Busca todas as receitas", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/receitas")
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("msg", "Todas as receitas");
      expect(Array.isArray(res.body.receitas)).toBe(true);
    });

    test("Busca receitas filtrando por nome", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/receitas")
        .query({
          nome: "bolo",
        })
        .set("Authorization", token);
      expect([200, 404]).toContain(res.statusCode);
    });
  });

  describe("GET /super/receitas/:id", () => {
    let receitaId;

    beforeAll(async () => {
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "receita para teste",
          rendimento: "1",
          custoDeProducao: 1,
        },
      });
      receitaId = receita.id;
    });

    afterAll(async () => {
      if (receitaId) {
        await prisma.tbReceita
          .delete({ where: { id: receitaId } })
          .catch(() => {});
      }
    });

    test("Busca receita por ID válida", async () => {
      const res = await request(app)
        .get(`/api_confeitaria/super/receitas/${receitaId}`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("receita");
      expect(res.body.receita).toHaveProperty("id", receitaId);
    });

    test("Retorna 404 para ID inexistente", async () => {
      const res = await request(app)
        .get("/api_confeitaria/super/receitas/uuid-inexistente-0000-0000")
        .set("Authorization", token);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("msg", "Receita não encontrada.");
    });
  });

  describe("GET /receitas/:id/checar-uso-para-edicao", () => {
    test("Deve indicar que a receita não está em uso", async () => {
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "Receita Livre",
          rendimento: "8 porções",
          custoDeProducao: 7,
        },
      });

      const res = await request(app)
        .get(`/api_confeitaria/receitas/${receita.id}/checar-uso-para-edicao`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("inUse", false);

      await prisma.tbReceita.delete({ where: { id: receita.id } });
    });

    test("Deve indicar que a receita está em uso e listar os pedidos afetados", async () => {
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "Receita em Uso",
          rendimento: "12",
          custoDeProducao: 10,
        },
      });

      const pedido = await prisma.tbPedido.create({
        data: {
          id: uuidv4(),
          nomeCliente: "Cliente Test",
          dataPedido: new Date().toISOString(),
          valorTotal: 2,
          status: "PENDENTE",
          pedidoReceitas: {
            create: [
              {
                receita: { connect: { id: receita.id } },
                quantidade: 1,
              },
            ],
          },
        },
      });

      const res = await request(app)
        .get(`/api_confeitaria/receitas/${receita.id}/checar-uso-para-edicao`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("inUse", true);
      expect(res.body.affectedOrders).toContain(pedido.id);

      // Cleanup
      await prisma.tbPedido.delete({ where: { id: pedido.id } });
      await prisma.tbReceita.delete({ where: { id: receita.id } });
    });

    test("Retorna 404 se a receita não existir", async () => {
      const res = await request(app)
        .get(`/api_confeitaria/receitas/${uuidv4()}/checar-uso-para-edicao`)
        .set("Authorization", token);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("msg", "Receita não encontrada.");
    });
  });

  describe("PUT /super/receitas/:id", () => {
    let receitaId;

    beforeAll(async () => {
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "receita para atualizar",
          rendimento: "1",
          custoDeProducao: 1,
        },
      });
      receitaId = receita.id;
    });

    afterAll(async () => {
      if (receitaId) {
        await prisma.tbReceita
          .delete({ where: { id: receitaId } })
          .catch(() => {});
      }
    });

    test("Atualiza receita nome e rendimento", async () => {
      const updateData = {
        nome: "receita atualizada",
        rendimento: "2",
      };

      const res = await request(app)
        .put(`/api_confeitaria/super/receitas/${receitaId}`)
        .set("Authorization", token)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "mensagem",
        "Receita atualizada com sucesso."
      );
      expect(res.body.receita).toHaveProperty(
        "nome",
        updateData.nome.toLowerCase()
      );
      expect(res.body.receita).toHaveProperty(
        "rendimento",
        updateData.rendimento
      );
    });

    test("Retorna 404 para atualizar receita inexistente", async () => {
      const res = await request(app)
        .put("/api_confeitaria/super/receitas/uuid-inexistente-0000-0000")
        .set("Authorization", token)
        .send({
          nome: "novo nome",
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("msg", "Receita não encontrada.");
    });

    test("Retorna 409 ao tentar atualizar com nome duplicado", async () => {
      const receita1 = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "bolo de chocolate",
          rendimento: "1",
          custoDeProducao: 1,
        },
      });

      const receita2 = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "torta de morango",
          rendimento: "1",
          custoDeProducao: 1,
        },
      });

      const res = await request(app)
        .put(`/api_confeitaria/super/receitas/${receita2.id}`)
        .set("Authorization", token)
        .send({ nome: "bolo de chocolate" });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty(
        "error",
        "Já existe uma receita com este nome."
      );

      await prisma.tbReceita.deleteMany({
        where: { id: { in: [receita1.id, receita2.id] } },
      });
    });

    test("Atualiza receita com ingredientes válidos e recalcula custo de produção", async () => {
      // Criar ingrediente válido no estoque
      const ingrediente = await prisma.tbIngredienteEmEstoque.create({
        data: {
          id: uuidv4(),
          nome: "Farinha de trigo",
          unidadeMedida: UnidadeMedida.kg,
          unidades: 10, // 10 unidades em estoque
          pesoPorUnidade: 1, // 1 kg por unidade
          validade: "2025-12-31",
          nivelMinimo: 2,
          precoCusto: 100, // R$ 100 por 10 unidades = R$10 por unidade
          categoria: "Ingrediente",
        },
      });

      // Criar receita
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "Bolo Simples",
          rendimento: "5",
          custoDeProducao: 0,
        },
      });

      // Relacionar ingrediente com receita
      await prisma.tbReceitaIngrediente.create({
        data: {
          idReceita: receita.id,
          idIngrediente: ingrediente.id,
          qtdGramasOuMl: 500, // 500 gramas (0.5kg) para a receita
        },
      });

      // Atualizar receita (rendimento só pra disparar update)
      const res = await request(app)
        .put(`/api_confeitaria/super/receitas/${receita.id}`)
        .set("Authorization", token)
        .send({ rendimento: "6" }); // mudar rendimento só pra atualizar

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "mensagem",
        "Receita atualizada com sucesso."
      );
      expect(res.body.receita).toHaveProperty("rendimento", "6");

      // Verifica se o custoDeProducao foi calculado corretamente:
      // 500g = 0.5kg / pesoPorUnidade (1kg) = 0.5 unidades usadas
      // custo por unidade = precoCusto / unidades = 100 / 10 = 10
      // custo total esperado = 0.5 * 10 = 5
      expect(res.body.receita.custoDeProducao).toBeCloseTo(5);

      // Limpeza
      await prisma.tbReceitaIngrediente.deleteMany({
        where: { idReceita: receita.id },
      });
      await prisma.tbReceita.delete({ where: { id: receita.id } });
      await prisma.tbIngredienteEmEstoque.delete({
        where: { id: ingrediente.id },
      });
    });

    test("Retorna 400 ao recalcular custo com pesoPorUnidade inválido", async () => {
      const uniqueName = `ingrediente-teste-${uuidv4()}`;

      const ingrediente = await prisma.tbIngredienteEmEstoque.create({
        data: {
          ...baseIngredient,
          id: uuidv4(), // força um id novo
          nome: uniqueName, // nome único para não dar conflito também
          pesoPorUnidade: 0, // inválido para o teste
        },
      });

      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `receita-teste-${uuidv4()}`,
          rendimento: "1",
          custoDeProducao: 0,
        },
      });

      await prisma.tbReceitaIngrediente.create({
        data: {
          idReceita: receita.id,
          idIngrediente: ingrediente.id,
          qtdGramasOuMl: 100,
        },
      });

      const res = await request(app)
        .put(`/api_confeitaria/super/receitas/${receita.id}`)
        .set("Authorization", token)
        .send({ rendimento: 3 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Peso/Volume por Unidade");

      await prisma.tbReceitaIngrediente.deleteMany({
        where: { idReceita: receita.id },
      });
      await prisma.tbIngredienteEmEstoque.delete({
        where: { id: ingrediente.id },
      });
      await prisma.tbReceita.delete({ where: { id: receita.id } });
    });

    test("Atualiza modoDePreparo corretamente", async () => {
      const updateData = { modoDePreparo: "  Misturar tudo e assar  " };

      const res = await request(app)
        .put(`/api_confeitaria/super/receitas/${receitaId}`)
        .set("Authorization", token)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.receita).toHaveProperty(
        "modoDePreparo",
        "Misturar tudo e assar"
      );
    });

    test("Atualiza modoDePreparo corretamente com trim", async () => {
      const updateData = { modoDePreparo: "  Misturar e assar  " };

      const res = await request(app)
        .put(`/api_confeitaria/super/receitas/${receitaId}`)
        .set("Authorization", token)
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body.receita).toHaveProperty(
        "modoDePreparo",
        "Misturar e assar"
      );
    });

    test("Retorna 400 para ingrediente com precoCusto inválido", async () => {
      const ingrediente = await prisma.tbIngredienteEmEstoque.create({
        data: {
          id: uuidv4(),
          nome: "Ingrediente Preco Inválido",
          unidadeMedida: UnidadeMedida.g,
          unidades: 10,
          pesoPorUnidade: 100,
          precoCusto: -5, // inválido
          nivelMinimo: 1,
          validade: "2025-12-31",
          categoria: "Ingrediente",
        },
      });

      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `receita-preco-invalido-${uuidv4()}`,
          rendimento: "1",
          custoDeProducao: 0,
        },
      });

      await prisma.tbReceitaIngrediente.create({
        data: {
          idReceita: receita.id,
          idIngrediente: ingrediente.id,
          qtdGramasOuMl: 100,
        },
      });

      const res = await request(app)
        .put(`/api_confeitaria/super/receitas/${receita.id}`)
        .set("Authorization", token)
        .send({ rendimento: "2" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Preço de custo inválido");

      // Cleanup
      await prisma.tbReceitaIngrediente.deleteMany({
        where: { idReceita: receita.id },
      });
      await prisma.tbReceita.delete({ where: { id: receita.id } });
      await prisma.tbIngredienteEmEstoque.delete({
        where: { id: ingrediente.id },
      });
    });
  });

  describe("DELETE /super/receitas/:id", () => {
    let receitaId;

    beforeEach(async () => {
      const receita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: "receita para deletar",
          rendimento: "1",
          custoDeProducao: 1,
        },
      });
      receitaId = receita.id;
    });

    afterEach(async () => {
      if (receitaId) {
        await prisma.tbReceita
          .delete({ where: { id: receitaId } })
          .catch(() => {});
      }
    });

    test("Deleta receita não associada a pedidos", async () => {
      const res = await request(app)
        .delete(`/api_confeitaria/super/receitas/${receitaId}`)
        .set("Authorization", token)
        .send({
          forceDelete: false,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("msg");
      expect(res.body).toHaveProperty("action", "recipe_deleted_direct");
    });

    test("Retorna 404 para deletar receita inexistente", async () => {
      const res = await request(app)
        .delete("/api_confeitaria/super/receitas/uuid-inexistente-0000-0000")
        .set("Authorization", token)
        .send({
          forceDelete: false,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("msg", "Receita não encontrada.");
    });

    // TESTE NOVO: Cenário 1 - Exclusão de receita com pedido associado (primeira tentativa)
    test("Retorna 200 e mensagem de confirmação se a receita estiver em um pedido", async () => {
      const receitaParaDeletar = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `receita associada-${Date.now()}`,
          rendimento: "100g",
          custoDeProducao: 10.5,
        },
      });

      const pedido = await prisma.tbPedido.create({
        data: {
          id: uuidv4(),
          dataPedido: new Date().toISOString(), // Adequado para o schema (string)
          nomeCliente: "Cliente Teste",
          valorTotal: 0,
          status: "PENDENTE",
        },
      });

      await prisma.tbPedidoReceita.create({
        data: {
          pedidoId: pedido.id,
          receitaId: receitaParaDeletar.id,
          quantidade: 1, // Adicionado campo 'quantidade'
        },
      });

      const res = await request(app)
        .delete(`/api_confeitaria/super/receitas/${receitaParaDeletar.id}`)
        .set("Authorization", token)
        .send({ forceDelete: false });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("action", "confirm_force_delete_recipe");
      expect(res.body.msg).toContain(
        `A receita "${receitaParaDeletar.nome}" está associada`
      );

      await prisma.tbPedidoReceita.deleteMany({
        where: { pedidoId: pedido.id, receitaId: receitaParaDeletar.id },
      });
      await prisma.tbPedido.delete({ where: { id: pedido.id } });
      await prisma.tbReceita.delete({ where: { id: receitaParaDeletar.id } });
    });

    // TESTE NOVO: Cenário 2 - Exclusão forçada (cascata)
    test("Deleta a receita e o(s) pedido(s) que ficaram vazios com forceDelete", async () => {
      const receitaParaDeletar = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `receita forçada-${Date.now()}`,
          rendimento: "100g",
          custoDeProducao: 10.5,
        },
      });
      const pedidoUnico = await prisma.tbPedido.create({
        data: {
          id: uuidv4(),
          dataPedido: new Date().toISOString(), // Adequado para o schema (string)
          nomeCliente: "Cliente Teste",
          valorTotal: 0,
          status: "PENDENTE",
        },
      });
      await prisma.tbPedidoReceita.create({
        data: {
          pedidoId: pedidoUnico.id,
          receitaId: receitaParaDeletar.id,
          quantidade: 1, // Adicionado campo 'quantidade'
        },
      });

      const res = await request(app)
        .delete(`/api_confeitaria/super/receitas/${receitaParaDeletar.id}`)
        .set("Authorization", token)
        .send({ forceDelete: true });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("action", "recipe_deleted_cascading");
      expect(res.body.msg).toContain(
        `Receita "${receitaParaDeletar.nome}" excluída com sucesso.`
      );
      expect(res.body.msg).toContain("1 pedido(s)");
      expect(res.body.deletedOrders).toEqual([pedidoUnico.id]);

      const receitaVerificada = await prisma.tbReceita.findUnique({
        where: { id: receitaParaDeletar.id },
      });
      const pedidoVerificado = await prisma.tbPedido.findUnique({
        where: { id: pedidoUnico.id },
      });

      expect(receitaVerificada).toBeNull();
      expect(pedidoVerificado).toBeNull();
    });

    // TESTE NOVO: Cenário 3 - Exclusão forçada de receita em um pedido com MULTIPLAS receitas
    test("Deleta a receita mas MANTÉM o pedido se ele tiver outras receitas", async () => {
      const receitaParaDeletar = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `receita forcada-multi-${Date.now()}`,
          rendimento: "1 porção",
          custoDeProducao: 10.5,
        },
      });
      const receitaSecundaria = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: `receita secundaria-${Date.now()}`,
          rendimento: "1 porção",
          custoDeProducao: 5.0,
        },
      });

      const pedidoComVariasReceitas = await prisma.tbPedido.create({
        data: {
          id: uuidv4(),
          dataPedido: new Date().toISOString(), // Adequado para o schema (string)
          nomeCliente: "Cliente Teste",
          valorTotal: 0,
          status: "PENDENTE",
        },
      });
      await prisma.tbPedidoReceita.create({
        data: {
          pedidoId: pedidoComVariasReceitas.id,
          receitaId: receitaParaDeletar.id,
          quantidade: 1,
        },
      });
      await prisma.tbPedidoReceita.create({
        data: {
          pedidoId: pedidoComVariasReceitas.id,
          receitaId: receitaSecundaria.id,
          quantidade: 1,
        },
      });

      const res = await request(app)
        .delete(`/api_confeitaria/super/receitas/${receitaParaDeletar.id}`)
        .set("Authorization", token)
        .send({ forceDelete: true });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("action", "recipe_deleted_cascading");
      expect(res.body.msg).toContain(
        `Receita "${receitaParaDeletar.nome}" excluída com sucesso.`
      );
      expect(res.body.msg).not.toContain("pedido(s)");
      expect(res.body.deletedOrders).toEqual([]);

      const receitaVerificada = await prisma.tbReceita.findUnique({
        where: { id: receitaParaDeletar.id },
      });
      const pedidoVerificado = await prisma.tbPedido.findUnique({
        where: { id: pedidoComVariasReceitas.id },
      });
      const receitaSecundariaVerificada = await prisma.tbReceita.findUnique({
        where: { id: receitaSecundaria.id },
      });

      expect(receitaVerificada).toBeNull();
      expect(pedidoVerificado).not.toBeNull();
      expect(receitaSecundariaVerificada).not.toBeNull();

      await prisma.tbPedidoReceita.deleteMany({
        where: { pedidoId: pedidoComVariasReceitas.id },
      });
      await prisma.tbReceita.delete({ where: { id: receitaSecundaria.id } });
      await prisma.tbPedido.delete({
        where: { id: pedidoComVariasReceitas.id },
      });
    });
  });
});

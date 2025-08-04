const { PrismaClient, UnidadeMedida } = require("@prisma/client");
const prisma = new PrismaClient();

const { v4: uuidv4 } = require("uuid");

const { convertRecipeUnits } = require("./utils/recipeUnitConverter");

class RevenuesController {
  static async createRecipe(req, res) {
    const { nome, rendimento, modoDePreparo, ingredientes } = req.body;

    try {
      if (!nome || !rendimento || !ingredientes || ingredientes.length === 0) {
        return res
          .status(400)
          .json({ error: "Nome, rendimento e ingredientes são obrigatórios." });
      }

      const nomeMinusculo = nome.toLowerCase();

      const receitaExistente = await prisma.tbReceita.findUnique({
        where: {
          nome: nomeMinusculo,
        },
      });

      if (receitaExistente) {
        return res
          .status(409)
          .json({ error: "Já existe uma receita com este nome." });
      }

      let custoDeProducao = 0;
      const ingredientesParaCriacao = [];

      for (const ingredienteReceita of ingredientes) {
        const { ingredienteId, quantidadeUsada, unidadeMedidaUsada } =
          ingredienteReceita;

        if (
          !ingredienteId ||
          quantidadeUsada === undefined ||
          quantidadeUsada === null ||
          !unidadeMedidaUsada
        ) {
          return res.status(400).json({
            error:
              "Dados incompletos para ingrediente da receita (ingredienteId, quantidadeUsada, unidadeMedidaUsada são obrigatórios).",
          });
        }

        if (quantidadeUsada <= 0) {
          return res.status(400).json({
            error: `Quantidade usada do ingrediente ${ingredienteId} deve ser positiva.`,
          });
        }

        const ingredienteEstoque =
          await prisma.tbIngredienteEmEstoque.findUnique({
            where: { id: ingredienteId },
          });

        if (!ingredienteEstoque) {
          return res.status(404).json({
            error: `Ingrediente com ID ${ingredienteId} não encontrado no estoque.`,
          });
        }

        let quantidadeDeUnidadesNecessarias = 0;
        const baseUnitEstoque = ingredienteEstoque.unidadeMedida;

        if (
          quantidadeUsada === null ||
          quantidadeUsada === undefined ||
          quantidadeUsada <= 0
        ) {
          return res.status(400).json({
            error: `Quantidade usada inválida para o ingrediente "${ingredienteEstoque.nome}" na receita.`,
          });
        }

        if (baseUnitEstoque === UnidadeMedida.un) {
          try {
            quantidadeDeUnidadesNecessarias = convertRecipeUnits(
              quantidadeUsada,
              unidadeMedidaUsada,
              UnidadeMedida.un
            );
          } catch (error) {
            return res.status(400).json({
              error: `Erro de conversão para unidade 'un' para o ingrediente "${ingredienteEstoque.nome}": ${error.message}`,
            });
          }
        } else {
          if (
            ingredienteEstoque.pesoPorUnidade === null ||
            ingredienteEstoque.pesoPorUnidade <= 0
          ) {
            return res.status(400).json({
              error: `"Peso/Volume por Unidade" inválido (${ingredienteEstoque.pesoPorUnidade}) para o ingrediente "${ingredienteEstoque.nome}". É necessário para calcular o custo.`,
            });
          }

          let quantidadeReceitaNaUnidadeEstoque;
          try {
            quantidadeReceitaNaUnidadeEstoque = convertRecipeUnits(
              quantidadeUsada,
              unidadeMedidaUsada,
              baseUnitEstoque
            );
          } catch (error) {
            return res.status(400).json({
              error: `Erro de conversão da receita para a unidade do estoque para o ingrediente "${ingredienteEstoque.nome}": ${error.message}`,
            });
          }

          quantidadeDeUnidadesNecessarias =
            quantidadeReceitaNaUnidadeEstoque /
            ingredienteEstoque.pesoPorUnidade;
        }

        if (
          ingredienteEstoque.precoCusto === null ||
          ingredienteEstoque.precoCusto < 0
        ) {
          return res.status(400).json({
            error: `Preço de custo inválido para o ingrediente "${ingredienteEstoque.nome}".`,
          });
        }
        if (
          ingredienteEstoque.unidades === null ||
          ingredienteEstoque.unidades <= 0
        ) {
          return res.status(400).json({
            error: `Ingrediente "${ingredienteEstoque.nome}" sem unidades disponíveis para cálculo de custo.`,
          });
        }

        const custoPorUnidadeEstoque =
          ingredienteEstoque.precoCusto / ingredienteEstoque.unidades;
        const custoDoItemNaReceita =
          quantidadeDeUnidadesNecessarias * custoPorUnidadeEstoque;

        if (isNaN(custoDoItemNaReceita) || !isFinite(custoDoItemNaReceita)) {
          console.warn(
            `Custo do item na receita para ${ingredienteEstoque.nome} resultou em NaN/Infinity. Qtd Necessaria: ${quantidadeDeUnidadesNecessarias}, Custo Por Unidade Estoque: ${custoPorUnidadeEstoque}`
          );
          return res.status(400).json({
            error: `Não foi possível calcular o custo para o ingrediente "${ingredienteEstoque.nome}". Verifique os valores.`,
          });
        }

        custoDeProducao += custoDoItemNaReceita;

        let qtdUnidadeParaDb = null;
        let qtdGramasOuMlParaDb = null;

        if (["UN"].includes(unidadeMedidaUsada.toUpperCase())) {
          qtdUnidadeParaDb = quantidadeUsada;
        } else if (
          [UnidadeMedida.g, UnidadeMedida.mg, UnidadeMedida.kg].includes(
            unidadeMedidaUsada
          )
        ) {
          qtdGramasOuMlParaDb = convertRecipeUnits(
            quantidadeUsada,
            unidadeMedidaUsada,
            UnidadeMedida.g
          );
        } else if (
          [UnidadeMedida.ml, UnidadeMedida.l].includes(unidadeMedidaUsada)
        ) {
          qtdGramasOuMlParaDb = convertRecipeUnits(
            quantidadeUsada,
            unidadeMedidaUsada,
            UnidadeMedida.ml
          );
        } else {
          console.warn(
            `Unidade de medida usada na receita desconhecida para salvamento no DB: ${unidadeMedidaUsada}`
          );
          if (typeof quantidadeUsada === "number") {
            if (["G", "MG", "KG"].includes(baseUnitEstoque)) {
              qtdGramasOuMlParaDb = convertRecipeUnits(
                quantidadeUsada,
                unidadeMedidaUsada,
                UnidadeMedida.g
              );
            } else if (["ML", "L"].includes(baseUnitEstoque)) {
              qtdGramasOuMlParaDb = convertRecipeUnits(
                quantidadeUsada,
                unidadeMedidaUsada,
                UnidadeMedida.ml
              );
            } else {
              qtdGramasOuMlParaDb = quantidadeUsada;
            }
          }
        }

        ingredientesParaCriacao.push({
          ingrediente: { connect: { id: ingredienteId } },
          qtdUnidade: qtdUnidadeParaDb,
          qtdGramasOuMl: qtdGramasOuMlParaDb,
        });
      }

      const novaReceita = await prisma.tbReceita.create({
        data: {
          id: uuidv4(),
          nome: nomeMinusculo,
          rendimento,
          modoDePreparo: modoDePreparo?.trim() || null,
          custoDeProducao,
          ingredientes: {
            create: ingredientesParaCriacao,
          },
        },
        include: {
          ingredientes: {
            include: {
              ingrediente: true,
            },
          },
        },
      });

      return res.status(201).json({
        msg: "Receita criada com sucesso!", // Adiciona a propriedade 'msg'
        recipe: novaReceita, // E a receita criada
      });
    } catch (error) {
      console.error("Erro ao criar receita:", error);
      let statusCode = 500;
      let errorMessage = "Erro interno do servidor ao criar receita.";

      if (error.message.includes("Já existe uma receita com este nome.")) {
        statusCode = 409;
        errorMessage = error.message;
      } else if (
        error.message.includes("Dados incompletos") ||
        error.message.includes("Quantidade usada do ingrediente") ||
        error.message.includes("não encontrado no estoque") ||
        error.message.includes("Preço de custo inválido") ||
        error.message.includes("Peso/Volume por Unidade") ||
        error.message.includes("sem unidades disponíveis") ||
        error.message.includes("Não foi possível calcular o custo") ||
        error.message.includes("Erro de conversão") ||
        error.message.includes("Unidade de origem desconhecida")
      ) {
        statusCode = 400;
        errorMessage = error.message;
      }
      return res
        .status(statusCode)
        .json({ error: errorMessage, detalhes: error.message });
    }
  }

  static async getRecipes(req, res) {
    try {
      const { nome } = req.query;

      if (nome && nome.trim() !== "") {
        const nomeParaBusca = nome.toLowerCase();
        const receitasFiltradas = await prisma.tbReceita.findMany({
          where: {
            nome: {
              contains: nomeParaBusca,
            },
          },
          include: {
            ingredientes: {
              include: {
                ingrediente: true,
              },
            },
          },
        });
        if (receitasFiltradas.length === 0) {
          return res
            .status(404)
            .json({ msg: "Nenhuma receita encontrada com esse nome." });
        }
        return res
          .status(200)
          .json({ msg: "Receitas encontradas!", receitas: receitasFiltradas });
      }
      const todasReceitas = await prisma.tbReceita.findMany({
        include: {
          ingredientes: {
            include: {
              ingrediente: true,
            },
          },
        },
      });
      return res
        .status(200)
        .json({ msg: "Todas as receitas", receitas: todasReceitas });
    } catch (error) {
      console.error("Erro ao buscar receitas:", error);
      return res
        .status(500)
        .json({ msg: "Erro ao buscar receitas.", erro: error.message });
    }
  }

  static async getRecipeById(req, res) {
    try {
      const { id } = req.params;

      const receita = await prisma.tbReceita.findUnique({
        where: { id },
        include: {
          ingredientes: {
            include: {
              ingrediente: true,
            },
          },
        },
      });

      if (!receita) {
        return res.status(404).json({ msg: "Receita não encontrada." });
      }

      return res.status(200).json({ msg: "Receita encontrada!", receita });
    } catch (error) {
      console.error("Erro ao buscar receita por ID:", error);
      return res
        .status(500)
        .json({ msg: "Erro ao buscar a receita.", erro: error.message });
    }
  }

  static async checkRecipeUsageForEdit(req, res) {
    // ... (esta função permanece inalterada) ...
    const { id } = req.params;

    try {
      const receita = await prisma.tbReceita.findUnique({
        where: { id },
        select: {
          nome: true,
          pedidoReceitas: {
            select: {
              pedidoId: true,
            },
          },
        },
      });

      if (!receita) {
        return res.status(404).json({ msg: "Receita não encontrada." });
      }

      if (receita.pedidoReceitas.length > 0) {
        // Recipe is in use in orders
        const uniqueOrderIds = [
          ...new Set(receita.pedidoReceitas.map((pr) => pr.pedidoId)),
        ];
        return res.status(200).json({
          inUse: true,
          msg: `A receita "${receita.nome}" está associada a ${uniqueOrderIds.length} pedido(s).`,
          affectedOrders: uniqueOrderIds,
        });
      } else {
        // Recipe is not in use in any order
        return res.status(200).json({
          inUse: false,
          msg: `A receita "${receita.nome}" não está associada a nenhum pedido.`,
        });
      }
    } catch (error) {
      console.error("Erro ao verificar uso da receita para edição:", error);
      return res.status(500).json({
        error: "Erro interno do servidor ao verificar o uso da receita.",
        detalhes: error.message,
      });
    }
  }

  static async updateRecipe(req, res) {
    const { id } = req.params;
    const { nome, rendimento, modoDePreparo } = req.body;

    try {
      // Buscar receita existente com ingredientes incluídos
      const receitaExistente = await prisma.tbReceita.findUnique({
        where: { id },
        include: { ingredientes: true },
      });

      if (!receitaExistente) {
        return res.status(404).json({ msg: "Receita não encontrada." });
      }

      // Iniciar transação para garantir atomicidade da atualização
      const receitaAtualizada = await prisma.$transaction(async (tx) => {
        const dataParaAtualizacao = {};
        let custoDeProducao = 0;

        // Atualização nome com verificação de duplicidade
        if (nome !== undefined) {
          const nomeMinusculo = nome.toLowerCase();
          if (nomeMinusculo !== receitaExistente.nome) {
            const nomeDuplicado = await tx.tbReceita.findUnique({
              where: { nome: nomeMinusculo },
            });
            if (nomeDuplicado && nomeDuplicado.id !== id) {
              throw new Error("Já existe uma receita com este nome.");
            }
            dataParaAtualizacao.nome = nomeMinusculo;
          }
        }

        if (rendimento !== undefined) {
          dataParaAtualizacao.rendimento = rendimento;
        }

        if (modoDePreparo !== undefined) {
          dataParaAtualizacao.modoDePreparo = modoDePreparo?.trim() || null;
        }

        // Obter ingredientes atuais da receita com dados completos
        const currentRecipeIngredients = await tx.tbReceitaIngrediente.findMany(
          {
            where: { idReceita: id },
            include: { ingrediente: true },
          }
        );

        // Calcular custo de produção acumulado
        for (const item of currentRecipeIngredients) {
          const { idIngrediente, qtdUnidade, qtdGramasOuMl, ingrediente } =
            item;

          if (!ingrediente) {
            console.warn(
              `Ingrediente com ID ${idIngrediente} não encontrado para cálculo da receita ${id}.`
            );
            continue;
          }

          let quantidadeDeUnidadesNecessarias = 0;
          const baseUnitEstoque = ingrediente.unidadeMedida;

          // Determinar a quantidade e unidade para conversão
          let quantidadeParaConversao;
          let unidadeParaConversao;

          if (qtdUnidade !== null) {
            quantidadeParaConversao = qtdUnidade;
            unidadeParaConversao = UnidadeMedida.un;
          } else if (qtdGramasOuMl !== null) {
            quantidadeParaConversao = qtdGramasOuMl;

            if (
              [UnidadeMedida.g, UnidadeMedida.kg, UnidadeMedida.mg].includes(
                baseUnitEstoque
              )
            ) {
              unidadeParaConversao = UnidadeMedida.g;
            } else if (
              [UnidadeMedida.ml, UnidadeMedida.l].includes(baseUnitEstoque)
            ) {
              unidadeParaConversao = UnidadeMedida.ml;
            } else {
              throw new Error(
                `Não foi possível inferir a unidade de origem para qtdGramasOuMl para o ingrediente "${ingrediente.nome}".`
              );
            }
          } else {
            throw new Error(
              `Quantidade usada inválida para o ingrediente "${ingrediente.nome}" na receita.`
            );
          }

          if (
            quantidadeParaConversao === null ||
            quantidadeParaConversao === undefined ||
            quantidadeParaConversao <= 0
          ) {
            throw new Error(
              `Quantidade usada inválida para o ingrediente "${ingrediente.nome}" na receita.`
            );
          }

          if (baseUnitEstoque === UnidadeMedida.un) {
            try {
              quantidadeDeUnidadesNecessarias = convertRecipeUnits(
                quantidadeParaConversao,
                unidadeParaConversao,
                UnidadeMedida.un
              );
            } catch (error) {
              throw new Error(
                `Erro de conversão para unidade 'un' para o ingrediente "${ingrediente.nome}": ${error.message}`
              );
            }
          } else {
            if (
              ingrediente.pesoPorUnidade === null ||
              ingrediente.pesoPorUnidade <= 0
            ) {
              throw new Error(
                `"Peso/Volume por Unidade" inválido (${ingrediente.pesoPorUnidade}) para o ingrediente "${ingrediente.nome}". É necessário para calcular o custo.`
              );
            }

            let quantidadeReceitaNaUnidadeEstoque;
            try {
              quantidadeReceitaNaUnidadeEstoque = convertRecipeUnits(
                quantidadeParaConversao,
                unidadeParaConversao,
                baseUnitEstoque
              );
            } catch (error) {
              throw new Error(
                `Erro de conversão da receita para a unidade do estoque para o ingrediente "${ingrediente.nome}": ${error.message}`
              );
            }

            quantidadeDeUnidadesNecessarias =
              quantidadeReceitaNaUnidadeEstoque / ingrediente.pesoPorUnidade;
          }

          if (ingrediente.precoCusto === null || ingrediente.precoCusto < 0) {
            throw new Error(
              `Preço de custo inválido para o ingrediente "${ingrediente.nome}".`
            );
          }
          if (ingrediente.unidades === null || ingrediente.unidades <= 0) {
            throw new Error(
              `Ingrediente "${ingrediente.nome}" sem unidades disponíveis para cálculo de custo.`
            );
          }

          const custoPorUnidadeEstoque =
            ingrediente.precoCusto / ingrediente.unidades;
          const custoDoItemNaReceita =
            quantidadeDeUnidadesNecessarias * custoPorUnidadeEstoque;

          if (isNaN(custoDoItemNaReceita) || !isFinite(custoDoItemNaReceita)) {
            console.warn(
              `Custo do item na receita para ${ingrediente.nome} resultou em NaN/Infinity. Qtd Necessaria: ${quantidadeDeUnidadesNecessarias}, Custo Por Unidade Estoque: ${custoPorUnidadeEstoque}`
            );
            throw new Error(
              `Não foi possível calcular o custo para o ingrediente "${ingrediente.nome}". Verifique os valores.`
            );
          }

          custoDeProducao += custoDoItemNaReceita;
        }

        dataParaAtualizacao.custoDeProducao = custoDeProducao;

        return await tx.tbReceita.update({
          where: { id },
          data: dataParaAtualizacao,
        });
      });

      return res.status(200).json({
        mensagem: "Receita atualizada com sucesso.",
        receita: receitaAtualizada,
      });
    } catch (erro) {
      //console.error("Erro ao atualizar receita:", erro);
      let statusCode = 500;
      let errorMessage = "Erro interno do servidor ao atualizar a receita.";

      if (erro.message.includes("Receita não encontrada")) {
        statusCode = 404;
        errorMessage = "Receita não encontrada.";
      } else if (
        erro.message.includes("Já existe uma receita com este nome.")
      ) {
        statusCode = 409;
        errorMessage = erro.message;
      } else if (
        erro.message.includes("Preço de custo inválido") ||
        erro.message.includes("Preço de custo para o ingrediente") ||
        erro.message.includes("Quantidade usada inválida") ||
        erro.message.includes("Peso/Volume por Unidade") ||
        erro.message.includes("sem unidades disponíveis") ||
        erro.message.includes("Erro de conversão") ||
        erro.message.includes("Unidade de origem desconhecida")
      ) {
        statusCode = 400;
        errorMessage = erro.message;
      }

      return res.status(statusCode).json({
        error: errorMessage,
        detalhes: erro.message,
      });
    }
  }

  static async deleteRecipe(req, res) {
    const { id } = req.params;
    const { forceDelete } = req.body; // Capture the forceDelete flag from the request body

    try {
      const receitaExistente = await prisma.tbReceita.findUnique({
        where: { id },
        select: {
          nome: true,
          // Select related orders to check for associations
          pedidoReceitas: {
            select: {
              pedidoId: true,
              // We need to know if the order has other recipes after this one is removed
              pedido: {
                select: {
                  pedidoReceitas: {
                    select: { receitaId: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!receitaExistente) {
        return res.status(404).json({ msg: "Receita não encontrada." });
      }

      // Get unique order IDs associated with this recipe
      const ordersUsingRecipe = receitaExistente.pedidoReceitas;
      const uniqueOrderIdsAffected = [
        ...new Set(ordersUsingRecipe.map((pr) => pr.pedidoId)),
      ];

      if (ordersUsingRecipe.length > 0) {
        // Scenario 1: Recipe is associated with one or more orders
        if (!forceDelete) {
          // First call: Return a warning message for frontend confirmation modal
          return res.status(200).json({
            msg: `A receita "${receitaExistente.nome}" está associada a ${uniqueOrderIdsAffected.length} pedido(s). Deseja realmente excluí-la? Isso a removerá dos pedidos e, se for a única receita de um pedido, o pedido também será excluído.`,
            action: "confirm_force_delete_recipe", // Tells frontend to show a confirmation modal
            orders: uniqueOrderIdsAffected, // Optionally, send the list of affected order IDs
          });
        } else {
          // Second call with 'forceDelete: true': Proceed with cascading deletion
          await prisma.$transaction(async (tx) => {
            const deletedOrders = [];

            // 1. Process related orders
            for (const pr of ordersUsingRecipe) {
              const pedidoId = pr.pedidoId;

              // Delete the specific association between this recipe and the order
              await tx.tbPedidoReceita.delete({
                where: {
                  pedidoId_receitaId: {
                    // Composite key for deletion
                    pedidoId: pedidoId,
                    receitaId: id,
                  },
                },
              });

              // Check if the order now has no remaining recipes
              const remainingRecipesInOrder = await tx.tbPedidoReceita.count({
                where: { pedidoId: pedidoId },
              });

              if (remainingRecipesInOrder === 0) {
                // If the order is empty, delete the order
                await tx.tbPedido.delete({
                  where: { id: pedidoId },
                });
                deletedOrders.push(pedidoId); // Collect deleted order IDs
              }
            }

            // 2. Delete all ingredient associations for this recipe
            await tx.tbReceitaIngrediente.deleteMany({
              where: { idReceita: id },
            });

            // 3. Finally, delete the recipe itself
            await tx.tbReceita.delete({
              where: { id: id },
            });

            let successMsg = `Receita "${receitaExistente.nome}" excluída com sucesso.`;
            if (deletedOrders.length > 0) {
              successMsg += ` ${
                deletedOrders.length
              } pedido(s) (${deletedOrders.join(
                ", "
              )}) também foram excluídos por ficarem vazios.`;
            }

            return res.status(200).json({
              msg: successMsg,
              action: "recipe_deleted_cascading",
              deletedOrders: deletedOrders, // Return list of affected orders if needed
            });
          });
        }
      } else {
        // Scenario 2: Recipe is NOT associated with any orders (direct deletion)
        await prisma.$transaction(async (tx) => {
          await tx.tbReceitaIngrediente.deleteMany({
            where: { idReceita: id },
          });

          // Then delete the recipe itself
          await tx.tbReceita.delete({ where: { id } });
        });

        return res.status(200).json({
          msg: `Receita "${receitaExistente.nome}" deletada com sucesso!`,
          action: "recipe_deleted_direct",
        });
      }
      //da linha 683 até até a 695 estão descobertas
    } catch (error) {
      console.error("Erro ao excluir receita:", error);
      // General error handling
      let statusCode = 500;
      let errorMessage = "Erro interno do servidor ao excluir a receita.";

      if (error.code === "P2025") {
        // Prisma error for record not found
        statusCode = 404;
        errorMessage = "Receita não encontrada.";
      }
      // You might have specific error messages for other conditions if needed.

      return res.status(statusCode).json({
        error: errorMessage,
        detalhes: error.message, // Provide technical details for debugging
      });
    }
  }
}

module.exports = RevenuesController;

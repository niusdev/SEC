const { PrismaClient, StatusPedido } = require("@prisma/client");
const prisma = new PrismaClient();
const { v4: uuidv4 } = require("uuid");
const convertToBase = require("./utils/convertToBase");

class OrderController {
  static async createOrder(req, res) {
    const { nomeCliente, receitas } = req.body;
    const dataPedido = new Date().toISOString();

    try {
      // 1. Validações Iniciais
      if (
        !nomeCliente ||
        !receitas ||
        !Array.isArray(receitas) ||
        receitas.length === 0
      ) {
        return res.status(400).json({
          msg: "Nome do cliente e pelo menos uma receita são obrigatórios.",
        });
      }

      const nomeClienteMinusculo = nomeCliente.toLowerCase();

      let valorTotalPedido = 0;
      const receitasParaPedido = [];
      const ingredientesNecessariosAcumulados = new Map(); // idIngrediente -> { nome, unidadeMedidaEstoque, estoqueAtualUnidades, estoqueAtualQuantidadeTotal, pesoPorUnidadeEstoque, totalUnidadesFisicasNecessaria, totalQuantidadeNecessariaBaseReceita }

      // 2. Pré-cálculo e Acúmulo de Necessidades de Ingredientes
      for (const itemPedido of receitas) {
        const { receitaId, qtd } = itemPedido;

        if (!receitaId || !qtd || qtd <= 0) {
          return res.status(422).json({
            msg: `Dados inválidos para uma das receitas (receitaId e qtd > 0 são obrigatórios). Receita ID: ${receitaId}`,
          });
        }

        const receita = await prisma.tbReceita.findUnique({
          where: { id: receitaId },
          include: {
            ingredientes: {
              include: {
                ingrediente: true,
              },
            },
          },
        });

        if (!receita) {
          return res
            .status(404)
            .json({ msg: `Receita com ID ${receitaId} não encontrada.` });
        }
        if (receita.custoDeProducao === null) {
          return res.status(400).json({
            msg: `Receita "${receita.nome}" não possui custo de produção definido. Impossível calcular valor total.`,
          });
        }

        valorTotalPedido += receita.custoDeProducao * qtd;
        receitasParaPedido.push({ receitaId: receita.id, quantidade: qtd });

        for (const ingredienteDaReceita of receita.ingredientes) {
          const ingredienteEstoque = ingredienteDaReceita.ingrediente;
          const ingredienteId = ingredienteEstoque.id;

          const qtdUnidadeNecessariaDaReceita =
            ingredienteDaReceita.qtdUnidade || 0; // Quantidade de "unidades" diretas
          const qtdGramasOuMlNecessariaDaReceita =
            ingredienteDaReceita.qtdGramasOuMl || 0; // Quantidade em gramas/ml que a receita precisa

          if (!ingredientesNecessariosAcumulados.has(ingredienteId)) {
            ingredientesNecessariosAcumulados.set(ingredienteId, {
              nome: ingredienteEstoque.nome,
              unidadeMedidaEstoque: ingredienteEstoque.unidadeMedida,
              estoqueAtualUnidades: ingredienteEstoque.unidades,
              estoqueAtualQuantidadeTotal: ingredienteEstoque.quantidade, // 'quantidade' no estoque
              pesoPorUnidadeEstoque: ingredienteEstoque.pesoPorUnidade, // Peso/volume de UMA unidade física
              totalUnidadesFisicasNecessaria: 0, // Para ingredientes 'un'
              totalQuantidadeNecessariaBaseReceita: 0, // Para ingredientes g, ml, etc. (em gramas ou ml)
            });
          }
          const acumulado =
            ingredientesNecessariosAcumulados.get(ingredienteId);

          if (ingredienteEstoque.unidadeMedida === "un") {
            // Se o ingrediente em estoque é do tipo 'un', a receita também deve pedir em 'un'
            acumulado.totalUnidadesFisicasNecessaria +=
              qtdUnidadeNecessariaDaReceita * qtd;
          } else {
            // Se o ingrediente em estoque não é 'un', a receita pede em gramas/ml
            acumulado.totalQuantidadeNecessariaBaseReceita +=
              qtdGramasOuMlNecessariaDaReceita * qtd;
          }
        }
      }

      // 3. Verificar o estoque consolidado antes de qualquer alteração
      const faltando = [];
      for (const [
        ingredienteId,
        dadosAcumulados,
      ] of ingredientesNecessariosAcumulados) {
        const {
          nome,
          unidadeMedidaEstoque,
          estoqueAtualUnidades,
          estoqueAtualQuantidadeTotal,
          pesoPorUnidadeEstoque,
          totalUnidadesFisicasNecessaria,
          totalQuantidadeNecessariaBaseReceita,
        } = dadosAcumulados;

        if (unidadeMedidaEstoque === "un") {
          if (totalUnidadesFisicasNecessaria > estoqueAtualUnidades) {
            faltando.push({
              nome: nome,
              unidadeMedida: "un",
              necessario: totalUnidadesFisicasNecessaria,
              emEstoque: estoqueAtualUnidades,
              falta: totalUnidadesFisicasNecessaria - estoqueAtualUnidades,
            });
          }
        } else {
          // Para ingredientes g, ml, kg, l, mg:
          // Converte o pesoPorUnidade do estoque para a mesma base (gramas ou ml) para calcular as unidades físicas necessárias
          const pesoPorUnidadeEstoqueNaBase = convertToBase(
            pesoPorUnidadeEstoque,
            unidadeMedidaEstoque
          );
          const unidadesFisicasNecessariasCalculado =
            totalQuantidadeNecessariaBaseReceita /
            (pesoPorUnidadeEstoqueNaBase || 1);

          if (unidadesFisicasNecessariasCalculado > estoqueAtualUnidades) {
            // Compare com 'unidades' no estoque
            faltando.push({
              nome: nome,
              unidadeMedida: unidadeMedidaEstoque, // Unidade original para exibição
              necessario: totalQuantidadeNecessariaBaseReceita, // Valor na unidade base da receita
              emEstoque: estoqueAtualQuantidadeTotal, // Valor total em estoque (unidades * pesoPorUnidade)
              falta:
                totalQuantidadeNecessariaBaseReceita -
                estoqueAtualQuantidadeTotal,
            });
          }
        }
      }

      if (faltando.length > 0) {
        return res.status(400).json({
          msg: "Estoque insuficiente para realizar o pedido.",
          detalhesFalta: faltando,
        });
      }

      // 4. Iniciar transação para decrementar estoque e criar pedido
      const idPedido = uuidv4();
      const operations = [];

      // Decrementar estoque para cada ingrediente
      for (const [
        ingredienteId,
        dadosAcumulados,
      ] of ingredientesNecessariosAcumulados) {
        const {
          totalUnidadesFisicasNecessaria,
          totalQuantidadeNecessariaBaseReceita,
          unidadeMedidaEstoque,
          pesoPorUnidadeEstoque,
        } = dadosAcumulados;

        if (unidadeMedidaEstoque === "un") {
          operations.push(
            prisma.tbIngredienteEmEstoque.update({
              where: { id: ingredienteId },
              data: {
                unidades: { decrement: totalUnidadesFisicasNecessaria },
                // **REMOVIDO:** Se 'quantidade' é campo derivado, não atualize diretamente aqui.
                // Deixe o DB ou sua camada de modelo gerenciar isso.
              },
            })
          );
        } else {
          // g, ml, kg, l, mg
          // Converte o pesoPorUnidade do estoque para a mesma base (gramas ou ml)
          const pesoPorUnidadeEstoqueNaBase = convertToBase(
            pesoPorUnidadeEstoque,
            unidadeMedidaEstoque
          );
          // Calcula quantas unidades físicas serão decrementadas
          const unidadesFisicasParaDecrementar =
            totalQuantidadeNecessariaBaseReceita /
            (pesoPorUnidadeEstoqueNaBase || 1);

          operations.push(
            prisma.tbIngredienteEmEstoque.update({
              where: { id: ingredienteId },
              data: {
                unidades: { decrement: unidadesFisicasParaDecrementar },
              },
            })
          );
        }
      }

      // Criar o registro do Pedido
      operations.push(
        prisma.tbPedido.create({
          data: {
            id: idPedido,
            dataPedido: dataPedido,
            nomeCliente: nomeClienteMinusculo,
            valorTotal: valorTotalPedido,
            status: StatusPedido.PENDENTE,
          },
        })
      );

      // Criar os registros na tabela de junção tbPedidoReceita
      for (const receitaData of receitasParaPedido) {
        operations.push(
          prisma.tbPedidoReceita.create({
            data: {
              pedidoId: idPedido,
              receitaId: receitaData.receitaId,
              quantidade: receitaData.quantidade,
            },
          })
        );
      }

      await prisma.$transaction(operations);

      res.status(201).json({
        msg: "Pedido criado com sucesso!",
        pedidoId: idPedido,
        valorTotal: valorTotalPedido,
      });
    } catch (error) {
      console.error("Erro ao criar o pedido:", error);
      res.status(500).json({
        msg: "Erro interno do servidor ao criar o pedido.",
        detalhes: error.message,
      });
    }
  }

  static async getOrders(req, res) {
    try {
      const { nomeCliente } = req.query;
      let orders;

      if (nomeCliente && nomeCliente.trim() !== "") {
        const nomeParaBusca = nomeCliente.toLowerCase();
        orders = await prisma.tbPedido.findMany({
          where: {
            nomeCliente: {
              contains: nomeParaBusca,
            },
          },
          include: {
            pedidoReceitas: {
              include: {
                receita: true,
              },
            },
          },
        });

        if (orders.length === 0) {
          return res
            .status(404)
            .json({ msg: "Nenhum pedido encontrado para este cliente." });
        }
      } else {
        orders = await prisma.tbPedido.findMany({
          include: {
            pedidoReceitas: {
              include: {
                receita: true,
              },
            },
          },
        });
      }

      return res
        .status(200)
        .json({ msg: "Pedidos encontrados!", pedidos: orders });
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      return res
        .status(500)
        .json({ msg: "Erro ao buscar pedidos.", erro: error.message });
    }
  }

  static async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const pedido = await prisma.tbPedido.findUnique({
        where: { id },
        include: {
          pedidoReceitas: {
            include: {
              receita: true,
            },
          },
        },
      });

      if (!pedido) {
        return res.status(404).json({ msg: "Pedido não encontrado." });
      }

      return res.status(200).json({ msg: "Pedido encontrado!", pedido });
    } catch (error) {
      console.error("Erro ao buscar pedido por ID:", error);
      return res
        .status(500)
        .json({ msg: "Erro ao buscar o pedido.", erro: error.message });
    }
  }

  static async updateOrder(req, res) {
    const { id } = req.params;
    const { nomeCliente, receitas: novasReceitas } = req.body;

    try {
      const pedidoExistente = await prisma.tbPedido.findUnique({
        where: { id },
        include: {
          pedidoReceitas: {
            include: {
              receita: {
                include: {
                  ingredientes: {
                    include: {
                      ingrediente: true, // Incluir o ingrediente completo
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!pedidoExistente) {
        return res.status(404).json({ error: "Pedido não encontrado." });
      }

      if (["CONCLUIDO", "CANCELADO"].includes(pedidoExistente.status)) {
        return res.status(400).json({
          error: `Pedidos com status '${pedidoExistente.status}' não podem ser editados.`,
        });
      }

      const operations = []; // Array para coletar todas as operações da transação

      // --- 1. Devolver os ingredientes ao estoque das receitas antigas ---
      for (const pr of pedidoExistente.pedidoReceitas) {
        const quantidadeReceitas = pr.quantidade;
        const receitaAntigaDetalhes = pr.receita;

        for (const ingredienteRelacao of receitaAntigaDetalhes.ingredientes) {
          const ingredienteEstoque = ingredienteRelacao.ingrediente;
          const ingredienteId = ingredienteEstoque.id;

          let unidadesParaDevolver = 0;

          if (ingredienteEstoque.unidadeMedida === "un") {
            unidadesParaDevolver =
              (ingredienteRelacao.qtdUnidade || 0) * quantidadeReceitas;
          } else {
            // g, ml, kg, l, mg
            const qtdGramasOuMlParaDevolver =
              (ingredienteRelacao.qtdGramasOuMl || 0) * quantidadeReceitas;
            const pesoPorUnidadeEstoqueNaBase = convertToBase(
              ingredienteEstoque.pesoPorUnidade,
              ingredienteEstoque.unidadeMedida
            );
            // Calcula quantas "unidades físicas" correspondem à quantidade em g/ml
            unidadesParaDevolver =
              qtdGramasOuMlParaDevolver / (pesoPorUnidadeEstoqueNaBase || 1);
          }

          // Incrementa SOMENTE o campo 'unidades'.
          // O campo 'quantidade' será atualizado implicitamente pela lógica do seu modelo.
          operations.push(
            prisma.tbIngredienteEmEstoque.update({
              where: { id: ingredienteId },
              data: {
                unidades: { increment: unidadesParaDevolver },
                // O campo 'quantidade' será recalculado automaticamente ou pela sua lógica de DB
                // Não o alteramos diretamente aqui para respeitar seu modelo
              },
            })
          );
        }
      }

      // --- 2. Remover receitas antigas do pedido ---
      operations.push(
        prisma.tbPedidoReceita.deleteMany({
          where: { pedidoId: id },
        })
      );

      // --- 3. Validar e coletar operações para novas receitas ---
      let novoValorTotalPedido = 0;
      const ingredientesNecessariosAcumulados = new Map(); // Para verificar estoque antes de decrementar

      // Primeiro, acumule as necessidades das novas receitas e adicione as operações de criação de PedidoReceita
      for (const receitaItem of novasReceitas) {
        const { receitaId, quantidade } = receitaItem;

        if (!receitaId || !quantidade || quantidade <= 0) {
          return res.status(422).json({
            msg: `Dados inválidos para uma das novas receitas (receitaId e quantidade > 0 são obrigatórios). Receita ID: ${receitaId}`,
          });
        }

        const receita = await prisma.tbReceita.findUnique({
          where: { id: receitaId },
          include: {
            ingredientes: {
              include: {
                ingrediente: true, // Incluir detalhes atuais do ingrediente no estoque
              },
            },
          },
        });

        if (!receita) {
          return res
            .status(400)
            .json({ error: `Receita ${receitaId} não encontrada.` });
        }
        if (receita.custoDeProducao === null) {
          return res.status(400).json({
            msg: `Receita "${receita.nome}" não possui custo de produção definido.`,
          });
        }

        novoValorTotalPedido += receita.custoDeProducao * quantidade;

        for (const ingredienteDaReceita of receita.ingredientes) {
          const ingredienteEstoque = ingredienteDaReceita.ingrediente;
          const ingredienteId = ingredienteEstoque.id;

          let unidadesNecessariasAcumulado = 0;

          if (ingredienteEstoque.unidadeMedida === "un") {
            unidadesNecessariasAcumulado =
              (ingredienteDaReceita.qtdUnidade || 0) * quantidade;
          } else {
            const qtdGramasOuMlNecessariaDaReceita =
              (ingredienteDaReceita.qtdGramasOuMl || 0) * quantidade;
            const pesoPorUnidadeEstoqueNaBase = convertToBase(
              ingredienteEstoque.pesoPorUnidade,
              ingredienteEstoque.unidadeMedida
            );
            unidadesNecessariasAcumulado =
              qtdGramasOuMlNecessariaDaReceita /
              (pesoPorUnidadeEstoqueNaBase || 1);
          }

          if (!ingredientesNecessariosAcumulados.has(ingredienteId)) {
            ingredientesNecessariosAcumulados.set(ingredienteId, {
              nome: ingredienteEstoque.nome,
              unidadeMedidaEstoque: ingredienteEstoque.unidadeMedida,
              pesoPorUnidadeEstoque: ingredienteEstoque.pesoPorUnidade,
              totalUnidadesFisicasNecessaria: 0,
              totalQuantidadeNecessariaBaseReceita: 0, // Mantemos para feedback ao usuário
            });
          }
          const acumulado =
            ingredientesNecessariosAcumulados.get(ingredienteId);
          acumulado.totalUnidadesFisicasNecessaria +=
            unidadesNecessariasAcumulado;
          // Para o feedback de erro, talvez seja útil ter a quantidade total em g/ml
          acumulado.totalQuantidadeNecessariaBaseReceita +=
            ingredienteEstoque.unidadeMedida === "un"
              ? unidadesNecessariasAcumulado *
                (ingredienteEstoque.pesoPorUnidade || 1)
              : (ingredienteDaReceita.qtdGramasOuMl || 0) * quantidade;
        }

        operations.push(
          prisma.tbPedidoReceita.create({
            data: {
              pedidoId: id,
              receitaId: receitaId,
              quantidade: quantidade,
            },
          })
        );
      }

      // Agora, verificar o estoque consolidado e adicionar operações de decremento
      const faltando = [];
      for (const [
        ingredienteId,
        dadosAcumulados,
      ] of ingredientesNecessariosAcumulados) {
        // É CRÍTICO buscar o estado ATUAL do ingrediente após as devoluções.
        // Isso garante que a verificação de estoque considere o que foi devolvido.
        const ingredienteAtualizadoNoEstoque =
          await prisma.tbIngredienteEmEstoque.findUnique({
            where: { id: ingredienteId },
          });

        if (!ingredienteAtualizadoNoEstoque) {
          return res.status(500).json({
            error: `Ingrediente ${dadosAcumulados.nome} não encontrado no estoque após devolução inicial.`,
          });
        }

        const {
          nome,
          unidadeMedidaEstoque,
          pesoPorUnidadeEstoque,
          totalUnidadesFisicasNecessaria,
          totalQuantidadeNecessariaBaseReceita,
        } = dadosAcumulados;

        if (
          totalUnidadesFisicasNecessaria >
          ingredienteAtualizadoNoEstoque.unidades
        ) {
          // Detalhes da falta para o usuário
          faltando.push({
            nome: nome,
            unidadeMedida: unidadeMedidaEstoque,
            necessario:
              unidadeMedidaEstoque === "un"
                ? totalUnidadesFisicasNecessaria
                : totalQuantidadeNecessariaBaseReceita,
            emEstoque:
              unidadeMedidaEstoque === "un"
                ? ingredienteAtualizadoNoEstoque.unidades
                : ingredienteAtualizadoNoEstoque.quantidade,
            falta:
              unidadeMedidaEstoque === "un"
                ? totalUnidadesFisicasNecessaria -
                  ingredienteAtualizadoNoEstoque.unidades
                : totalQuantidadeNecessariaBaseReceita -
                  ingredienteAtualizadoNoEstoque.quantidade,
          });
        } else {
          // Se há estoque suficiente, adiciona a operação de decremento de UNIDADES
          operations.push(
            prisma.tbIngredienteEmEstoque.update({
              where: { id: ingredienteId },
              data: {
                unidades: { decrement: totalUnidadesFisicasNecessaria },
                // O campo 'quantidade' será recalculado automaticamente ou pela sua lógica de DB
                // Não o alteramos diretamente aqui
              },
            })
          );
        }
      }

      if (faltando.length > 0) {
        // Se falta estoque, a transação falhará e tudo será revertido.
        return res.status(400).json({
          msg: "Estoque insuficiente para as novas receitas.",
          detalhesFalta: faltando,
        });
      }

      // --- 4. Atualizar o pedido principal ---
      operations.push(
        prisma.tbPedido.update({
          where: { id },
          data: {
            nomeCliente: nomeCliente
              ? nomeCliente.toLowerCase()
              : pedidoExistente.nomeCliente,
            valorTotal: novoValorTotalPedido,
          },
        })
      );

      // Executar todas as operações em uma única transação
      await prisma.$transaction(operations);

      res.status(200).json({
        message: "Pedido atualizado com sucesso.",
        pedidoId: id,
        novoValorTotal: novoValorTotalPedido,
      });
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      res.status(500).json({
        error: "Erro interno do servidor ao atualizar pedido.",
        detalhes: error.message,
      });
    }
  }

  static async updateOrderStatus(req, res) {
    const { id } = req.params;
    const { novoStatus } = req.body;
    const { perfil } = req.user;

    try {
      // 1. Busca inicial leve para validação
      const pedidoBasico = await prisma.tbPedido.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!pedidoBasico) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      // Validações de status e perfil
      if (pedidoBasico.status === StatusPedido.CANCELADO) {
        return res.status(400).json({
          error: `Pedidos com status ${pedidoBasico.status} não podem ser modificados.`,
        });
      }

      if (perfil === "FUNCIONARIO_COMUM") {
        return res.status(403).json({
          error: "Você não tem permissão para alterar o status do pedido.",
        });
      }

      if (
        perfil === "SUPERVISOR_JUNIOR" &&
        novoStatus === StatusPedido.CANCELADO
      ) {
        return res
          .status(403)
          .json({ error: "SUPERVISOR_JUNIOR não pode cancelar pedidos." });
      }

      if (!Object.values(StatusPedido).includes(novoStatus)) {
        return res.status(400).json({ error: "Status inválido." });
      }

      const operations = [];

      // 2. Lógica condicional: se o novo status for CANCELADO, execute a busca completa
      // para devolver os ingredientes.
      if (novoStatus === StatusPedido.CANCELADO) {
        const pedidoCompleto = await prisma.tbPedido.findUnique({
          where: { id },
          include: {
            pedidoReceitas: {
              include: {
                receita: {
                  include: {
                    ingredientes: {
                      include: {
                        ingrediente: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!pedidoCompleto) {
          // Caso o pedido tenha sido excluído entre as duas buscas
          return res.status(404).json({ error: "Pedido não encontrado" });
        }

        // Lógica de devolução de ingredientes
        for (const pedidoReceita of pedidoCompleto.pedidoReceitas) {
          const quantidadeReceitasNoPedido = pedidoReceita.quantidade;
          const ingredientesDaReceita = pedidoReceita.receita.ingredientes;

          for (const ingredienteRel of ingredientesDaReceita) {
            const ingredienteEstoque = ingredienteRel.ingrediente;
            let unidadesParaDevolver = 0;

            if (ingredienteEstoque.unidadeMedida === UnidadeMedida.un) {
              unidadesParaDevolver =
                (ingredienteRel.qtdUnidade || 0) * quantidadeReceitasNoPedido;
            } else {
              const qtdTotalReceitaNaBase =
                (ingredienteRel.qtdGramasOuMl || 0) *
                quantidadeReceitasNoPedido;
              const pesoPorUnidadeEstoqueNaBase = convertToBase(
                ingredienteEstoque.pesoPorUnidade,
                ingredienteEstoque.unidadeMedida
              );

              if (pesoPorUnidadeEstoqueNaBase <= 0) {
                throw new Error(
                  `Peso por unidade inválido para ingrediente ${ingredienteEstoque.nome}`
                );
              }
              unidadesParaDevolver =
                qtdTotalReceitaNaBase / pesoPorUnidadeEstoqueNaBase;
            }

            operations.push(
              prisma.tbIngredienteEmEstoque.update({
                where: { id: ingredienteEstoque.id },
                data: {
                  unidades: { increment: unidadesParaDevolver },
                },
              })
            );
          }
        }
      }

      // 3. Adiciona a operação de atualização do status do pedido à transação
      operations.push(
        prisma.tbPedido.update({
          where: { id },
          data: { status: novoStatus },
        })
      );

      // 4. Executa todas as operações em uma única transação
      await prisma.$transaction(operations);

      return res
        .status(200)
        .json({ message: `Status do pedido atualizado para ${novoStatus}.` });
    } catch (error) {
      console.error("Erro ao atualizar status do pedido:", error);
      if (error.message.includes("Peso por unidade inválido")) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({
        error: "Erro interno do servidor ao atualizar status do pedido.",
      });
    }
  }

  static async addRecipeToOrder(req, res) {
    const { id: pedidoId } = req.params;
    const { receitaId, quantidade } = req.body;

    try {
      if (!receitaId || !quantidade || quantidade <= 0) {
        return res
          .status(400)
          .json({ msg: "ID da receita e quantidade (>0) são obrigatórios." });
      }

      const pedido = await prisma.tbPedido.findUnique({
        where: { id: pedidoId },
      });

      if (!pedido) {
        return res.status(404).json({ msg: "Pedido não encontrado." });
      }

      if (["CONCLUIDO", "CANCELADO"].includes(pedido.status)) {
        return res.status(400).json({
          msg: `Não é possível adicionar receita. Pedido com status '${pedido.status}' não pode ser editado.`,
        });
      }

      const receita = await prisma.tbReceita.findUnique({
        where: { id: receitaId },
        include: {
          ingredientes: {
            include: {
              ingrediente: true,
            },
          },
        },
      });

      if (!receita) {
        return res
          .status(404)
          .json({ msg: `Receita com ID ${receitaId} não encontrada.` });
      }
      if (receita.custoDeProducao === null) {
        return res.status(400).json({
          msg: `Receita "${receita.nome}" não possui custo de produção definido. Impossível adicionar ao pedido.`,
        });
      }

      // --- 1. Calcular necessidades de ingredientes para a nova receita ---
      const ingredientesNecessarios = new Map();
      for (const ingredienteDaReceita of receita.ingredientes) {
        const ingredienteEstoque = ingredienteDaReceita.ingrediente;
        const ingredienteId = ingredienteEstoque.id;

        let necessarioUnidadesFisicas = 0;
        let necessarioQuantidadeBase = 0;

        if (ingredienteEstoque.unidadeMedida === "un") {
          necessarioUnidadesFisicas =
            (ingredienteDaReceita.qtdUnidade || 0) * quantidade;
          necessarioQuantidadeBase =
            necessarioUnidadesFisicas *
            (ingredienteEstoque.pesoPorUnidade || 1);
        } else {
          necessarioQuantidadeBase =
            (ingredienteDaReceita.qtdGramasOuMl || 0) * quantidade;
          const pesoPorUnidadeEstoque = convertToBase(
            ingredienteEstoque.pesoPorUnidade,
            ingredienteEstoque.unidadeMedida
          );
          necessarioUnidadesFisicas =
            necessarioQuantidadeBase / (pesoPorUnidadeEstoque || 1);
        }

        if (!ingredientesNecessarios.has(ingredienteId)) {
          ingredientesNecessarios.set(ingredienteId, {
            nome: ingredienteEstoque.nome,
            unidadeMedidaEstoque: ingredienteEstoque.unidadeMedida,
            necessarioUnidadesFisicas: 0,
            necessarioQuantidadeBase: 0,
          });
        }

        const acumulado = ingredientesNecessarios.get(ingredienteId);
        acumulado.necessarioUnidadesFisicas += necessarioUnidadesFisicas;
        acumulado.necessarioQuantidadeBase += necessarioQuantidadeBase;
      }

      // --- 2. Verificar estoque com os dados mais recentes ---
      const faltando = [];
      for (const [ingredienteId, dados] of ingredientesNecessarios) {
        const ingredienteAtualizadoNoEstoque =
          await prisma.tbIngredienteEmEstoque.findUnique({
            where: { id: ingredienteId },
          });

        if (!ingredienteAtualizadoNoEstoque) {
          return res.status(400).json({
            msg: `Ingrediente ${dados.nome} (ID: ${ingredienteId}) não encontrado no estoque.`,
            detalhesFalta: { nome: dados.nome, id: ingredienteId },
          });
        }

        if (
          dados.necessarioUnidadesFisicas >
          ingredienteAtualizadoNoEstoque.unidades
        ) {
          faltando.push({
            nome: dados.nome,
            unidadeMedida: dados.unidadeMedidaEstoque,
            necessario: dados.necessarioUnidadesFisicas,
            emEstoque: ingredienteAtualizadoNoEstoque.unidades,
            falta:
              dados.necessarioUnidadesFisicas -
              ingredienteAtualizadoNoEstoque.unidades,
            necessarioEmBase: dados.necessarioQuantidadeBase,
            emEstoqueEmBase: ingredienteAtualizadoNoEstoque.quantidade,
          });
        }
      }

      if (faltando.length > 0) {
        return res.status(400).json({
          msg: "Estoque insuficiente para adicionar esta receita ao pedido.",
          detalhesFalta: faltando,
        });
      }

      // --- 3. Iniciar transação para atualizar estoque, pedido e tbPedidoReceita ---
      const operations = [];

      for (const [ingredienteId, dados] of ingredientesNecessarios) {
        operations.push(
          prisma.tbIngredienteEmEstoque.update({
            where: { id: ingredienteId },
            data: {
              unidades: { decrement: dados.necessarioUnidadesFisicas },
              quantidade: { decrement: dados.necessarioQuantidadeBase },
            },
          })
        );
      }

      const pedidoReceitaExistente = await prisma.tbPedidoReceita.findUnique({
        where: {
          pedidoId_receitaId: {
            pedidoId: pedidoId,
            receitaId: receitaId,
          },
        },
      });

      if (pedidoReceitaExistente) {
        operations.push(
          prisma.tbPedidoReceita.update({
            where: {
              pedidoId_receitaId: { pedidoId: pedidoId, receitaId: receitaId },
            },
            data: { quantidade: { increment: quantidade } },
          })
        );
      } else {
        operations.push(
          prisma.tbPedidoReceita.create({
            data: {
              pedidoId: pedidoId,
              receitaId: receitaId,
              quantidade: quantidade,
            },
          })
        );
      }

      operations.push(
        prisma.tbPedido.update({
          where: { id: pedidoId },
          data: {
            valorTotal: { increment: receita.custoDeProducao * quantidade },
          },
        })
      );

      await prisma.$transaction(operations);

      const pedidoAtualizado = await prisma.tbPedido.findUnique({
        where: { id: pedidoId },
        include: { pedidoReceitas: { include: { receita: true } } },
      });

      res.status(200).json({
        msg: "Receita adicionada/quantidade atualizada no pedido com sucesso!",
        pedido: pedidoAtualizado,
      });
    } catch (error) {
      console.error("Erro ao adicionar receita ao pedido:", error);
      res.status(500).json({
        msg: "Erro interno do servidor ao adicionar receita ao pedido.",
        detalhes: error.message,
      });
    }
  }

  static async updateRecipeQuantityInOrder(req, res) {
    const { id: pedidoId, receitaId } = req.params;
    const { novaQuantidade } = req.body;

    try {
      // Buscar o pedido para verificar status
      const pedidoExistente = await prisma.tbPedido.findUnique({
        where: { id: pedidoId },
        select: { status: true },
      });

      if (!pedidoExistente) {
        return res.status(404).json({ msg: "Pedido não encontrado." });
      }

      if (["CONCLUIDO", "CANCELADO"].includes(pedidoExistente.status)) {
        return res.status(400).json({
          msg: `Pedidos com status '${pedidoExistente.status}' não podem ser editados.`,
        });
      }

      if (
        novaQuantidade === undefined ||
        novaQuantidade === null ||
        novaQuantidade < 0
      ) {
        return res.status(400).json({
          msg: "Nova quantidade deve ser um número positivo ou zero.",
        });
      }

      // Buscar a receita do pedido com seus ingredientes e os detalhes de estoque para cálculo inicial
      const pedidoReceitaExistente = await prisma.tbPedidoReceita.findUnique({
        where: {
          pedidoId_receitaId: {
            pedidoId: pedidoId,
            receitaId: receitaId,
          },
        },
        include: {
          receita: {
            include: {
              ingredientes: {
                include: {
                  ingrediente: true, // Detalhes do ingrediente no estoque
                },
              },
            },
          },
        },
      });

      if (!pedidoReceitaExistente) {
        return res
          .status(404)
          .json({ msg: "Receita não encontrada neste pedido." });
      }

      const quantidadeAntiga = pedidoReceitaExistente.quantidade;
      const receitaDetalhes = pedidoReceitaExistente.receita;

      if (receitaDetalhes.custoDeProducao === null) {
        return res.status(400).json({
          msg: `Receita "${receitaDetalhes.nome}" não possui custo de produção definido. Impossível recalcular valor total.`,
        });
      }

      const diffQuantidade = novaQuantidade - quantidadeAntiga;

      if (diffQuantidade === 0) {
        // Fetch current order details to return
        const currentOrder = await prisma.tbPedido.findUnique({
          where: { id: pedidoId },
          include: { pedidoReceitas: { include: { receita: true } } },
        });
        return res.status(200).json({
          msg: "Nenhuma mudança na quantidade da receita.",
          pedido: currentOrder,
        });
      }

      // --- Calcular as necessidades/devoluções de ingrediente baseadas na diferença ---
      const ingredientesParaAtualizar = new Map(); // idIngrediente -> { nome, unidadeMedidaEstoque, pesoPorUnidadeEstoque, unidadesFisicasChange, quantidadeBaseReceitaChange }

      for (const ingredienteDaReceita of receitaDetalhes.ingredientes) {
        const ingredienteEstoque = ingredienteDaReceita.ingrediente; // Detalhes do ingrediente do estoque (não o estado atual)
        const ingredienteId = ingredienteEstoque.id;

        let unidadesPorReceita = 0;
        let quantidadeBasePorReceita = 0;

        if (ingredienteEstoque.unidadeMedida === "un") {
          unidadesPorReceita = ingredienteDaReceita.qtdUnidade || 0;
          quantidadeBasePorReceita =
            unidadesPorReceita * (ingredienteEstoque.pesoPorUnidade || 1); // Calcula equivalente em g/ml
        } else {
          quantidadeBasePorReceita = ingredienteDaReceita.qtdGramasOuMl || 0;
          const pesoPorUnidadeEstoqueNaBase = convertToBase(
            ingredienteEstoque.pesoPorUnidade,
            ingredienteEstoque.unidadeMedida
          );
          unidadesPorReceita =
            quantidadeBasePorReceita / (pesoPorUnidadeEstoqueNaBase || 1);
        }

        if (!ingredientesParaAtualizar.has(ingredienteId)) {
          ingredientesParaAtualizar.set(ingredienteId, {
            nome: ingredienteEstoque.nome,
            unidadeMedidaEstoque: ingredienteEstoque.unidadeMedida,
            pesoPorUnidadeEstoque: ingredienteEstoque.pesoPorUnidade,
            unidadesFisicasChange: 0,
            quantidadeBaseReceitaChange: 0, // Para feedback e, se necessário, para o campo 'quantidade'
          });
        }
        const acumulado = ingredientesParaAtualizar.get(ingredienteId);
        acumulado.unidadesFisicasChange += unidadesPorReceita * diffQuantidade;
        acumulado.quantidadeBaseReceitaChange +=
          quantidadeBasePorReceita * diffQuantidade;
      }

      // --- Verificar estoque (se for um decremento - diffQuantidade < 0) ---
      const faltando = [];
      for (const [ingredienteId, dados] of ingredientesParaAtualizar) {
        // **CRÍTICO:** Buscar o estado ATUAL do ingrediente no estoque para verificação precisa
        const ingredienteAtualizadoNoEstoque =
          await prisma.tbIngredienteEmEstoque.findUnique({
            where: { id: ingredienteId },
            select: { unidades: true, quantidade: true, unidadeMedida: true }, // Otimizar select
          });

        if (!ingredienteAtualizadoNoEstoque) {
          throw new Error(
            `Ingrediente ${dados.nome} (ID: ${ingredienteId}) não encontrado no estoque.`
          );
        }

        if (dados.unidadesFisicasChange < 0) {
          // Se a mudança implica em um decremento (consumo líquido)
          // Verifica se o estoque atual (unidades) é suficiente para o consumo
          if (
            ingredienteAtualizadoNoEstoque.unidades +
              dados.unidadesFisicasChange <
            0
          ) {
            faltando.push({
              nome: dados.nome,
              unidadeMedida: dados.unidadeMedidaEstoque,
              necessarioRemoverUnidades: Math.abs(dados.unidadesFisicasChange),
              emEstoqueUnidades: ingredienteAtualizadoNoEstoque.unidades,
              faltaUnidades:
                Math.abs(dados.unidadesFisicasChange) -
                ingredienteAtualizadoNoEstoque.unidades,
              necessarioRemoverEmBase: Math.abs(
                dados.quantidadeBaseReceitaChange
              ),
              emEstoqueEmBase: ingredienteAtualizadoNoEstoque.quantidade,
            });
          }
        }
      }

      if (faltando.length > 0) {
        return res.status(400).json({
          msg: "Estoque insuficiente para atualizar a quantidade da receita.",
          detalhesFalta: faltando,
        });
      }

      const operations = []; // Array para coletar todas as operações da transação

      // --- Atualizar estoque ---
      for (const [ingredienteId, dados] of ingredientesParaAtualizar) {
        operations.push(
          prisma.tbIngredienteEmEstoque.update({
            where: { id: ingredienteId },
            data: {
              unidades: { increment: dados.unidadesFisicasChange },
            },
          })
        );
      }

      // --- Atualizar ou deletar a tbPedidoReceita ---
      if (novaQuantidade === 0) {
        operations.push(
          prisma.tbPedidoReceita.delete({
            where: {
              pedidoId_receitaId: {
                pedidoId: pedidoId,
                receitaId: receitaId,
              },
            },
          })
        );
      } else {
        operations.push(
          prisma.tbPedidoReceita.update({
            where: {
              pedidoId_receitaId: {
                pedidoId: pedidoId,
                receitaId: receitaId,
              },
            },
            data: { quantidade: novaQuantidade },
          })
        );
      }

      // --- Atualizar o valor total do pedido ---
      const valorTotalReceitaChange =
        receitaDetalhes.custoDeProducao * diffQuantidade;
      operations.push(
        prisma.tbPedido.update({
          where: { id: pedidoId },
          data: { valorTotal: { increment: valorTotalReceitaChange } },
        })
      );

      // Executar todas as operações em uma única transação
      await prisma.$transaction(operations);

      const pedidoAtualizado = await prisma.tbPedido.findUnique({
        where: { id: pedidoId },
        include: { pedidoReceitas: { include: { receita: true } } },
      });

      res.status(200).json({
        msg: "Quantidade da receita no pedido atualizada com sucesso!",
        pedido: pedidoAtualizado,
      });
    } catch (error) {
      console.error(
        "Erro ao atualizar a quantidade da receita no pedido:",
        error
      );
      res.status(500).json({
        msg: "Erro interno do servidor ao atualizar a quantidade da receita no pedido.",
        detalhes: error.message,
      });
    }
  }

  static async removeRecipeFromOrder(req, res) {
    const { id: pedidoId, receitaId } = req.params;

    try {
      // 1. Validar status do pedido
      const pedidoExistente = await prisma.tbPedido.findUnique({
        where: { id: pedidoId },
        select: { status: true },
      });

      if (!pedidoExistente) {
        return res.status(404).json({ msg: "Pedido não encontrado." });
      }

      if (["CONCLUIDO", "CANCELADO"].includes(pedidoExistente.status)) {
        return res.status(400).json({
          msg: `Pedidos com status '${pedidoExistente.status}' não podem ser editados.`,
        });
      }

      // 2. Buscar a receita associada ao pedido
      const pedidoReceitaExistente = await prisma.tbPedidoReceita.findUnique({
        where: {
          pedidoId_receitaId: {
            pedidoId: pedidoId,
            receitaId: receitaId,
          },
        },
        include: {
          receita: {
            include: {
              ingredientes: {
                include: {
                  ingrediente: true, // Necessário para os detalhes do ingrediente
                },
              },
            },
          },
        },
      });

      if (!pedidoReceitaExistente) {
        return res
          .status(404)
          .json({ msg: "Receita não encontrada neste pedido." });
      }

      const quantidadeRemovida = pedidoReceitaExistente.quantidade;
      const receitaDetalhes = pedidoReceitaExistente.receita;

      if (receitaDetalhes.custoDeProducao === null) {
        return res.status(400).json({
          msg: `Receita "${receitaDetalhes.nome}" não possui custo de produção definido. Impossível recalcular valor total.`,
        });
      }

      const operations = [];

      // 3. Devolver ingredientes ao estoque (apenas o campo 'unidades' é incrementado)
      for (const ingredienteDaReceita of receitaDetalhes.ingredientes) {
        const ingredienteEstoque = ingredienteDaReceita.ingrediente; // Detalhes do ingrediente
        const ingredienteId = ingredienteEstoque.id;

        let unidadesParaDevolver = 0;
        // Não precisamos de qtdGramasOuMlParaDevolver se 'quantidade' for derivado

        if (ingredienteEstoque.unidadeMedida === "un") {
          unidadesParaDevolver =
            (ingredienteDaReceita.qtdUnidade || 0) * quantidadeRemovida;
        } else {
          const qtdGramasOuMlDaReceita =
            ingredienteDaReceita.qtdGramasOuMl || 0;
          const pesoPorUnidadeEstoqueNaBase = convertToBase(
            ingredienteEstoque.pesoPorUnidade,
            ingredienteEstoque.unidadeMedida
          );
          // Calcula quantas unidades físicas serão devolvidas com base no volume/peso
          unidadesParaDevolver =
            (qtdGramasOuMlDaReceita * quantidadeRemovida) /
            (pesoPorUnidadeEstoqueNaBase || 1);
        }

        operations.push(
          prisma.tbIngredienteEmEstoque.update({
            where: { id: ingredienteId },
            data: {
              unidades: { increment: unidadesParaDevolver },
              // **Removido:** Não atualizamos 'quantidade' diretamente se ela for derivada.
              // Seu DB (via trigger ou `GENERATED ALWAYS`) ou outra lógica deve recalcular.
            },
          })
        );
      }

      // 4. Remover a associação da receita com o pedido
      operations.push(
        prisma.tbPedidoReceita.delete({
          where: {
            pedidoId_receitaId: {
              pedidoId: pedidoId,
              receitaId: receitaId,
            },
          },
        })
      );

      // 5. Atualizar o valor total do pedido
      const valorTotalReceitaRemovida =
        receitaDetalhes.custoDeProducao * quantidadeRemovida;
      operations.push(
        prisma.tbPedido.update({
          where: { id: pedidoId },
          data: { valorTotal: { decrement: valorTotalReceitaRemovida } },
        })
      );

      // 6. Executar todas as operações em uma única transação
      await prisma.$transaction(operations);

      // 7. Buscar o pedido atualizado para retornar ao cliente
      const pedidoAtualizado = await prisma.tbPedido.findUnique({
        where: { id: pedidoId },
        include: { pedidoReceitas: { include: { receita: true } } },
      });

      res.status(200).json({
        msg: "Receita removida do pedido com sucesso!",
        pedido: pedidoAtualizado,
      });
    } catch (error) {
      console.error("Erro ao remover receita do pedido:", error);
      res.status(500).json({
        msg: "Erro interno do servidor ao remover receita do pedido.",
        detalhes: error.message,
      });
    }
  }

  static async deleteOrder(req, res) {
    const { id } = req.params;

    try {
      const pedidoExistente = await prisma.tbPedido.findUnique({
        where: { id },
        include: {
          pedidoReceitas: {
            include: {
              receita: {
                include: {
                  ingredientes: {
                    include: {
                      ingrediente: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!pedidoExistente) {
        return res.status(404).json({ msg: "Pedido não encontrado." });
      }

      const operations = [];

      // Devolver os ingredientes ao estoque para cada receita do pedido
      for (const pedidoReceita of pedidoExistente.pedidoReceitas) {
        const receita = pedidoReceita.receita;
        const qtdReceitaNoPedido = pedidoReceita.quantidade;

        for (const itemReceita of receita.ingredientes) {
          const ingredienteEstoque = itemReceita.ingrediente;
          const ingredienteId = ingredienteEstoque.id;

          let unidadesParaDevolver = 0;

          if (ingredienteEstoque.unidadeMedida === "un") {
            unidadesParaDevolver =
              (itemReceita.qtdUnidade || 0) * qtdReceitaNoPedido;
          } else {
            const qtdGramasOuMlDaReceita = itemReceita.qtdGramasOuMl || 0;
            const pesoPorUnidadeEstoqueNaBase = convertToBase(
              ingredienteEstoque.pesoPorUnidade,
              ingredienteEstoque.unidadeMedida
            );
            // Calcula quantas unidades físicas serão devolvidas com base no volume/peso
            unidadesParaDevolver =
              (qtdGramasOuMlDaReceita * qtdReceitaNoPedido) /
              (pesoPorUnidadeEstoqueNaBase || 1);
          }

          operations.push(
            prisma.tbIngredienteEmEstoque.update({
              where: { id: ingredienteId },
              data: {
                unidades: { increment: unidadesParaDevolver },
                // **REMOVIDO:** Se 'quantidade' é campo derivado, não atualize diretamente aqui.
                // Deixe o DB ou sua camada de modelo gerenciar isso.
              },
            })
          );
        }
      }

      // Remover todas as associações entre o pedido e as receitas
      operations.push(
        prisma.tbPedidoReceita.deleteMany({
          where: { pedidoId: id },
        })
      );

      // Excluir o pedido principal
      operations.push(
        prisma.tbPedido.delete({
          where: { id },
        })
      );

      // Executar todas as operações em uma única transação
      await prisma.$transaction(operations);

      res.status(204).send(); // Resposta 204 indica sucesso sem conteúdo
    } catch (error) {
      console.error("Erro ao excluir o pedido:", error);
      res.status(500).json({
        msg: "Erro interno do servidor ao excluir o pedido.",
        detalhes: error.message,
      });
    }
  }
}

module.exports = OrderController;

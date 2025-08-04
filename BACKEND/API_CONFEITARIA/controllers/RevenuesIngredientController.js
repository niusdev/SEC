const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { convertRecipeUnits, UnidadeMedida } = require('./utils/recipeUnitConverter');

class ReceitaIngredienteController {

  static async addIngredientInRecipe(req, res) {
        try {
            const{ idReceita } = req.params
            const {idIngrediente, quantidadeUsada, unidadeMedidaUsada } = req.body;

            if (!idReceita || !idIngrediente || quantidadeUsada === undefined || unidadeMedidaUsada === undefined) {
                return res.status(400).json({ error: "idReceita, idIngrediente, quantidadeUsada e unidadeMedidaUsada são obrigatórios." });
            }
            if (quantidadeUsada <= 0) {
                return res.status(400).json({ error: "A quantidade usada deve ser um valor positivo." });
            }

            // Verificar se já existe
            const existente = await prisma.tbReceitaIngrediente.findUnique({
                where: { idReceita_idIngrediente: { idReceita, idIngrediente } },
            });

            if (existente) {
                return res.status(409).json({ error: "Ingrediente já vinculado à receita." });
            }

            // Buscar informações do ingrediente em estoque para validação
            const ingredienteEstoque = await prisma.tbIngredienteEmEstoque.findUnique({
                where: { id: idIngrediente },
                select: { nome: true, unidadeMedida: true } // Pegar a unidade base do estoque
            });

            if (!ingredienteEstoque) {
                return res.status(404).json({ error: `Ingrediente com ID ${idIngrediente} não encontrado no estoque.` });
            }

            let qtdUnidadeParaDb = null;
            let qtdGramasOuMlParaDb = null;

            // Lógica de validação e atribuição com base na unidade de medida do estoque
            const baseUnit = ingredienteEstoque.unidadeMedida; // Unidade de medida do estoque do ingrediente (ex: 'l', 'kg', 'un')

            if (baseUnit === UnidadeMedida.un) { // Se o ingrediente do estoque é em unidades
                if (unidadeMedidaUsada !== UnidadeMedida.un) {
                    return res.status(400).json({ error: `Ingrediente "${ingredienteEstoque.nome}" é armazenado em unidades. A quantidade usada na receita deve ser em '${UnidadeMedida.un}'.` });
                }
                qtdUnidadeParaDb = quantidadeUsada;
            } else if ([UnidadeMedida.mg, UnidadeMedida.g, UnidadeMedida.kg].includes(baseUnit)) { // Se o ingrediente do estoque é em massa (g/kg/mg)
                if (![UnidadeMedida.mg, UnidadeMedida.g, UnidadeMedida.kg].includes(unidadeMedidaUsada)) {
                    return res.status(400).json({ error: `Ingrediente "${ingredienteEstoque.nome}" é armazenado em massa. A quantidade usada na receita deve ser em '${UnidadeMedida.mg}', '${UnidadeMedida.g}' ou '${UnidadeMedida.kg}'.` });
                }
                // Converte a quantidade usada (e.g., 500g) para a unidade base do estoque (e.g., kg)
                qtdGramasOuMlParaDb = convertRecipeUnits(quantidadeUsada, unidadeMedidaUsada, baseUnit);
            } else if ([UnidadeMedida.ml, UnidadeMedida.l].includes(baseUnit)) { // Se o ingrediente do estoque é em volume (ml/l)
                if (![UnidadeMedida.ml, UnidadeMedida.l].includes(unidadeMedidaUsada)) {
                    return res.status(400).json({ error: `Ingrediente "${ingredienteEstoque.nome}" é armazenado em volume. A quantidade usada na receita deve ser em '${UnidadeMedida.ml}' ou '${UnidadeMedida.l}'.` });
                }
                // Converte a quantidade usada (e.g., 500ml) para a unidade base do estoque (e.g., l)
                qtdGramasOuMlParaDb = convertRecipeUnits(quantidadeUsada, unidadeMedidaUsada, baseUnit);
            } else {
                return res.status(400).json({ error: `Unidade de medida de estoque inválida para ingrediente "${ingredienteEstoque.nome}".` });
            }

            const novoIngrediente = await prisma.tbReceitaIngrediente.create({
                data: {
                    idReceita,
                    idIngrediente,
                    qtdUnidade: qtdUnidadeParaDb,
                    qtdGramasOuMl: qtdGramasOuMlParaDb,
                },
            });

            return res.status(201).json({ message: "Ingrediente adicionado à receita com sucesso!", novoIngrediente });

        } catch (error) {
            console.error("Erro ao adicionar ingrediente na receita:", error);
            // Melhora o retorno de erro para validações
            if (error.message.includes("Não é possível converter") || error.message.includes("deve ser em") || error.message.includes("Unidade de origem desconhecida")) {
                 return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Erro interno ao adicionar ingrediente na receita." });
        }
  }

  static async updateRecipeIngredient(req, res) {
        try {
            const { idReceita, idIngrediente } = req.params;
            const { quantidadeUsada, unidadeMedidaUsada } = req.body;

            if (!idReceita || !idIngrediente) {
                return res.status(400).json({ error: "idReceita e idIngrediente são obrigatórios nos parâmetros." });
            }
            if (quantidadeUsada !== undefined && quantidadeUsada <= 0) {
                return res.status(400).json({ error: "A quantidade usada deve ser um valor positivo." });
            }
            // unidadeMedidaUsada é obrigatória se quantidadeUsada é fornecida, ou se for uma atualização de unidade
            if (quantidadeUsada !== undefined && unidadeMedidaUsada === undefined) {
                 return res.status(400).json({ error: "unidadeMedidaUsada é obrigatória ao fornecer quantidadeUsada." });
            }


            // Verificar se o registro existe
            const existente = await prisma.tbReceitaIngrediente.findUnique({
                where: { idReceita_idIngrediente: { idReceita, idIngrediente } },
            });

            if (!existente) {
                return res.status(404).json({ error: "Ingrediente não vinculado a essa receita." });
            }

            // Buscar informações do ingrediente em estoque para validação
            const ingredienteEstoque = await prisma.tbIngredienteEmEstoque.findUnique({
                where: { id: idIngrediente },
                select: { nome: true, unidadeMedida: true } // Pegar a unidade base do estoque
            });

            if (!ingredienteEstoque) {
                return res.status(404).json({ error: `Ingrediente com ID ${idIngrediente} não encontrado no estoque.` });
            }

            let qtdUnidadeParaDb = existente.qtdUnidade; // Mantém o valor existente por padrão
            let qtdGramasOuMlParaDb = existente.qtdGramasOuMl; // Mantém o valor existente por padrão

            const baseUnit = ingredienteEstoque.unidadeMedida; // Unidade de medida do estoque do ingrediente

            // Somente aplica a lógica de validação/conversão se 'quantidadeUsada' e 'unidadeMedidaUsada' forem fornecidos
            if (quantidadeUsada !== undefined && unidadeMedidaUsada !== undefined) {
                if (baseUnit === UnidadeMedida.un) { // Se o ingrediente do estoque é em unidades
                    if (unidadeMedidaUsada !== UnidadeMedida.un) {
                        return res.status(400).json({ error: `Ingrediente "${ingredienteEstoque.nome}" é armazenado em unidades. A quantidade usada na receita deve ser em '${UnidadeMedida.un}'.` });
                    }
                    qtdUnidadeParaDb = quantidadeUsada;
                    qtdGramasOuMlParaDb = null; // Garante que o outro campo seja nulo
                } else if ([UnidadeMedida.mg, UnidadeMedida.g, UnidadeMedida.kg].includes(baseUnit)) { // Se o ingrediente do estoque é em massa
                    if (![UnidadeMedida.mg, UnidadeMedida.g, UnidadeMedida.kg].includes(unidadeMedidaUsada)) {
                        return res.status(400).json({ error: `Ingrediente "${ingredienteEstoque.nome}" é armazenado em massa. A quantidade usada na receita deve ser em '${UnidadeMedida.mg}', '${UnidadeMedida.g}' ou '${UnidadeMedida.kg}'.` });
                    }
                    qtdGramasOuMlParaDb = convertRecipeUnits(quantidadeUsada, unidadeMedidaUsada, baseUnit); // Converte para a unidade base do ingrediente
                    qtdUnidadeParaDb = null; // Garante que o outro campo seja nulo
                } else if ([UnidadeMedida.ml, UnidadeMedida.l].includes(baseUnit)) { // Se o ingrediente do estoque é em volume
                    if (![UnidadeMedida.ml, UnidadeMedida.l].includes(unidadeMedidaUsada)) {
                        return res.status(400).json({ error: `Ingrediente "${ingredienteEstoque.nome}" é armazenado em volume. A quantidade usada na receita deve ser em '${UnidadeMedida.ml}' ou '${UnidadeMedida.l}'.` });
                    }
                    qtdGramasOuMlParaDb = convertRecipeUnits(quantidadeUsada, unidadeMedidaUsada, baseUnit); // Converte para a unidade base do ingrediente
                    qtdUnidadeParaDb = null; // Garante que o outro campo seja nulo
                } else {
                    return res.status(400).json({ error: `Unidade de medida de estoque inválida para ingrediente "${ingredienteEstoque.nome}".` });
                }
            } else if (quantidadeUsada === undefined && unidadeMedidaUsada !== undefined) {
                 // Se o usuário só enviou a unidade, mas não a quantidade, é um erro, pois a unidade por si só não atualiza
                 return res.status(400).json({ error: "unidadeMedidaUsada foi fornecida sem quantidadeUsada. Forneça ambos para atualizar." });
            }


            const ingredienteAtualizado = await prisma.tbReceitaIngrediente.update({
                where: { idReceita_idIngrediente: { idReceita, idIngrediente } },
                data: {
                    qtdUnidade: qtdUnidadeParaDb,
                    qtdGramasOuMl: qtdGramasOuMlParaDb,
                },
            });

            return res.status(200).json({ message: "Ingrediente atualizado com sucesso!", ingredienteAtualizado });

        } catch (error) {
            console.error("Erro ao atualizar ingrediente da receita:", error);
            if (error.message.includes("Não é possível converter") || error.message.includes("deve ser em") || error.message.includes("Unidade de origem desconhecida")) {
                 return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: "Erro interno ao atualizar ingrediente da receita." });
        }
  }

  static async deleteRecipeIngredient(req, res) {
        try {
            const { idReceita, idIngrediente } = req.params;

            if (!idReceita || !idIngrediente) {
                return res.status(400).json({ error: "idReceita e idIngrediente são obrigatórios nos parâmetros." });
            }

            // Verificar se o registro existe
            const existente = await prisma.tbReceitaIngrediente.findUnique({
                where: { idReceita_idIngrediente: { idReceita, idIngrediente } },
            });

            if (!existente) {
                return res.status(404).json({ error: "Ingrediente não vinculado a essa receita." });
            }

            await prisma.tbReceitaIngrediente.delete({
                where: { idReceita_idIngrediente: { idReceita, idIngrediente } },
            });

            return res.status(200).json({ message: "Ingrediente removido da receita com sucesso!" });

        } catch (error) {
            console.error("Erro ao remover ingrediente da receita:", error);
            return res.status(500).json({ error: "Erro interno ao remover ingrediente da receita." });
        }
  }

}

module.exports = ReceitaIngredienteController;

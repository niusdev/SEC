-- CreateTable
CREATE TABLE "tbUsuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "perfil" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "tbPedido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataPedido" TEXT NOT NULL,
    "nomeCliente" TEXT NOT NULL,
    "valorTotal" REAL NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "tbReceita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "rendimento" TEXT NOT NULL,
    "modoDePreparo" TEXT,
    "custoDeProducao" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "tbIngredienteEmEstoque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "unidades" REAL NOT NULL,
    "pesoPorUnidade" REAL,
    "quantidade" REAL NOT NULL,
    "unidadeMedida" TEXT NOT NULL,
    "validade" TEXT,
    "nivelMinimo" INTEGER NOT NULL,
    "precoCusto" REAL NOT NULL,
    "categoria" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "tbReceitaIngrediente" (
    "idReceita" TEXT NOT NULL,
    "idIngrediente" TEXT NOT NULL,
    "qtdUnidade" INTEGER,
    "qtdGramasOuMl" REAL,

    PRIMARY KEY ("idReceita", "idIngrediente"),
    CONSTRAINT "tbReceitaIngrediente_idReceita_fkey" FOREIGN KEY ("idReceita") REFERENCES "tbReceita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tbReceitaIngrediente_idIngrediente_fkey" FOREIGN KEY ("idIngrediente") REFERENCES "tbIngredienteEmEstoque" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tbPedidoReceita" (
    "pedidoId" TEXT NOT NULL,
    "receitaId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    PRIMARY KEY ("pedidoId", "receitaId"),
    CONSTRAINT "tbPedidoReceita_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "tbPedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "tbPedidoReceita_receitaId_fkey" FOREIGN KEY ("receitaId") REFERENCES "tbReceita" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tbUsuario_email_key" ON "tbUsuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tbReceita_nome_key" ON "tbReceita"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "tbIngredienteEmEstoque_nome_key" ON "tbIngredienteEmEstoque"("nome");


-- prisma/migrations/<timestamp>_add_quantidade_auto_update_trigger/migration.sql

-- Trigger para INSERÇÃO
CREATE TRIGGER update_quantidade_ingrediente_on_insert
AFTER INSERT ON tbIngredienteEmEstoque
FOR EACH ROW
BEGIN
  UPDATE tbIngredienteEmEstoque
  SET quantidade = NEW.unidades * COALESCE(NEW.pesoPorUnidade, 1.0)
  WHERE id = NEW.id;
END;

-- Trigger para ATUALIZAÇÃO
CREATE TRIGGER update_quantidade_ingrediente_on_update
AFTER UPDATE OF unidades, pesoPorUnidade ON tbIngredienteEmEstoque
FOR EACH ROW
BEGIN
  UPDATE tbIngredienteEmEstoque
  SET quantidade = NEW.unidades * COALESCE(NEW.pesoPorUnidade, 1.0)
  WHERE id = NEW.id;
END;

-- Lembre-se de adicionar a parte de DROP TRIGGER no bloco DOWN se quiser um rollback completo para o trigger
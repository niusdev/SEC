-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tbPedidoReceita" (
    "pedidoId" TEXT NOT NULL,
    "receitaId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    PRIMARY KEY ("pedidoId", "receitaId"),
    CONSTRAINT "tbPedidoReceita_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "tbPedido" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tbPedidoReceita_receitaId_fkey" FOREIGN KEY ("receitaId") REFERENCES "tbReceita" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_tbPedidoReceita" ("pedidoId", "quantidade", "receitaId") SELECT "pedidoId", "quantidade", "receitaId" FROM "tbPedidoReceita";
DROP TABLE "tbPedidoReceita";
ALTER TABLE "new_tbPedidoReceita" RENAME TO "tbPedidoReceita";
CREATE TABLE "new_tbReceitaIngrediente" (
    "idReceita" TEXT NOT NULL,
    "idIngrediente" TEXT NOT NULL,
    "qtdUnidade" INTEGER,
    "qtdGramasOuMl" REAL,

    PRIMARY KEY ("idReceita", "idIngrediente"),
    CONSTRAINT "tbReceitaIngrediente_idReceita_fkey" FOREIGN KEY ("idReceita") REFERENCES "tbReceita" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tbReceitaIngrediente_idIngrediente_fkey" FOREIGN KEY ("idIngrediente") REFERENCES "tbIngredienteEmEstoque" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_tbReceitaIngrediente" ("idIngrediente", "idReceita", "qtdGramasOuMl", "qtdUnidade") SELECT "idIngrediente", "idReceita", "qtdGramasOuMl", "qtdUnidade" FROM "tbReceitaIngrediente";
DROP TABLE "tbReceitaIngrediente";
ALTER TABLE "new_tbReceitaIngrediente" RENAME TO "tbReceitaIngrediente";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

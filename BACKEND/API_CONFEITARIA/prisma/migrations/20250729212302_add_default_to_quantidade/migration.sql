-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_tbIngredienteEmEstoque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "unidades" REAL NOT NULL,
    "pesoPorUnidade" REAL,
    "quantidade" REAL NOT NULL DEFAULT 0.0,
    "unidadeMedida" TEXT NOT NULL,
    "validade" TEXT,
    "nivelMinimo" INTEGER NOT NULL,
    "precoCusto" REAL NOT NULL,
    "categoria" TEXT NOT NULL
);
INSERT INTO "new_tbIngredienteEmEstoque" ("categoria", "id", "nivelMinimo", "nome", "pesoPorUnidade", "precoCusto", "quantidade", "unidadeMedida", "unidades", "validade") SELECT "categoria", "id", "nivelMinimo", "nome", "pesoPorUnidade", "precoCusto", "quantidade", "unidadeMedida", "unidades", "validade" FROM "tbIngredienteEmEstoque";
DROP TABLE "tbIngredienteEmEstoque";
ALTER TABLE "new_tbIngredienteEmEstoque" RENAME TO "tbIngredienteEmEstoque";
CREATE UNIQUE INDEX "tbIngredienteEmEstoque_nome_key" ON "tbIngredienteEmEstoque"("nome");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

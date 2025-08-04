const { convertRecipeUnits, UnidadeMedida } = require('../controllers/utils/recipeUnitConverter'); // Ajuste o caminho

describe('convertRecipeUnits', () => {

    // Testes de conversão de unidades de peso
    describe('Conversão de Unidades de Peso', () => {
        test('deve converter mg para g corretamente', () => {
            expect(convertRecipeUnits(1000, UnidadeMedida.mg, UnidadeMedida.g)).toBe(1);
            expect(convertRecipeUnits(500, UnidadeMedida.mg, UnidadeMedida.g)).toBe(0.5);
        });

        test('deve converter mg para kg corretamente', () => {
            expect(convertRecipeUnits(1000000, UnidadeMedida.mg, UnidadeMedida.kg)).toBe(1);
            expect(convertRecipeUnits(500000, UnidadeMedida.mg, UnidadeMedida.kg)).toBe(0.5);
        });

        test('deve converter g para kg corretamente', () => {
            expect(convertRecipeUnits(1000, UnidadeMedida.g, UnidadeMedida.kg)).toBe(1);
            expect(convertRecipeUnits(2500, UnidadeMedida.g, UnidadeMedida.kg)).toBe(2.5);
        });
        
        test('deve converter g para mg corretamente', () => {
            expect(convertRecipeUnits(1, UnidadeMedida.g, UnidadeMedida.mg)).toBe(1000);
            expect(convertRecipeUnits(2.5, UnidadeMedida.g, UnidadeMedida.mg)).toBe(2500);
        });

        test('deve converter kg para g corretamente', () => {
            expect(convertRecipeUnits(1, UnidadeMedida.kg, UnidadeMedida.g)).toBe(1000);
            expect(convertRecipeUnits(0.5, UnidadeMedida.kg, UnidadeMedida.g)).toBe(500);
        });

        test('deve converter kg para mg corretamente', () => {
            expect(convertRecipeUnits(1, UnidadeMedida.kg, UnidadeMedida.mg)).toBe(1000000);
            expect(convertRecipeUnits(0.001, UnidadeMedida.kg, UnidadeMedida.mg)).toBe(1000);
        });
    });

    // Testes de conversão de unidades de volume
    describe('Conversão de Unidades de Volume', () => {
        test('deve converter ml para l corretamente', () => {
            expect(convertRecipeUnits(1000, UnidadeMedida.ml, UnidadeMedida.l)).toBe(1);
            expect(convertRecipeUnits(500, UnidadeMedida.ml, UnidadeMedida.l)).toBe(0.5);
        });
        
        test('deve converter l para ml corretamente', () => {
            expect(convertRecipeUnits(1, UnidadeMedida.l, UnidadeMedida.ml)).toBe(1000);
            expect(convertRecipeUnits(2.5, UnidadeMedida.l, UnidadeMedida.ml)).toBe(2500);
        });
    });

    // Testes de casos de borda e erros
    describe('Tratamento de Erros e Casos Especiais', () => {
        test('deve retornar o mesmo valor se as unidades de origem e destino forem iguais', () => {
            expect(convertRecipeUnits(100, UnidadeMedida.g, UnidadeMedida.g)).toBe(100);
            expect(convertRecipeUnits(50, UnidadeMedida.ml, UnidadeMedida.ml)).toBe(50);
        });

        test('deve lançar um erro se a unidade de origem for "un" e a de destino for diferente', () => {
            expect(() => convertRecipeUnits(10, UnidadeMedida.un, UnidadeMedida.g))
                .toThrow("Não é possível converter 'un' para g.");
        });

        test('deve lançar um erro se a unidade de destino for "un" e a de origem for diferente', () => {
            expect(() => convertRecipeUnits(10, UnidadeMedida.g, UnidadeMedida.un))
                .toThrow("Não é possível converter g para 'un'.");
        });

        test('deve retornar o valor para "un" quando as unidades de origem e destino forem "un"', () => {
            expect(convertRecipeUnits(12, UnidadeMedida.un, UnidadeMedida.un)).toBe(12);
        });
        
        test('deve lançar um erro se a unidade de origem for desconhecida', () => {
            expect(() => convertRecipeUnits(100, 'unidade-desconhecida', 'g'))
                .toThrow("Unidade de origem desconhecida ou não suportada para conversão: unidade-desconhecida");
        });

        test('deve lançar um erro se a unidade de destino for desconhecida', () => {
            expect(() => convertRecipeUnits(100, 'g', 'unidade-desconhecida'))
                .toThrow("Unidade de destino desconhecida ou não suportada para conversão: unidade-desconhecida");
        });
        
        test('deve retornar 0 para valor nulo', () => {
            expect(convertRecipeUnits(null, UnidadeMedida.g, UnidadeMedida.kg)).toBe(0);
        });

        test('deve retornar 0 para valor indefinido', () => {
            expect(convertRecipeUnits(undefined, UnidadeMedida.g, UnidadeMedida.kg)).toBe(0);
        });

        test('deve retornar 0 para valor não numérico', () => {
            expect(convertRecipeUnits('abc', UnidadeMedida.g, UnidadeMedida.kg)).toBe(0);
        });
    });
});
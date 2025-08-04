const convertToBase = require('../controllers/utils/convertToBase'); // Ajuste o caminho conforme necessário

describe('convertToBase', () => {

    // Testes de conversão para unidades de peso
    describe('Conversão de Unidades de Peso', () => {
        test('deve converter mg para a base (gramas)', () => {
            expect(convertToBase(1000, 'mg')).toBe(1);
            expect(convertToBase(500, 'mg')).toBe(0.5);
            expect(convertToBase(2500, 'mg')).toBe(2.5);
        });

        test('deve retornar o mesmo valor para a unidade base (gramas)', () => {
            expect(convertToBase(100, 'g')).toBe(100);
            expect(convertToBase(0, 'g')).toBe(0);
        });

        test('deve converter kg para a base (gramas)', () => {
            expect(convertToBase(1, 'kg')).toBe(1000);
            expect(convertToBase(2.5, 'kg')).toBe(2500);
            expect(convertToBase(0.1, 'kg')).toBe(100);
        });
    });

    // Testes de conversão para unidades de volume
    describe('Conversão de Unidades de Volume', () => {
        test('deve retornar o mesmo valor para a unidade base (mililitros)', () => {
            expect(convertToBase(500, 'ml')).toBe(500);
            expect(convertToBase(150, 'ml')).toBe(150);
        });

        test('deve converter litros para a base (mililitros)', () => {
            expect(convertToBase(1, 'l')).toBe(1000);
            expect(convertToBase(0.5, 'l')).toBe(500);
        });
    });
    
    // Testes para unidades que não precisam de conversão (unidade)
    describe('Unidade "un" (unidade)', () => {
        test('deve retornar o mesmo valor para a unidade "un"', () => {
            expect(convertToBase(12, 'un')).toBe(12);
            expect(convertToBase(1, 'un')).toBe(1);
        });
    });

    // Testes de comportamento com entradas inválidas ou inesperadas
    describe('Tratamento de Entradas Inválidas', () => {
        test('deve retornar 0 para valor nulo', () => {
            expect(convertToBase(null, 'g')).toBe(0);
        });

        test('deve retornar 0 para valor indefinido', () => {
            expect(convertToBase(undefined, 'g')).toBe(0);
        });

        test('deve retornar 0 para valor que não é um número', () => {
            expect(convertToBase('abc', 'g')).toBe(0);
        });
        
        test('deve retornar o valor original para uma unidade de medida desconhecida', () => {
            expect(convertToBase(150, 'copo')).toBe(150);
            expect(convertToBase(99, 'balde')).toBe(99);
        });

        test('deve ser case-insensitive para a unidade de medida', () => {
            expect(convertToBase(1, 'KG')).toBe(1000);
            expect(convertToBase(1000, 'Ml')).toBe(1000);
            expect(convertToBase(1000, 'Mg')).toBe(1);
        });
    });
});
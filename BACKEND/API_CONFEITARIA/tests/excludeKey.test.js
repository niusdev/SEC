const exclude = require('../controllers/utils/excludeKey'); // Ajuste o caminho conforme necessário

describe('excludeKey', () => {

    const user = {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'securepassword123',
        profile: 'user'
    };

    test('deve remover uma única chave do objeto', () => {
        const keysToExclude = ['password'];
        const result = exclude(user, keysToExclude);

        // O objeto resultante não deve conter a chave 'password'
        expect(result).not.toHaveProperty('password');
        
        // O objeto resultante deve conter as outras chaves
        expect(result).toHaveProperty('id', 1);
        expect(result).toHaveProperty('name', 'John Doe');
        expect(result).toHaveProperty('email', 'john.doe@example.com');
        expect(result).toHaveProperty('profile', 'user');
    });

    test('deve remover múltiplas chaves do objeto', () => {
        const keysToExclude = ['password', 'profile'];
        const result = exclude(user, keysToExclude);

        // O objeto resultante não deve conter as chaves 'password' e 'profile'
        expect(result).not.toHaveProperty('password');
        expect(result).not.toHaveProperty('profile');

        // O objeto resultante deve conter as outras chaves
        expect(result).toHaveProperty('id', 1);
        expect(result).toHaveProperty('name', 'John Doe');
        expect(result).toHaveProperty('email', 'john.doe@example.com');
    });

    test('deve retornar o objeto original se as chaves a serem excluídas não existirem', () => {
        const keysToExclude = ['address', 'phone'];
        const result = exclude(user, keysToExclude);

        // O objeto resultante deve ser idêntico ao original
        expect(result).toEqual(user);
    });

    test('deve retornar o objeto original se o array de chaves for vazio', () => {
        const keysToExclude = [];
        const result = exclude(user, keysToExclude);

        // O objeto resultante deve ser idêntico ao original
        expect(result).toEqual(user);
    });

    test('deve retornar um objeto vazio se todas as chaves forem removidas', () => {
        const keysToExclude = ['id', 'name', 'email', 'password', 'profile'];
        const result = exclude(user, keysToExclude);

        // O objeto resultante deve ser vazio
        expect(Object.keys(result).length).toBe(0);
        expect(result).toEqual({});
    });
});
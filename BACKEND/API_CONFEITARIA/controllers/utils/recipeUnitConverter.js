const { UnidadeMedida } = require('@prisma/client'); 

function convertRecipeUnits(value, fromUnit, targetUnit) {
    if (value === null || value === undefined || isNaN(value)) {
        return 0; 
    }

    const val = parseFloat(value);
    const lowerFromUnit = fromUnit.toLowerCase();
    const lowerTargetUnit = targetUnit.toLowerCase();

    if (lowerFromUnit === lowerTargetUnit) {
        return val;
    }

    let intermediateValue; 

    switch (lowerFromUnit) {
        case UnidadeMedida.mg: intermediateValue = val / 1000; break;
        case UnidadeMedida.g: intermediateValue = val; break;
        case UnidadeMedida.kg: intermediateValue = val * 1000; break;

        case UnidadeMedida.ml: intermediateValue = val; break;
        case UnidadeMedida.l: intermediateValue = val * 1000; break;

        case UnidadeMedida.un:
            if (lowerTargetUnit !== UnidadeMedida.un) {
                throw new Error(`Não é possível converter 'un' para ${lowerTargetUnit}.`);
            }
            return val; 
        default:
            throw new Error(`Unidade de origem desconhecida ou não suportada para conversão: ${fromUnit}`);
    }

   
    switch (lowerTargetUnit) {
        case UnidadeMedida.mg: return intermediateValue * 1000;
        case UnidadeMedida.g: return intermediateValue;
        case UnidadeMedida.kg: return intermediateValue / 1000;
        
        case UnidadeMedida.ml: return intermediateValue;
        case UnidadeMedida.l: return intermediateValue / 1000;
        
        case UnidadeMedida.un:
            throw new Error(`Não é possível converter ${fromUnit} para 'un'.`);
        default:
            throw new Error(`Unidade de destino desconhecida ou não suportada para conversão: ${targetUnit}`);
    }
}

// Exporte a função e o enum para uso nos controllers
module.exports = { convertRecipeUnits, UnidadeMedida };
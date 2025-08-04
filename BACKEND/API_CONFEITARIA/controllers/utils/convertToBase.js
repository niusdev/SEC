function convertToBase(value, unit) {
    if (value === null || value === undefined || isNaN(value)) {
        return 0;
    }

    const val = parseFloat(value);
    const lowerUnit = unit.toLowerCase();

    switch (lowerUnit) {
        case 'mg': return val / 1000;         // 1000 mg = 1g
        case 'g':  return val;                // base padrão de peso
        case 'kg': return val * 1000;         // 1kg = 1000g
        case 'ml': return val;                // base padrão de volume
        case 'l':  return val * 1000;         // 1L = 1000ml
        case 'un': return val;                // unidade bruta (para itens como ovos, latas, etc.)
        default:   return val;                // fallback: retorna valor sem conversão
    }
}

module.exports = convertToBase;
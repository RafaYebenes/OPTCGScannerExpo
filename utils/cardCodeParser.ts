export const cardCodeParser = {
  // Regex Explicación:
  // 1. Prefijos: (OP|EB|ST|PRB) y sus variantes con error OCR (0P, QP, etc)
  // 2. Set: 2 dígitos (o letras O)
  // 3. Separador: Guión opcional
  // 4. Número: 3 dígitos (o letras O)
  PATTERN: /((?:OP|EB|ST|PRB|0P|O0|QP)[0-9O]{2})\s?[-—]?\s?([0-9O]{3})/i,

  parse(text: string): { set: string; number: string; fullCode: string } | null {
    if (!text) return null;

    const lines = text.toUpperCase().split('\n');

    for (const line of lines) {
      const match = line.match(this.PATTERN);

      if (match) {
        // match[1] es la primera parte completa (ej: "OP01" o "ST10")
        // match[2] es el número de la carta (ej: "045")
        
        let rawPrefixPart = match[1];
        let rawNumber = match[2];

        // --- CORRECCIÓN DE ERRORES OCR ---
        
        // 1. Separamos las letras del prefijo de los números del set
        // Ej: "OP01" -> letras="OP", nums="01"
        // Ej: "0P01" -> letras="0P", nums="01" (esto lo arreglamos abajo)
        const prefixMatch = rawPrefixPart.match(/([A-Z0]+?)([0-9O]{2})$/);
        
        if (!prefixMatch) continue;

        let prefixLetters = prefixMatch[1]; // Ej: "OP"
        let setNumbers = prefixMatch[2];    // Ej: "01"

        // Corregimos el prefijo si el OCR leyó un cero en vez de O
        prefixLetters = prefixLetters
          .replace('0', 'O')
          .replace('Q', 'O'); // A veces lee Q en vez de O

        // Corregimos números (O -> 0)
        const fixedSetNum = setNumbers.replace(/O/g, '0');
        const fixedCardNum = rawNumber.replace(/O/g, '0');

        const finalSetCode = `${prefixLetters}${fixedSetNum}`; // Ej: OP01, ST02
        const fullCode = `${finalSetCode}-${fixedCardNum}`;    // Ej: OP01-045

        return {
          set: finalSetCode,
          number: fixedCardNum,
          fullCode: fullCode
        };
      }
    }

    return null;
  },

  validate(code: { set: string; number: string }): boolean {
    // Validamos que la parte numérica del set y la carta sean números
    const setPart = code.set.match(/\d+$/); // Extrae los números del final del set
    if (!setPart) return false;

    const setNum = parseInt(setPart[0], 10);
    const cardNum = parseInt(code.number, 10);

    return !isNaN(setNum) && !isNaN(cardNum);
  },

  getSetName(setCode: string): string {
    // Diccionario extendido (puedes ir añadiendo más)
    const prefixes: Record<string, string> = {
      'OP': 'Booster Pack',
      'ST': 'Starter Deck',
      'EB': 'Extra Booster',
      'PRB': 'Premium Booster'
    };

    // Intentamos buscar el nombre específico (ej: OP01)
    const specificSets: Record<string, string> = {
      'OP01': 'Romance Dawn',
      'OP02': 'Paramount War',
      'OP03': 'Pillars of Strength',
      'OP04': 'Kingdoms of Intrigue',
      'OP05': 'Awakening of the New Era',
      'OP06': 'Wings of the Captain',
      'OP07': '500 Years into the Future',
      'OP08': 'Two Legends',
      'OP09': 'The Four Emperors',
      'OP10': 'Royal Blood',
      'EB01': 'Memorial Collection',
      'PRB01': 'The Best',
      'ST01': 'Straw Hat Crew',
      // ... puedes añadir más
    };

    if (specificSets[setCode]) {
      return specificSets[setCode];
    }

    // Si no tenemos el nombre exacto, devolvemos el tipo genérico
    const prefix = setCode.replace(/[0-9]/g, '');
    return prefixes[prefix] ? `${prefixes[prefix]} ${setCode}` : setCode;
  }
};
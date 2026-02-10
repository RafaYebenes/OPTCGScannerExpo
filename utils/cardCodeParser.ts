export const cardCodeParser = {
  // Regex Explicación:
  // 1. Prefijos: (OP|EB|ST|PRB) y sus variantes con error OCR (0P, QP, etc)
  // 2. Set: 2 dígitos (o letras O)
  // 3. Separador: Guión opcional (o guión largo)
  // 4. Número: 3 dígitos (o letras O)
  PATTERN: /((?:OP|EB|ST|PRB|0P|O0|QP|DP|CP)[0-9O]{2})\s?[-—]?\s?([0-9O]{3})/i,

  parse(text: string): { set: string; number: string; fullCode: string } | null {
    if (!text) return null;

    const lines = text.toUpperCase().split('\n');

    for (const line of lines) {
      const match = line.match(this.PATTERN);

      if (match) {
        let rawPrefixPart = match[1];
        let rawNumber = match[2];

        // --- CORRECCIÓN DE ERRORES OCR ---
        const prefixMatch = rawPrefixPart.match(/([A-Z0]+?)([0-9O]{2})$/);

        if (!prefixMatch) continue;

        let prefixLetters = prefixMatch[1];
        let setNumbers = prefixMatch[2];

        // Corregimos el prefijo (0 -> O, Q -> O)
        prefixLetters = prefixLetters
          .replace('0', 'O')
          .replace('Q', 'O')
          .replace('D', 'O') // Si lee DP -> OP
          .replace('C', 'O'); // Si lee CP -> OP

        // Corregimos números (O -> 0)
        const fixedSetNum = setNumbers.replace(/O/g, '0');
        const fixedCardNum = rawNumber.replace(/O/g, '0');

        const finalSetCode = `${prefixLetters}${fixedSetNum}`;
        const fullCode = `${finalSetCode}-${fixedCardNum}`;

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
    const setPart = code.set.match(/\d+$/);
    if (!setPart) return false;

    const setNum = parseInt(setPart[0], 10);
    const cardNum = parseInt(code.number, 10);

    return !isNaN(setNum) && !isNaN(cardNum);
  },

  // --- DICCIONARIO DE NOMBRES REALES ---
  getSetName(setCode: string): string {
    if (!setCode) return 'Desconocido';
    const code = setCode.toUpperCase();

    const specificSets: Record<string, string> = {
      // --- BOOSTERS (OP) ---
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

      // --- EXTRA BOOSTERS (EB) ---
      'EB01': 'Memorial Collection',

      // --- PREMIUM BOOSTERS (PRB) ---
      'PRB01': 'The Best',

      // --- STARTER DECKS (ST) ---
      'ST01': 'Straw Hat Crew',
      'ST02': 'Worst Generation',
      'ST03': 'The Seven Warlords',
      'ST04': 'Animal Kingdom Pirates',
      'ST05': 'ONE PIECE FILM edition',
      'ST06': 'Absolute Justice',
      'ST07': 'Big Mom Pirates',
      'ST08': 'Monkey D. Luffy',
      'ST09': 'Yamato',
      'ST10': 'The Three Captains',
      'ST11': 'Uta',
      'ST12': 'Zoro & Sanji',
      'ST13': 'The Three Brothers',
      'ST14': '3D2Y',
      'ST15': 'Edward Newgate',
      'ST16': 'Uta (Green)',
      'ST17': 'Blue Doflamingo',
      'ST18': 'Purple Kaido',
      'ST19': 'Black Smoker',
      'ST20': 'Yellow Katakuri',

      // --- PROMOS ---
      'P': 'Promotional Card',
    };

    // 1. Buscamos el nombre exacto
    if (specificSets[code]) {
      return specificSets[code];
    }

    // 2. Si no existe, usamos fallback genérico
    const prefixes: Record<string, string> = {
      'OP': 'Booster Pack',
      'ST': 'Starter Deck',
      'EB': 'Extra Booster',
      'PRB': 'Premium Booster'
    };

    const prefix = code.replace(/[0-9]/g, '');

    return prefixes[prefix] ? `${prefixes[prefix]} ${code}` : code;
  }
};
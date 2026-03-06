// ============================================
// CARD CODE PARSER — OPSCANNER (ACTUALIZADO)
// ============================================
// Extrae el código de carta del texto OCR.
//
// CAMBIOS vs versión anterior:
// 1. Detecta prefijo "SP" antes del código → lo reporta
// 2. Soporte para cartas Promo (P-XXX)
// 3. Devuelve metadata extra: hasSpPrefix, isPromo
// ============================================

export interface ParsedCode {
  set: string;        // 'OP05', 'EB03', 'ST17', 'P'
  number: string;     // '060', '024', '005'
  fullCode: string;   // 'OP05-060'
  hasSpPrefix: boolean;  // NUEVO: true si "SP" aparecía delante del código
  isPromo: boolean;      // NUEVO: true si es formato P-XXX
}

export const cardCodeParser = {
  // --- REGEX PRINCIPAL ---
  // Soporta:
  // - OP/EB/ST/PRB + 2 dígitos + guión + 3 dígitos (estándar)
  // - Prefijo SP opcional antes del código
  // - Errores OCR comunes: 0↔O, Q→O, D→O, C→O
  //
  // Grupo 1: Prefijo SP (opcional)
  // Grupo 2: Set + número de set (ej: OP05)
  // Grupo 3: Número de carta (ej: 060)
  STANDARD_PATTERN: /(?:(SP)\s*)?((?: OP|EB|ST|PRB|0P|O0|QP|DP|CP)[0-9O]{2})\s?[-—]?\s?([0-9O]{3})/i,

  // --- REGEX PARA PROMOS ---
  // Formato: P-001, P-023, etc.
  PROMO_PATTERN: /\bP\s?[-—]\s?([0-9O]{3})\b/i,

  /**
   * Parsea el texto OCR y extrae el código de carta.
   * Intenta primero el formato estándar, luego el de promo.
   *
   * @param text - Texto crudo del OCR
   * @returns ParsedCode o null si no se detectó código
   */
  parse(text: string): ParsedCode | null {
    if (!text) return null;

    // Intentar formato estándar primero (más común)
    const standardResult = this._parseStandard(text);
    if (standardResult) return standardResult;

    // Intentar formato promo
    const promoResult = this._parsePromo(text);
    if (promoResult) return promoResult;

    return null;
  },

  // --- PARSER ESTÁNDAR (OP/EB/ST/PRB) ---
  _parseStandard(text: string): ParsedCode | null {
    const lines = text.toUpperCase().split('\n');

    for (const line of lines) {
      const match = line.match(this.STANDARD_PATTERN);

      if (match) {
        const spPrefix = match[1]; // 'SP' o undefined
        let rawPrefixPart = match[2];
        let rawNumber = match[3];

        // --- CORRECCIÓN DE ERRORES OCR ---
        const prefixMatch = rawPrefixPart.trim().match(/([A-Z0]+?)([0-9O]{2})$/);

        if (!prefixMatch) continue;

        let prefixLetters = prefixMatch[1];
        let setNumbers = prefixMatch[2];

        // Corregimos el prefijo (0 -> O, Q -> O, D -> O, C -> O)
        prefixLetters = prefixLetters
          .replace('0', 'O')
          .replace('Q', 'O')
          .replace('D', 'O')
          .replace('C', 'O');

        // Corregimos números (O -> 0)
        const fixedSetNum = setNumbers.replace(/O/g, '0');
        const fixedCardNum = rawNumber.replace(/O/g, '0');

        const finalSetCode = `${prefixLetters}${fixedSetNum}`;
        const fullCode = `${finalSetCode}-${fixedCardNum}`;

        return {
          set: finalSetCode,
          number: fixedCardNum,
          fullCode: fullCode,
          hasSpPrefix: !!spPrefix,
          isPromo: false,
        };
      }
    }

    return null;
  },

  // --- PARSER DE PROMOS (P-XXX) ---
  _parsePromo(text: string): ParsedCode | null {
    const lines = text.toUpperCase().split('\n');

    for (const line of lines) {
      const match = line.match(this.PROMO_PATTERN);

      if (match) {
        const rawNumber = match[1];
        const fixedNumber = rawNumber.replace(/O/g, '0');

        return {
          set: 'P',
          number: fixedNumber,
          fullCode: `P-${fixedNumber}`,
          hasSpPrefix: false,
          isPromo: true,
        };
      }
    }

    return null;
  },

  // --- VALIDACIÓN ---
  validate(code: { set: string; number: string }): boolean {
    // Promos: set = 'P', número válido
    if (code.set === 'P') {
      const cardNum = parseInt(code.number, 10);
      return !isNaN(cardNum) && cardNum > 0;
    }

    // Estándar: set tiene parte numérica, número válido
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
      'OP11': 'A Fist of Divine Speed',
      'OP12': 'Unknown',
      'OP13': 'Carrying on His Will',

      // --- EXTRA BOOSTERS (EB) ---
      'EB01': 'Memorial Collection',
      'EB02': 'Unknown EB02',
      'EB03': 'Heroines Edition',
      'EB04': 'Unknown EB04',

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

    // 1. Buscar nombre específico
    if (specificSets[code]) return specificSets[code];

    // 2. Intentar prefijo genérico
    if (code.startsWith('OP')) return `Booster ${code}`;
    if (code.startsWith('ST')) return `Starter Deck ${code}`;
    if (code.startsWith('EB')) return `Extra Booster ${code}`;

    return 'Desconocido';
  },
};
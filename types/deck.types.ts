// types/deck.types.ts

export type DeckRow = {
  id: string;
  user_id: string;
  name: string;
  leader_card_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CardRow = {
  id: string;
  code: string;
  name: string;
  color: string | null;
  type: "LEADER" | "CHARACTER" | "EVENT" | string | null;
  variant: "Normal" | "Parallel" | string | null;
  image_url?: string | null;
  set_code?: string | null;
};

export type DeckCardRow = {
  id: string;
  deck_id: string;
  card_id: string;
  quantity: number;
  card?: CardRow;
};

export type DeckDetail = {
  deck: DeckRow;
  leader: CardRow | null;
  cards: DeckCardRow[]; // main deck
};

export type DeckValidationResult = {
  ok: boolean;
  errors: string[];
  stats: { mainCount: number; total: number };
};

// ===== Import deck types =====
export type ParsedDecklistItem = {
  code: string;
  quantity: number;
  name?: string;
  isLeaderHint?: boolean;
  rawLines: string[];
};

export type ParsedDecklist = {
  name?: string;
  items: ParsedDecklistItem[];
  errors: string[];
  warnings: string[];
};

export type ResolvedDeckImport = {
  name: string;
  leader: CardRow | null;
  main: { card: CardRow; quantity: number }[];
  missing: { code: string; quantity: number; name?: string }[];
  errors: string[];
  warnings: string[];
  stats: { mainCount: number; total: number };
};

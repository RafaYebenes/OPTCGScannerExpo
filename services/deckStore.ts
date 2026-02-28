// services/deckStore.ts
import type { DeckDetail } from "./deckService";

type Listener = (detail: DeckDetail | null) => void;

const store = new Map<string, DeckDetail>();
const listeners = new Map<string, Set<Listener>>();

function notify(deckId: string) {
  const subs = listeners.get(deckId);
  if (!subs) return;
  const detail = store.get(deckId) ?? null;
  subs.forEach((cb) => cb(detail));
}

export const deckStore = {
  get(deckId: string) {
    return store.get(deckId);
  },

  set(deckId: string, detail: DeckDetail) {
    store.set(deckId, detail);
    notify(deckId);
  },

  clear(deckId: string) {
    store.delete(deckId);
    notify(deckId);
  },

  update(deckId: string, updater: (prev: DeckDetail) => DeckDetail) {
    const prev = store.get(deckId);
    if (!prev) return;
    store.set(deckId, updater(prev));
    notify(deckId);
  },

  subscribe(deckId: string, cb: Listener) {
    if (!listeners.has(deckId)) listeners.set(deckId, new Set());
    listeners.get(deckId)!.add(cb);

    // Push inicial
    cb(store.get(deckId) ?? null);

    return () => {
      listeners.get(deckId)?.delete(cb);
    };
  },
};

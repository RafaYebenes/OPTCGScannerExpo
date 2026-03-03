// src/utils/deckImport.ts
import type {
    CardRow,
    ParsedDecklist,
    ParsedDecklistItem,
    ResolvedDeckImport,
} from "../types/deck.types";
import { colorsSubsetOfLeader, isLeaderType } from "./deckUtils";

const CODE_RE = /([A-Z]{1,4}\d{2}-\d{3})/i;

const normalizeCode = (code: string) => code.trim().toUpperCase();

const safeInt = (v: any, fallback = 0) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
};

const stripLeaderTag = (s: string) =>
  s.replace(/\[\s*leader\s*\]/gi, "").trim();

export const parseDecklistText = (rawText: string): ParsedDecklist => {
  const text = (rawText ?? "").replace(/\r\n/g, "\n").trim();

  const out: ParsedDecklist = { items: [], errors: [], warnings: [] };
  if (!text) return out;

  // --- JSON propio ---
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);

      const readOne = (obj: any): ParsedDecklistItem | null => {
        if (!obj) return null;
        const code = obj.code ?? obj.cardCode ?? obj.id ?? obj.card_id;
        const qty = obj.quantity ?? obj.qty ?? obj.count ?? 0;
        if (!code) return null;
        return {
          code: normalizeCode(String(code)),
          quantity: safeInt(qty, 0),
          name: obj.name ? String(obj.name) : undefined,
          isLeaderHint: Boolean(obj.isLeader ?? obj.leader),
          rawLines: [JSON.stringify(obj)],
        };
      };

      if (Array.isArray(parsed)) {
        out.items = parsed.map(readOne).filter(Boolean) as ParsedDecklistItem[];
      } else {
        out.name =
          parsed.name ??
          parsed.deckName ??
          parsed.title ??
          parsed.deck_title ??
          undefined;

        const leader =
          parsed.leader ??
          parsed.leaderCode ??
          parsed.leader_code ??
          parsed.leaderCardCode ??
          undefined;

        if (leader) {
          out.items.push({
            code: normalizeCode(String(leader)),
            quantity: 1,
            isLeaderHint: true,
            rawLines: ["leader"],
          });
        }

        const arr =
          parsed.cards ??
          parsed.main ??
          parsed.deck ??
          parsed.list ??
          parsed.items ??
          [];

        if (!Array.isArray(arr)) {
          out.errors.push("JSON: 'cards' debe ser un array.");
        } else {
          out.items.push(...(arr.map(readOne).filter(Boolean) as any));
        }
      }

      // agregación por code
      const byCode = new Map<string, ParsedDecklistItem>();
      for (const it of out.items) {
        if (!it.code) continue;
        const qty = safeInt(it.quantity, 0);
        if (qty <= 0) continue;

        const prev = byCode.get(it.code);
        if (!prev) {
          byCode.set(it.code, {
            ...it,
            quantity: qty,
            rawLines: [...it.rawLines],
          });
        } else {
          prev.quantity += qty;
          prev.isLeaderHint = prev.isLeaderHint || it.isLeaderHint;
          prev.rawLines.push(...it.rawLines);
          if (!prev.name && it.name) prev.name = it.name;
        }
      }
      out.items = [...byCode.values()];
      return out;
    } catch {
      out.warnings.push(
        "No se pudo parsear como JSON; intentando parseo por líneas.",
      );
    }
  }

  // --- Texto libre (OPTD / Limitless / variantes) ---
  const lines = text.split("\n").map((l) => l.trim());
  const tmp: ParsedDecklistItem[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[\-\*\u2022]\s*/, "").trim();
    if (!line) continue;
    if (/^(#|\/\/)/.test(line)) continue;

    // Nombre opcional (header)
    const header = line.match(/^(deck|name|title)\s*:\s*(.+)$/i);
    if (header && !CODE_RE.test(line)) {
      if (!out.name) out.name = header[2].trim();
      continue;
    }

    const isLeaderHint =
      /\[\s*leader\s*\]/i.test(line) || /^leader\s*:/i.test(line);

    // 1) "4x OP01-001 Nombre" o "4 OP01-001 Nombre"
    const m = line.match(
      /^\s*(\d+)\s*(?:x)?\s*([A-Z]{1,4}\d{2}-\d{3})\b(?:\s+(.+))?$/i,
    );
    if (m) {
      const qty = safeInt(m[1], 0);
      const code = normalizeCode(m[2]);
      const name = m[3] ? stripLeaderTag(m[3]) : undefined;

      if (qty <= 0) {
        out.warnings.push(`Línea ignorada (qty inválida): ${rawLine}`);
        continue;
      }

      tmp.push({
        code,
        quantity: qty,
        name,
        isLeaderHint,
        rawLines: [rawLine],
      });
      continue;
    }

    // 2) "OP01-001 Nombre [Leader]" (sin qty)
    const m2 = line.match(/^\s*([A-Z]{1,4}\d{2}-\d{3})\b(?:\s+(.+))?$/i);
    if (m2) {
      const code = normalizeCode(m2[1]);
      const name = m2[2] ? stripLeaderTag(m2[2]) : undefined;

      tmp.push({ code, quantity: 1, name, isLeaderHint, rawLines: [rawLine] });
      continue;
    }

    // 3) Línea con code pero formato raro
    const maybe = line.match(CODE_RE);
    if (maybe) {
      out.warnings.push(
        `Línea con código detectado pero formato desconocido: ${rawLine}`,
      );
      tmp.push({
        code: normalizeCode(maybe[1]),
        quantity: 1,
        name: stripLeaderTag(line.replace(maybe[1], "")).trim() || undefined,
        isLeaderHint,
        rawLines: [rawLine],
      });
      continue;
    }

    out.warnings.push(`Línea ignorada: ${rawLine}`);
  }

  // Agregación por code
  const byCode = new Map<string, ParsedDecklistItem>();
  for (const it of tmp) {
    const prev = byCode.get(it.code);
    if (!prev) byCode.set(it.code, { ...it, rawLines: [...it.rawLines] });
    else {
      prev.quantity += it.quantity;
      prev.isLeaderHint = prev.isLeaderHint || it.isLeaderHint;
      prev.rawLines.push(...it.rawLines);
      if (!prev.name && it.name) prev.name = it.name;
    }
  }
  out.items = [...byCode.values()];

  if (out.items.length === 0)
    out.errors.push("No se detectó ninguna carta en el texto.");

  return out;
};

const buildCatalogIndex = (catalog: CardRow[]) => {
  const byCode = new Map<string, CardRow[]>();
  for (const c of catalog ?? []) {
    const code = (c.code ?? "").toUpperCase();
    if (!code) continue;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code)!.push(c);
  }
  return byCode;
};

const pickBestVariant = (arr: CardRow[]) => {
  if (!arr || arr.length === 0) return null;
  const normal = arr.find((c) => (c.variant ?? "").toLowerCase() === "normal");
  return normal ?? arr[0];
};

export const resolveDeckImport = (
  parsed: ParsedDecklist,
  catalog: CardRow[],
  overrideName?: string,
): ResolvedDeckImport => {
  const errors: string[] = [...(parsed.errors ?? [])];
  const warnings: string[] = [...(parsed.warnings ?? [])];

  const byCode = buildCatalogIndex(catalog);

  // --- Detectar leader ---
  const leaderHints = parsed.items.filter((i) => i.isLeaderHint);
  let leaderCode: string | null = null;

  if (leaderHints.length > 1) {
    errors.push(
      `Se detectaron varios leaders marcados: ${leaderHints.map((x) => x.code).join(", ")}.`,
    );
  } else if (leaderHints.length === 1) {
    leaderCode = leaderHints[0].code;
  }

  // Inferencia si no viene marcado: exactamente 1 carta tipo LEADER en el listado
  if (!leaderCode && parsed.items.length > 0) {
    const leaderCandidates = parsed.items
      .map((it) => ({ it, card: pickBestVariant(byCode.get(it.code) ?? []) }))
      .filter((x) => x.card && isLeaderType(x.card.type));

    const uniq = new Map<string, CardRow>();
    for (const c of leaderCandidates) uniq.set(c.it.code, c.card!);

    if (uniq.size === 1) {
      leaderCode = [...uniq.keys()][0];
      warnings.push(
        `Leader inferido automáticamente por tipo: ${leaderCode} (si no es correcto, marca la línea con [Leader]).`,
      );
    } else if (uniq.size > 1) {
      errors.push(
        `Hay más de un candidato a Leader en el texto: ${[...uniq.keys()].join(
          ", ",
        )}. Marca el correcto con [Leader].`,
      );
    }
  }

  let leader: CardRow | null = null;

  if (leaderCode) {
    leader = pickBestVariant(byCode.get(leaderCode) ?? []);

    if (!leader) {
      errors.push(`No se encontró el Leader en el catálogo: ${leaderCode}.`);
    } else if (!isLeaderType(leader.type)) {
      errors.push(
        `El Leader indicado no es tipo LEADER en catálogo: ${leaderCode} (${leader.type ?? "sin tipo"}).`,
      );
    }
  } else {
    errors.push("No se pudo determinar el Leader (usa [Leader] en la línea).");
  }

  // --- Main deck ---
  const missing: { code: string; quantity: number; name?: string }[] = [];
  const main: { card: CardRow; quantity: number }[] = [];

  const itemsSorted = [...parsed.items].sort((a, b) =>
    (a.code ?? "").localeCompare(b.code ?? ""),
  );

  for (const it of itemsSorted) {
    if (leaderCode && it.code === leaderCode) continue;

    const qty = safeInt(it.quantity, 0);
    if (qty <= 0) continue;

    if (qty > 4) {
      errors.push(`La carta ${it.code} supera 4 copias (${qty}).`);
      continue;
    }

    const card = pickBestVariant(byCode.get(it.code) ?? []);
    if (!card) {
      missing.push({ code: it.code, quantity: qty, name: it.name });
      continue;
    }

    if (isLeaderType(card.type)) {
      errors.push(`Carta inválida en main deck: ${it.code} es LEADER.`);
      continue;
    }

    if (leader) {
      const ok = colorsSubsetOfLeader(leader.color, card.color);
      if (!ok) {
        errors.push(
          `Color inválido: ${card.code} (${card.color ?? "sin color"}) no es compatible con leader (${leader.color ?? "sin color"}).`,
        );
        continue;
      }
    }

    main.push({ card, quantity: qty });
  }

  // --- Conteos ---
  const mainCount = main.reduce((acc, x) => acc + (x.quantity ?? 0), 0);
  const total = (leader ? 1 : 0) + mainCount;

  if (mainCount !== 50)
    errors.push(`El main deck debe tener 50 cartas. Ahora: ${mainCount}.`);
  if (total !== 51)
    errors.push(`El mazo debe tener 51 cartas (Leader + 50). Ahora: ${total}.`);

  if (missing.length > 0) {
    errors.push(
      `No se encontraron ${missing.length} cartas en el catálogo (revisa codes).`,
    );
  }

  const name =
    (overrideName ?? "").trim() ||
    (parsed.name ?? "").trim() ||
    "Mazo importado";

  return {
    name,
    leader,
    main,
    missing,
    errors,
    warnings,
    stats: { mainCount, total },
  };
};

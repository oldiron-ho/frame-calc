import { calculateRailLayout, type RailLayoutResult } from "@/lib/rail-calculator";
import {
  millimetersToMeters,
  normalizeDecimalInput,
  parseDecimalInput,
  parseStrictInt,
  toCanonicalDecimalInput,
} from "@/lib/number-input";

export const HISTORY_STORAGE_KEY = "framecalc-history-v2";
export const MAX_HISTORY_ENTRIES = 10;
const HISTORY_STORAGE_EVENT = "framecalc-history-sync";
const EMPTY_HISTORY_ENTRIES: CalculationHistoryEntry[] = [];

let cachedSerializedHistoryEntries: string | null | undefined;
let cachedHistoryEntriesSnapshot: CalculationHistoryEntry[] = EMPTY_HISTORY_ENTRIES;

export interface CalculationHistorySnapshot {
  totalLengthInput: string;
  gapCountInput: string;
  thicknessInput: string;
}

export interface CalculationHistoryEntry {
  id: string;
  savedAtMillis: number;
  snapshot: CalculationHistorySnapshot;
}

export function getSnapshotSignature(snapshot: CalculationHistorySnapshot): string {
  return [
    snapshot.totalLengthInput,
    snapshot.gapCountInput,
    snapshot.thicknessInput,
  ].join("|");
}

export function createCalculationHistorySnapshot(inputs: {
  totalLengthInput: string;
  gapCountInput: string;
  thicknessInput: string;
}): CalculationHistorySnapshot | null {
  const normalizedTotalLengthInput = normalizeDecimalInput(inputs.totalLengthInput);
  const normalizedGapCountInput = inputs.gapCountInput.trim();
  const normalizedThicknessInput = normalizeDecimalInput(inputs.thicknessInput);

  if (
    normalizedTotalLengthInput.length === 0 ||
    normalizedGapCountInput.length === 0 ||
    normalizedThicknessInput.length === 0
  ) {
    return null;
  }

  const totalLength = parseDecimalInput(normalizedTotalLengthInput);
  const gapCount = parseStrictInt(normalizedGapCountInput);
  const thicknessInMillimeters = parseDecimalInput(normalizedThicknessInput);

  if (
    totalLength === null ||
    gapCount === null ||
    thicknessInMillimeters === null
  ) {
    return null;
  }

  const snapshot = {
    totalLengthInput: toCanonicalDecimalInput(totalLength),
    gapCountInput: gapCount.toString(),
    thicknessInput: toCanonicalDecimalInput(thicknessInMillimeters),
  };

  return snapshotToLayoutResultOrNull(snapshot) === null ? null : snapshot;
}

export function snapshotToLayoutResultOrNull(
  snapshot: CalculationHistorySnapshot,
): RailLayoutResult | null {
  const totalLength = parseDecimalInput(snapshot.totalLengthInput);
  const gapCount = parseStrictInt(snapshot.gapCountInput);
  const thicknessInMillimeters = parseDecimalInput(snapshot.thicknessInput);

  if (
    totalLength === null ||
    gapCount === null ||
    thicknessInMillimeters === null
  ) {
    return null;
  }

  try {
    return calculateRailLayout(
      totalLength,
      gapCount,
      millimetersToMeters(thicknessInMillimeters),
    );
  } catch {
    return null;
  }
}

export function withSavedEntry(
  entries: CalculationHistoryEntry[],
  newEntry: CalculationHistoryEntry,
  maxEntries: number = MAX_HISTORY_ENTRIES,
): CalculationHistoryEntry[] {
  if (maxEntries <= 0) {
    return [];
  }

  return [
    newEntry,
    ...entries
      .filter((entry) => getSnapshotSignature(entry.snapshot) !== getSnapshotSignature(newEntry.snapshot))
      .slice(0, maxEntries - 1),
  ];
}

export function deleteHistoryEntry(
  entries: CalculationHistoryEntry[],
  entryId: string,
): CalculationHistoryEntry[] {
  return entries.filter((entry) => entry.id !== entryId);
}

export function serializeHistoryEntries(entries: CalculationHistoryEntry[]): string {
  return JSON.stringify(entries);
}

export function parseHistoryEntries(serializedEntries: string | null | undefined): CalculationHistoryEntry[] {
  if (serializedEntries == null || serializedEntries.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(serializedEntries);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry): CalculationHistoryEntry[] => {
      if (
        typeof entry !== "object" ||
        entry === null ||
        typeof entry.id !== "string" ||
        typeof entry.savedAtMillis !== "number" ||
        typeof entry.snapshot !== "object" ||
        entry.snapshot === null
      ) {
        return [];
      }

      const snapshot = createCalculationHistorySnapshot({
        totalLengthInput: String((entry.snapshot as Record<string, unknown>).totalLengthInput ?? ""),
        gapCountInput: String((entry.snapshot as Record<string, unknown>).gapCountInput ?? ""),
        thicknessInput: String((entry.snapshot as Record<string, unknown>).thicknessInput ?? ""),
      });

      return snapshot === null
        ? []
        : [
            {
              id: entry.id,
              savedAtMillis: entry.savedAtMillis,
              snapshot,
            },
          ];
    });
  } catch {
    return [];
  }
}

export function loadHistoryEntries(storage: Pick<Storage, "getItem"> | null | undefined): CalculationHistoryEntry[] {
  if (storage == null) {
    return [];
  }

  return parseHistoryEntries(storage.getItem(HISTORY_STORAGE_KEY));
}

export function persistHistoryEntries(
  entries: CalculationHistoryEntry[],
  storage: Pick<Storage, "setItem"> | null | undefined,
): void {
  if (storage == null) {
    return;
  }

  const serializedEntries = serializeHistoryEntries(entries);
  cachedSerializedHistoryEntries = serializedEntries;
  cachedHistoryEntriesSnapshot = entries;
  storage.setItem(HISTORY_STORAGE_KEY, serializedEntries);
}

export function subscribeToHistoryEntries(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = (): void => {
    callback();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(HISTORY_STORAGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(HISTORY_STORAGE_EVENT, handleChange);
  };
}

export function getClientHistoryEntriesSnapshot(): CalculationHistoryEntry[] {
  if (typeof window === "undefined") {
    return EMPTY_HISTORY_ENTRIES;
  }

  const serializedEntries = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  if (serializedEntries === cachedSerializedHistoryEntries) {
    return cachedHistoryEntriesSnapshot;
  }

  cachedSerializedHistoryEntries = serializedEntries;
  cachedHistoryEntriesSnapshot = parseHistoryEntries(serializedEntries);
  return cachedHistoryEntriesSnapshot;
}

export function getServerHistoryEntriesSnapshot(): CalculationHistoryEntry[] {
  return EMPTY_HISTORY_ENTRIES;
}

export function notifyHistoryEntriesChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(HISTORY_STORAGE_EVENT));
}

export function createHistoryEntry(
  snapshot: CalculationHistorySnapshot,
  nowMillis: () => number = Date.now,
): CalculationHistoryEntry {
  return {
    id: createHistoryId(),
    savedAtMillis: nowMillis(),
    snapshot,
  };
}

function createHistoryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `history-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

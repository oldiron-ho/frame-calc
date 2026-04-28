import {
  calculateRailLayout,
  type EndRailMode,
  type RailLayoutResult,
} from "@/lib/rail-calculator";
import {
  parseDecimalInput,
  parseStrictInt,
  metersToMillimeters,
} from "@/lib/number-input";

export const HISTORY_STORAGE_KEY = "framecalc-history-v3";
export const MAX_HISTORY_ENTRIES = 10;
const HISTORY_STORAGE_EVENT = "framecalc-history-sync";
const LEGACY_HISTORY_STORAGE_KEYS = ["framecalc-history-v2"] as const;
const EMPTY_HISTORY_ENTRIES: CalculationHistoryEntry[] = [];

let cachedSerializedHistoryEntries: string | null | undefined;
let cachedHistoryEntriesSnapshot: CalculationHistoryEntry[] = EMPTY_HISTORY_ENTRIES;

export interface CalculationHistorySnapshot {
  totalLengthInput: string;
  gapCountInput: string;
  thicknessInput: string;
  endRailMode?: EndRailMode;
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
    snapshot.endRailMode ?? "with-ends",
  ].join("|");
}

export function createCalculationHistorySnapshot(inputs: {
  totalLengthInput: string;
  gapCountInput: string;
  thicknessInput: string;
  endRailMode?: EndRailMode;
}): CalculationHistorySnapshot | null {
  const normalizedTotalLengthInput = inputs.totalLengthInput.trim();
  const normalizedGapCountInput = inputs.gapCountInput.trim();
  const normalizedThicknessInput = inputs.thicknessInput.trim();
  const endRailMode = inputs.endRailMode ?? "with-ends";

  if (
    normalizedTotalLengthInput.length === 0 ||
    normalizedGapCountInput.length === 0 ||
    normalizedThicknessInput.length === 0
  ) {
    return null;
  }

  const totalLength = parseStrictInt(normalizedTotalLengthInput);
  const gapCount = parseStrictInt(normalizedGapCountInput);
  const thicknessInMillimeters = parseStrictInt(normalizedThicknessInput);

  if (
    totalLength === null ||
    gapCount === null ||
    thicknessInMillimeters === null
  ) {
    return null;
  }

  const snapshot = {
    totalLengthInput: totalLength.toString(),
    gapCountInput: gapCount.toString(),
    thicknessInput: thicknessInMillimeters.toString(),
    endRailMode,
  };

  return snapshotToLayoutResultOrNull(snapshot) === null ? null : snapshot;
}

export function snapshotToLayoutResultOrNull(
  snapshot: CalculationHistorySnapshot,
): RailLayoutResult | null {
  const totalLength = parseStrictInt(snapshot.totalLengthInput);
  const gapCount = parseStrictInt(snapshot.gapCountInput);
  const thicknessInMillimeters = parseStrictInt(snapshot.thicknessInput);

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
      thicknessInMillimeters,
      snapshot.endRailMode ?? "with-ends",
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
        endRailMode: parseEndRailMode((entry.snapshot as Record<string, unknown>).endRailMode),
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

  return loadHistoryEntriesFromStorage(storage);
}

export function persistHistoryEntries(
  entries: CalculationHistoryEntry[],
  storage: Pick<Storage, "setItem"> | null | undefined,
): void {
  if (storage == null) {
    return;
  }

  const serializedEntries = serializeHistoryEntries(entries);
  cachedSerializedHistoryEntries = getSerializedCacheKey({
    serializedEntries,
    isLegacy: false,
  });
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

  const source = getHistoryStorageSource(window.localStorage);
  const serializedEntries = getSerializedCacheKey(source);
  if (serializedEntries === cachedSerializedHistoryEntries) {
    return cachedHistoryEntriesSnapshot;
  }

  cachedSerializedHistoryEntries = serializedEntries;
  cachedHistoryEntriesSnapshot = source.isLegacy
    ? parseLegacyHistoryEntries(source.serializedEntries)
    : parseHistoryEntries(source.serializedEntries);
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

function loadHistoryEntriesFromStorage(storage: Pick<Storage, "getItem">): CalculationHistoryEntry[] {
  const source = getHistoryStorageSource(storage);
  return source.isLegacy
    ? parseLegacyHistoryEntries(source.serializedEntries)
    : parseHistoryEntries(source.serializedEntries);
}

function getHistoryStorageSource(storage: Pick<Storage, "getItem">): {
  serializedEntries: string | null;
  isLegacy: boolean;
} {
  const currentEntries = storage.getItem(HISTORY_STORAGE_KEY);
  if (currentEntries !== null) {
    return {
      serializedEntries: currentEntries,
      isLegacy: false,
    };
  }

  for (const legacyKey of LEGACY_HISTORY_STORAGE_KEYS) {
    const legacyEntries = storage.getItem(legacyKey);
    if (legacyEntries !== null) {
      return {
        serializedEntries: legacyEntries,
        isLegacy: true,
      };
    }
  }

  return {
    serializedEntries: null,
    isLegacy: false,
  };
}

function getSerializedCacheKey(source: {
  serializedEntries: string | null;
  isLegacy: boolean;
}): string {
  return `${source.isLegacy ? "legacy" : "current"}:${source.serializedEntries ?? ""}`;
}

function parseLegacyHistoryEntries(
  serializedEntries: string | null | undefined,
): CalculationHistoryEntry[] {
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

      const totalLengthInMeters = parseDecimalInput(
        String((entry.snapshot as Record<string, unknown>).totalLengthInput ?? ""),
      );
      const gapCount = parseStrictInt(
        String((entry.snapshot as Record<string, unknown>).gapCountInput ?? ""),
      );
      const thicknessInMillimeters = parseDecimalInput(
        String((entry.snapshot as Record<string, unknown>).thicknessInput ?? ""),
      );

      if (
        totalLengthInMeters === null ||
        gapCount === null ||
        thicknessInMillimeters === null
      ) {
        return [];
      }

      const snapshot = createCalculationHistorySnapshot({
        totalLengthInput: Math.round(metersToMillimeters(totalLengthInMeters)).toString(),
        gapCountInput: gapCount.toString(),
        thicknessInput: Math.round(thicknessInMillimeters).toString(),
        endRailMode: "with-ends",
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

function parseEndRailMode(value: unknown): EndRailMode {
  return value === "without-ends" ? "without-ends" : "with-ends";
}

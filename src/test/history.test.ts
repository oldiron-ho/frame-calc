import { describe, expect, it } from "vitest";

import {
  MAX_HISTORY_ENTRIES,
  createCalculationHistorySnapshot,
  deleteHistoryEntry,
  parseHistoryEntries,
  serializeHistoryEntries,
  withSavedEntry,
  type CalculationHistoryEntry,
} from "@/lib/history";

describe("history helpers", () => {
  it("moves a matching calculation to the front without duplicating it", () => {
    const duplicate = historyEntry({
      id: "existing-duplicate",
      savedAtMillis: 100,
      totalLengthInput: "3600",
      gapCountInput: "5",
      thicknessInput: "38",
    });
    const other = historyEntry({
      id: "other",
      savedAtMillis: 90,
      totalLengthInput: "2400",
      gapCountInput: "3",
      thicknessInput: "50",
    });
    const replacement = historyEntry({
      id: "replacement",
      savedAtMillis: 110,
      totalLengthInput: "3600",
      gapCountInput: "5",
      thicknessInput: "38",
    });

    const updatedEntries = withSavedEntry([duplicate, other], replacement);

    expect(updatedEntries).toEqual([replacement, other]);
  });

  it("keeps only the most recent configured limit", () => {
    const existingEntries = Array.from({ length: MAX_HISTORY_ENTRIES }, (_, index) => {
      return historyEntry({
        id: `entry-${index}`,
        savedAtMillis: index,
        totalLengthInput: ((2 + index) * 1000).toString(),
        gapCountInput: "2",
        thicknessInput: "100",
      });
    });
    const newEntry = historyEntry({
      id: "new-entry",
      savedAtMillis: 999,
      totalLengthInput: "99900",
      gapCountInput: "4",
      thicknessInput: "200",
    });

    const updatedEntries = withSavedEntry(existingEntries, newEntry);

    expect(updatedEntries).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(updatedEntries[0]).toEqual(newEntry);
    expect(updatedEntries.some((entry) => entry.id === existingEntries.at(-1)?.id)).toBe(false);
  });

  it("removes only the matching history entry", () => {
    const first = historyEntry({ id: "first", savedAtMillis: 10 });
    const second = historyEntry({ id: "second", savedAtMillis: 20 });
    const third = historyEntry({ id: "third", savedAtMillis: 30 });

    const remainingEntries = deleteHistoryEntry([first, second, third], "second");

    expect(remainingEntries).toEqual([first, third]);
  });

  it("round-trips history entries and drops invalid data", () => {
    const entries = [
      historyEntry({ id: "first", savedAtMillis: 10 }),
      historyEntry({
        id: "second",
        savedAtMillis: 20,
        totalLengthInput: "3600",
        gapCountInput: "5",
        thicknessInput: "38",
      }),
    ];

    const decodedEntries = parseHistoryEntries(serializeHistoryEntries(entries));

    expect(decodedEntries).toEqual(entries);
    expect(parseHistoryEntries('[{"id":"bad","savedAtMillis":1,"snapshot":{"totalLengthInput":"0","gapCountInput":"2","thicknessInput":"100"}}]')).toEqual([]);
  });

  it("normalizes equivalent numeric strings into a canonical snapshot", () => {
    const snapshot = createCalculationHistorySnapshot({
      totalLengthInput: "003600",
      gapCountInput: "5",
      thicknessInput: "038",
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot).toEqual({
      totalLengthInput: "3600",
      gapCountInput: "5",
      thicknessInput: "38",
      endRailMode: "with-ends",
    });
  });
});

function historyEntry(input: {
  id: string;
  savedAtMillis: number;
  totalLengthInput?: string;
  gapCountInput?: string;
  thicknessInput?: string;
}): CalculationHistoryEntry {
  const snapshot = createCalculationHistorySnapshot({
    totalLengthInput: input.totalLengthInput ?? "2400",
    gapCountInput: input.gapCountInput ?? "3",
    thicknessInput: input.thicknessInput ?? "50",
  });

  if (snapshot === null) {
    throw new Error("Failed to create valid history snapshot for test");
  }

  return {
    id: input.id,
    savedAtMillis: input.savedAtMillis,
    snapshot,
  };
}

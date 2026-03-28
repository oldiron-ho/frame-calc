import { describe, expect, it } from "vitest";

import {
  RailLayoutCalculationError,
  RailLayoutValidationError,
  calculateRailLayout,
} from "@/lib/rail-calculator";

describe("calculateRailLayout", () => {
  it("calculates evenly spaced rail positions", () => {
    const result = calculateRailLayout(3600, 5, 38);

    expect(result.railCount).toBe(6);
    expect(result.gapSize).toBeCloseTo(674.4, 10);
    expect(result.positions).toHaveLength(6);
    expect(result.positions[0]).toEqual({
      index: 1,
      start: 0,
      end: 38,
    });
    expect(result.positions[5].index).toBe(6);
    expect(result.positions[5].start).toBeCloseTo(3562, 10);
    expect(result.positions[5].end).toBeCloseTo(3600, 10);
  });

  it.each([
    [0, 5, 38, RailLayoutValidationError.TotalLengthMustBePositive],
    [3600, 0, 38, RailLayoutValidationError.GapCountMustBeAtLeastOne],
    [3600, 5, 0, RailLayoutValidationError.ThicknessMustBePositive],
    [200, 5, 50, RailLayoutValidationError.TotalLengthTooShort],
  ])("throws the right validation error for %j", (totalLength, gapCount, thickness, error) => {
    expect(() => calculateRailLayout(totalLength, gapCount, thickness)).toThrowError(
      new RailLayoutCalculationError(error),
    );
  });
});

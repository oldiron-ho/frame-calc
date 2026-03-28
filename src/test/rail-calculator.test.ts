import { describe, expect, it } from "vitest";

import {
  RailLayoutCalculationError,
  RailLayoutValidationError,
  calculateRailLayout,
} from "@/lib/rail-calculator";

describe("calculateRailLayout", () => {
  it("calculates evenly spaced rail positions", () => {
    const result = calculateRailLayout(3.6, 5, 0.038);

    expect(result.railCount).toBe(6);
    expect(result.gapSize).toBeCloseTo(0.6744, 10);
    expect(result.positions).toHaveLength(6);
    expect(result.positions[0]).toEqual({
      index: 1,
      start: 0,
      end: 0.038,
    });
    expect(result.positions[5].index).toBe(6);
    expect(result.positions[5].start).toBeCloseTo(3.562, 10);
    expect(result.positions[5].end).toBeCloseTo(3.6, 10);
  });

  it.each([
    [0, 5, 0.038, RailLayoutValidationError.TotalLengthMustBePositive],
    [3.6, 0, 0.038, RailLayoutValidationError.GapCountMustBeAtLeastOne],
    [3.6, 5, 0, RailLayoutValidationError.ThicknessMustBePositive],
    [0.2, 5, 0.05, RailLayoutValidationError.TotalLengthTooShort],
  ])("throws the right validation error for %j", (totalLength, gapCount, thickness, error) => {
    expect(() => calculateRailLayout(totalLength, gapCount, thickness)).toThrowError(
      new RailLayoutCalculationError(error),
    );
  });
});

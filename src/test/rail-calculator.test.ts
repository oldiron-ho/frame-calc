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

  it("calculates evenly spaced internal rails without end rails", () => {
    const result = calculateRailLayout(3600, 5, 38, "without-ends");

    expect(result.railCount).toBe(4);
    expect(result.gapSize).toBeCloseTo(689.6, 10);
    expect(result.positions).toHaveLength(4);
    expect(result.positions[0]).toEqual({
      index: 1,
      start: 689.6,
      end: 727.6,
    });
    expect(result.positions[3].index).toBe(4);
    expect(result.positions[3].start).toBeCloseTo(2872.4, 10);
    expect(result.positions[3].end).toBeCloseTo(2910.4, 10);
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

  it("requires at least two gaps when end rails are omitted", () => {
    expect(() => calculateRailLayout(3600, 1, 38, "without-ends")).toThrowError(
      new RailLayoutCalculationError(
        RailLayoutValidationError.GapCountMustBeAtLeastTwoWithoutEnds,
      ),
    );
  });
});

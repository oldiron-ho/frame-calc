import { describe, expect, it } from "vitest";

import { buildCalculatorUiState } from "@/lib/ui-state";

describe("buildCalculatorUiState", () => {
  it("returns the empty state when no inputs are present", () => {
    expect(
      buildCalculatorUiState({
        totalLengthInput: "",
        gapCountInput: "",
        thicknessInput: "",
      }),
    ).toMatchObject({ kind: "empty" });
  });

  it("returns a hint when some fields are still blank", () => {
    expect(
      buildCalculatorUiState({
        totalLengthInput: "3.6",
        gapCountInput: "",
        thicknessInput: "0.038",
      }),
    ).toMatchObject({ kind: "hint" });
  });

  it("returns a validation error when inputs are invalid", () => {
    expect(
      buildCalculatorUiState({
        totalLengthInput: "3.6",
        gapCountInput: "0",
        thicknessInput: "0.038",
      }),
    ).toMatchObject({
      kind: "error",
      message: "간격 개수는 1 이상의 정수로 입력하세요.",
    });

    expect(
      buildCalculatorUiState({
        totalLengthInput: "3.6",
        gapCountInput: "5.5",
        thicknessInput: "0.038",
      }),
    ).toMatchObject({
      kind: "error",
      message: "간격 개수는 1 이상의 정수로 입력하세요.",
    });
  });

  it("returns a ready state when the calculation succeeds", () => {
    const state = buildCalculatorUiState({
      totalLengthInput: "3.6",
      gapCountInput: "5",
      thicknessInput: "0.038",
    });

    expect(state.kind).toBe("ready");
    if (state.kind !== "ready") {
      throw new Error("expected ready state");
    }

    expect(state.layout.railCount).toBe(6);
    expect(state.layout.positions).toHaveLength(6);
  });
});

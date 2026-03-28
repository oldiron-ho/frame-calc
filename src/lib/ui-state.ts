import {
  RailLayoutCalculationError,
  RailLayoutValidationError,
  calculateRailLayout,
  type RailLayoutResult,
} from "@/lib/rail-calculator";
import {
  millimetersToMeters,
  parseDecimalInput,
  parseStrictInt,
} from "@/lib/number-input";

export type CalculatorUiState =
  | { kind: "empty"; title: string; message: string; isError: false }
  | { kind: "hint"; title: string; message: string; isError: false }
  | { kind: "error"; title: string; message: string; isError: true }
  | { kind: "ready"; layout: RailLayoutResult };

const MESSAGES = {
  emptyTitle: "입력을 시작하세요",
  emptyMessage: "세 값을 모두 입력하면 난간 시작 위치 테이블이 바로 표시됩니다.",
  hintTitle: "입력 대기 중",
  hintMessage: "전체 길이(m), 간격 개수, 난간 두께(mm)를 모두 입력하세요.",
  errorTitle: "입력을 확인하세요",
  invalidTotalLength: "전체 길이는 0보다 큰 숫자로 입력하세요.",
  invalidGapCount: "간격 개수는 1 이상의 정수로 입력하세요.",
  invalidThickness: "난간 두께는 0보다 큰 숫자(mm)로 입력하세요.",
  totalLengthTooShort: "전체 길이가 난간 두께 합보다 짧습니다.",
} as const;

export function buildCalculatorUiState(input: {
  totalLengthInput: string;
  gapCountInput: string;
  thicknessInput: string;
}): CalculatorUiState {
  const totalLengthInput = input.totalLengthInput.trim();
  const gapCountInput = input.gapCountInput.trim();
  const thicknessInput = input.thicknessInput.trim();

  if (
    totalLengthInput.length === 0 &&
    gapCountInput.length === 0 &&
    thicknessInput.length === 0
  ) {
    return {
      kind: "empty",
      title: MESSAGES.emptyTitle,
      message: MESSAGES.emptyMessage,
      isError: false,
    };
  }

  if (
    totalLengthInput.length === 0 ||
    gapCountInput.length === 0 ||
    thicknessInput.length === 0
  ) {
    return {
      kind: "hint",
      title: MESSAGES.hintTitle,
      message: MESSAGES.hintMessage,
      isError: false,
    };
  }

  const totalLength = parseDecimalInput(totalLengthInput);
  const gapCount = parseStrictInt(gapCountInput);
  const thicknessInMillimeters = parseDecimalInput(thicknessInput);

  if (totalLength === null) {
    return {
      kind: "error",
      title: MESSAGES.errorTitle,
      message: MESSAGES.invalidTotalLength,
      isError: true,
    };
  }

  if (gapCount === null) {
    return {
      kind: "error",
      title: MESSAGES.errorTitle,
      message: MESSAGES.invalidGapCount,
      isError: true,
    };
  }

  if (thicknessInMillimeters === null) {
    return {
      kind: "error",
      title: MESSAGES.errorTitle,
      message: MESSAGES.invalidThickness,
      isError: true,
    };
  }

  try {
    return {
      kind: "ready",
      layout: calculateRailLayout(
        totalLength,
        gapCount,
        millimetersToMeters(thicknessInMillimeters),
      ),
    };
  } catch (error) {
    if (error instanceof RailLayoutCalculationError) {
      return {
        kind: "error",
        title: MESSAGES.errorTitle,
        message: toErrorMessage(error.error),
        isError: true,
      };
    }

    throw error;
  }
}

function toErrorMessage(error: RailLayoutValidationError): string {
  switch (error) {
    case RailLayoutValidationError.TotalLengthMustBePositive:
      return MESSAGES.invalidTotalLength;
    case RailLayoutValidationError.GapCountMustBeAtLeastOne:
      return MESSAGES.invalidGapCount;
    case RailLayoutValidationError.ThicknessMustBePositive:
      return MESSAGES.invalidThickness;
    case RailLayoutValidationError.TotalLengthTooShort:
      return MESSAGES.totalLengthTooShort;
  }
}

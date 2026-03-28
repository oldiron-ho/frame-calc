export interface RailPosition {
  index: number;
  start: number;
  end: number;
}

export interface RailLayoutResult {
  totalLength: number;
  gapCount: number;
  thickness: number;
  railCount: number;
  gapSize: number;
  positions: RailPosition[];
}

export enum RailLayoutValidationError {
  TotalLengthMustBePositive = "TotalLengthMustBePositive",
  GapCountMustBeAtLeastOne = "GapCountMustBeAtLeastOne",
  ThicknessMustBePositive = "ThicknessMustBePositive",
  TotalLengthTooShort = "TotalLengthTooShort",
}

export class RailLayoutCalculationError extends Error {
  constructor(public readonly error: RailLayoutValidationError) {
    super(error);
    this.name = "RailLayoutCalculationError";
  }
}

export function calculateRailLayout(
  totalLength: number,
  gapCount: number,
  thickness: number,
): RailLayoutResult {
  validate(totalLength > 0 && Number.isFinite(totalLength), () => {
    return RailLayoutValidationError.TotalLengthMustBePositive;
  });
  validate(gapCount >= 1, () => {
    return RailLayoutValidationError.GapCountMustBeAtLeastOne;
  });
  validate(thickness > 0 && Number.isFinite(thickness), () => {
    return RailLayoutValidationError.ThicknessMustBePositive;
  });

  const railCount = gapCount + 1;
  const totalRailThickness = railCount * thickness;

  validate(totalRailThickness <= totalLength, () => {
    return RailLayoutValidationError.TotalLengthTooShort;
  });

  const gapSize = (totalLength - totalRailThickness) / gapCount;
  const step = thickness + gapSize;
  const positions = Array.from({ length: railCount }, (_, index) => {
    const start = index === railCount - 1 ? totalLength - thickness : index * step;
    return {
      index: index + 1,
      start,
      end: start + thickness,
    };
  });

  return {
    totalLength,
    gapCount,
    thickness,
    railCount,
    gapSize,
    positions,
  };
}

function validate(
  condition: boolean,
  error: () => RailLayoutValidationError,
): asserts condition {
  if (!condition) {
    throw new RailLayoutCalculationError(error());
  }
}

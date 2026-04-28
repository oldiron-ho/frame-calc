export function formatMillimeters(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 3,
  }).format(value);
}

export function formatRoundedMillimeters(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatHistoryDateTime(savedAtMillis: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(savedAtMillis));
}

export function formatInputSummary(input: {
  totalLengthInput: string;
  gapCountInput: string;
  thicknessInput: string;
  endRailMode?: "with-ends" | "without-ends";
}): string {
  const endRailModeLabel =
    input.endRailMode === "without-ends" ? "끝단 없음" : "끝단 있음";
  return `전체 ${input.totalLengthInput}mm · 간격 ${input.gapCountInput}개 · 두께 ${input.thicknessInput}mm · ${endRailModeLabel}`;
}

export function formatResultSummary(result: {
  railCount: number;
  gapSize: number;
}): string {
  return `난간 ${result.railCount}개 · 동일 간격 ${formatMillimeters(result.gapSize)}mm`;
}

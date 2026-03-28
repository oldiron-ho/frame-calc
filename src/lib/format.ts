export function formatMeters(value: number): string {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
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
}): string {
  return `전체 ${input.totalLengthInput}m · 간격 ${input.gapCountInput}개 · 두께 ${input.thicknessInput}m`;
}

export function formatResultSummary(result: {
  railCount: number;
  gapSize: number;
}): string {
  return `난간 ${result.railCount}개 · 동일 간격 ${formatMeters(result.gapSize)}m`;
}

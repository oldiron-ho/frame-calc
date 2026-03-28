const DECIMAL_INPUT_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const STRICT_INT_PATTERN = /^[+-]?\d+$/;

export const MILLIMETERS_PER_METER = 1000;

export function sanitizeDigitsOnlyInput(value: string): string {
  return value.replace(/\D+/g, "");
}

export function normalizeDecimalInput(value: string): string {
  return value.trim().replaceAll(",", ".");
}

export function parseDecimalInput(value: string): number | null {
  const normalized = normalizeDecimalInput(value);
  if (!DECIMAL_INPUT_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toCanonicalDecimalInput(value: number): string {
  const asString = value.toString();
  if (!/[eE]/.test(asString)) {
    return asString;
  }

  return value.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
}

export function parseStrictInt(value: string): number | null {
  const normalized = value.trim();
  if (!STRICT_INT_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : null;
}

export function metersToMillimeters(value: number): number {
  return value * MILLIMETERS_PER_METER;
}

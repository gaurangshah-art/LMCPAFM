const WEIGHT_UNIT_SUFFIX = /\s*(g|grams?|gm)\.?\s*$/i;
const WEIGHT_RANGE_SPLIT = /\s*(?:-|–|—|\bto\b)\s*/i;
const NUMERIC_WEIGHT = /^\d+(\.\d+)?$/;

export function normalizeWeightText(value: string): string {
  return value.trim().replace(WEIGHT_UNIT_SUFFIX, "").trim();
}

function parseSingleWeightGrams(part: string): number {
  const cleaned = part.trim();
  if (!NUMERIC_WEIGHT.test(cleaned)) {
    throw new Error(`Weight must be numeric (grams): '${part.trim()}'`);
  }
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Weight must be greater than zero.");
  }
  return numeric;
}

export function validateWeightGrams(value: string): string | null {
  const text = normalizeWeightText(value);
  if (!text) {
    return "Weight is required.";
  }

  const parts = text.split(WEIGHT_RANGE_SPLIT).filter(Boolean);
  if (parts.length === 2) {
    try {
      const minimum = parseSingleWeightGrams(parts[0]);
      const maximum = parseSingleWeightGrams(parts[1]);
      if (minimum > maximum) {
        return "Weight range minimum cannot exceed maximum.";
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Invalid weight value.";
    }
  }

  if (parts.length !== 1) {
    return "Weight must be a numeric value or range in grams (e.g. 200 g or 200-250 g).";
  }

  try {
    parseSingleWeightGrams(parts[0]);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid weight value.";
  }
}

export function latestIsoDate(...dates: Array<string | null | undefined>): string | undefined {
  const valid = dates.filter((value): value is string => Boolean(value));
  if (valid.length === 0) {
    return undefined;
  }
  return valid.reduce((latest, current) => (current > latest ? current : latest));
}

export function validateDateOnOrAfter(
  value: string,
  minimum: string | undefined,
  valueLabel: string,
  minimumLabel: string,
): string | null {
  if (!value) {
    return `${valueLabel} is required.`;
  }
  if (!minimum) {
    return null;
  }
  if (value < minimum) {
    return `${valueLabel} cannot be earlier than ${minimumLabel} (${minimum}).`;
  }
  return null;
}

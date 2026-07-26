const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const DISPLAY_DATE = /^\d{2}\/\d{2}\/\d{4}$/;

/** Format API/ISO dates for display as dd/mm/yyyy. */
export function formatDisplayDate(
  value: string | null | undefined,
  fallback = "—",
): string {
  if (value == null) return fallback;

  const text = String(value).trim();
  if (!text) return fallback;
  if (DISPLAY_DATE.test(text)) return text;

  const isoMatch = text.match(ISO_DATE_PREFIX);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  return text;
}

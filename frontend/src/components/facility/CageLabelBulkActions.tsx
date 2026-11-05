import type { CageLabelCategory } from "../../api/facilityApi";

interface CageLabelBulkActionsProps {
  onPrintCategory: (category: CageLabelCategory) => void | Promise<void>;
  busy?: boolean;
}

const BULK_CATEGORIES: Array<{ category: CageLabelCategory; label: string }> = [
  { category: "quarantine", label: "Print all quarantine cage labels" },
  { category: "available", label: "Print all available cage labels" },
  { category: "rehabilitated", label: "Print all rehabilitated cage labels" },
];

export function CageLabelBulkActions({ onPrintCategory, busy = false }: CageLabelBulkActionsProps) {
  return (
    <div className="inline-actions cage-label-bulk-actions">
      {BULK_CATEGORIES.map(({ category, label }) => (
        <button
          key={category}
          type="button"
          className="btn-secondary btn-small"
          disabled={busy}
          onClick={() => void onPrintCategory(category)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export const SUPPLY_CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "bedding", label: "Bedding (corncob, etc.)" },
  { value: "cage", label: "Cages" },
  { value: "ivc", label: "IVC / equipment" },
  { value: "other", label: "Other" },
] as const;

export const SUPPLY_UNITS = [
  { value: "each", label: "Each" },
  { value: "bag", label: "Bag" },
  { value: "kg", label: "Kg" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
] as const;

export type SupplyCategory = (typeof SUPPLY_CATEGORIES)[number]["value"];

export const HVAC_STATUSES = [
  { value: "normal", label: "Normal" },
  { value: "alarm", label: "Alarm / out of range" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline", label: "Offline" },
] as const;

export type HvacStatus = (typeof HVAC_STATUSES)[number]["value"];

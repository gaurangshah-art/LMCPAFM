export const CARE_LOG_TYPES = [
  { value: "feeding", label: "Feeding" },
  { value: "watering", label: "Watering" },
  { value: "cleaning", label: "Cage cleaning" },
  { value: "cage_cleaning", label: "Cage cleaning (detailed)" },
  { value: "cage_wash", label: "Cage wash" },
  { value: "autoclave", label: "Autoclave" },
  { value: "room_sanitize", label: "Room sanitize" },
  { value: "ivc_check", label: "IVC check" },
] as const;

export type CareLogType = (typeof CARE_LOG_TYPES)[number]["value"];

export const ROOM_ONLY_CARE_LOG_TYPES = new Set<CareLogType>([
  "autoclave",
  "room_sanitize",
  "ivc_check",
]);

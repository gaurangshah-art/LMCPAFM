export interface FacilitySummary {
  total_animals: number;
  available_animals: number;
  quarantine_animals: number;
  allocated_animals: number;
  deceased_animals: number;
  rehabilitated_animals: number;
  total_rooms: number;
  total_cages: number;
  procurements_this_month: number;
  breeding_records_this_month: number;
}

export interface FacilityAnimal {
  id: number;
  animal_number?: string | null;
  species_name?: string | null;
  strain_name?: string | null;
  cage_label?: string | null;
  room_code?: string | null;
  status?: string | null;
  latest_weight_g?: number | null;
}

export interface CageMapAnimal {
  id: number;
  animal_number?: string | null;
  status?: string | null;
  species_name?: string | null;
  strain_name?: string | null;
}

export interface CageMapCage {
  id: number;
  label: string;
  location: string;
  capacity: number;
  status: string;
  animal_count: number;
  animals: CageMapAnimal[];
}

export interface FacilityCageMapRoom {
  id: number;
  code: string;
  name: string;
  building?: string | null;
  cages: CageMapCage[];
}

export interface AnimalTimelineEvent {
  event_type: string;
  date: string;
  title: string;
  details?: string | null;
}

export interface FacilityCareLog {
  id: number;
  log_type: string;
  room_id?: number | null;
  cage_id?: number | null;
  room_code?: string | null;
  cage_label?: string | null;
  date: string;
  details: string;
  performed_by_name: string;
  created_at: string;
}

export interface PiDashboardGroup {
  group_id: number;
  group_name: string;
  animal_count: number;
  caged_count: number;
}

export interface PiDashboardProtocol {
  protocol_id: number;
  protocol_number?: string | null;
  title: string;
  principal_investigator?: string | null;
  status?: string | null;
  total_animals: number;
  allocated_count: number;
  in_experiment_count: number;
  caged_count: number;
  uncaged_count: number;
  groups: PiDashboardGroup[];
}

export interface PiDashboard {
  protocols: PiDashboardProtocol[];
}

export interface RoomDashboardRow {
  room_id: number;
  room_code: string;
  room_name: string;
  building?: string | null;
  cage_count: number;
  occupied_cages: number;
  total_capacity: number;
  animal_count: number;
  quarantine_count: number;
  available_count: number;
  allocated_count: number;
  rehabilitated_count: number;
  last_care_date?: string | null;
  care_stale: boolean;
}

export interface RoomDashboard {
  stale_days: number;
  rooms: RoomDashboardRow[];
}

export interface StrainDashboardRow {
  strain_id: number;
  strain_name: string;
  species_id: number;
  species_name?: string | null;
  total_animals: number;
  available_count: number;
  quarantine_count: number;
  allocated_count: number;
  in_experiment_count: number;
  rehabilitated_count: number;
  deceased_count: number;
}

export interface StrainDashboard {
  strains: StrainDashboardRow[];
}

export interface FacilityRoom {
  id: number;
  code: string;
  name: string;
  building?: string | null;
  notes?: string | null;
}

export interface FacilityCage {
  id: number;
  label: string;
  location: string;
  room_id?: number | null;
  capacity: number;
  status: string;
  room_code?: string | null;
  room_name?: string | null;
  animal_count: number;
}

export interface SupplyItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  reorder_level: number;
  quantity_on_hand: number;
  active: boolean;
  notes?: string | null;
  low_stock: boolean;
}

export interface SupplyTransaction {
  id: number;
  item_id: number;
  item_name: string;
  item_category: string;
  item_unit: string;
  txn_type: string;
  quantity: number;
  date: string;
  notes?: string | null;
  room_id?: number | null;
  room_code?: string | null;
  created_at: string;
}

export interface FacilityEnvironmentLog {
  id: number;
  room_id: number;
  room_code?: string | null;
  room_name?: string | null;
  date: string;
  temperature_c?: number | null;
  humidity_pct?: number | null;
  hvac_status: string;
  light_cycle?: string | null;
  notes?: string | null;
  performed_by_name: string;
  created_at: string;
}

export interface FacilityOperationsActivity {
  kind: string;
  date: string;
  title: string;
  subtitle: string;
  details: string;
}

export interface FacilityOperationsSummary {
  as_of_date: string;
  facility_summary: FacilitySummary;
  stale_care_room_count: number;
  stale_care_rooms: RoomDashboardRow[];
  low_stock_count: number;
  low_stock_items: SupplyItem[];
  rooms_logged_today: number;
  rooms_missing_env_today: number;
  total_rooms: number;
  recent_activity: FacilityOperationsActivity[];
}

export interface FormCBreedingRow {
  date: string;
  number_born: number;
  litter_count: number;
  species_name: string;
  strain_name: string;
  breeding_record_id: number;
  remarks?: string | null;
}

export interface FormCDisposalRow {
  date: string;
  animal_id: number;
  animal_number?: string | null;
  method: string;
  reason: string;
  species_name: string;
  strain_name: string;
  disposal_id: number;
}

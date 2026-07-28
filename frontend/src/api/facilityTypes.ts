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

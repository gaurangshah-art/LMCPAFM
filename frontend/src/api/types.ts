export interface IAECProjectCreate {
  title: string;
  investigator_name: string;
  protocol_number?: string | null;
  approval_date?: string | null;
  principal_investigator?: string | null;
  purpose?: string | null;
  status?: string | null;
  objective?: string | null;
  start_date?: string | null;
}

export interface AnimalExperiment {
  id: number;
  description: string;
  group_id: number;
}

export interface ExperimentGroup {
  id: number;
  name: string;
  project_id: number;
  experiments: AnimalExperiment[];
}

export interface IAECProject extends IAECProjectCreate {
  id: number;
  experiment_groups: ExperimentGroup[];
}

export interface ExperimentGroupCreate {
  name: string;
  project_id: number;
}

export interface AnimalExperimentCreate {
  description: string;
  group_id: number;
}

export interface AnimalRequisitionItemCreate {
  species_id: number;
  strain_id: number;
  requested_count: number;
}

export interface AnimalAllocationAnimal {
  id: number;
  species_id: number;
  strain_id: number;
  cage_id?: number | null;
  status?: string | null;
  protocol_id?: number | null;
}

export interface AnimalAllocationItem {
  id: number;
  allocation_id: number;
  requisition_item_id: number;
  allocated_count: number;
  remaining_count: number;
  timestamp: string;
  animals: AnimalAllocationAnimal[];
}

export interface AnimalRequisitionItem extends AnimalRequisitionItemCreate {
  id: number;
  requisition_id: number;
  allocations: AnimalAllocationItem[];
}

export interface AnimalRequisitionCreate {
  protocol_id: number;
  requester_name: string;
  requester_role: string;
  date: string;
  purpose: string;
  items: AnimalRequisitionItemCreate[];
}

export interface AnimalRequisition extends AnimalRequisitionCreate {
  id: number;
  items: AnimalRequisitionItem[];
}

export interface AnimalAllocationItemCreate {
  requisition_item_id: number;
  allocated_count: number;
  remaining_count: number;
}

export interface AnimalAllocationCreate {
  requisition_id: number;
  date: string;
  allocated_by: string;
  remarks: string;
  items: AnimalAllocationItemCreate[];
}

export interface AnimalAllocation extends AnimalAllocationCreate {
  id: number;
  items: AnimalAllocationItem[];
}

export interface ExperimentAnimalCreate {
  animal_id: number;
}

export interface ExperimentAnimal extends ExperimentAnimalCreate {
  id: number;
  experiment_id: number;
}

export interface ExperimentCreate {
  protocol_id: number;
  allocation_id: number;
  date: string;
  performed_by: string;
  purpose: string;
  procedure: string;
  dose: string;
  observations: string;
  start_time?: string | null;
  end_time?: string | null;
  animals: ExperimentAnimalCreate[];
}

export interface Experiment extends ExperimentCreate {
  id: number;
  animals: ExperimentAnimal[];
}

export interface ApiErrorResponse {
  detail?: string;
}

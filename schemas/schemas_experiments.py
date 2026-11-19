from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from typing import List, Optional


# =========================================================
# ANIMAL LINK SCHEMAS
# =========================================================

class ExperimentAnimalBase(BaseModel):
    animal_id: int


class ExperimentAnimalCreate(ExperimentAnimalBase):
    pass


class ExperimentAnimal(ExperimentAnimalBase):
    id: int
    experiment_id: int
    model_config = ConfigDict(from_attributes=True)


# =========================================================
# EXPERIMENT SCHEMAS
# =========================================================

class ExperimentBase(BaseModel):
    protocol_id: int
    allocation_id: int
    experiment_group_id: int
    date: date
    performed_by: str                      # researcher name
    purpose: str                           # experiment purpose
    procedure: str                         # what was done
    dose: str                              # drug/chemical dose
    observations: str                      # experiment notes
    start_time: Optional[datetime] = None  # experiment start
    end_time: Optional[datetime] = None    # experiment end


class ExperimentCreate(ExperimentBase):
    animals: List[ExperimentAnimalCreate]  # list of animal IDs


class Experiment(ExperimentBase):
    id: int
    protocol_id: int
    allocation_id: int
    animals: List[ExperimentAnimal]
    model_config = ConfigDict(from_attributes=True)

# LMCP Animal Facility — Equipment register (for customised SOPs)

**Purpose:** Record **make, model, and operating characteristics** of equipment at LMCP so facility SOPs (cleaning, calibration, environment, washing) match real machines — not generic industry text.

**Who fills this:** Facility in-charge + admin coordinator.  
**When:** Before final approval of `sop_facility_daily_operations.md` and before writing `sop_facility_equipment_calibration.md`.

**Privacy:** Internal document — same rules as other SOPs (restricted share, not public web).

---

## How to use this register

1. Walk through the animal house and list **every** item in the categories below.  
2. Copy the **nameplate** photo or manual PDF into your internal folder (optional: `Docs/facility_assets/` — add to `.gitignore` if manuals are licensed).  
3. Fill one row per device. Use **“N/A”** if LMCP does not have that category.  
4. Send the completed table to whoever is adapting SOPs; we insert make/model into procedure steps and calibration schedules.

**Industry SOPs that depend on this register** (see `facility_sop_source_catalog.md`):

| Category | Example industry refs |
|----------|------------------------|
| Cage / rack washing | PH101, PH110 |
| Autoclave / sterilizer | PH107 |
| Weighing balance | PH-121, 163 |
| Refrigerator / cold storage | PH-114 |
| HVAC / dehumidifier | PH106 (monitoring tied to rooms) |
| Micropipette | PH-115 (usually lab — list if kept in AH) |

LMCPAFM today logs **rooms, cages, environment, care** — it does **not** store equipment master data; this register lives in **Docs** until you choose to add an equipment module later.

---

## A. Environmental control (per room or central plant)

| ID | Room / area | Equipment type (AHU, AC split, humidifier, heater, sensor) | Make | Model | Serial no. | Capacity / range | Setpoints allowed | Sensor make/model | Calibration due | Notes |
|----|-------------|-----------------------------------------------------------|------|-------|------------|------------------|-------------------|-------------------|-----------------|-------|
| ENV-1 | | | | | | | | | | |
| ENV-2 | | | | | | | | | | |

**Characteristics to capture:** min/max temp and RH the unit can hold; alarm behaviour; backup if power fails; where **thermo-hygrometer** is placed for daily log (PH106).

---

## B. Cage and rack washing

| ID | Location | Type (cage washer, tunnel washer, manual wash) | Make | Model | Serial no. | Cycle names / times | Detergent approved | Rinse temp | Validation date | Notes |
|----|----------|--------------------------------------------------|------|-------|------------|---------------------|--------------------|------------|-----------------|-------|
| WASH-1 | | | | | | | | | | |

---

## C. Sterilization

| ID | Location | Type (autoclave, HP steam, UV cabinet) | Make | Model | Serial no. | Chamber volume | Cycle types (121 °C etc.) | Biological indicator routine | Last PQ / validation | Notes |
|----|----------|----------------------------------------|------|-------|------------|----------------|---------------------------|------------------------------|----------------------|-------|
| STR-1 | | | | | | | | | | |

---

## D. Weighing (animals, feed, doses)

| ID | Location | Type (analytical, top-loading, portable) | Make | Model | Serial no. | Readability (e.g. 0.1 g) | Max capacity | Internal / external calibration schedule | Last calibration | Next due | Notes |
|----|----------|------------------------------------------|------|-------|------------|--------------------------|--------------|------------------------------------------|------------------|----------|-------|
| BAL-1 | | | | | | | | | | | |

---

## E. Cold storage (feed, biologicals)

| ID | Location | Type (refrigerator, freezer) | Make | Model | Serial no. | Temp range set | Monitoring (min/max log?) | Alarm | Last service | Notes |
|----|----------|------------------------------|------|-------|------------|----------------|---------------------------|-------|--------------|-------|
| REF-1 | | | | | | | | | | |

---

## F. Water and feed systems

| ID | Location | Type (RO plant, bottle filler, automatic watering, feed storage bin) | Make | Model | Treatment (RO, acidification) | Sanitation schedule | Notes |
|----|----------|-----------------------------------------------------------------------|------|-------|--------------------------------|---------------------|-------|
| WAT-1 | | | | | | | |

---

## G. Other facility equipment

| ID | Location | Description (vacuum, fume hood, bedding dispenser, PPE cabinet) | Make | Model | Serial no. | SOP needed? (Y/N) | Notes |
|----|----------|------------------------------------------------------------------|------|-------|------------|-------------------|-------|
| OTH-1 | | | | | | | |

---

## H. Room inventory summary (links environment to LMCPAFM)

List each **FacilityRoom** code as in LMCPAFM Admin → Facility:

| Room code | Room name | Species housed | Cage types | Target temp (°C) | Target RH (%) | Light cycle | Primary ENV equipment ID(s) |
|-----------|-----------|----------------|------------|------------------|---------------|-------------|----------------------------|
| | | | | | | | |

This table drives acceptable ranges in **Environment** logs and text in `sop_facility_daily_operations.md` §5.

---

## I. Quarantine and entry (physical, not a “machine”)

| Item | Specification at LMCP |
|------|------------------------|
| Change room layout | |
| Air lock / pressure relative to corridor | |
| PPE standard (coat, gloves, mask, hair cover) | |
| Quarantine room ID(s) | |
| Minimum quarantine period (days) | |
| Health checks performed (vendor cert, parasitology, etc.) | |

---

## J. Disinfectants and cleaning agents (approved list)

| Product name | Use (floor, cage, hands) | Active ingredient | Dilution | Contact time | MSDS location | Notes |
|--------------|--------------------------|-------------------|----------|--------------|---------------|-------|
| | | | | | | |

Required to replace generic industry wording in PH113 / PH101.

---

## K. Sign-off when register is complete

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Facility in-charge | | | |
| IAEC / CPCSEA nominee (if required) | | | |
| Admin coordinator | | | |

---

## Next step after this register is filled

1. Update **`sop_facility_daily_operations.md`** annex with room setpoints and approved disinfectants.  
2. Draft **`sop_facility_equipment_calibration.md`** per balance, sterilizer, and fridge rows.  
3. Mark **`facility_equipment_register.md`** status **APPROVED** in `sop_master_index.md`.

Optional: maintain the same data in Excel and export a row to this markdown during reviews.

---

*Template v1.0 — fill in LMCP-specific values; leave blank rows in git or replace with “Not applicable”.*

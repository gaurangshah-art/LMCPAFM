# Industry → LMCP facility SOP source catalog

**Purpose:** List industry reference SOPs under `Docs/source_industry/` that apply to **day-to-day animal facility management** (not toxicology study execution). Use this when rewriting procedures for LMCP.

**Legend**

| Tag | Meaning |
|-----|---------|
| **ADAPT** | Rewrite for LMCP; core process still relevant |
| **PARTIAL** | Use principles; LMCP layout/species/equipment may differ |
| **FORM** | Paper form only — map to LMCPAFM log or keep as annexure |
| **SKIP** | CRO/tox/lab analyser — not primary facility ops for LMCP |

Prefer **`-N.doc`** or root **PH###** copies over `Old formate sop/` duplicates unless content is missing.

---

## A. Housekeeping, entry, and room environment

| Source file (under `Animal House SOP/`) | Subject | Tag | LMCP target |
|-------------------------------------------|---------|-----|-------------|
| `Ph113-00 SOP for cleaning & sanitationof rooms in animal house - I.doc` | Room/corridor cleaning & sanitation | **ADAPT** | `sop_facility_daily_operations.md` § Cleaning |
| `PH108-00-SOP for entry in animal house.doc` | Entry/exit, change room, PPE | **ADAPT** | Same § Entry & PPE |
| `PH106-00-SOP FOR Recording temperature and relative humidity.doc` | Temp/RH recording | **ADAPT** | LMCPAFM **Environment** tab + paper backup if required |
| `PH106-01-SOP FOR Recording temperature and relative humidity.doc` | (variant/annex) | **PARTIAL** | Merge with PH106-00 |
| `PH049-00-SOP for internal audit of animal house.doc` | Internal audit | **ADAPT** | QA checklist; partial use of Admin/facility reports |

---

## B. Caging, washing, and husbandry

| Source file | Subject | Tag | LMCP target |
|-------------|---------|-----|-------------|
| `PH101-00-SOP FOR emptying and washing rat and mice cages.doc` | Empty/wash rodent cages | **ADAPT** | Daily ops § Cage washing |
| `PH102-00-SOP FOR Caging and cage changing for rat and mice.doc` | Cage change rodents | **ADAPT** | Daily ops § Cage change |
| `PH104-00-SOP FOR Caging and tray changing and washing.doc` | Tray change/wash | **PARTIAL** | If LMCP uses trays |
| `PH110-00-SOP for washing rabbit cages.doc` | Rabbit cage wash | **PARTIAL** | If rabbits housed |
| `PH112-00 SOP for caging, pan changing & handling of G.pig.doc` | Guinea pig caging | **PARTIAL** | If GP housed |
| `PH103-00-SOP FOR Feeding and measuring feed intake for rats and mice.doc` | Feeding & feed measurement | **ADAPT** | Daily ops § Feeding + **Care logs** |
| `PH105-00-SOP FOR Handling and feeding of rabbits.doc` | Rabbit feeding | **PARTIAL** | If rabbits housed |
| `PH109-00 SOP for feeding guinea pigs.doc` | GP feeding | **PARTIAL** | If GP housed |

---

## C. Incoming animals, breeding, health screening

| Source file | Subject | Tag | LMCP target |
|-------------|---------|-----|-------------|
| `PH111-00 SOP for quarantine of purchased animals.doc` | Quarantine | **ADAPT** | Daily ops § Quarantine + **Procurement** in LMCPAFM |
| `CRO-AH-SOP/PH-117-00 Endoparasitic screening...` | Parasite screening | **PARTIAL** | Vet/health SOP; log in care notes |
| `CRO-AH-SOP/PH-118-00 Breeding of rats and mice-N.doc` | Rodent breeding | **ADAPT** | **Breeding records** in Admin Facility |
| `CRO-AH-SOP/PH-120-00 Breeding of Rabbits-N.doc` | Rabbit breeding | **PARTIAL** | If applicable |
| `Standard formats/INBREEDING RECORD FORM.doc` | Inbreeding form | **FORM** | Breeding module / paper |

---

## D. Waste, sterilization, utilities

| Source file | Subject | Tag | LMCP target |
|-------------|---------|-----|-------------|
| `CRO-AH-SOP/PH-122-00 Animal house waste disposale-N.doc` | Waste disposal | **ADAPT** | Daily ops § Waste |
| `PH107-00-SOP for high pressure high vacuum stem sterilizer.doc` | Autoclave/sterilizer | **PARTIAL** | Equipment SOP; validate against LMCP equipment |

---

## E. Equipment calibration / verification

| Source file | Subject | Tag | LMCP target |
|-------------|---------|-----|-------------|
| `CRO-AH-SOP/PH-121-00 Usage, verification and calibration of the Mettler Toledo balance-N.doc` | Balance calibration | **ADAPT** | `sop_facility_equipment_calibration.md` (draft later) |
| `PH-115-00 operation and calibration of digital micropipette.doc` | Micropipette | **SKIP** | Usually lab, not AH daily |
| `PH-114-00 operation and calibration of refrigerator.doc` | Refrigerator | **PARTIAL** | If used for feed/samples in AH |
| `SOP-2003/163-00-SOP for weighing balance (Bonso).doc` | Balance (Bonso) | **PARTIAL** | Pick one balance SOP for LMCP model |

---

## F. Records and daily activity

| Source file | Subject | Tag | LMCP target |
|-------------|---------|-----|-------------|
| `CRO-AH-SOP/PH-123-00 Entry of activity in daily activity sheet-N.doc` | Daily activity sheet | **ADAPT** | LMCPAFM **Care logs** + staff facility hub |
| `CRO-AH-SOP/PH-123-00-ANNEXURE I.doc` | Activity sheet form | **FORM** | Align fields with care log types |

---

## G. Explicitly de-prioritized (tox / clinical lab / study execution)

Do **not** use as first wave for LMCP facility daily SOPs:

- `SOP-2003/15x–16x` acute/sub-acute tox routes, anesthesia/euthanasia **for studies**
- `CRO-TOX-SOP/17x–18x` protocol prep, report verification, compound administration
- `SOP-2003/168–172` histology processors, staining ( pathology lab )
- HIV/HBsAg/drug screen urine SOPs

Study-specific procedures belong under **IAEC-approved protocol / investigator SOPs**, not generic animal house daily management.

---

## H. LMCPAFM where staff record work

| Activity | LMCPAFM location | Role |
|----------|------------------|------|
| Room temp/humidity | **Staff Facility → Environment** | `staff` |
| Cleaning, feeding, cage change notes | **Staff Facility → Care** (care logs) | `staff` |
| Supplies | **Staff Facility → Supplies** | `staff` |
| Rooms/cages/animals/procurement/breeding | **Admin → Facility** | `admin` |
| Allocations to projects | **Allocations** | `staff` |
| Form C register | **Form C** (read-only compile) | `staff`, `iaec`, `admin` |

---

## I. Equipment data required before finalising SOPs

Many industry SOPs assume specific **make, model, cycle, and range** (washer, autoclave, Mettler balance, etc.). LMCP must fill:

- **`Docs/facility_equipment_register.md`** (narrative tables), or  
- **`Docs/templates/facility_equipment_register.csv`** (same fields for Excel)

Without this, daily ops and calibration SOPs stay **generic drafts**.

## J. Next documents to produce

1. **`sop_facility_daily_operations.md`** — consolidated LMCP procedure (created from sections A–F); **update annex after register**.  
2. **`sop_facility_equipment_calibration.md`** — one section per register row (balance, sterilizer, fridge, washer).  
3. Optional: species-specific annexes (rabbit/GP) if LMCP houses those species.

---

*Catalog version 1.0 — sources in `Docs/source_industry/` (not for public git if confidential).*

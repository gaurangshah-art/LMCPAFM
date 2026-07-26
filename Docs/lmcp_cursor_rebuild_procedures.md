# LMCP IAEC System Rebuild Procedures for Cursor

## Purpose

This document defines the implementation procedure for rebuilding the frontend and normalizing the user/investigator data model of the LMCP IAEC system while preserving the existing backend and core workflow tables.[cite:679][cite:680]

The system already contains core backend routing for authentication, users, IAEC, requisition/allocation, experiments, disposal, Form D, and an internal Form B flow, which makes a backend-preserving rebuild practical.[cite:567]

The current database already includes `users`, `roles`, `user_roles`, `form_b`, `form_b_investigator`, `iaec_project`, and multiple IAEC/workflow tables, so the goal is not a fresh database rewrite but a controlled schema evolution.[cite:677]

## Product Rules



### Registration

Faculty registration is restricted to LMCP institutional email users and should create investigator-facing accounts only.[cite:621][cite:629]

Non-investigator operational accounts such as animal facility staff, caretakers, and IAEC office-bearers should be created by admin rather than public self-registration.[cite:620][cite:630]

### Role model

System roles and project roles must be treated separately.[cite:620][cite:667]

System roles:

- investigator
- staff
- caretaker or admin
- iaec role-holder

Project roles:

- principal investigator
- co-investigator
- investigator
- student contributor

Principal investigator and co-investigator are project-level designations, not global login roles.[cite:620][cite:627]

### Project validity

A project is valid only if at least one investigator is LMCP faculty, and that validation must be enforced in backend business logic rather than only in frontend forms.[cite:620][cite:627]

### Student access

Students may assist with form preparation and may be allowed to submit Form B in specific cases, but they should not automatically have access to project status, IAEC approval letters, or broader project history unless explicitly granted such permissions.[cite:638][cite:642]

### Investigator visibility

An investigator should be able to view the status only of projects in which that investigator is explicitly involved, because project-based visibility requires object-level membership rules in addition to role-based access control.[cite:620][cite:637]

## Current-State Findings

The current backend has a login route at `/auth/login`, a user creation route at `/users/`, a `/users/me` route, and several role-gated endpoints, confirming that the backend already contains real authentication and authorization building blocks.[cite:574][cite:577]

The current auth response returns an access token, but role and user context are not exposed cleanly in the login response model, so frontend code should either decode the token carefully or fetch `/users/me` immediately after login.[cite:574][cite:578]

The current `users` schema is minimal and includes `id`, `name`, `email`, `password_hash`, `role`, and `status`, while the schema also separately contains `roles` and `user_roles`, indicating a likely overlap between legacy and newer role handling.[cite:678][cite:677]

The current `form_b_investigator` structure appears to contain only `id`, `form_b_id`, `name`, and `role`, which is too thin to support reusable investigator profiles, project visibility, or reliable linkage to authenticated institutional users.[cite:678]

## Target Architecture



### High-level decision

Keep the backend and rebuild the frontend cleanly in a new folder or branch, rather than attempting to untangle the old frontend in place.[cite:481]

Use additive schema migration and phased application cutover rather than destructive replacement.[cite:680][cite:693]

### Identity and profile separation

The data model should separate three concerns:[cite:662][cite:665]

1. Authentication identity in `users`.
2. Reusable investigator metadata in `investigator_profile`.
3. Project or form participation in membership tables such as an expanded `form_b_investigator`.

This separation keeps login, profile, and project-role concerns normalized and easier to evolve.[cite:665][cite:670]

### Frontend architecture

The rebuilt frontend should use a clean structure such as:

- `src/app/` for router and providers
- `src/api/` for typed API wrappers
- `src/auth/` for auth context and route guards
- `src/pages/` for page-level routes
- `src/components/` for reusable UI
- `src/types/` for DTOs and app types

A codebase-aware assistant is most effective when operating within a clear project structure and small, scoped implementation tasks rather than generating the app without architectural constraints.[cite:603][cite:608]

## Target Database Shape



### Keep these existing tables

Preserve these current tables unless later inspection proves otherwise:[cite:677]

- `users`
- `roles`
- `user_roles`
- `form_b`
- `form_b_investigator`
- `iaec_project`
- existing workflow tables such as `iaec_agenda`, `iaec_amendment`, `iaec_renewal`, `experiment`, `animal_requisition`, and allocation tables



### Add these structures

Add a reusable investigator profile table and extend existing membership tables rather than replacing everything immediately.[cite:679][cite:686]

Recommended additions:

- `investigator_profile`
- FK-based investigator linkage in `form_b_investigator`
- permission flags for view/edit/submit capabilities
- optional audit fields such as timestamps and assignment metadata



### Recommended table responsibilities


| Table                  | Responsibility                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `users`                | Authentication identity only; email, password hash, active flags, core audit fields.[cite:678][cite:662] |
| `roles`                | Master list of system roles.[cite:677][cite:670]                                                         |
| `user_roles`           | True many-to-many system role assignments.[cite:677][cite:670]                                           |
| `investigator_profile` | One-time reusable faculty/investigator metadata for auto-population.[cite:665][cite:678]                 |
| `form_b_investigator`  | Form/project participant linkage plus project/form role and permissions.[cite:678]                       |
| `iaec_project`         | Project-level master entity where available.[cite:677]                                                   |




## Schema Migration Procedure



### Phase 1: expand only

Add new structures without dropping or renaming old ones first, because additive migrations are safer for live or evolving systems than immediate destructive changes.[cite:680][cite:684]

#### 1. Add `investigator_profile`

Create a new table:

- `user_id` PK and FK to `users.id`
- `institutional_email`
- `institution_name`
- `department`
- `designation`
- `age`
- `qualification`
- `years_experience`
- `animal_handling_experience`
- `is_lmcp_faculty`
- `created_at`
- `updated_at`

This table exists to support fill-once, reuse-many-times faculty metadata for Form B and related workflows.[cite:665][cite:662]

#### 2. Expand `users`

Add missing fields without removing legacy ones yet:

- `email_verified`
- `created_at`
- `updated_at`

Keep `users.role` temporarily as a compatibility field during the migration, but treat it as legacy because `roles` and `user_roles` already exist.[cite:678][cite:677]

#### 3. Expand `form_b_investigator`

Add these columns:

- `user_id` FK to `users.id`
- `investigator_profile_user_id` FK to `investigator_profile.user_id`
- `investigator_type` such as faculty, student, or external
- `can_view_status`
- `can_view_approval_letters`
- `can_edit_forms`
- `can_submit_form_b`
- optional `created_at` and `updated_at`

This lets the existing table evolve from a minimal name list into a real participant/membership table.[cite:678][cite:686]

### Phase 2: backfill data

Migrate existing data incrementally and verify each step before moving forward.[cite:679][cite:689]

#### 1. Backfill roles

Populate `roles` with distinct role values from `users.role` where missing, then populate `user_roles` from `users.role` for any users not yet mapped.[cite:678][cite:677]

#### 2. Seed investigator profiles

Create an `investigator_profile` shell for users who are investigators or investigator-like users based on existing role assignments.[cite:678][cite:665]

Where profile data is not currently available, allow nullable fields initially and require investigators to complete their profile on first login or first Form B creation.[cite:665]

#### 3. Link Form B investigators to users

Attempt to map `form_b_investigator.name` to real users only where there is a reliable one-to-one match; ambiguous matches should be flagged for manual review, because names alone are weak identifiers.[cite:678][cite:689]

Keep legacy `name` values for history and display during transition even after `user_id` is added.[cite:678][cite:686]

### Phase 3: dual-write transition

During the transition, application code should write to both legacy-compatible and new normalized structures where necessary until reads are fully switched.[cite:684][cite:693]

Examples:

- New faculty registration writes to `users`, `user_roles`, and `investigator_profile`.[cite:577][cite:586]
- Admin-created staff or IAEC users write to `users` and `user_roles`, and optionally `investigator_profile` only if they are investigator-capable users.[cite:577]
- Form B participant assignment writes both display fields and normalized `user_id` linkage where possible.[cite:678]



### Phase 4: switch reads

After backfill and testing, gradually switch application reads to the new sources:[cite:680][cite:693]

- Read system roles from `user_roles`, not `users.role`.[cite:677][cite:678]
- Read profile auto-population data from `investigator_profile`.[cite:665]
- Read project/form participation and visibility from the expanded `form_b_investigator` structure.[cite:678]



### Phase 5: cleanup

Only after all services and UI flows are confirmed against the new structures should legacy fields be retired.[cite:684][cite:693]

Potential cleanup later:

- stop writing to `users.role`
- drop or deprecate `users.role`
- tighten `form_b_investigator.user_id` for LMCP faculty users
- rename columns like `role` to `project_role` only after the application fully supports the new naming



## Backend Procedure



### Auth changes

1. Keep `/auth/login` for credential validation.[cite:574]
2. After successful login, return token as now or improve the response to include basic user metadata and roles if desired.[cite:574][cite:578]
3. Ensure frontend calls `/users/me` immediately after login if the login response remains minimal.[cite:577][cite:574]



### Registration changes

Create a dedicated faculty registration flow rather than exposing generic unrestricted user creation to the public.[cite:577][cite:621]

Rules:

- only LMCP institutional email domains allowed for self-registration
- self-registration creates investigator-capable accounts only
- public users cannot assign themselves admin, staff, or IAEC roles
- email/domain validation must be enforced in backend business logic and not only in the frontend UI[cite:621][cite:629]



### User management changes

Keep or refactor admin-only user creation so admins can create:

- staff
- caretakers
- IAEC office-bearers
- other non-self-registered operational users

This preserves institutional control over privileged and operational accounts.[cite:620][cite:630]

### Authorization changes

Authorization checks should follow this pattern:[cite:620][cite:676]

1. authenticated user check
2. system role check via `user_roles`
3. project or Form B membership check
4. action-level permission check such as view status, view approval letter, edit form, or submit form

This is necessary because project visibility depends on both role and explicit involvement.[cite:620][cite:637]

## Frontend Rebuild Procedure



### Phase 1: scaffold

Create a fresh frontend folder or a clean new app shell and do not reuse the messy structure in place.[cite:481]

Tasks:

- create router
- create layout shell
- create typed API client wrappers
- create auth provider and session state
- create error and unauthorized pages



### Phase 2: auth flow

Implement:

- login page
- logout flow
- session persistence in memory/context appropriate to the app constraints
- `/users/me` bootstrap after login
- route guards by system role

The frontend should not guess user roles from ad hoc state if `/users/me` can provide authoritative role membership.[cite:577][cite:574]

### Phase 3: investigator profile flow

Implement investigator onboarding/profile completion:

- registration page for LMCP faculty only
- investigator profile completion page
- profile edit page
- profile auto-population service for Form B

If a profile is incomplete, the investigator should be prompted to complete mandatory fields before submitting Form B.[cite:665][cite:651]

### Phase 4: Form B rebuild

Implement Form B using reusable data sources:

- auto-populate investigator information from `investigator_profile`
- allow multiple investigators
- support project roles such as PI, co-investigator, investigator, and student contributor
- enforce at least one LMCP faculty investigator before final submission
- respect permission flags for student contributors and other limited participants



### Phase 5: status and document visibility

Implement project pages so that:

- investigators see only projects they are attached to
- privileged users see broader project sets according to system role
- approval letters and status history obey project membership and permission rules

This should be enforced both in backend APIs and frontend route/component logic.[cite:620][cite:637]

## Cursor Execution Rules



### How Cursor should be used

Cursor should be used for scoped, deterministic tasks rather than open-ended full-app generation, because codebase-aware AI performs best when the architecture is fixed and tasks are narrow.[cite:603][cite:608]

Preferred prompt style:

- “Create auth context using `/auth/login` and `/users/me`. Do not create registration yet.”
- “Create `investigator_profile` SQLAlchemy model and migration from this schema.”
- “Expand `form_b_investigator` with FK and permission fields. Preserve existing columns.”
- “Build Form B page using investigator profile auto-population and multiple investigators.”



### Operational guardrails

For each major step:

- make one change set only
- run the app or migration
- validate manually
- commit to Git
- proceed to next step only after confirmation

This reduces the risk of repeating the earlier Copilot-driven duplication and structural drift problem.[cite:481][cite:679]

## Delivery Order

Use this exact implementation sequence:

1. Freeze product rules.
2. Add additive schema migrations.
3. Refactor backend auth and registration rules.
4. Build new frontend shell.
5. Build login and `/users/me` bootstrap.
6. Build investigator registration and profile completion.
7. Build Form B with auto-population and multi-investigator support.
8. Build project status visibility.
9. Build admin user management for staff and IAEC accounts.
10. Clean up legacy schema and code paths only after verification.[cite:680][cite:693]



## Acceptance Criteria

The rebuild is complete only when all of the following are true:

- LMCP faculty can self-register only with approved institutional email rules.[cite:621][cite:629]
- Faculty investigator data can be filled once and reused across future forms.[cite:651][cite:652]
- Non-investigator operational users are created by admin only.[cite:620][cite:630]
- Multi-role and multi-investigator cases work without ambiguity.[cite:577][cite:586]
- A project cannot be valid without at least one LMCP faculty investigator.[cite:620][cite:627]
- Student contributors cannot see unauthorized project status or approval documents by default.[cite:638][cite:642]
- Investigators can view status only for projects they are part of.[cite:620][cite:637]
- Frontend uses normalized profile and role data rather than legacy shortcuts.[cite:678][cite:665]



## Final instruction to Cursor

Treat the existing backend and schema as a salvageable base, not as throwaway code.[cite:567][cite:677]

Prefer extension, normalization, and phased migration over destructive rewrites.[cite:680][cite:693]

When uncertain, preserve backward compatibility first, then migrate reads and writes gradually, then remove legacy fields last.[cite:684][cite:693]





**## 2026-07-23 – IAEC meeting workflow and Form B investigator API**

### Decisions

- Form B submissions are accepted all year; there is no limited submission window.

- IAEC meetings are arranged when a sufficient number of Form B protocols accumulate.

- IAEC admin will assign a meeting number manually for each IAEC meeting.

- A Form B can be scheduled for a meeting and, if not taken up, can be carried forward to a later meeting without losing its identity.

- The final protocol number will be generated only when the protocol is actually approved in a meeting.

- Protocol number format: `LMCP/IAEC/{meeting year}/{meeting number}/{serial in that meeting}`.

- Meeting year will be derived from the meeting date.

- Serial number is per meeting, assigned by the backend in order of approval.

### Backend status

- `form_b` table exists and can now store at least one test record.

- `form_b_investigator` has been expanded and is linked to `users` via `user_id`.

- New API endpoints added and tested:

  - `POST /formb/investigators` – creates a Form B investigator linked to `form_b_id`.

  - `GET /formb/{form_b_id}/investigators` – lists investigators for a Form B.

- Verified that creating a Form B row, then posting a new investigator, succeeds via PowerShell `Invoke-RestMethod`.

### Next backend steps (planned)

- Add `meeting_number` to `iaec_meeting`.

- Introduce a way to link Form B (or `iaec_project`) to a specific meeting (e.g., `meeting_id`).

- Design a `POST /formb/{id}/submit` or `finalize` endpoint that:

  - checks meeting assignment,

  - generates the final protocol number,

  - records the IAEC decision state (approved / approved with modifications / deferred / rejected).

- Plan PDF generation for:

  - CPCSEA Form B per protocol,

  - summary table per meeting,

  - IAEC certificate after approval.
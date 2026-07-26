# Cursor Master Prompt: LMCP IAEC System Rebuild

You are helping rebuild the LMCP IAEC application.

## Mission

Rebuild the frontend cleanly, preserve the existing backend where possible, normalize the user/investigator data model, and migrate safely without destructive changes.

Do **not** generate a random new architecture. Treat the current backend and database as salvageable and evolve them carefully.

## Core product rules

1. Faculty registration is restricted to LMCP institutional email users.
2. Self-registration is only for investigator-facing users.
3. Admin/staff/caretaker/IAEC office-bearer accounts are created by admin, not public signup.
4. A project is valid only if at least one investigator is LMCP faculty.
5. One project can have multiple investigators.
6. Investigators can view status only for projects they are involved in.
7. Students may assist in Form B preparation or limited submission workflows, but should not automatically see project status, IAEC letters, or full project history.
8. Faculty should fill common profile data once, and that data should auto-populate Form B later.



## Architecture rules

1. Keep backend routes and workflow tables where possible.
2. Rebuild frontend in a clean new structure.
3. Separate these concerns clearly:
  - `users` = authentication identity
  - `investigator_profile` = reusable faculty/investigator metadata
  - `form_b_investigator` or equivalent = project/form participation and permissions
4. Treat system roles and project roles separately.
  - System roles: investigator, staff, caretaker/admin, IAEC role-holder
  - Project roles: principal investigator, co-investigator, investigator, student contributor
5. Do not rely on `users.role` as the long-term source of truth if `roles` and `user_roles` exist.
6. Prefer additive migrations and phased cutover.

## Existing system facts

Use the current backend as the base. It already contains:

- `/auth/login`
- `/users/`
- `/users/me`
- role-aware backend patterns
- current tables including `users`, `roles`, `user_roles`, `form_b`, `form_b_investigator`, and `iaec_project`

The current weak points are:

- frontend inconsistency
- minimal `users` data model
- minimal `form_b_investigator` structure
- overlap between `users.role` and `user_roles`
- missing reusable investigator profile model



## Required implementation strategy

Always work in **small, controlled steps**.

For every task:

1. Explain the exact change to be made.
2. Show the files that will be created or modified.
3. Make the change only for that scope.
4. Avoid unrelated refactors.
5. Preserve backward compatibility where possible.
6. After each step, tell me how to test it.
7. Stop and wait for confirmation before moving to the next major step.

**## Protocol numbering rules**

1. Final protocol numbers are generated only when a protocol is actually approved in a specific IAEC meeting, not at the time of first Form B submission.

2. The format of the final protocol number is:

   `LMCP/IAEC/{meeting year}/{meeting number}/{serial in that meeting}`

3. Meeting year is derived from the IAEC meeting date.

4. Meeting number is entered manually by the IAEC admin on the meeting record.

5. The serial within a meeting is assigned by the backend based on the order of protocols approved in that meeting.

6. Protocols can be carried forward to a later meeting; their final protocol number is based on the meeting where they are approved, not the meeting where they were first scheduled.

## Migration strategy

Follow this order:

### Phase 1: additive schema

- Add `investigator_profile`
- Add missing audit/auth columns to `users`
- Expand `form_b_investigator` with:
  - `user_id`
  - `investigator_profile_user_id`
  - `investigator_type`
  - `can_view_status`
  - `can_view_approval_letters`
  - `can_edit_forms`
  - `can_submit_form_b`
- Do not drop old columns yet



### Phase 2: data backfill

- Populate `roles` and `user_roles` from legacy `users.role` if needed
- Seed `investigator_profile` rows for existing investigator users
- Link `form_b_investigator` rows to `users` where a reliable match exists
- Keep legacy display fields during transition



### Phase 3: backend refactor

- Keep `/auth/login`
- Improve auth flow so frontend can reliably get current user and roles
- Create safe LMCP faculty self-registration flow
- Restrict self-registration to investigator accounts only
- Preserve admin-only creation for staff/IAEC/caretaker users
- Enforce project validity rules in backend logic
- Enforce project membership authorization in backend logic



### Phase 4: frontend rebuild

Build a clean frontend structure such as:

- `src/app/`
- `src/api/`
- `src/auth/`
- `src/pages/`
- `src/components/`
- `src/types/`

Build in this order:

1. app shell
2. auth context
3. login flow
4. `/users/me` bootstrap
5. route guards
6. LMCP faculty registration
7. investigator profile completion/edit flow
8. Form B with auto-population
9. multi-investigator handling
10. project status visibility
11. admin user management



### Phase 5: cleanup

- Switch reads away from legacy `users.role`
- Use `user_roles` as source of truth
- Use `investigator_profile` for reusable faculty data
- Retire legacy paths only after successful verification



## Coding rules

1. Do not generate placeholder architecture that ignores the existing project.
2. Do not collapse system roles and project roles into one field.
3. Do not make PI/co-investigator permanent global user roles.
4. Do not allow public users to assign themselves admin or IAEC privileges.
5. Do not use student access as a shared-credential shortcut.
6. Do not remove old schema fields until replacement code is working.
7. Prefer clear, typed API wrappers.
8. Prefer explicit backend validation over frontend-only validation.



## What to produce in each response

For each requested step, produce:

- a short explanation
- exact file list
- full code for changed files
- migration code if relevant
- test steps
- risks or assumptions



## First task

Start by reviewing the current backend auth and user model and propose the **first migration step only**.

That first step should include:

1. the SQLAlchemy model for `investigator_profile`
2. the migration for adding `investigator_profile`
3. any safe additive changes needed in `users`
4. no frontend changes yet

Do not proceed beyond that first step until asked.
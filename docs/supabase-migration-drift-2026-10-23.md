# Supabase Migration Drift Register — 2026-10-23

Project: `ptmokqppwjjxhakjpxum`
Repository: `rasta-svg/rastafitness`
Purpose: reconciliation record only; this file does not replay or modify migrations.

## Observed state

- Supabase migration history returned 35 applied versions.
- The repository's `supabase/migrations` directory contains 12 SQL files on the audited main branch.
- Two repository migration files share the timestamp prefix `20261022000000`:
  - `20261022000000_personalized_nutrition_foundation.sql)
  - `20261022000000_rasta_contact_messages.sql)
- Do not run a new migration, reset the production database, or synthesize historical SQL from migration names alone until the source of truth is reconciled.

## Applied database versions not present as same-named repository files

The following versions appeared in the live migration history but were not present as same-named files in the audited repository snapshot:

- `20261020104602_fitmind_core_schema`
- `20261020104632_seed_initial_foods_exercises`
- `20261020105209_fitmind_indexes_triggers_security`
- `20261020134838_admin_profiles_and_roles`
- `20261020134921_admin_profile_details`
- `20261020152752_iranian_food_and_snack_catalog`
- `20261020153004_seed_builtin_exercise_catalog`
- `20261020212740_add_profile_based_fitness_preferences`
- `20261020212831_add_age_to_personal_fitness_profile`
- `20261020214627_add_profile_target_muscles`
- `20261020220919_create_secure_activity_logs`
- `20261020221704_centr_wellness_goals_and_weekly_schedule`
- `20261021010405_create_user_app_sync_state`
- `20261021092452_add_premium_programs_with_subscription_rls`
- `20261021104309_add_private_user_presence`
- `20261021120029_prevent_email_reuse_after_signup`
- `20261021120041_reserve_email_changes_too`
- `20261021210430_add_contact_messages_inbox`
- `20261021224756_personalized_nutrition_foundation`
- `20261021225429_nutrition_data_quality_and_feedback`
- `20261021225659_nutrition_food_review_status_and_feedback_index`
- `20261021234304_exercise_content_review_fields`
- `20261022130943_fix_user_presence_own_row_policies`
- `20261022195742_allow_public_read_of_published_food_nutrition`
- `20261022213629_import_verified_nutrition_values_sample`
- `20261022213641_import_peymoo_iranian_recipe_nutrition`
- `20261022213657_import_more_source_matched_food_values`

## Required reconciliation procedure

1. Retrieve SQL history or backup/source-control history for each database-only version.
2. Compare the live schema, policies, triggers, functions, and seed-data effects with the missing migration's original SQL.
3. Decide whether each change should be restored as historical source, represented by a documented baseline, or superseded by a forward-only corrective migration.
4. Resolve the duplicate timestamp naming issue without rewriting applied production history.
5. Validate the resulting migration chain in a disposable development branch/database before any production change.
6. Verify the final migration list and schema diff after the controlled rollout.

This register is evidence of drift, not authorization to reconstruct or apply migrations. No database changes were made while collecting it.

# Central health integration — 2026-10-23

Branch: `codex/central-module-health-checks`

## Added in this increment

- The food-bank page registers `food-bank-data` with Rasta Core and declares its dependency on the page module.
- Successful food loading sets the module to `ready`; a failed request sets it to `degraded` and emits a sanitized diagnostic code.
- The recipe detail page registers `recipe-detail-data`, declares its page dependency, reports the no-selection state as ready, marks unknown/unpublished recipe IDs unavailable, and reports load failures as degraded with a diagnostic event.
- Application validation now asserts that core-backed pages consume the central Supabase configuration and that nutrition pages implement the health-reporting contract.

## Runtime behavior and boundaries

- Health status is evaluated in the current page runtime; this is not a cross-device or server-side global monitor.
- The module registry can only report dependencies that a page or service explicitly registers. It does not yet prove every screen, API, and engine has been registered.
- The browser data reads remain direct PostgREST requests using the public/publishable key. Authorization remains enforced by Supabase policies; this change does not change those policies.
- No production database, RLS policy, deployed Edge Function, or migration was modified.

## Validation

GitHub Actions was triggered for the changed branch. Check the latest run before merging:
https://github.com/rasta-svg/rastafitness/actions

The automated validation checks JavaScript syntax and application contracts; it does not replace real-device testing, authorization tests against an isolated environment, or a full regression pass.

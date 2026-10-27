# Frontend integration plan

The app is a single page with two views: configuration and simulation. `App`
holds the workload being edited and the current run, and switches views with
state rather than a router.

## 1. Connect results to core statistics (done)

`runSimulations` produces the histories for `ProcessTimeline`, and
`calculateAllStatistics` produces the `Statistic[]` that `ResultsTable` renders
in API order, joined by program ID. Calculation rules stay in core.

## 2. Configuration view with one policy (this change)

- **Policy:** choose one policy from `getPolicies()` and show its description.
  Edit only the fields it lists through `getConfigFields()`; an empty list means
  no settings. Each field carries its own label and limits. Build the run with
  `makePolicyInstance(policy, id, config)`.
- **Programs:** 1–10 programs with CPU cycles (1–20), arrival time (0–20), and
  optional I/O interval and length (1–10 each). Users can add, reorder, and
  remove programs. Labels follow list position (P0, P1, …), and program IDs are
  assigned by position when the run starts; React keys are separate stable IDs.
  The UI calls these "processes"; code and core keep the name `Program`.
- **Validation:** `validateWorkload` in core takes the raw text of every field
  and returns either runnable programs and config or a message per field.
  Missing, nonnumeric, fractional, and out-of-range values show beside the
  field; disabled I/O fields are ignored; Run stays disabled until the workload
  is valid (FR-020, FR-027).
- **Running:** each Run recomputes from the current configuration, and Back
  discards the run, so stale results are never shown (FR-005). Configuration is
  kept while switching views (FR-021). Calculation errors are caught and shown
  on the configuration view (NFR-010). A fresh visit starts with a prefilled
  example (FR-019).

## 3. Multiple policy instances and comparison

Replace the single policy with a list of 1–5 instances (FR-020), each with its
own settings and a unique ID. Label duplicates by number and settings, for
example `Round Robin #2 (Time slice: 5)` (FR-026), and allow reordering and
removal. Extend `validateWorkload` with an instance list and count limit. Stack
one timeline per instance on a shared cycle axis, padding shorter runs as
completed (FR-001, FR-017), and add the comparison view (FR-006).

## 4. Shared playback

Keep one playback position across policy runs. Add pause/resume, stepping,
restart, jump, and speeds of 1–4 cycles per second. Start paused at cycle zero;
visually pad completed processes through the longest run without changing core
histories or statistics. Reveal final results only at the final shared position.
Switching between timeline and comparison views preserves playback position.

## Where things live

| Path                          | Contents                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| `core/validation.ts`          | Input limits and `validateWorkload`                                                               |
| `workloadDraft.ts`            | Form state types, the prefilled example, config field labels                                      |
| `views/ConfigurationView.tsx` | Policy and program editing, Run                                                                   |
| `views/SimulationView.tsx`    | Timeline and results for a finished run                                                           |
| `components/`                 | `PolicySettings`, `PolicyTags`, `ProgramEditor`, `NumberField`, `ProcessTimeline`, `ResultsTable` |

## Testing

There are no automated frontend tests for now, and CI coverage applies to core
only. Keep logic that needs tests (simulation, statistics, validation) in core,
and check the views by hand in Chrome and Firefox.

## Open items

- The arrival range of 0–20 is a placeholder; FR-014 does not define one.
- Policies are identified by display name; import/export (FR-028) will need a
  stable key.
- Section 9 of the requirements still lists import/export as excluded, which
  contradicts FR-028.
- `architecture.mmd` still names `getAvailablePolicies()` and FCFS/SPN.

Acceptance details remain in [requirements.md](requirements.md), especially
FR-005–FR-006, FR-011, FR-016–FR-022, FR-024, FR-026–FR-027, and section 6.

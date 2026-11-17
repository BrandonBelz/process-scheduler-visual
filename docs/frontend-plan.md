# Frontend integration plan

The app is a single page with two views: configuration and simulation. `App`
holds the workload being edited and the current run, and switches views with
state rather than a router.

## 1. Connect results to core statistics (done)

`runSimulations` produces the histories for `ProcessTimeline`, and
`calculateAllStatistics` produces the `Statistic[]` that `ResultsTable` renders
in API order, joined by program ID. Calculation rules stay in core.

## 2. Configuration view with one policy (done)

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

## 3. Multiple policy instances and comparison (this change)

- **Instances:** the single policy becomes a list of 1–5 instances (FR-020),
  each with its own policy and settings. Users can add, reorder, and remove
  them; Add suggests a policy not yet in the list. Instance IDs follow list
  position when the run starts, and React keys are separate stable IDs, as with
  programs. The prefilled example runs FIFO and Round Robin.
- **Labels:** `numberPolicyNames` in core numbers policies that appear more than
  once, in list order, and `labelPolicyInstances` adds their settings, for
  example `Round Robin #2 (Time slice: 5)` (FR-026). The configuration view
  shows the numbered names, since the settings are visible beside them.
- **Validation:** `validateWorkload` takes a `policies` list and returns
  `policyConfigs` and per-instance errors, index-aligned with the input, plus a
  count message.
- **Overview:** with more than one instance, `PolicyOverview` shows one row per
  instance on a shared cycle axis, with a line at every moment through all rows.
  Each cell shows the running process; when nothing runs, it lists the blocked
  processes (two, then `+n`), or shows idle. `summarizeCpuCycles` in core
  derives this from the histories and pads shorter runs as completed, for
  display only (FR-001, FR-017). Per-process rows are not shown here. A results
  table per instance follows, unchanged for now.
- **Process colors:** running cells take a fixed per-process color (P0–P7, from
  a palette checked for color-blind separation between neighbors; P8 and P9
  share a neutral fill), and the label always names the process, so color is
  never the only cue (NFR-006). Blocked cells are striped and neutral, with a
  colored dot per process. The detail view shows the same color beside each
  process label.
- **Detail:** selecting an instance in the overview shows every process for
  that instance in `ProcessTimeline`, with its results table. A run with one
  instance opens in this view. Policy and process labels stay in view while
  either grid scrolls sideways.
- **Comparison:** a second tab shows `ComparisonTable`: mean statistics per
  instance, then each statistic per process with a column per instance
  (FR-006). Switching tabs keeps the run; Back discards it.

## 4. Shared playback

Keep one playback position across policy runs. Add pause/resume, stepping,
restart, jump, and speeds of 1–4 cycles per second. Start paused at cycle zero;
visually pad completed processes through the longest run without changing core
histories or statistics. Reveal final results only at the final shared position.
Switching between timeline and comparison views preserves playback position.

## 5. Process editing modal

Move process editing on the configuration view into a modal. Save keeps the
edits and Cancel discards them, and the page shows the saved processes as a
compact summary.

## Where things live

| Path                          | Contents                                                                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `core/validation.ts`          | Input limits and `validateWorkload`                                                                                                    |
| `workloadDraft.ts`            | Form state types, the prefilled example, config field labels                                                                           |
| `views/ConfigurationView.tsx` | Policy and program editing, Run                                                                                                        |
| `core/cpuTimeline.ts`         | `summarizeCpuCycles`, the per-cycle summary for the overview                                                                           |
| `views/SimulationView.tsx`    | Overview, detail, and comparison for a finished run                                                                                    |
| `components/`                 | `PolicySettings`, `PolicyTags`, `ProgramEditor`, `NumberField`, `PolicyOverview`, `ProcessTimeline`, `ResultsTable`, `ComparisonTable` |

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
- FR-001 and section 6 of the requirements describe stacked per-process views
  for every policy; the multi-policy view now shows only the CPU's process per
  cycle, with per-process detail one policy at a time.
- Results are still shown for every instance on the overview; their layout is
  expected to change.

Acceptance details remain in [requirements.md](requirements.md), especially
FR-005–FR-006, FR-011, FR-016–FR-022, FR-024, FR-026–FR-027, and section 6.

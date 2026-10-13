# Frontend integration plan

## 1. Connect results to core statistics (this change)

Run the example workload once with `runSimulations`, pass its histories to
`ProcessTimeline`, and pass that same result map to `calculateAllStatistics`.
Select both histories and statistics by policy instance ID.

Replace the temporary frontend metrics types with the core `Statistic[]` contract.
Render columns in API order (currently Response Time, then Turnaround Time), join
per-process values by program ID, and format the core averages to two decimals.
Keep calculation rules in core. The prefilled workload remains sample input;
all displayed results are computed.

Verify reordered/nonconsecutive process IDs, missing values, empty results, and
real simulation output. Run tests, lint, and the production build.

## 2. Select and compare policy instances

Use `getPolicies()` for available policies. Keep selected instances in React state,
with unique instance IDs and clear labels, including duplicate policies. Run the
same workload across selected instances and render each timeline and results
table from its matching ID. Respect the 1–5 instance limit. Round Robin remains
dependent on core support.

## 3. Add workload configuration

Create the configuration view with editable, reorderable programs and optional
I/O. Validate the documented integer ranges and 1–10 program limit before
running. Retain configuration while navigating and compute a fresh run when
entering simulation. Handle calculation failures without showing stale results.

## 4. Add shared playback and results views

Keep one playback position across policy runs. Add pause/resume, stepping,
restart, jump, and speeds of 1–4 cycles per second. Start paused at cycle zero;
visually pad completed processes through the longest run without changing core
histories or statistics. Reveal final results only at the final shared position.
Switching between timeline and comparison views preserves playback position.

Acceptance details remain in [requirements.md](requirements.md), especially
FR-005–FR-006, FR-011, FR-016–FR-022, FR-024, FR-026–FR-027, and section 6.

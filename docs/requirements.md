# Requirements: Process Scheduling Policy Visualizer

<!-- Drafted by Sam Tooley & Brandon Belz with the assistance of CODEX -->
<!-- Ran this through CODEX a few times to help determine some requirements and edge cases as well as formatting into a good requirements document. -->

Version: 1.1  
Date: September 21, 2026  
Status: Requirements baseline following the final discovery round. Remaining delivery decisions are listed in section 10.

## 1. Purpose and audience

The app is an educational web tool for students learning operating systems and an instructor teaching the class. The instructor will demonstrate examples, then students will experiment with programs, processes, workloads, and scheduling policies.

Users must be able to:

- Understand each supported policy step by step.
- Compare scheduling policies on a workload.
- Investigate how workload properties affect performance under different policies.

## 2. Conventions and terminology

- Required: included in the December baseline unless explicitly marked as stretch or design direction, or assigned a later delivery date such as the final ownership handoff.
- Stretch: optional work only if time permits before January; not required for acceptance.
- Design direction: implementation flexibility within the agreed behavior.
- Confirmed: agreed behavior or constraint; confirmed functional requirements are part of the December baseline unless marked otherwise.
- TBD: a detail that still requires a delivery decision.
- Delivery decision: information to record during implementation or deployment, not an additional discovery question.
- Functional requirements describe behavior; non-functional requirements describe measurable quality targets.
- Acceptance criteria describe how to verify the requirements; they do not claim that an implementation has been tested.

### Domain terms

| Term | Definition |
| --- | --- |
| Program | A description of the CPU work and optional I/O activity that a process performs. |
| Process | An execution of a program that progresses through ready, running, blocked, and completed states. |
| Policy | The scheduling algorithm that determines which runnable process executes on each cycle. |
| Policy instance | A separately configured application of a scheduling policy to a workload, allowing the same policy to be compared under different or identical settings. |
| Scheduler | The mechanism that applies a policy to select a runnable process for execution, leaving the CPU idle when none is runnable. |
| Workload | The complete simulation scenario, including the programs, selected policy instances, and their settings. |
| Clock cycle | One discrete unit of simulated time during which the CPU executes a process or remains idle. |

## 3. Project and technical constraints

| ID | Constraint | Status |
| --- | --- | --- |
| TC-001 | Build the web app with React and TypeScript. | Confirmed |
| TC-002 | Execute simulation logic in the browser without a separate simulation server. | Confirmed |
| TC-003 | Model exactly one CPU core per policy simulation. | Confirmed |
| TC-004 | Use OSTEP chapters 7-9 as the policy reference, with primary emphasis on chapter 7 policies. | Confirmed |
| PC-001 | Deliver within the capacity of a two-person undergraduate senior computer science team. | Confirmed |
| PC-002 | Deliver an MVP during the week of December 14, 2026. | Required |
| PC-003 | January-April 2027 will focus on user testing, stabilization, and iterative usability refinements based on classroom feedback. | Confirmed; exact deadline TBD |
| PC-004 | Deliver a deployed app, a concise developer guide, an ownership handoff and quick start, the requirements document, and the existing use cases. | Confirmed |
| PC-005 | Present next semester and transfer maintenance to the professor after April. | Required |

Simulation computation runs locally in the browser. Configuration persists across in-app navigation but is not restored after browser refresh. Hosting remains TBD.

## 4. Functional requirements

Required December policies: FIFO, SJF, RR, and STCF. All confirmed functional capabilities below are part of the baseline unless marked stretch or design direction. MLFQ follows the four required policies if time permits; lottery/stride are further stretch goals before January.

| ID | Requirement | Status | Acceptance criteria / implementation detail |
| --- | --- | --- | --- |
| FR-001 | Provide a detailed process view with vertically stacked policy instances and shared playback. | Required December MVP | Each process and state is distinguishable within each instance's timeline; all timelines show the same selected clock cycle. |
| FR-002 | Instantiate exactly one independent process per program per configured policy instance. | Confirmed | Three programs and two instances produce six process instances, even if both selections use identical policy types/settings. Each references its program and maintains independent runtime state and history. |
| FR-003 | Let users add policy instances by choosing a policy type and configuring its settings. | Confirmed | Repeated types and identical configurations are accepted without duplicate checking. Each instance has independent settings, runtime state, and results. |
| FR-004 | Let users create programs on a configuration page separate from simulation viewing. | Confirmed | A user can create a valid program and include it in a workload. |
| FR-005 | Recompute all simulations whenever returning from configuration to simulation, and start paused at cycle 0. | Confirmed | Recompute and reset even if configuration was not changed; retain program and policy settings but never restore the previous playback position on this transition. |
| FR-006 | Provide a separate workload comparison view using the same workload inputs across policy instances. | Required December MVP | Every instance receives equivalent program configuration, run duration, I/O settings, and any arrival settings; results are independent and comparable. |
| FR-007 | Support FIFO, Round Robin (RR), Shortest Job First (SJF), and Shortest Time-to-Completion First (STCF). | Required December MVP | Each policy is selectable and matches reference schedules under section 5, including I/O and idle-cycle cases. |
| FR-008 | Support lottery and stride scheduling following OSTEP chapter 9. | Stretch goals | Implement only if substantial time remains before January and after core policies and MLFQ; settings and reproducibility rules TBD. |
| FR-009 | Visualize execution and process states with one history entry per global clock cycle. | Required | READY entries include time waiting while another process runs; every row uses the same time axis. |
| FR-010 | Retain the complete current simulation history. | Required | Users can revisit earlier cycles without loss from scrolling or playback. Refresh need not retain history. |
| FR-011 | Provide speed adjustment, pause/resume, next/previous cycle, restart, and jump to a selected cycle. | Required | Speeds are 1, 2, 3, and 4 cycles per second. Automatically pause at the final shared position; navigation cannot go before cycle 0 or beyond the end. Playback does not alter computed schedules. Simulation begins at cycle 0.|
| FR-012 | Show history extending left as new cycles appear. | Design direction | Exact animation and scrolling are implementation choices; earlier cycles must remain accessible. |
| FR-013 | Configure whole-number CPU duration 1-20 and optional I/O interval/duration each 1-10 inclusive. | Required | Reject invalid active fields; disabled I/O produces no blocking. Waiting/blocked cycles do not reduce required CPU work. |
| FR-014 | Initially admit all programs at cycle 0; optionally add arrival delays per program before January. | Pre-January stretch goal | If implemented, apply a program's delay equally to every policy instance. |
| FR-015 | Show brief explanations of scheduling events or decisions. | Stretch before January | Define event coverage if selected for implementation; not required for MVP acceptance. |
| FR-016 | Show the final results table at the end of playback. | Required December MVP | Reveal only when shared playback reaches the final position across all runs, including by jumping to the end. Identify instances and show per-process and mean turnaround/response times. |
| FR-017 | Keep completed processes visibly completed while the shared playback advances through longer policy runs. | Confirmed | A process completed at cycle 8 remains completed when another policy advances to cycle 12; its completion time and metrics remain fixed. |
| FR-018 | Calculate per-process and mean turnaround/response time for each policy instance. | Required | Use section 5; include each process exactly once. Provide a summary table displaying turnaround and response metrics for completed simulations. |
| FR-019 | Show a small, valid prefilled workload on a fresh visit. | Required | Include editable programs and at least one required policy instance. Exact example values are an implementation choice. |
| FR-020 | Require 1-10 programs and 1-5 policy instances to run, counting duplicates. | Required | Prevent an eleventh program or sixth instance; prevent running an empty configuration and explain the limits. |
| FR-021 | Retain configuration across in-app navigation. Persistance across browser reloads is out of scope for the MVP. | Required | Retain programs, settings, and order when navigating. |
| FR-022 | Provide editable policy defaults. | Required | RR defaults to a two-cycle slice, editable in whole numbers from 1-20. The other required policies have no additional agreed numeric parameters. |
| FR-023 | Support MLFQ following OSTEP chapter 8 if the four required policies are completed early. | First policy stretch goal | Implement only if time permits before January testing; queue and boost parameters TBD. |
| FR-024 | Let users reorder and delete programs in configuration. | Confirmed | Tie-breaking among equal-priority processes is handled deterministically (e.g., by program ID / arrival order); deleting a program removes its processes from all recomputed policy instances. |
| FR-025 | Provide charts comparing simulation results. | Optional stretch goal | Chart types and metric presentation TBD; the required results table is sufficient for the MVP. |
| FR-026 | Allow editing, removing, and reordering policy instances. | Required | Reordering changes display order only. Distinguish duplicate instances by number and relevant settings, such as `RR #2 - slice 5`. |
| FR-027 | Validate inputs with messages beside the affected fields. | Required | Missing required, nonnumeric, fractional, and out-of-range values prevent running until corrected. Retain editable inputs and explain each correction; inactive I/O fields must not block running. |

## 5. Simulation rules

### Agreed model

- Each process must receive its program's configured CPU execution duration. Blocked time and waiting for CPU access add to elapsed time. Ten CPU cycles plus four blocked cycles take fourteen elapsed cycles if no other delay occurs.
- Each process has independent I/O with no shared-device contention or I/O queue. Several processes may be blocked at once; their I/O timers do not interfere with one another. CPU execution can continue for a ready process while others are blocked.
- I/O intervals count executed CPU cycles and preserve progress across preemption. With interval 3, two running cycles, waiting, and one more running cycle trigger I/O. Histories include waiting: `[RUNNING, RUNNING, READY, READY, RUNNING, BLOCKED]` when two waiting cycles intervene.
- States are READY, RUNNING, BLOCKED, and COMPLETED. Record one state per global clock cycle, including READY when another process runs.
- After I/O, processes rejoin the back of the FIFO/RR ready queue. RR gives a fresh slice when the process next runs.
- Completion takes precedence over I/O: the final required CPU cycle completes the process without trailing I/O, even if an I/O interval expires on that cycle.
- Initially all programs arrive at cycle 0. Per-program delayed arrivals are a later capability.
- Each policy simulation has one CPU core and independent runtime state.
- Context switching costs zero simulated cycles. Exactly one process runs in each cycle when runnable work exists. The CPU is idle if all unfinished processes are blocked (or, if delayed arrivals are added, no process has arrived). Execution ends when all processes finish.
- Use configuration order for initial admission and otherwise equal scheduling choices. Preserve FIFO/RR queue order rather than replacing rotation with configuration sorting.
- Playback uses a shared cycle position across stacked policies. Completed-state padding is visual only and does not extend completion metrics.

### Metrics

Turnaround time = completion time minus arrival time. Response time = first CPU start time minus arrival time. Report each per process and as an arithmetic mean per policy. These definitions follow [OSTEP chapter 7](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf).

Only turnaround and response time, per process and averaged per policy instance, are in the metric scope.

### Policy reference baseline

Refer to OSTEP as the authority. RR has an editable default of two cycles (valid range 1-20). Stretch-policy settings must be specified if those features are implemented.

- FIFO: use arrival order without time-slice preemption. SJF: select the shortest next CPU burst, running until blocking or completion. STCF: select the shortest remaining current CPU burst and permit preemption. RR: rotate runnable processes using a time slice. Burst-based interpretation is confirmed. [Chapter 7](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf)
- A burst ends at the next I/O request or process completion, whichever comes first. For I/O-disabled programs, the burst is all remaining CPU work. For I/O-enabled programs, its remaining length is the lesser of total CPU work remaining and CPU cycles still needed before the next I/O request. Preemption preserves progress; I/O completion begins a new burst. Bursts belong to the same process and do not create additional process instances.
- MLFQ: choose the highest nonempty priority queue, use RR among peers, start new processes at the top, demote after cumulative CPU allotment is consumed even across voluntary yields, and periodically boost priorities. Queue count, per-queue quantum/allotment, and boost interval require explicit values. [Chapter 8, refined rules](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf)
- Lottery: make weighted random selections using tickets. Stride: select the smallest pass value and advance that value by the process's stride after service. Ticket weights, quantum, random seed, initial pass, and blocked-process return behavior require explicit choices. [Chapter 9](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-lottery.pdf)


## 6. Interface and teaching support

Confirmed: two main views, one showing individual processes under one or more vertically stacked policies and one comparing workload-level results across policies. Each policy simulation models its own single core; stacking policies does not create a multicore simulation.

Confirmed: separate configuration and simulation pages within the web app. The simulation area retains the two main views. Whether these are separate routes or view selections is a design decision.

Confirmed playback controls: speed, pause/resume, next/previous cycle, restart, and jumping to a selected cycle.

Both simulation views, the initial example, and results table are required for December. Charts and brief event descriptions are optional. Repeated policy selections must remain distinguishable by instance number and settings.

Returning from configuration recomputes all runs and starts paused at cycle 0, even without edits. Configuration persists across navigation, but refresh restores fresh example defaults. Instructor demonstration followed by independent student exploration is the teaching flow.

Authoring defaults: switching between simulation views retains the shared run and playback position. Restart pauses at cycle 0 without changing configuration. Initial playback speed is one cycle per second; step/jump controls pause at the selected position.

## 7. Non-functional requirements

Desktop/laptop browser scope, capacity, non-color state identification, and preliminary response-time targets are confirmed.

| ID | Requirement | Status | Acceptance criteria |
| --- | --- | --- | --- |
| NFR-001 | Support core workflows in Chrome and Firefox on desktops/laptops. | Confirmed | Test configuration, both simulation views, playback, and metrics in both browsers; versions and minimum viewport TBD. |
| NFR-002 | Keep program inputs, process states, and histories isolated between policy runs. | Confirmed model constraint | Activity in one policy cannot mutate another policy's runtime state or the source program configuration. |
| NFR-003 | Preserve simulation outcomes while users navigate or change playback speed. | Required, derived from playback behavior | The same computed history yields identical completion times and metrics under all playback operations, including completed-state padding. |
| NFR-004 | Support 10 programs, each requiring at most 20 CPU cycles, across 5 simultaneous policy instances, with I/O interval and duration each 1-10 cycles inclusive. | Confirmed capacity | Verify 50 independent process instances, including duplicate selections, at combined limits. Elapsed time includes I/O and waiting. |
| NFR-005 | Provide keyboard-operated controls. | Stretch goal | Core keyboard workflows and shortcuts TBD; not a required December deliverable. |
| NFR-006 | Pair state colors with readable state badges and compact non-color timeline markings. | Confirmed | Ready, running, blocked, and completed are identifiable without distinguishing colors; include a legend for abbreviations or symbols. |
| NFR-007 | Compute all selected simulations for the maximum supported workload within 2 seconds on an agreed test laptop. | Preliminary target accepted | Measure computation through availability of complete histories and metrics in Chrome and Firefox. Hardware, versions, and timing procedure TBD. |
| NFR-008 | Respond to playback controls within 100 milliseconds on the agreed test laptop. | Preliminary target accepted | Measure input to visible response at supported workload limits; this is independent of selected animation speed. Test procedure TBD. |
| NFR-009 | Produce deterministic histories and metrics under identical inputs for the four required policies. | Required correctness criterion | Verify documented reference traces for ties, preemption, I/O, idle cycles, completion, and queue returns; repeat identical inputs. |
| NFR-010 | Validate before running and recover from computation failures without losing editable configuration. | Required, derived reliability criterion | Invalid inputs cannot start simulation. A simulated failure shows a readable error, permits return/retry, and never presents stale results as current. |
| NFR-011 | Provide a concise, usable developer guide and ownership handoff with a user quick start for professor ownership after April. | Required; incremental delivery per section 9 | Provide working setup/test/deployment instructions with the December MVP. Before final handoff, complete one professor or teammate walkthrough covering setup/build/test from a clean checkout, deployment, and basic recovery; correct blocking documentation gaps. No separate review report is required. |

Phone/tablet optimization and dedicated layouts are outside required scope. General responsive styling is a best-effort intention, not a promise of mobile/tablet support.

Performance figures are agreed initial targets, not measured claims about an existing implementation. Record the reference laptop, browser versions, viewport sizes, and timing procedure before acceptance testing; document any later target changes. Full accessibility certification, additional browsers, accounts, cloud saving, and offline operation are not promised by this baseline.

## 8. Use cases and acceptance coverage

These concise use cases support the requirements; any additional course-specific format can be produced separately.

- UC-001: An instructor demonstrates a policy step by step.
- UC-002: A student changes program/workload properties and observes process-state history.
- UC-003: A student compares workload performance across policies.
- UC-004: A student pauses, steps, seeks, changes speed, and restarts without changing computed outcomes.
- UC-005: The professor uses the consolidated developer guide and ownership notes to run, test, deploy, recover, and maintain the app independently.

Before accepting the MVP, verify all requirements due for the December baseline and cover CPU-only reference schedules; burst progress across preemption; independent overlapping I/O; all-blocked idle cycles; completion versus I/O/quantum expiration; ties and simultaneous queue events; boundary/invalid/empty inputs; maximum combined capacity; duplicate instance isolation; edit/delete/reorder; navigation and refresh; all playback speeds and bounds; completed-state padding; results only at terminal time; Chrome/Firefox; non-color state identification; performance measurements; and deployment smoke checks.

Report actual test outcomes and known deviations. This checklist does not assert that implementation tests have already passed.

## 9. Delivery scope and handoff

December MVP: FIFO, SJF, RR, STCF, configuration, both simulation views, the prefilled example, playback, results table, and required quality criteria.

Stretch order for policies: MLFQ after the four required policies; lottery/stride only if substantial time remains. Keyboard operation, charts, brief explanations, and arrival delays are optional before January. Choose among these only after required work is secure.

January-April 2027: user testing, fixes, stabilization, and iterative usability refinements based on classroom feedback within the agreed feature scope. No new features are planned during this period.

Explicit exclusions: fairness metrics, optimal-metric comparisons, multicore simulation, a separate simulation server, shared-I/O-device contention, configuration-file import/export, shareable configuration links, restoring user state after browser refresh, and dedicated phone/tablet optimization. Chrome and Firefox are the required browser test targets. Retired IDs are not reused.

Hosting is intentionally undecided: candidates are the School of Computing server, Netlify, and Vercel. Select one; supporting all three is not required. The deployed app must retain browser-only simulation.

The professor maintains the app after April. Deliver two concise documents sufficient to operate and maintain the delivered app:

1. **Developer guide:** practical instructions for setup, running locally, testing, building, deploying to the selected host, and basic maintenance/recovery. Include a brief code overview and relevant troubleshooting notes. Link to existing requirements, tests, and configuration where useful instead of duplicating them.
2. **Ownership handoff and quick start:** a short overview of the deployed app, repository and hosting ownership, access transfer, known limitations, and relevant project links. Include basic instructions for configuring an example, using playback, comparing results, and understanding refresh behavior. Transfer access and credentials through account mechanisms; do not put credentials in documentation.

These two documents cover the required user, testing, deployment, and maintenance guidance; separate guides for those topics are not required. Keep the content practical and proportionate to a two-person project, without exhaustive manuals or a prescribed page count.

Update documentation incrementally alongside implementation, user feedback, and stabilization. Trying the app with users and gathering feedback does not depend on completing documentation. Provide working setup/test/deployment instructions with the December MVP; finalize ownership details and complete the NFR-011 walkthrough before the ownership transfer after April.

Delivery includes the deployed app and documentation for the selected environment.

## 10. Decisions left to delivery planning

No further discovery round is required for the feature baseline. Record these decisions when the team has the relevant information:

| Decision | When to resolve |
| --- | --- |
| Host, URL, account ownership, and host-specific settings | Before deployment documentation and handoff testing. |
| Reference laptop, browser versions, viewport sizes, and timing procedure | Before formal performance/browser acceptance. |
| Exact April deadline, presentation date, and remaining rubric/artifacts | With the instructor's course schedule. |
| Example values, visual layout, and label formatting | During implementation within this baseline. |
| Selection and detailed parameters/tests for stretch features | Before starting each feature. |

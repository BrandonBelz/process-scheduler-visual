# Requirements: Process Scheduling Policy Visualizer

Status: Discovery draft, updated after discussion round 5. Incomplete; open decisions are explicitly marked. Later decisions supersede earlier discovery notes.

## 1. Purpose and audience

The app is an educational web tool for students learning operating systems and an instructor teaching the class. The instructor will demonstrate examples, then students will experiment with programs, processes, workloads, and scheduling policies.

Users must be able to:

- Understand each supported policy step by step.
- Compare scheduling policies on a workload.
- Investigate how workload properties affect performance under different policies.

## 2. Conventions and terminology

- Use "policy" throughout the product requirements and domain terminology.
- Confirmed: the user has agreed to the capability or constraint. This does not automatically assign it to the December MVP.
- Proposed: an idea awaiting confirmation.
- TBD: a decision is still needed.
- Functional requirements describe behavior; non-functional requirements describe measurable quality targets.
- Acceptance criteria below are draft verification statements unless explicitly approved.

### Domain terms

| Term | Meaning and known fields | Open decisions |
| --- | --- | --- |
| Program | User-created configuration with an ID, required CPU execution cycles (maximum 20), I/O enabled flag, and I/O interval and duration each from 1-10 cycles inclusive. Produces exactly one process per configured policy instance. | CPU minimum/integer validation and eventual arrival-delay configuration. |
| Process | Independent runtime instance of one program under one selected policy, with its own state and stateHistory. References its program. | Process identifier representation and exact history representation. |
| Policy | Scheduling behavior with an ID, name, description, preemptive boolean, initialState, and scheduler. | Configuration fields, internal state, and exact scheduler contract. |
| Policy instance | One configured selection of a policy type, with independent settings and simulation state. Duplicate types and identical settings are allowed. Each instance counts toward the five-instance comparison limit. | Display names and editing/removal interactions. |
| Scheduler | Proposed model: takes an array of processes and determines which process runs next clock cycle.   | Additional context needed, such as current time, queues, and previous decisions; behavior when nothing is runnable. |
| Workload | Shared ordered program configurations used to instantiate equivalent process inputs for every policy instance. Returning from configuration recomputes every run and resets playback. | None for the navigation/recompute rule. |
| Clock cycle | Discrete simulation time step. | Event ordering and whether history records state before or after execution. |

## 3. Project and technical constraints

| ID | Constraint | Status |
| --- | --- | --- |
| TC-001 | Build the web app with React and TypeScript. | Confirmed |
| TC-002 | Execute simulation logic in the browser without a separate simulation server. | Confirmed |
| TC-003 | Model exactly one CPU core per policy simulation. | Confirmed |
| TC-004 | Use OSTEP chapters 7-9 as the policy reference, with primary emphasis on chapter 7 policies. | Confirmed |
| PC-001 | Deliver within the capacity of a two-person undergraduate senior computer science team. | Confirmed |
| PC-002 | Deliver an MVP by week of December 14 , 2026. | Confirmed |
| PC-003 | Reserve January-April 2027 for testing and fixes; no new features are planned during that period. | Confirmed direction; exact final deadline TBD |
| PC-004 | Deliver a deployed app, requirements document, use cases, and additional course artifacts. | Confirmed; remaining artifact list and rubric TBD |
| PC-005 | Present the project next semester. | Confirmed; date and presentation requirements TBD |

Simulation computation runs locally in the browser. Configuration persists across in-app navigation but is not restored after browser refresh. Hosting remains TBD.

## 4. Functional requirements

Required December policies: FIFO, SJF, RR, and STCF. MLFQ is a stretch goal after these are complete; lottery/stride are further stretch goals only if substantial time remains before testing begins. Other feature priorities remain as identified below or TBD.

| ID | Requirement | Status | Draft acceptance criteria / remaining detail |
| --- | --- | --- | --- |
| FR-001 | Provide a detailed process view with vertically stacked policy instances and shared playback. | Required December MVP | Each process and state is distinguishable within each instance's timeline; all timelines show the same selected clock cycle. |
| FR-002 | Instantiate exactly one independent process per program per configured policy instance. | Confirmed | Three programs and two instances produce six process instances, even if both selections use identical policy types/settings. Each references its program and maintains independent runtime state and history. |
| FR-003 | Let users add policy instances by choosing a policy type and configuring its settings. | Confirmed | Repeated types and identical configurations are accepted without duplicate checking. Each instance has independent settings, runtime state, and results. |
| FR-004 | Let users create programs on a configuration page separate from simulation viewing. | Confirmed | A user can create a valid program and include it in a workload; a dialog within this page remains an optional design choice. |
| FR-005 | Recompute all simulations whenever returning from configuration to simulation, and start paused at cycle 0. | Confirmed | Recompute and reset even if configuration was not changed; retain program and policy settings but never restore the previous playback position on this transition. |
| FR-006 | Provide a separate workload comparison view using the same workload inputs across policy instances. | Required December MVP | Every instance receives equivalent program configuration, run duration, I/O settings, and any arrival settings; results are independent and comparable. |
| FR-007 | Support FIFO, Round Robin (RR), Shortest Job First (SJF), and Shortest Time-to-Completion First (STCF). | Required December MVP | Each policy is selectable and matches reference schedules under the documented simulation rules. |
| FR-008 | Support lottery and stride scheduling following OSTEP chapter 9. | Further stretch goals, after core policies and MLFQ | Implement only if substantial time remains before January; settings and reproducibility rules TBD. |
| FR-009 | Visualize execution and process-state changes by clock cycle. | Confirmed intent | Users can inspect how process states change over successive cycles; exact visual design TBD. |
| FR-010 | Retain simulation history for visualization. | Confirmed intent | Earlier cycles remain inspectable; navigation and retention limits TBD. |
| FR-011 | Provide speed adjustment, pause/resume, next cycle, previous cycle, restart, and jumping to a selected cycle. | Confirmed | Users can navigate history in both directions, pause before completion, resume, return to the beginning, and select a cycle. Navigation does not alter the computed schedule. Exact speed range and boundary behavior TBD. |
| FR-012 | Animate a timeline with earlier cycles moving left as new cycles appear. | Proposed visual direction | Confirm layout, scrolling, and behavior for long histories. |
| FR-013 | Compute the simulation history before animated playback. | Proposed architecture | Browser computation confirmed; eager computation, maximum workload, and responsiveness target still require confirmation. |
| FR-014 | Let users configure required CPU cycles up to 20 and optional I/O with interval and duration each from 1-10 cycles inclusive. | Confirmed | Reject I/O settings outside the bounds. CPU execution counts toward the interval; ready and blocked time do not consume CPU work. CPU lower bound and whole-number validation await explicit confirmation. |
| FR-015 | Initially admit all programs at cycle 0; optionally add arrival delays per program before January. | Pre-January stretch goal | If implemented, apply a program's delay equally to every policy instance. |
| FR-016 | Show brief explanations of scheduling events or decisions. | Optional, subject to implementation effort | Explanation coverage and MVP inclusion TBD. |
| FR-017 | Show an end-of-run results table in the workload comparison view. | Required December MVP | Identify each policy instance and report per-process and mean turnaround/response times. Comparison timeline layout remains open; charts are separately optional. |
| FR-018 | Keep completed processes visibly completed while the shared playback advances through longer policy runs. | Confirmed | A process completed at cycle 8 remains completed when another policy advances to cycle 12; its completion time and metrics remain fixed. |
| FR-019 | Calculate per-process and average turnaround time and response time for each policy. | Confirmed | Use the definitions below; each average includes each workload process exactly once. Display rounding and incomplete-run presentation TBD. |
| FR-022 | Provide a built-in example workload for initial exploration. | Optional candidate | Example selection and MVP inclusion TBD. |
| FR-023 | Limit workload configuration to 10 programs and simultaneous comparison to 5 policy instances, counting duplicates. | Confirmed | An eleventh program and sixth instance cannot be added; programs with more than 20 required CPU cycles cannot be submitted. Explain the relevant limit. |
| FR-024 | Retain configured programs and selected policies while moving between configuration and simulation views; reset user configuration on browser refresh. | Confirmed | Navigate between views without losing inputs; refresh and verify previous user inputs/selections are not restored. Fresh defaults TBD. |
| FR-025 | Provide sensible editable defaults for supported policy parameters. | Confirmed | Users can view and change applicable settings before running; exact defaults, valid ranges, and reset behavior TBD. |
| FR-026 | Support MLFQ following OSTEP chapter 8 if the four required policies are completed early. | First policy stretch goal | Implement only if time permits before January testing; queue and boost parameters TBD. |
| FR-027 | Let users reorder and delete programs in configuration. | Confirmed | Reordered programs determine tie-breaking order in the next run; deleting a program removes its processes from all recomputed policy instances. |
| FR-028 | Provide charts comparing simulation results. | Optional stretch goal | Chart types and metric presentation TBD; the required results table is sufficient for the MVP. |

## 5. Simulation rules and remaining decisions

### Agreed model

- Each process must receive its program's configured CPU execution duration. Blocked time and waiting for CPU access add to elapsed time. Ten CPU cycles plus four blocked cycles take fourteen elapsed cycles if no other delay occurs.
- Each process has independent I/O with no shared-device contention or I/O queue. Several processes may be blocked at once; their I/O timers do not interfere with one another. CPU execution can continue for a ready process while others are blocked.
- I/O interval counts executed CPU cycles. The user supplied `[RUNNING, RUNNING, RUNNING, BLOCKED]` for two executed cycles, preemption, then one more executed cycle. This supports retaining burst progress across preemption; whether the example omits intervening READY cycles is unresolved. A full history aligned to global time is proposed below.
- Completion takes precedence over I/O: the final required CPU cycle completes the process without trailing I/O, even if an I/O interval expires on that cycle.
- Initially all programs arrive at cycle 0. Per-program delayed arrivals are a later capability.
- Each policy simulation has one CPU core and independent runtime state.
- Context switching costs zero simulated cycles. Exactly one process runs in each cycle when runnable work exists. The CPU is idle if all unfinished processes are blocked (or, if delayed arrivals are added, no process has arrived). Execution ends when all processes finish.
- Use configuration-page order to resolve otherwise equal scheduling choices. Queue semantics still apply; tie-breaking must not replace RR rotation. Ordering simultaneous queue events remains TBD.
- Playback uses a shared cycle position across stacked policies. Completed-state padding is visual only and does not extend completion metrics.

### Metrics

Turnaround time = completion time minus arrival time. Response time = first CPU start time minus arrival time. Report each per process and as an arithmetic mean per policy. These definitions follow [OSTEP chapter 7](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf).

Only turnaround and response time, per process and averaged per policy instance, are in the metric scope.

### Policy reference baseline

The user selected OSTEP as the authority. Defaults must be editable. Configuration-order tie-breaking and zero context-switch cost are confirmed; parameter values and I/O edge cases still need decisions.

- FIFO: use arrival order without time-slice preemption. SJF: select the shortest next CPU burst, running until blocking or completion. STCF: select the shortest remaining current CPU burst and permit preemption. RR: rotate runnable processes using a time slice. Burst-based interpretation is confirmed. [Chapter 7](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf)
- A burst ends at the next I/O request or process completion, whichever comes first. For I/O-disabled programs, the burst is all remaining CPU work. For I/O-enabled programs, its remaining length is the lesser of total CPU work remaining and CPU cycles still needed before the next I/O request. Preemption preserves progress; I/O completion begins a new burst. Bursts belong to the same process and do not create additional process instances.
- MLFQ: choose the highest nonempty priority queue, use RR among peers, start new processes at the top, demote after cumulative CPU allotment is consumed even across voluntary yields, and periodically boost priorities. Queue count, per-queue quantum/allotment, and boost interval require explicit values. [Chapter 8, refined rules](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf)
- Lottery: make weighted random selections using tickets. Stride: select the smallest pass value and advance that value by the process's stride after service. Ticket weights, quantum, random seed, initial pass, and blocked-process return behavior require explicit choices. [Chapter 9](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-lottery.pdf)

### Remaining decisions

- Global-time history semantics: proposed one state entry per elapsed cycle per process, including READY entries while another process runs. Clarify whether the user's compressed example intentionally omitted those waiting cycles.
- Candidate states from the PDF: blocked, ready, running, and completed. State transitions and representation before arrival remain TBD.
- Ordering of arrivals, I/O completions, time-slice expiration, selection, and execution at a cycle boundary.
- I/O return queue position, simultaneous event ordering, and policy parameter defaults/ranges.
- MLFQ queue rules and configuration.
- Display precision and treatment of incomplete metrics.
- Reproducibility rules for comparisons and any randomized behavior.
- Completion, invalid input, and maximum-run handling.

## 6. Interface and teaching support

Confirmed: two main views, one showing individual processes under one or more vertically stacked policies and one comparing workload-level results across policies. Each policy simulation models its own single core; stacking policies does not create a multicore simulation.

Confirmed: separate configuration and simulation pages within the web app. The simulation area retains the two main views. Whether these are separate routes or view selections is a design decision.

Confirmed playback controls: speed, pause/resume, next/previous cycle, restart, and jumping to a selected cycle.

Both simulation views and the results table are required for December. Charts and brief event descriptions are optional. Policy instances can repeat the same type and settings; each should remain distinguishable in the interface (label format TBD).

Returning from configuration to simulation recomputes all runs and starts paused at cycle 0, regardless of whether edits occurred. Programs and configured policy instances persist across view navigation but reset on browser refresh. A built-in example is optional. Configuration-file import/export and shareable links are not required. Instructor-led demonstration followed by independent student exploration is the intended teaching flow.

## 7. Non-functional requirements to define

Desktop/laptop browser scope, capacity, non-color state identification, and preliminary response-time targets are confirmed. Test hardware and remaining quality criteria still need definition.

| ID | Requirement | Status | Draft acceptance criteria |
| --- | --- | --- | --- |
| NFR-001 | Support core workflows in Chrome and Firefox on desktops/laptops. | Confirmed | Test configuration, both simulation views, playback, and metrics in both browsers; versions and minimum viewport TBD. |
| NFR-002 | Keep program inputs, process states, and histories isolated between policy runs. | Confirmed model constraint | Activity in one policy cannot mutate another policy's runtime state or the source program configuration. |
| NFR-003 | Preserve simulation outcomes while users navigate or change playback speed. | Draft derived requirement | The same computed history yields identical completion times and metrics under all playback operations, including completed-state padding. |
| NFR-004 | Support 10 programs, each requiring at most 20 CPU cycles, across 5 simultaneous policy instances, with I/O interval and duration each 1-10 cycles inclusive. | Confirmed capacity | Verify 50 independent process instances, including duplicate selections, at combined limits. Elapsed time includes I/O and waiting. |
| NFR-005 | Provide keyboard-operated controls. | Stretch goal | Core keyboard workflows and shortcuts TBD; not a required December deliverable. |
| NFR-006 | Pair state colors with readable state badges and compact non-color timeline markings. | Confirmed | Ready, running, blocked, and completed are identifiable without distinguishing colors; include a legend for abbreviations or symbols. |
| NFR-007 | Compute all selected simulations for the maximum supported workload within 2 seconds on an agreed test laptop. | Preliminary target accepted | Measure computation through availability of complete histories and metrics in Chrome and Firefox. Hardware, versions, and timing procedure TBD. |
| NFR-008 | Respond to playback controls within 100 milliseconds on the agreed test laptop. | Preliminary target accepted | Measure input to visible response at supported workload limits; this is independent of selected animation speed. Test procedure TBD. |

Phone/tablet optimization and dedicated layouts are outside required scope. General responsive styling is a best-effort intention, not a promise of mobile/tablet support.

| Area | Decisions needed |
| --- | --- |
| Correctness | Reference schedules, policy variants, invariants, and metric definitions. |
| Performance and capacity | Reference test hardware/procedure, maximum-run handling, and any additional bounds needed for stretch policies/arrivals. |
| Usability | First-time student tasks, instructor demonstration needs, and help content. |
| Accessibility | Keyboard controls are stretch; non-color state identification confirmed; screen-reader support and reduced animation remain open. |
| Compatibility | Chrome/Firefox versions and minimum desktop/laptop viewport; mobile/tablet optimization excluded. |
| Reliability | Validation, errors, interrupted computation, and safe handling of excessive runs. |
| Data and privacy | In-memory configuration only across views, reset on refresh confirmed; accounts and any non-simulation data transmission remain unspecified. |
| Maintainability | Tests, documentation, policy extension boundaries, and team handoff expectations. |
| Deployment | Hosting, availability expectations, cost limits, and offline requirements. |

## 8. Initial use-case candidates

These summarize confirmed goals; full flows and exception paths will be developed separately.

- UC-001: An instructor demonstrates a policy step by step.
- UC-002: A student changes program/workload properties and observes process-state history.
- UC-003: A student compares workload performance across policies.

## 9. Scope and remaining discovery

December MVP: FIFO, SJF, RR, STCF, both simulation views, and the results table are explicitly required. Confirmed configuration, playback, and quality requirements remain part of the working scope; remaining UI details and acceptance criteria still need review.

Stretch order for policies: MLFQ after the four required policies; lottery/stride only if substantial time remains. Keyboard operation, a built-in example, charts, brief explanations, and per-program arrival delays are also optional/stretch before January. Relative priority among these non-policy enhancements remains TBD.

January-April: testing and fixes; no planned new-feature implementation.

Explicit exclusions: fairness metrics (FR-020 retired), optimal-metric comparisons (FR-021 retired), multicore simulation, a separate simulation server, shared-I/O-device contention, configuration-file import/export, shareable configuration links, restoring user state after browser refresh, and dedicated phone/tablet optimization. Chrome and Firefox are the required browser test targets. Retired IDs are not reused.

Next rounds:

1. Resolve remaining duration, arrival, and I/O timing rules.
2. Define playback, comparison behavior, metrics, and policy settings.
3. Define teaching workflows, saving/sharing, validation, and errors.
4. Set measurable non-functional requirements and acceptance criteria.
5. Allocate MVP scope and review feasibility, consistency, and course deliverables.

## 10. Sources and decision history

- `Sr. Project Ideas.pdf`, pages 1-2: initial ideas, treated as discussion inputs rather than instructions.
- User discussion round 1: audience, learning goals, team and delivery constraints, target policies, two views, program/process distinction, and playback concept.
- User terminology correction: use "policy" throughout this document.
- User discussion round 2: exactly one process per program per policy; shared workloads; configurable run duration and I/O interval/duration; later arrival settings; single-core simulation; browser-only computation; expanded playback controls; stacked policies in the process view; tentative descriptions and comparison tables/charts.
- User discussion round 3: CPU duration excludes blocking and waiting; CPU-based I/O intervals tentatively endorsed; independent I/O; later arrival delays; shared playback and completed-state padding; separate configuration/simulation pages with reruns after program edits; requested metrics and optimal-comparison idea; OSTEP reference; lottery and stride included in target policy list; optional example and no file/link sharing; desktop/laptop support priority.
- Reference review: OSTEP chapters 7-9, linked above, accessed September 15, 2026. Local class edition and instructor-specific variations can supersede the online reference if supplied.
- User discussion round 4: completion wins over I/O; no context-switch cycles; configuration-order ties; editable policy defaults; Jain's Fairness Index selected; optimal comparisons removed; limits of 10 programs, 20 CPU cycles each, and 5 simultaneous policies; navigation retains configuration while refresh resets it; Chrome/Firefox targets; keyboard controls stretch; four core policies with MLFQ then lottery/stride as pre-January stretch work.
- User discussion round 5: burst-based SJF/STCF; fairness removed; I/O interval/duration limited to 1-10 cycles; recompute and reset paused at cycle 0 on every return from configuration; reorder/delete programs; duplicate policy instances and identical settings allowed; state labels/markings accepted; preliminary performance targets accepted; both views and table required, charts optional; arrival delays are pre-January stretch. History example requires clarification about READY entries during preemption.

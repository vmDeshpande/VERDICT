# VERDICT --- Development Roadmap

**Status:** Planning\
**Product:** Multiplayer AI courtroom simulation and legal education
platform\
**Initial jurisdictions:** India and United States\
**Initial experience:** Human vs. human, with an interactive AI judge\
**Architecture:** TypeScript modular monolith

------------------------------------------------------------------------

## 1. Roadmap goals

The roadmap prioritizes a reliable courtroom engine before expanding
legal-source coverage and advanced AI capabilities.

The first release should prove that two people can participate in a
synchronized, auditable courtroom simulation where an AI judge can
intervene safely and produce a source-grounded educational assessment.

### Product outcomes

1.  Students can practice legal advocacy without needing another
    participant online every time.
2.  Two or more people can participate in real-time hearings.
3.  The AI judge can intervene while respecting deterministic courtroom
    rules.
4.  Legal research is jurisdiction- and date-aware.
5.  Legal citations can be traced to source documents and passages.
6.  Trial history and AI decisions can be reviewed.
7.  Educators can eventually create and assess structured exercises.

## 2. Scope and release strategy

### MVP

The MVP should include:

-   Authentication and profiles.
-   Case library with a small, curated set of exercises.
-   Courtroom creation and invitations.
-   Two human advocates and an interactive AI judge.
-   Configurable, limited courtroom templates.
-   Real-time arguments and transcript.
-   Basic objections and judicial interventions.
-   A small verified legal corpus for one carefully bounded subject area
    in India and one in the US.
-   Source-linked legal retrieval.
-   Structured simulated judgment.
-   Basic individual feedback.
-   Trial replay.

### Not required for MVP

-   Comprehensive coverage of all Indian and US law.
-   Every court type and procedural rule.
-   Video conferencing.
-   Voice-first hearings.
-   AI witness personas.
-   Multi-judge panels.
-   University billing and administration.
-   Public leaderboards and tournaments.
-   Automated ingestion from every legal website.
-   Production use with confidential client matters.

These features should not delay validation of the core courtroom
experience.

## 3. Milestones

Estimates below assume focused work by a solo developer or small team.
They are planning estimates, not delivery commitments. Legal-source
access, data quality, and evaluation can extend the schedule.

### Phase 0 --- Product and repository foundation

**Goal:** Turn the specification into an implementable repository.

Deliverables:

-   [ ] Confirm product terminology and user roles.
-   [ ] Define MVP scope and explicit non-goals.
-   [ ] Create repository and contribution conventions.
-   [ ] Set up TypeScript, linting, formatting, and test tooling.
-   [ ] Define environment configuration and secret handling.
-   [ ] Create architecture decision records for major choices.
-   [ ] Define initial case and courtroom templates.
-   [ ] Create threat model and data classification.
-   [ ] Establish CI checks.

Exit criteria:

-   Repository builds and CI passes.
-   Product scope is documented.
-   Initial architecture decisions are recorded.
-   No secrets are committed.

### Phase 1 --- Application foundation

**Goal:** Users can register, create cases, and create/join courtrooms.

Deliverables:

-   [ ] Next.js application shell and design system.
-   [ ] Express API application.
-   [ ] PostgreSQL and Prisma setup.
-   [ ] Authentication and session handling.
-   [ ] User profiles and role model.
-   [ ] Case CRUD and case library.
-   [ ] Courtroom creation and invitation flow.
-   [ ] Membership and role assignment.
-   [ ] Authorization tests.
-   [ ] Development Docker Compose configuration.

Exit criteria:

-   Two distinct accounts can join the same authorized courtroom.
-   Users cannot access unrelated private cases or rooms.
-   Database migrations run from a clean database.
-   API validation and authorization tests pass.

### Phase 2 --- Deterministic courtroom engine

**Goal:** A courtroom can conduct a complete basic hearing without AI.

Deliverables:

-   [ ] Trial state machine.
-   [ ] Courtroom templates and phase configuration.
-   [ ] Server-authoritative turn management.
-   [ ] Socket.IO connection and room authorization.
-   [ ] Argument submission and delivery.
-   [ ] Transcript event persistence.
-   [ ] Objection submission and basic rulings.
-   [ ] Reconnection and event resynchronization.
-   [ ] Idempotency for retried commands.
-   [ ] Append-only event sequence.
-   [ ] Trial replay from events.

Exit criteria:

-   Two clients see the same event order.
-   Invalid phase transitions are rejected.
-   Unauthorized users cannot submit courtroom actions.
-   Reconnection does not duplicate or lose committed events.
-   A trial can be reconstructed from its event history.

### Phase 3 --- Interactive AI judge

**Goal:** The AI judge participates in a controlled, structured hearing.

Deliverables:

-   [ ] Provider-agnostic LLM adapter.
-   [ ] Structured output schemas.
-   [ ] Judge context builder.
-   [ ] AI intervention triggers.
-   [ ] Clarification and authority-request actions.
-   [ ] Procedural action validation.
-   [ ] Judge message and action persistence.
-   [ ] AI timeout, retry, and failure behavior.
-   [ ] Prompt-injection defenses for case material.
-   [ ] AI evaluation scenario suite.

Exit criteria:

-   The model cannot directly mutate trial state.
-   Every proposed action is validated by backend rules.
-   Invalid model output fails safely.
-   AI failures do not corrupt or stall the authoritative event log.
-   Judge actions are reproducible from stored context, prompt version,
    model metadata, and retrieved sources as far as provider determinism
    allows.

### Phase 4 --- Legal intelligence foundation

**Goal:** Retrieve traceable legal authorities for a bounded initial
corpus.

Deliverables:

-   [ ] Legal document and version data model.
-   [ ] Source connector interface.
-   [ ] Initial India source adapter(s).
-   [ ] Initial US source adapter(s).
-   [ ] Manual ingestion path for approved documents.
-   [ ] Text extraction and section/paragraph segmentation.
-   [ ] Metadata and full-text indexing.
-   [ ] pgvector embeddings and retrieval.
-   [ ] Source provenance and checksums.
-   [ ] Citation verification service.
-   [ ] Effective-date and version selection.
-   [ ] Source freshness and coverage indicators.
-   [ ] Legal retrieval evaluation dataset.

Exit criteria:

-   Every returned passage maps to a stored source document and
    location.
-   Jurisdiction filters are enforced.
-   Historical-date queries select the appropriate known version or
    disclose missing history.
-   Unsupported or stale source coverage is disclosed.
-   Fabricated citations are rejected or marked unverified.
-   Source connector permissions and terms have been reviewed.

**Important scope constraint:** Begin with a narrow legal subject and
verified corpus in each jurisdiction. Expand coverage only when
ingestion, versioning, citation verification, and evaluation are
reliable.

### Phase 5 --- Evidence and case simulation

**Goal:** Participants can work with case packets and exhibits.

Deliverables:

-   [ ] Secure object storage integration.
-   [ ] Upload authorization and file validation.
-   [ ] Malware scanning workflow.
-   [ ] Exhibit numbering and metadata.
-   [ ] Submitted/admitted/disputed/excluded/pending statuses.
-   [ ] Evidence ruling history.
-   [ ] Case facts and issue management.
-   [ ] Fictional case generator with explicit labels.
-   [ ] Role-specific confidential case packet support.
-   [ ] Evidence analysis assistant.
-   [ ] Cross-examination question and answer workflow.

Exit criteria:

-   Evidence access follows case and courtroom permissions.
-   Uploads are not automatically treated as authentic or admitted.
-   Fictional content is visibly identified.
-   Confidential role-specific materials are not exposed to the opposing
    participant.
-   Every evidence status change is auditable.

### Phase 6 --- Judgment and learning analytics

**Goal:** Trials produce useful educational outcomes.

Deliverables:

-   [ ] Structured judgment schema.
-   [ ] Issue-by-issue reasoning.
-   [ ] Legal authority and evidence references.
-   [ ] Disputed fact and uncertainty reporting.
-   [ ] Separate party performance reports.
-   [ ] Advocacy rubric configuration.
-   [ ] Trial replay interface.
-   [ ] Exportable transcript and report.
-   [ ] Instructor review workflow.

Exit criteria:

-   The simulated decision cites the actual stored sources it relied on.
-   The report distinguishes legal accuracy from advocacy quality.
-   Missing evidence and unresolved issues are disclosed.
-   The winner is not used as the only performance metric.
-   Reports are clearly labeled as educational simulations.

### Phase 7 --- Beta readiness

**Goal:** Safely release a limited public beta.

Deliverables:

-   [ ] End-to-end tests.
-   [ ] Authorization and tenant-isolation testing.
-   [ ] Load and reconnect testing.
-   [ ] AI latency and cost monitoring.
-   [ ] Legal retrieval quality evaluation.
-   [ ] Security review.
-   [ ] Privacy and retention policy.
-   [ ] Terms and educational-use disclaimers.
-   [ ] Source coverage documentation.
-   [ ] Backup and restore tests.
-   [ ] Production deployment and incident runbooks.
-   [ ] Feedback and issue reporting.

Exit criteria:

-   Critical security issues are resolved.
-   Data recovery is tested.
-   AI and legal retrieval failure modes are visible.
-   The public product does not imply legal advice or binding decisions.
-   Source coverage and limitations are published.

## 4. Post-MVP roadmap

### Education and institutions

-   [ ] Instructor dashboards.
-   [ ] Course and class management.
-   [ ] Assignments and grading rubrics.
-   [ ] Scheduled moot court competitions.
-   [ ] Private institutional workspaces.
-   [ ] Cohort-level learning analytics.

### Advanced courtroom

-   [ ] Human vs. AI opposing counsel.
-   [ ] AI vs. AI demonstration trials.
-   [ ] AI witness simulation.
-   [ ] Multiple AI judges and separate opinions.
-   [ ] Voice and video through WebRTC.
-   [ ] Live captions and transcript correction.
-   [ ] More court and hearing templates.

### Legal intelligence expansion

-   [ ] Additional Indian state law coverage.
-   [ ] More Indian High Court coverage.
-   [ ] US state law coverage.
-   [ ] Additional international jurisdictions.
-   [ ] Better case treatment and citation graph.
-   [ ] Source change alerts.
-   [ ] Research workspaces and saved authority collections.

## 5. Cross-cutting engineering work

These activities span all phases.

### Quality

-   Unit tests for domain logic.
-   Integration tests for database and API behavior.
-   Socket.IO contract tests.
-   End-to-end tests for complete trials.
-   AI regression tests with fixed scenarios.
-   Legal citation and retrieval evaluation.
-   Load and failure-injection testing.

### Observability

Track:

-   API latency and error rate.
-   Socket connection and event delivery health.
-   Trial event processing delay.
-   AI latency, token usage, cost, and failure rate.
-   Retrieval precision and source coverage.
-   Citation verification failures.
-   Background job retries and dead-letter counts.

Do not log raw sensitive case contents or secrets by default.

### Reliability

-   Transactional event persistence.
-   Idempotent commands.
-   Background job retries with bounded backoff.
-   Dead-letter handling.
-   Database backups and restore drills.
-   Redis treated as recoverable coordination/cache state, not the sole
    source of truth.
-   Object storage lifecycle and retention policies.

## 6. Suggested implementation order

The dependency chain is:

``` text
Repository foundation
        |
        v
Identity + Case + Courtroom
        |
        v
Deterministic Trial Engine
        |
        v
Real-time Events + Replay
        |
        v
AI Judge with Validated Actions
        |
        v
Legal Corpus + Retrieval + Citations
        |
        v
Evidence + Case Simulation
        |
        v
Judgment + Learning Analytics
        |
        v
Security Review + Public Beta
```

Do not build advanced AI witness behavior before the deterministic
courtroom engine is reliable. Do not market legal knowledge as current
until source versioning and freshness checks exist.

## 7. Definition of done

A feature is not complete merely because its happy path works.

Each feature must include:

-   Defined behavior and acceptance criteria.
-   Input validation and authorization.
-   Unit and integration tests as appropriate.
-   Error and retry behavior.
-   Audit/event behavior where relevant.
-   Accessibility and responsive UI checks.
-   Documentation and configuration updates.
-   Security and privacy review proportional to risk.

## 8. Release gates

  -----------------------------------------------------------------------
  Gate                                Required evidence
  ----------------------------------- -----------------------------------
  Internal prototype                  Two users complete a basic hearing

  AI preview                          Judge actions are schema-validated
                                      and backend-controlled

  Legal preview                       Citations resolve to verified
                                      stored passages

  Evidence preview                    Access control and exhibit status
                                      history work

  Education preview                   Reports are useful, transparent,
                                      and reviewable

  Public beta                         Security, privacy, operational, and
                                      legal limitations are documented
  -----------------------------------------------------------------------

------------------------------------------------------------------------

**Guiding principle:** Build a trustworthy courtroom first, then expand
the law it can responsibly support.

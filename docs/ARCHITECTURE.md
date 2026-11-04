# VERDICT --- System Architecture

**Document status:** Proposed architecture\
**Architecture style:** Modular monolith with explicit domain
boundaries\
**Primary language:** TypeScript\
**Initial jurisdictions:** India and United States

------------------------------------------------------------------------

## 1. Architecture objectives

VERDICT combines real-time collaboration, structured legal proceedings,
AI orchestration, legal-source retrieval, and evidence management.

The architecture must provide:

1.  A server-authoritative courtroom state.
2.  Ordered, durable, replayable trial events.
3.  Strict participant, role, and resource authorization.
4.  Jurisdiction- and time-aware legal retrieval.
5.  Traceable citations and source provenance.
6.  Controlled AI actions with deterministic validation.
7.  Secure evidence and document handling.
8.  A modular implementation that can evolve without premature
    microservices.

## 2. Architectural decisions

  -----------------------------------------------------------------------
  Concern                 Decision                Rationale
  ----------------------- ----------------------- -----------------------
  Application shape       Modular monolith        Lower operational
                                                  complexity while
                                                  boundaries are still
                                                  evolving

  Frontend                Next.js + React         Interactive application
                                                  and dashboard

  Backend                 Express + TypeScript    Familiar, explicit API
                                                  and domain
                                                  orchestration

  Real-time               Socket.IO               Rooms,
                                                  acknowledgements,
                                                  reconnection, event
                                                  delivery

Primary database        MongoDB              Document storage,
                                                   flexible schema,
                                                   audit-friendly records

  ODM                     Mongoose              Typed document access
                                                   and schema validation

  Vector search           (deferred)            Keep initial semantic
                                                   retrieval close to
                                                   source metadata

  Cache/queues            Redis + BullMQ          Transient coordination
                                                  and background
                                                  processing

  Files                   S3-compatible object    Private, scalable
                          storage                 evidence storage

  AI                      Provider adapter +      Model flexibility and
                          custom orchestrator     control over workflow

  Search                  MongoDB + (deferred)   Exact legal identifiers
                          full-text +             and semantic discovery
                          metadata filters                
  -----------------------------------------------------------------------

Do not introduce microservices, Kafka, a dedicated vector database, or a
separate search cluster until measured requirements justify them.

## 3. High-level system

``` text
                       BROWSER CLIENTS
                  Next.js / React / TypeScript
                              |
                   HTTPS REST + Socket.IO
                              |
                      EXPRESS API
                              |
       +----------------------+----------------------+
       |                      |                      |
  Identity & Access      Courtroom Domain       Case Domain
       |                      |                      |
       +----------------------+----------------------+
                              |
                     APPLICATION SERVICES
                              |
       +----------------------+----------------------+
       |                      |                      |
  Legal Intelligence     AI Orchestrator       Evidence Service
       |                      |                      |
       +----------------------+----------------------+
                              |
                   INFRASTRUCTURE ADAPTERS
                              |
+----------------------+----------------------+
        |                      |                      |
    MongoDB              Redis              Object Storage
                         + BullMQ            Evidence files
        |
  Legal Source Records
       |
  Source Connector Workers
       |
 Official legal repositories and approved datasets
```

## 4. Repository structure

A practical initial monorepo:

``` text
verdict/
├── apps/
│   ├── web/                       # Next.js client
│   └── api/                       # Express API and Socket.IO
├── packages/
│   ├── contracts/                 # Shared API/event schemas
│   ├── config/                    # Shared lint/TypeScript config
│   ├── database/                  # Mongoose schemas and models
│   ├── domain/                    # Domain types and pure rules
│   ├── ai/                        # Provider adapters and orchestration
│   └── ui/                        # Shared UI components, if needed
├── workers/
│   ├── legal-ingestion/           # Source sync and document processing
│   └── background/                # Reports and asynchronous jobs
├── docs/
│   ├── decisions/                 # Architecture decision records
│   ├── legal-sources/             # Source coverage and connector notes
│   └── security/                  # Threat model and security notes
├── infrastructure/
│   ├── docker/
│   └── deployment/
├── scripts/
├── tests/
│   ├── fixtures/
│   └── evaluation/
├── .env.example
├── docker-compose.yml
├── package.json
├── README.md
├── ROADMAP.md
└── ARCHITECTURE.md
```

The exact workspace tooling can be selected during repository
initialization. Keep imports flowing inward toward domain logic; domain
packages must not depend on Express, Mongoose, Socket.IO, or a specific AI
provider.

## 5. Backend module boundaries

### Identity and access

Responsibilities:

-   Registration, login, sessions, and account lifecycle.
-   User profiles.
-   Role and permission checks.
-   Institution and classroom membership in a later phase.
-   Resource-level authorization.

Must not own courtroom business rules.

### Case management

Responsibilities:

-   Case metadata and type.
-   Jurisdiction and relevant date.
-   Parties and issues.
-   Case facts and source references.
-   Real, hypothetical, and fictional case labels.
-   Role-specific case packet access.

### Courtroom engine

Responsibilities:

-   Courtroom creation and membership.
-   Role assignment.
-   Court template and phase configuration.
-   Trial state machine.
-   Command validation.
-   Turn and speaking permissions.
-   Objection workflow.
-   Event sequencing and replay.
-   Trial completion.

The courtroom engine is the authoritative owner of trial state.

### Legal intelligence

Responsibilities:

-   Legal source registry.
-   Source connector lifecycle.
-   Document ingestion and versioning.
-   Text extraction and segmentation.
-   Metadata, full-text, and vector indexing.
-   Jurisdiction and date filters.
-   Citation resolution and verification.
-   Source freshness and coverage reporting.

It should expose legal retrieval interfaces rather than leaking storage
implementation details.

### Evidence management

Responsibilities:

-   Upload initiation and authorization.
-   File metadata and object-storage references.
-   Exhibit identifiers.
-   Evidence status and ruling history.
-   Access policies.
-   Integrity hashes and scanning status.
-   Evidence references in arguments and judgments.

The system must not infer authenticity from file upload or successful
text extraction.

### AI orchestration

Responsibilities:

-   Build bounded agent context.
-   Retrieve supporting sources through legal intelligence.
-   Call model providers.
-   Validate structured model outputs.
-   Apply timeouts, retry policy, and budgets.
-   Record prompt/model/retrieval metadata.
-   Return proposed actions to the relevant domain service.

The AI orchestrator is not allowed to bypass domain services.

### Reporting and learning

Responsibilities:

-   Transcript exports.
-   Simulated judgment generation.
-   Party-specific feedback.
-   Rubric-based assessment.
-   Instructor review.
-   Trial analytics.

## 6. Domain model

The following is a conceptual model. Exact columns, constraints, and
normalization should be finalized with migrations.

### Identity and organizations

-   `users`
-   `user_profiles`
-   `institutions`
-   `institution_memberships`
-   `classrooms`
-   `classroom_memberships`

### Cases

-   `cases`
-   `case_parties`
-   `case_facts`
-   `case_issues`
-   `case_materials`
-   `case_packet_permissions`

### Courtrooms and proceedings

-   `courtrooms`
-   `courtroom_members`
-   `court_templates`
-   `trial_phases`
-   `trial_events`
-   `arguments`
-   `objections`
-   `judicial_actions`
-   `trial_snapshots`

### Evidence

-   `evidence`
-   `evidence_versions`
-   `evidence_rulings`
-   `evidence_access_logs`

### Legal intelligence

-   `legal_sources`
-   `legal_documents`
-   `legal_document_versions`
-   `legal_sections`
-   `legal_chunks`
-   `legal_citations`
-   `legal_treatments`
-   `ingestion_runs`

### AI and evaluation

-   `ai_runs`
-   `ai_prompt_versions`
-   `ai_retrieval_records`
-   `judgments`
-   `performance_reports`
-   `assessment_rubrics`

### Important relationships

``` text
User ----< CourtroomMembership >---- Courtroom ---- Case
                                          |
                                          +----< TrialEvent
                                          |
                                          +----< Argument
                                          |
                                          +----< Objection
                                          |
                                          +----< JudicialAction
                                          |
                                          +----< Judgment

Case ----< CaseParty
Case ----< CaseIssue
Case ----< Evidence ----< EvidenceVersion
                       +----< EvidenceRuling

LegalSource ----< LegalDocument ----< LegalDocumentVersion
                                      |
                                      +----< LegalSection
                                      |       |
                                      |       +----< LegalChunk
                                      |
                                      +----< LegalCitation
                                      +----< LegalTreatment
```

Use foreign keys and database constraints for relationships that must
remain valid. Apply tenant/institution ownership and courtroom
permissions explicitly rather than relying on frontend filtering.

## 7. Courtroom state machine

A trial is governed by a versioned template. The backend owns the
current phase and allowed transitions.

Example generic phases:

``` text
CREATED
  |
  v
WAITING_FOR_PARTICIPANTS
  |
  v
CASE_REVIEW
  |
  v
OPENING
  |
  v
SUBMISSIONS
  |
  v
EVIDENCE
  |
  v
QUESTIONING
  |
  v
CLOSING
  |
  v
DELIBERATION
  |
  v
DECISION
  |
  v
ARCHIVED
```

This is a configurable example, not a universal court procedure.

### State transition contract

A command should contain:

-   Trial ID.
-   Actor ID derived from authenticated identity, not trusted from
    client payload.
-   Command type.
-   Expected state version or sequence.
-   Validated payload.
-   Idempotency key.

The domain service:

1.  Loads or locks the current trial state.
2.  Verifies membership and role.
3.  Verifies the phase and allowed action.
4.  Validates payload and references.
5.  Applies the domain transition.
6.  Persists the event and state update transactionally.
7.  Publishes the committed event.

Use optimistic concurrency or row-level locking to prevent simultaneous
commands from producing inconsistent state.

### Event model

A durable event envelope:

``` typescript
interface TrialEvent<TPayload = unknown> {
  id: string;
  trialId: string;
  sequence: number;
  type: string;
  actorId: string | null;
  occurredAt: string;
  schemaVersion: number;
  payload: TPayload;
  correlationId: string;
}
```

Events should be append-only. Corrections should be represented by new
events that supersede or annotate earlier records, not by silently
rewriting history.

Potential event types:

``` typescript
type TrialEventType =
  | "TRIAL_CREATED"
  | "MEMBER_JOINED"
  | "ROLE_ASSIGNED"
  | "TRIAL_STARTED"
  | "PHASE_CHANGED"
  | "ARGUMENT_SUBMITTED"
  | "OBJECTION_RAISED"
  | "OBJECTION_RESOLVED"
  | "EVIDENCE_SUBMITTED"
  | "EVIDENCE_STATUS_CHANGED"
  | "QUESTION_ASKED"
  | "QUESTION_ANSWERED"
  | "JUDGE_INTERVENED"
  | "JUDGMENT_PUBLISHED"
  | "TRIAL_ARCHIVED";
```

Persist the event before broadcasting it. Use an outbox pattern or
equivalent reliable publication mechanism so a process crash between
database commit and Socket.IO emission does not permanently lose an
event notification.

## 8. Real-time communication

Socket.IO is the initial transport for live courtroom updates.

### Connection flow

1.  Client connects with an authenticated session.
2.  Server verifies identity.
3.  Client requests access to a trial room.
4.  Server checks current courtroom membership and permissions.
5.  Server joins the socket to the authorized room.
6.  Client receives current state version and last sequence.
7.  Client requests missed events if its local sequence is behind.

### Client commands

``` text
trial:join
trial:argument:submit
trial:objection:raise
trial:evidence:submit
trial:question:answer
trial:intervention:request
trial:leave
```

### Server notifications

``` text
trial:state:snapshot
trial:event:committed
trial:argument:received
trial:judge:intervention
trial:phase:changed
trial:evidence:updated
trial:transcript:updated
trial:judgment:published
trial:error
```

Use acknowledgements for commands. The server must distinguish command
receipt from command acceptance and committed state change.

Do not trust a client-supplied user ID, role, phase, or courtroom
permission.

## 9. API design

REST handles resource operations; Socket.IO handles live commands and
notifications. The exact split can evolve, but each state-changing
action must pass through the same domain service.

### Proposed REST endpoints

  Method   Endpoint                                Purpose
  -------- --------------------------------------- ---------------------------
  POST     `/api/v1/auth/register`                 Register
  POST     `/api/v1/auth/login`                    Login
  GET      `/api/v1/cases`                         List authorized cases
  POST     `/api/v1/cases`                         Create case
  GET      `/api/v1/cases/:caseId`                 Case details
  POST     `/api/v1/courtrooms`                    Create courtroom
  GET      `/api/v1/courtrooms/:trialId`           Courtroom snapshot
  POST     `/api/v1/courtrooms/:trialId/join`      Join by invitation
  GET      `/api/v1/courtrooms/:trialId/events`    Paginated event history
  POST     `/api/v1/evidence/upload-intents`       Request authorized upload
  GET      `/api/v1/legal/search`                  Search legal sources
  GET      `/api/v1/legal/documents/:documentId`   Legal document
  GET      `/api/v1/trials/:trialId/judgment`      Simulated judgment
  GET      `/api/v1/trials/:trialId/report`        Learning report

Validate all request and response contracts with shared schemas. Apply
pagination, resource authorization, rate limits, and consistent error
responses.

## 10. AI orchestration

### Logical agents

  -----------------------------------------------------------------------
  Agent                   Input                   Output
  ----------------------- ----------------------- -----------------------
  Judge                   Trial state, rules,     Proposed judicial
                          arguments, verified     action
                          authorities             

  Legal researcher        Legal question and      Retrieved authority
                          jurisdiction/date       passages
                          filters                 

  Argument analyst        Party submission and    Structured analysis
                          case issues             

  Evidence analyst        Authorized exhibit and  Potential relevance and
                          case context            reliability issues

  Procedure assistant     Proposed action and     Rule check and
                          court template          explanation

  Decision writer         Complete authorized     Draft simulated
                          trial record            decision

  Learning evaluator      Party's trial           Feedback and scores
                          contributions and       
                          rubric                  
  -----------------------------------------------------------------------

These components may share an LLM provider. Separate deployment is not
required.

### Judge action contract

``` typescript
type JudicialActionType =
  | "SPEAK"
  | "ASK_QUESTION"
  | "REQUEST_AUTHORITY"
  | "REQUEST_CLARIFICATION"
  | "RULE_ON_OBJECTION"
  | "PROPOSE_PHASE_TRANSITION";

interface JudicialAction {
  type: JudicialActionType;
  message: string;
  targetParticipantId?: string;
  relatedEventIds: string[];
  citationIds: string[];
  rationaleSummary: string;
  requiresHumanResponse: boolean;
}
```

Do not expose a generic model-generated `EXECUTE_COMMAND` action. Keep
the action vocabulary narrow and typed.

### Safe action pipeline

``` text
Trial event committed
       |
       v
Build bounded judge context
       |
       v
Retrieve relevant legal sources
       |
       v
Call model with structured output schema
       |
       v
Validate schema and references
       |
       v
Validate courtroom permissions and rules
       |
       v
Commit judicial action as a new event
       |
       v
Broadcast committed event
```

A model proposal can be rejected. The backend remains authoritative.

### Context management

Do not send the entire trial transcript and entire legal corpus on every
model call.

Construct a bounded context containing:

-   Current case summary and relevant facts.
-   Selected jurisdiction and legally relevant date.
-   Court template and current phase.
-   Participant roles.
-   Recent relevant events.
-   Issues under consideration.
-   Relevant submitted and admitted evidence.
-   Verified legal authorities and exact passages.
-   Prior rulings relevant to the current question.
-   Prompt and policy version.

Use retrieval and structured summaries, but retain source event IDs so a
decision can be traced back to the full record.

### Model reliability

-   Enforce timeouts and token budgets.
-   Validate structured outputs.
-   Retry only safe transient failures.
-   Avoid duplicate judicial actions using idempotency keys.
-   Persist model and prompt metadata.
-   Record retrieval IDs and source versions.
-   Provide a safe fallback when the AI is unavailable.
-   Never invent legal citations to fill retrieval gaps.

## 11. Legal intelligence architecture

### Source connector interface

Each legal source should be implemented as an adapter with explicit
capabilities and access constraints.

``` typescript
interface LegalSourceConnector {
  sourceId: string;

  discoverChanges(
    cursor?: string
  ): Promise<SourceChangePage>;

  fetchDocument(
    externalId: string
  ): Promise<RawLegalDocument>;

  getSourceMetadata(): Promise<LegalSourceMetadata>;
}
```

A connector's metadata should describe:

-   Jurisdiction and coverage.
-   Source authority.
-   Document types.
-   Available date fields.
-   Update cadence.
-   Access method.
-   Terms and licensing review status.
-   Known coverage gaps.
-   Last successful synchronization.

Do not assume a public website has a supported API or permission for
bulk scraping. Connectors must follow source-specific terms and
technical limits.

### Ingestion pipeline

``` text
Source connector
      |
      v
Discover new/changed records
      |
      v
Fetch source document
      |
      v
Store original + checksum
      |
      v
Extract text and metadata
      |
      v
Normalize dates and authority
      |
      v
Segment into sections/paragraphs
      |
      v
Index exact text + metadata
      |
      v
Generate embeddings
      |
      v
Verify ingestion and publish version
```

Keep raw source artifacts and normalized records separately. Failed
extraction must not overwrite a previously valid version.

### Legal document version model

Important fields:

``` typescript
interface LegalDocumentVersion {
  id: string;
  documentId: string;
  sourceVersionLabel?: string;
  publicationDate?: string;
  enactmentDate?: string;
  commencementDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  retrievedAt: string;
  checksum: string;
  sourceUrl: string;
  verificationStatus:
    | "UNVERIFIED"
    | "SOURCE_MATCHED"
    | "REVIEWED"
    | "SUPERSEDED";
}
```

Dates are optional because sources do not always expose every date
reliably. Never infer a commencement or effective date solely from a
publication date.

A document's lifecycle and legal treatment may require separate records.
For example, a judgment can be distinguished, appealed, stayed,
reversed, or overruled; those relationships should not be reduced to one
simplistic `is_current` flag.

### Retrieval strategy

Use a hybrid pipeline:

1.  Enforce jurisdiction, court, date, document type, and source
    filters.
2.  Exact-match citation and statute section identifiers.
3.  Run lexical/full-text retrieval.
4.  Run semantic retrieval over eligible chunks.
5.  Merge and rank candidates.
6.  Resolve candidates to authoritative document versions.
7.  Return passages with precise locations and provenance.
8.  Verify each citation before it enters AI context.

Semantic similarity is a discovery signal, not proof of legal authority
or relevance.

### Citation object

``` typescript
interface LegalCitation {
  id: string;
  documentId: string;
  versionId: string;
  locator: {
    section?: string;
    paragraph?: string;
    page?: number;
  };
  citationText: string;
  sourceUrl: string;
  authorityType: string;
  verificationStatus: string;
}
```

A citation must resolve to an actual stored source and passage. If the
passage cannot be verified, it must be marked accordingly and must not
be presented as a verified supporting authority.

## 12. Evidence architecture

### Evidence lifecycle

``` text
UPLOAD_REQUESTED
      |
      v
UPLOADED
      |
      v
SCANNING
   /     \
  v       v
SAFE   QUARANTINED
  |
  v
SUBMITTED
  |
  v
PENDING_RULING
  |
  +----> ADMITTED
  |
  +----> DISPUTED
  |
  +----> EXCLUDED
```

The exact state transitions depend on the courtroom template. `DISPUTED`
may be a separate flag or a status depending on the final domain design.

### File security

-   Generate short-lived, scoped upload URLs.
-   Enforce file size and allowed type.
-   Verify content signatures, not only file extensions.
-   Scan files before making them available to AI processing.
-   Store private objects outside the web root.
-   Use authorization checks for every download.
-   Record checksum and file version.
-   Treat extracted text as untrusted input.
-   Keep original evidence separate from derived OCR or transcription
    output.

The AI can flag apparent inconsistencies or missing context. It cannot
establish forensic authenticity merely from file contents.

## 13. Security architecture

### Threat areas

-   Unauthorized access to private courtrooms.
-   Participant impersonation.
-   Socket room authorization bypass.
-   Cross-institution data leakage.
-   Malicious file uploads.
-   Prompt injection in evidence and case documents.
-   Fabricated legal citations.
-   Model output causing unauthorized state changes.
-   Replay or duplicate command attacks.
-   Abuse, denial of service, and cost exhaustion.
-   Exposure of sensitive case data in logs or analytics.

### Required controls

-   Secure session management.
-   Role- and resource-based authorization.
-   Server-side permission checks for every command.
-   Input validation and output encoding.
-   CSRF protection where cookie-based authentication requires it.
-   Rate limits and per-user AI budgets.
-   File scanning and private storage.
-   Secrets management and rotation.
-   Encryption in transit and appropriate encryption at rest.
-   Audit logs for sensitive actions.
-   Data retention and deletion controls.
-   Prompt-injection defenses and tool allowlists.
-   No direct LLM access to database or infrastructure tools.

### Privacy

Define data classes before beta:

-   Public legal sources.
-   Public profile information.
-   Private learning records.
-   Private courtroom proceedings.
-   Sensitive case materials.
-   Authentication secrets.

Retention, export, deletion, consent, and recording policies must be
reviewed for each launch market. Avoid using private courtroom content
for model training unless a separate, informed, lawful consent process
exists.

## 14. Reliability and event delivery

### Database transaction boundary

For a state-changing courtroom command, persist:

1.  The accepted command result.
2.  The new trial state/version.
3.  The append-only trial event.
4.  An outbox notification record.

These should be committed in one database transaction where feasible.

A worker publishes outbox notifications to Socket.IO. If publishing
fails, the worker retries. Clients can recover missed events using
sequence numbers.

### Redis role

Redis is used for:

-   Socket.IO scaling adapter if required.
-   BullMQ job coordination.
-   Cache and ephemeral coordination.
-   Short-lived rate limits.

Redis must not be the only durable record of trial state or evidence.

### Failure behavior

  -----------------------------------------------------------------------
  Failure                             Expected behavior
  ----------------------------------- -----------------------------------
  AI provider unavailable             Trial remains valid; judge shows
                                      temporary unavailable state and can
                                      resume

  Socket disconnect                   Client reconnects and requests
                                      missed events

  Duplicate command                   Idempotency prevents duplicate
                                      state changes

  Legal source unavailable            Use only previously indexed
                                      material with freshness disclosure

  Ingestion failure                   Preserve last valid version and
                                      record failed run

  File scan failure                   Keep file quarantined

  Worker crash                        Retry safely; use dead-letter
                                      handling after configured attempts

  Database unavailable                Reject state-changing actions
                                      rather than claiming success
  -----------------------------------------------------------------------

## 15. Performance and scaling

Start with one API deployment and one or more worker processes.

Scale only after measuring:

-   Concurrent active trials.
-   Events per second.
-   Average event payload size.
-   Socket connection count.
-   AI calls per trial.
-   Legal retrieval latency.
-   Document ingestion throughput.
-   Object storage bandwidth.

Potential future extraction candidates:

-   Legal ingestion workers.
-   AI inference/orchestration workers.
-   Real-time gateway.
-   Reporting and analytics.

The modular boundaries should make extraction possible, but do not split
services without an operational reason.

## 16. Observability

Use structured logs, metrics, and traces with correlation IDs.

Track:

-   Request latency and status.
-   Socket connection and event delivery metrics.
-   Trial command rejection reasons.
-   Event sequence gaps.
-   AI provider latency, errors, tokens, and cost.
-   Retrieval latency and candidate counts.
-   Citation verification failures.
-   Legal source freshness.
-   Ingestion job failures.
-   File scanning outcomes.

Do not log raw secrets, full sensitive case documents, or unnecessary
personal information.

## 17. Testing strategy

### Domain tests

-   Valid and invalid trial transitions.
-   Role and phase permissions.
-   Objection workflow.
-   Evidence status transitions.
-   Event sequence and idempotency.

### Integration tests

-   Database transactions.
-   Outbox delivery.
-   Socket room authorization.
-   Reconnection and event recovery.
-   Object storage permissions.
-   Legal source ingestion and version selection.

### AI evaluation

Create a versioned evaluation set covering:

-   Wrong jurisdiction.
-   Wrong legal date.
-   Repealed or amended provisions.
-   Fabricated case citations.
-   Distinguishing versus binding authority.
-   Conflicting judgments.
-   Unsupported legal claims.
-   Biased evaluation of parties.
-   Prompt injection in uploaded evidence.
-   Inconsistent judge actions.
-   Failure to abstain when sources are missing.

Evaluate legal retrieval separately from the language model's response
quality.

### End-to-end tests

A critical end-to-end scenario:

1.  Register two users.
2.  Create a case and courtroom.
3.  Assign opposing roles.
4.  Join both users.
5.  Start the trial.
6.  Submit arguments from each side.
7.  Trigger an AI judicial question.
8.  Submit and rule on an exhibit.
9.  Complete the hearing.
10. Generate the simulated decision.
11. Reconnect one participant and verify transcript recovery.
12. Replay the trial from persisted events.

## 18. Deployment topology

Initial deployment:

``` text
                 INTERNET
                    |
              TLS / REVERSE PROXY
                    |
          +---------+---------+
          |                   |
       WEB APP             API APP
       Next.js          Express + Socket.IO
                              |
+----------------+----------------+
              |                |                |
          MongoDB         Redis         Object Storage
                               |
                         WORKERS
                    +---------+---------+
                    |                   |
              Legal ingestion      AI / Reports
```

Use separate environments for development, staging, and production. Add
automated database backups, restore drills, health checks, resource
limits, and deployment rollback procedures before public beta.

## 19. Architecture decision records

Record major decisions in `docs/decisions/`.

Initial ADR topics:

1.  Modular monolith versus microservices.
2.  MongoDB and Mongoose selection.
3.  Socket.IO event delivery and recovery.
4.  Append-only trial event history.
5.  AI action schema and backend validation.
6.  Legal source provenance and versioning.
7.  Object storage and evidence access.
8.  Authentication and session strategy.
9.  Legal source ingestion permissions.
10. AI model provider abstraction.

Each ADR should include context, decision, alternatives, consequences,
and date.

------------------------------------------------------------------------

## 20. Non-negotiable architecture rules

1.  The backend is the authority for courtroom state.
2.  The LLM never directly changes database state.
3.  Every state-changing action is authorized and validated.
4.  Every committed trial action is auditable.
5.  Legal claims must be traceable to source records.
6.  Jurisdiction and legally relevant date are required retrieval
    context.
7.  A vector similarity score does not establish legal authority.
8.  Uploaded evidence is untrusted and is not automatically authentic or
    admissible.
9.  AI judgments are educational simulations, never binding decisions.
10. Source coverage and uncertainty must be visible to users.

**Architecture principle:** deterministic systems govern the courtroom;
AI assists with reasoning; verified sources ground legal knowledge.

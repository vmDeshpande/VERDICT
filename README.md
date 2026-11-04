# VERDICT

**AI-powered legal education and multiplayer courtroom simulation.**

> Every argument deserves a hearing.

VERDICT is a jurisdiction-aware, multiplayer courtroom simulation
platform where people can practice legal advocacy, debate real or
fictional cases, work with legal authorities, and participate in
interactive hearings moderated by an AI judicial assistant.

The platform is designed for law students, educators, legal researchers,
lawyers, and people who want to learn how legal reasoning and courtroom
procedure work.

**Important:** VERDICT is an educational and simulation product. Its
AI-generated analysis and simulated decisions are not legally binding,
do not constitute legal advice, and must not be represented as decisions
of a real court.

------------------------------------------------------------------------

## Contents

-   [Vision](#vision)
-   [Core capabilities](#core-capabilities)
-   [Courtroom modes](#courtroom-modes)
-   [How a trial works](#how-a-trial-works)
-   [Legal intelligence](#legal-intelligence)
-   [AI system](#ai-system)
-   [Technology stack](#technology-stack)
-   [Architecture overview](#architecture-overview)
-   [Project status](#project-status)
-   [Getting started](#getting-started)
-   [Configuration](#configuration)
-   [Development principles](#development-principles)
-   [Security and privacy](#security-and-privacy)
-   [Legal and product limitations](#legal-and-product-limitations)
-   [Roadmap](#roadmap)
-   [Contributing](#contributing)
-   [License](#license)

## Vision

VERDICT makes practical legal learning more accessible.

Instead of only reading cases or asking a chatbot questions,
participants enter a structured virtual courtroom. They take roles,
examine a case file, present arguments, challenge opposing submissions,
raise objections, submit exhibits, and respond to an AI judge's
questions.

The AI is not the protagonist. **Human legal reasoning is.** AI provides
procedural facilitation, legal research assistance, structured feedback,
and a transparent simulated judicial assessment.

### Product principles

1.  **Source-grounded law:** legal claims should be traceable to
    identifiable legal sources.
2.  **Jurisdiction awareness:** law from one jurisdiction must never be
    silently applied to another.
3.  **Temporal accuracy:** the system must distinguish enactment,
    publication, commencement, effective, and amendment dates.
4.  **Human advocacy:** participants control their arguments and
    decisions.
5.  **Procedural integrity:** deterministic application logic, not an
    LLM, controls permissions and trial state.
6.  **Explainability:** AI assessments should identify reasoning,
    sources, uncertainty, and limitations.
7.  **Educational safety:** simulated outcomes must be clearly separated
    from real legal advice and judicial decisions.

## Core capabilities

### Multiplayer courtroom

-   Create private or public courtrooms.
-   Invite participants using a room link or code.
-   Assign configurable courtroom roles.
-   Support spectators and classroom observers.
-   Synchronize arguments, rulings, exhibits, and transcript events in
    real time.
-   Preserve a chronological, auditable trial record.

### Interactive AI judge

-   Opens and moderates a simulated hearing.
-   Tracks the case, issues, participants, and current phase.
-   Asks parties to clarify or substantiate arguments.
-   Requests legal authority or evidentiary foundations.
-   Responds to objections according to the selected simulation rules.
-   Issues procedural directions and phase transitions through validated
    backend actions.
-   Produces a reasoned, non-binding simulated decision.

### Legal intelligence

-   Search legislation, regulations, judgments, and other permitted
    legal materials.
-   Filter by jurisdiction, court, source, date, subject, and authority
    type.
-   Retrieve passages with paragraph or section-level references.
-   Track document versions and effective dates.
-   Verify citations against stored source records.
-   Show source URLs, retrieval timestamps, and verification status.

### Case and evidence management

-   Support real-case study exercises and fictional hypotheticals.
-   Create case packets with facts, issues, parties, and legal
    materials.
-   Upload permitted documents and exhibits.
-   Distinguish submitted, admitted, disputed, excluded, and pending
    evidence.
-   Record rulings and the reasons given.
-   Keep confidential role-specific materials separate where the
    exercise requires it.

### Learning and assessment

-   Generate trial transcripts and summaries.
-   Provide individual feedback on legal accuracy, reasoning, advocacy,
    evidence use, responsiveness, and procedure.
-   Support instructor-created exercises and classroom sessions.
-   Allow replay and review of prior simulations.
-   Evaluate quality of advocacy independently from the simulated
    winner.

## Courtroom modes

VERDICT is intended to support multiple simulation formats.

  -----------------------------------------------------------------------
  Mode                                Description
  ----------------------------------- -----------------------------------
  Real-case study                     Reconstruct or debate a real case
                                      using its available record and the
                                      law applicable to the relevant
                                      period.

  Hypothetical using real law         Use fictional facts while grounding
                                      legal analysis in real, current
                                      legal authorities.

  Fully fictional exercise            Generate fictional parties, facts,
                                      witnesses, and exhibits; clearly
                                      label invented material.

  Moot court                          Practice written and oral
                                      submissions on defined legal
                                      issues.

  Appellate simulation                Focus on issues, records, standards
                                      of review, and appellate arguments.

  AI practice                         A human participant practices
                                      against an AI-controlled opposing
                                      counsel.

  Observed simulation                 Spectators or instructors watch and
                                      review a live trial.
  -----------------------------------------------------------------------

Courtroom workflows must be configurable. A criminal trial, civil
hearing, appellate argument, and moot court do not share one universal
procedure.

## How a trial works

A typical configurable trial lifecycle:

1.  A host creates a courtroom and selects jurisdiction, court template,
    case type, and simulation mode.
2.  Participants join and receive authorized case materials.
3.  The system establishes roles and permissions.
4.  The AI judge reviews the structured case context and available legal
    sources.
5.  The hearing begins and proceeds through the selected template's
    phases.
6.  Participants submit arguments, questions, objections, and evidence.
7.  The backend validates each action and records it in the event log.
8.  The AI judge may intervene, request clarification, or propose a
    ruling.
9.  The hearing concludes under the selected workflow.
10. VERDICT generates a simulated decision and separate learning
    reports.

The lifecycle is a template, not a claim that all courts follow the same
sequence.

## Legal intelligence

Initial jurisdiction targets:

-   **India:** central and state legislation, constitutional materials,
    gazette notifications, and judgments from supported courts.
-   **United States:** federal constitutional and statutory materials,
    federal regulations, federal opinions, and state law collections
    added with explicit coverage metadata.

Potential official source starting points:

### India

-   [India Code](https://www.indiacode.nic.in/)
-   [Supreme Court of India](https://www.sci.gov.in/)
-   [e-SCR](https://scr.sci.gov.in/)
-   [eCourts Judgments](https://judgments.ecourts.gov.in/)
-   [e-Gazette of India](https://egazette.gov.in/)

### United States

-   [United States Code](https://uscode.house.gov/)
-   [Electronic Code of Federal Regulations](https://www.ecfr.gov/)
-   [Congress.gov](https://www.congress.gov/)
-   [U.S. Supreme Court
    opinions](https://www.supremecourt.gov/opinions/opinions.aspx)
-   [GovInfo](https://www.govinfo.gov/app/collection/USCOURTS/)
-   [PACER](https://pacer.uscourts.gov/)

These are candidate sources, not a claim that every source provides an
open API, complete coverage, or unrestricted automated access. Each
connector must be reviewed for terms, access limits, licensing, update
cadence, and technical availability.

### Legal source requirements

Every indexed legal document should preserve, where available:

-   Jurisdiction and sub-jurisdiction.
-   Issuing authority or court.
-   Document type and title.
-   Citation and stable source identifier.
-   Official source URL.
-   Publication, enactment, commencement, and effective dates as
    distinct fields.
-   Version and amendment history.
-   Repeal, supersession, overruling, or treatment metadata where
    reliably available.
-   Retrieval and last-verified timestamps.
-   Original file checksum and ingestion provenance.

A source being present in the index does not establish that it is
current, binding, complete, or applicable. VERDICT must communicate
source coverage and uncertainty.

## AI system

The AI architecture uses specialized responsibilities orchestrated by
the backend:

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  Judge agent                         Interventions, questions,
                                      procedural directions, and
                                      simulated decision drafting

  Legal research agent                Retrieve relevant authorities and
                                      source passages

  Argument evaluator                  Assess reasoning, relevance,
                                      support, and rebuttals

  Evidence analyst                    Identify evidentiary issues and
                                      contradictions without asserting
                                      authenticity

  Procedure validator                 Check requested actions against
                                      configured rules

  Report generator                    Produce transcript summaries and
                                      learning feedback
  -----------------------------------------------------------------------

These are logical components and do not need to be separate deployed
services.

### Critical control boundary

The LLM must never directly mutate authoritative trial state. It
proposes a typed action; backend code validates permissions, phase
rules, required inputs, and citation references before committing the
action.

### Citation-grounded generation

AI-generated legal claims should be linked to retrieved source passages.
The platform should:

-   Prefer primary and official sources.
-   Preserve exact source versions used during a trial.
-   Verify that cited document and passage identifiers exist.
-   Distinguish binding, persuasive, historical, and unknown authority
    status.
-   Show when a source has not been checked recently.
-   Avoid inventing citations or silently filling gaps.
-   Abstain or qualify an answer when reliable authority is unavailable.

## Technology stack

The initial stack is intentionally a modular monolith.

  Layer                              Preferred technology
  ---------------------------------- ---------------------------------------
  Web application                    Next.js, React, TypeScript
  UI                                 Tailwind CSS, shadcn/ui
  API                                Node.js, Express, TypeScript
  Real-time transport                Socket.IO
  Primary database                   PostgreSQL
  ORM                                Prisma
  Vector retrieval                   pgvector
  Cache and transient coordination   Redis
  Background jobs                    BullMQ
  File storage                       S3-compatible object storage
  AI integration                     Provider-agnostic TypeScript adapters
  Testing                            Vitest and Playwright
  Deployment                         Docker and Linux

The stack is a design target; implementation details may evolve as the
repository is created.

## Architecture overview

``` text
                    WEB CLIENT
             Next.js / React / TypeScript
                         |
              REST API + Socket.IO
                         |
                 EXPRESS BACKEND
                         |
      +------------------+-------------------+
      |                  |                   |
 Courtroom           Case & Evidence     Legal Intelligence
 Engine              Management          Service
      |                  |                   |
      +------------------+-------------------+
                         |
                  AI ORCHESTRATOR
                         |
       +-----------------+------------------+
       |                 |                  |
    Judge Agent     Research Agent     Analysis Agents
       |                 |                  |
       +-----------------+------------------+
                         |
       +-----------------+------------------+
       |                 |                  |
   PostgreSQL          Redis           Object Storage
   + pgvector          + BullMQ        Evidence / Files
                         |
                 LEGAL SOURCE CONNECTORS
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for module boundaries, data
design, event handling, APIs, AI orchestration, security, and
operational guidance.

## Project status

**Status: Product specification and architecture planning.**

This repository should not be considered production-ready until the
implementation, tests, source coverage, security review, and AI
evaluation gates described in the roadmap are complete.

## Getting started

### Prerequisites

-   Node.js 22 or later (LTS recommended).
-   Docker and Docker Compose for local PostgreSQL.

### Install and run

``` bash
# Clone the repository
git clone <repository-url>
cd verdict

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start local PostgreSQL
docker compose up -d

# Generate Prisma Client (also runs automatically on install)
npm run db:generate

# Apply database migrations
npm run db:migrate

# Start the development server
npm run dev
# Opens http://localhost:3000
```

### Available scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server (Turbopack)     |
| `npm run build`      | Production build (webpack)               |
| `npm run start`      | Start production server                  |
| `npm run lint`       | Run ESLint                               |
| `npm run typecheck`  | Run TypeScript type check                |
| `npm run test`       | Run Vitest unit tests                    |
| `npm run db:generate`| Generate Prisma Client                   |
| `npm run db:migrate` | Apply pending migrations                 |
| `npm run db:push`    | Sync schema to database (no migration)   |
| `npm run db:reset`   | Reset database and re-apply migrations   |

### Project structure

``` text
verdict/
├── src/app/           # Next.js App Router
├── src/components/    # UI and landing page sections
├── src/lib/           # Prisma client, config, utilities
├── prisma/            # Schema and migrations
├── docs/              # Architecture and security notes
└── public/            # Static assets
```

## Configuration

Never commit secrets. The eventual `.env.example` should document
variables such as:

``` dotenv
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

DATABASE_URL=
REDIS_URL=

AUTH_SECRET=

AI_PROVIDER=
AI_API_KEY=
AI_MODEL=

OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY=
OBJECT_STORAGE_SECRET_KEY=

LEGAL_INGESTION_ENABLED=false
```

Use separate credentials and isolated data for development, staging, and
production. Provider-specific configuration should be validated at
startup.

## Development principles

-   TypeScript strict mode.
-   Explicit schemas for API requests, Socket.IO payloads, and AI
    structured outputs.
-   Server-authoritative permissions and courtroom state.
-   Append-only trial event history.
-   Idempotent handling of retried commands.
-   Database transactions for state-changing actions.
-   Versioned legal source records.
-   Tests for legal retrieval, citation verification, and jurisdiction
    boundaries.
-   Observability for AI latency, cost, errors, and retrieval quality.
-   No silent fallback from a failed legal source to unsupported model
    memory.

## Security and privacy

VERDICT may handle sensitive educational records and potentially
confidential case materials. Security is a product requirement, not a
later enhancement.

Minimum expectations:

-   Authentication and role-based access control.
-   Authorization checks on every resource and real-time action.
-   Private courtroom isolation.
-   Secure file upload, scanning, and access-controlled download.
-   Encryption in transit and appropriate encryption at rest.
-   Secrets management and rotation.
-   Rate limiting and abuse prevention.
-   Prompt-injection defenses for user-supplied documents.
-   Audit logs for access, evidence, rulings, and administrative
    actions.
-   Data retention, export, and deletion workflows.
-   Recording and transcription consent where applicable.
-   Privacy and legal review for each launch jurisdiction.

## Legal and product limitations

-   VERDICT is not a court, law firm, legal representative, or source of
    binding decisions.
-   AI-generated judgments are simulated educational outputs.
-   Legal databases may be incomplete, delayed, or subject to access
    restrictions.
-   A retrieved judgment may have been appealed, distinguished,
    overruled, or otherwise affected; treatment data must be verified
    before strong claims are made.
-   Real-case simulations must preserve the relevant historical legal
    context.
-   Fictional facts, witnesses, and evidence must be explicitly labeled
    as invented.
-   Users must have authorization to upload or share case documents.
-   The platform must not imply that an AI score predicts the result of
    an actual case.

## Roadmap

See [ROADMAP.md](./docs/ROADMAP.md) for milestones, deliverables,
dependencies, acceptance criteria, and release gates.

## Contributing

Contributions are welcome once the repository contribution workflow is
established.

Before contributing:

1.  Read `ARCHITECTURE.md` and `ROADMAP.md`.
2.  Open or select an issue describing the change.
3.  Keep modules focused and respect service boundaries.
4.  Add tests for behavior changes.
5.  Never add private case material, credentials, or copyrighted
    datasets without authorization.
6.  Document legal-source provenance and licensing for new ingestion
    connectors.
7.  Do not present generated legal analysis as verified legal advice.

## License

A license has not yet been selected. Until a license is added to the
repository, all rights remain with the relevant copyright holder and
reuse is not automatically granted.

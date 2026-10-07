# Design

## Context
See `proposal.md` for background and user requirements. The application operates as a local-first system with a Quarkus 3.40.0 (Java 25) backend and an Angular 22 + Angular Material frontend, interacting directly with local filesystem storage.

## Goals / Non-Goals

**Goals:**
- Provide sub-100ms response times for filesystem scans and month navigation.
- Ensure atomic, corruption-proof file writes for local CSV timesheets.
- Enable high-speed data entry via spreadsheet-like keyboard shortcuts and inline expanding daily notes.
- Support single-binary packaging with Quarkus serving Angular static assets directly.

**Non-Goals:**
- Docker containerization / multi-container setups.
- Multi-user authentication / authorization.
- Database systems or remote cloud synchronization.

## Decisions

### 1. Static Resource Serving in Quarkus
- **Decision**: Bundle Angular production build directly into Quarkus `src/main/resources/META-INF/resources`.
- **Rationale**: Eliminates the overhead of separate web servers or reverse proxies, running the entire application as a single Java process on port 8080.
- **Alternatives Considered**: Separate nginx container or standalone web servers.

### 2. Semicolon-Separated CSV with Dot Decimal Format
- **Decision**: Format CSV files with semicolon (`;`) delimiters, dot (`.`) decimal separators, and standard multiline quoting for notes.
- **Rationale**: Guarantees compatibility with European spreadsheet tools while allowing straightforward numerical parsing.
- **Alternatives Considered**: Comma-separated RFC 4180 format or separate companion JSON/Markdown files.

### 3. Dynamic Calculation of NetHours and Total_PT
- **Decision**: Calculate daily net hours (`Template 1`) and daily/monthly person-day sums (`Template 2`) dynamically in memory.
- **Rationale**: Prevents data drift and synchronization inconsistencies by keeping raw input values authoritative.
- **Alternatives Considered**: Persisting computed sums as redundant columns in the CSV.

### 4. Inline Expanding Textarea for Daily Notes
- **Decision**: Use an inline expanding textarea with Angular CDK autosize for multiline bulletpoint notes.
- **Rationale**: Preserves direct visual locality between daily PT allocations and documented achievements without modal context-switching.
- **Alternatives Considered**: Side-drawer editor or modal popups.

### 5. Atomic File Replacement Lifecycle
- **Decision**: Write modifications to temporary staging files (`.<filename>.tmp`) followed by atomic replace (`Files.move` with `ATOMIC_MOVE` / `REPLACE_EXISTING`).
- **Rationale**: Prevents file truncation and corruption in the event of application restarts or system sleep.
- **Alternatives Considered**: Direct in-place file overwrites.

## Risks / Trade-offs

- **[Concurrent File Modification]** → Local single-user model; atomic file write prevents partial writes.
- **[Dynamic Task Column Changes]** → Task changes for a month modify only that month's CSV header, preserving historical month files intact.
- **[Keyboard Traversal in Web UI]** → Intercept `Tab` and `Enter` in grid cells to support horizontal vs. vertical navigation workflows.

# RAG Chatbot

A Next.js **RAG (Retrieval-Augmented Generation)** chatbot over **company knowledge**. An admin drops PDFs into `knowledge/`, seeds them into PostgreSQL + pgvector, and users chat with Gemini using retrieved context — no end-user upload.

## What works today

- Chat-first UI grounded in a **pre-seeded company knowledge base**
- Admin seed workflow: put PDFs in `knowledge/` → `npm run knowledge:seed`
- Documents tagged as `system` (company KB) vs `user` (legacy upload API still exists, not used by the UI)
- Starter prompt suggestions on the empty chat screen
- Knowledge readiness badge via `GET /api/knowledge/status`
- PDF validation for seeding (`.pdf` only, max 25 MB, basic PDF signature check)
- PDF text extraction (`pdf2json`)
- Text chunking (character-based, with overlap)
- Gemini embeddings via Vercel AI SDK (`gemini-embedding-2`, 1536 dimensions) — during ingestion and query retrieval
- Vector similarity retrieval across **all ready system documents**
- RAG prompt building with natural fallback responses (`lib/prompts.ts`)
- Retrieval relevance guard before prompting the model (`services/chat.service.ts`)
- Streaming chat API and UI powered by Vercel AI SDK + Gemini (`gemini-2.5-flash`)
- Document and chunk persistence in PostgreSQL
- Document status lifecycle: `UPLOADING` → `PROCESSING` → `READY` / `FAILED`
- Dev-only test endpoints for extraction, chunking, and retrieval
- Dismissible chat toasts via Sonner

## Planned enhancements

These are **not** implemented yet:

- Document list / management UI
- Source citations in the chat UI
- Navbar and sidebar layout

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Lucide icons |
| Database | PostgreSQL 17 + pgvector (Docker) |
| ORM | Drizzle ORM + Drizzle Kit |
| AI (embeddings + chat) | Vercel AI SDK (`ai` + `@ai-sdk/google`) — `gemini-embedding-2` (1536 dims) + `gemini-2.5-flash` |
| PDF parsing | `pdf2json` |
| Notifications | Sonner |

---

## Architecture

The app follows a layered structure:

```
UI (components) → API routes → Services → Repositories → Database
```

**Knowledge seed flow (admin):**

```
Add PDF(s) to knowledge/
  → npm run knowledge:seed
  → validate each PDF
  → replace any existing system doc with the same filename
  → create documents row (source: system, status: PROCESSING)
  → extract → chunk → embed → save chunks
  → mark document READY
```

**RAG chat flow (current):**

```
User question
  → verify at least one READY system document exists
  → embed query (Gemini)
  → vector search over all READY system document chunks
  → filter weak matches by similarity threshold
  → build prompt with retrieved context
  → stream Gemini answer to the UI
```

---

## Project structure

```
rag-chatbot/
├── app/
│   ├── (dashboard)/page.tsx      # Home page (chat workspace)
│   ├── api/
│   │   ├── chat/                 # Streaming RAG chat (system KB)
│   │   ├── knowledge/status/     # Knowledge readiness check
│   │   ├── documents/upload/     # Legacy upload + ingest (not used by UI)
│   │   ├── documents/extract/    # Dev: extract text from a file path
│   │   ├── chunk-test/           # Dev: test the text chunker
│   │   ├── retrieval-test/       # Dev: test vector search
│   │   └── health/db/            # Database health check
│   ├── icon.tsx                  # App favicon (generated route)
│   ├── apple-icon.tsx            # Apple touch icon (generated route)
│   └── layout.tsx
├── components/
│   ├── chat/                     # Chat UI (streaming, prompts)
│   └── ui/                       # shadcn/ui primitives
├── knowledge/                    # Admin-provided company PDFs (seed input)
├── services/                     # Business logic (see Code tour below)
├── repositories/                 # Database access (Drizzle)
├── db/                           # Schema, client, enums
├── drizzle/                      # SQL migrations
├── lib/
│   ├── prompts.ts                # RAG prompt builder
│   ├── brand-icon.ts             # Shared flower icon markup for favicon + UI
│   ├── parse-pdf-text.ts         # Shared pdf2json text extraction helper
│   ├── runtime-storage.ts        # Detects serverless runtimes (Vercel/Lambda)
│   ├── upload-document.ts        # Client helper for legacy upload API
│   ├── validate-pdf-upload.ts    # Shared PDF validation rules
│   └── utils.ts                  # Shared utilities (cn helper)
├── types/                        # TypeScript types
├── scripts/
│   ├── drizzle-kit.cjs           # Drizzle CLI wrapper (blocks push)
│   └── seed-knowledge.ts         # Admin knowledge seed script
├── uploads/                      # Legacy local upload storage
└── docker-compose.yaml           # PostgreSQL + pgvector
```

---

## Code tour — main files and how they connect

This section explains the **implemented** seed, retrieval, and chat API pipeline.

### Layer overview

```
Components  →  API routes  →  Services  →  Repositories  →  Database
   (UI)         (HTTP)      (logic)        (SQL/Drizzle)     (Postgres)
```

| Layer | Responsibility | Talks to |
| --- | --- | --- |
| Components | User interface | API routes (fetch) |
| API routes | HTTP entry, orchestration | Services |
| Services | Business rules, processing | Other services + repositories |
| Repositories | CRUD queries | `db/client.ts` |
| `db/` | Schema + connection | PostgreSQL |

### End-to-end knowledge seed flow

```
Admin adds PDFs to knowledge/
  → npm run knowledge:seed (scripts/seed-knowledge.ts)
    → knowledge-seed.service.ts
      → validate PDF
      → replace existing system doc with same filename (if any)
      → create documents row (source: system)
      → ingestion.service.ts
        → document-processor.service.ts
        → text-chunker.service.ts
        → embedding.service.ts
        → chunk.repository.ts
      → mark READY / FAILED
```

### End-to-end chat flow

```
chat-window.tsx
  → GET /api/knowledge/status (badge + enable composer)
  → POST /api/chat { message }
    → chat.service.ts
      → document.repository.ts   (require READY system docs)
      → retrieval.service.ts
        → embedding.service.ts   (query embedding)
        → chunk.repository.ts    (vector search over system docs)
      → relevance filter on similarity scores
      → lib/prompts.ts           (build RAG prompt)
      → streamText (Gemini)      (stream answer to UI)
```

### Frontend

| File | Role |
| --- | --- |
| `app/(dashboard)/page.tsx` | Home page — centered chat workspace |
| `components/chat/chat-window.tsx` | Chat UI, starter prompts, knowledge status, streams answers from `POST /api/chat` |
| `components/chat/chat-input.tsx` | Composer with message input and send button |
| `components/chat/chat-message.tsx` | User/assistant message bubbles |
| `components/chat/chat-empty-icon.tsx` | Empty-state icon |
| `app/layout.tsx` | Root layout, metadata, and Sonner toaster |
| `app/icon.tsx` | Favicon |
| `app/apple-icon.tsx` | Apple touch icon |

### API routes

| File | Role |
| --- | --- |
| `app/api/chat/route.ts` | Chat API — retrieves relevant chunks from the system knowledge base and streams a Gemini answer |
| `app/api/knowledge/status/route.ts` | Returns `{ ready, documentCount }` for READY system documents |
| `app/api/documents/upload/route.ts` | Legacy upload endpoint (not used by the UI). Still available for tooling. |
| `app/api/documents/extract/route.ts` | Dev only — extract text from a file path |
| `app/api/chunk-test/route.ts` | Dev only — chunk raw text |
| `app/api/retrieval-test/route.ts` | Dev only — embeds a query and returns the top matching chunks |
| `app/api/health/db/route.ts` | DB connectivity check |

### Services (business logic)

| File | Role |
| --- | --- |
| `services/knowledge-seed.service.ts` | Admin seed: scan `knowledge/`, create/replace system docs, run ingestion |
| `services/document.service.ts` | Legacy upload path — validates PDF, stores file, creates `user` document rows |
| `services/ingestion.service.ts` | **Pipeline orchestrator** — extract → chunk → embed → save → set READY/FAILED |
| `services/document-processor.service.ts` | Extracts text via `pdf2json` from an in-memory buffer or a file path |
| `services/text-chunker.service.ts` | Splits text into chunks (1000 chars, 200 overlap, word-boundary aware) |
| `services/embedding.service.ts` | Gemini embeddings via Vercel AI SDK (`gemini-embedding-2`, 1536 dimensions) |
| `services/retrieval.service.ts` | Embeds the user query and performs vector similarity search |
| `services/chat.service.ts` | Verifies system KB readiness, retrieves sources, filters weak matches, streams the answer |

### Supporting modules

| File | Role |
| --- | --- |
| `lib/prompts.ts` | Builds the RAG prompt from the question and retrieved chunks |
| `lib/parse-pdf-text.ts` | Converts pdf2json output into plain text |
| `lib/runtime-storage.ts` | Detects Vercel/Lambda for legacy upload storage handling |
| `lib/upload-document.ts` | Client helper for the legacy upload API |
| `lib/validate-pdf-upload.ts` | Shared PDF validation rules |
| `lib/utils.ts` | `cn()` helper for Tailwind class merging |

### Repositories (database access)

| File | Role |
| --- | --- |
| `repositories/document.repository.ts` | `create`, `findById`, `findByFilenameAndSource`, `countReadyBySource`, `deleteById`, `updateStatus` |
| `repositories/chunk.repository.ts` | `createMany`, `findByDocumentId`, `findSimilar` (optional `documentId` / `source` filters) |

### Database layer

| File | Role |
| --- | --- |
| `db/schema.ts` | Table definitions: `documents`, `document_chunks` (with `vector(1536)` embedding column) |
| `db/enums.ts` | `document_status` + `document_source` (`system` \| `user`) |
| `db/client.ts` | Drizzle + Postgres client (uses `DATABASE_URL`) |
| `db/index.ts` | Re-exports client, schema, enums |
| `drizzle/` | Versioned SQL migrations — apply with `npm run db:migrate` |

---

## Prerequisites

- **Node.js** 20+
- **npm** (or pnpm / yarn / bun)
- **Docker Desktop** (or another Docker runtime) for PostgreSQL

---

## Getting started

### 1. Clone and install

```bash
cd rag-chatbot
npm install
```

### 2. Environment variables

Copy the example env file and fill in your Gemini API key:

```bash
cp .env.example .env
```

`.env.example` contains:

```env
DATABASE_URL=postgres://postgres:12345@localhost:5433/rag_db
GEMINI_API_KEY=your_gemini_api_key_here
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Default matches `docker-compose.yaml` (port `5433`, db `rag_db`). |
| `GEMINI_API_KEY` | Gemini API key. Used for embeddings (ingestion + retrieval) and chat answer generation. |

### 3. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 17 with the pgvector extension image on port **5433**.

Verify the container is running:

```bash
docker compose ps
```

### 4. Initialize the database

**If you see `database "rag_db" does not exist`**, the Docker volume may have been created before `POSTGRES_DB` was set. Either recreate the volume or create the database manually:

```bash
# Option A: fresh start (deletes existing DB data)
docker compose down -v
docker compose up -d

# Option B: create the database in the running container
docker exec -it rag-postgres psql -U postgres -c "CREATE DATABASE rag_db;"
```

Enable the pgvector extension (required before migrations):

```bash
docker exec -it rag-postgres psql -U postgres -d rag_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Apply schema migrations:

```bash
npm run db:migrate
```

> **Do not use `drizzle-kit push`.** This project uses versioned SQL migrations only.
> After changing files in `db/`, run `npm run db:generate` then `npm run db:migrate`.

Confirm the database is reachable:

```bash
curl http://localhost:3000/api/health/db
```

Or open Drizzle Studio:

```bash
npm run db:studio
```

### 5. Seed company knowledge

1. Copy one or more company/product PDFs into `knowledge/`.
2. Run:

```bash
npm run knowledge:seed
```

This validates each PDF, replaces any existing **system** document with the same filename, then runs the full extract → chunk → embed pipeline.

3. Confirm readiness:

```bash
curl http://localhost:3000/api/knowledge/status
```

Expected: `{ "ready": true, "documentCount": N }`.

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and ask questions. No user upload is required.

### Using the UI

1. Wait for the header badge to show **Ready** (knowledge was seeded).
2. Ask a question or use one of the starter prompts.
3. Answers are retrieved from all READY system documents in the knowledge base.

### Updating knowledge later

1. Add, replace, or remove PDFs in `knowledge/`.
2. Run `npm run knowledge:seed` again.
3. Files with the same filename replace the previous system document and its chunks.

---

## Deploying to Vercel

This app works on Vercel with a hosted PostgreSQL database that supports pgvector (for example, Neon).

### Optional: Neon + Cursor setup wizard

If you use Cursor and want AI-assisted Neon setup (OAuth login, MCP server, agent skills, and help writing `DATABASE_URL` to `.env`), run this once from the project root:

```bash
npx neonctl@latest init
```

This is **optional**. It does not replace the required steps below — you still need to enable pgvector, run migrations, and set environment variables on Vercel.

### 1. Database setup

1. Create a Neon project and copy the connection string.
2. Enable pgvector on the database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Apply migrations from your machine against the production database:

```bash
DATABASE_URL="your_neon_connection_string" npm run db:migrate
```

### 2. Vercel environment variables

Set these in the Vercel project settings:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `GEMINI_API_KEY` | Gemini API key for embeddings and chat |

Vercel sets `VERCEL=1` automatically. The legacy upload API uses that to skip local disk writes. **Company knowledge seeding should be run from your machine (or CI) against the production database** before users chat — Vercel’s read-only filesystem is not meant for writing into `knowledge/` at runtime.

### 3. Seeding knowledge for production

1. Keep approved PDFs in `knowledge/` (or a CI checkout of that folder).
2. Point `DATABASE_URL` and `GEMINI_API_KEY` at production values.
3. Run:

```bash
DATABASE_URL="your_neon_connection_string" GEMINI_API_KEY="..." npm run knowledge:seed
```

Chunks and embeddings are stored in PostgreSQL. The chat UI only needs those rows — not the original PDF files on the server.

### 4. Timeouts

Large PDFs can take time to parse, chunk, and embed during `knowledge:seed`. Prefer seeding offline/CI rather than inside a short-lived serverless request.

---

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/chat` | JSON body: `{ "message": "...", "limit?": number }`. Streams the assistant answer as plain text from the system knowledge base. |
| `GET` | `/api/knowledge/status` | Returns `{ "ready": boolean, "documentCount": number }` for READY system documents. |
| `POST` | `/api/documents/upload` | Legacy. Upload a PDF (`multipart/form-data`, field: `file`). Not used by the chat UI. |
| `POST` | `/api/documents/extract` | Dev only. JSON body: `{ "filePath": "/absolute/path/to/file.pdf" }`. Returns extracted text. |
| `POST` | `/api/chunk-test` | Dev only. JSON body: `{ "text": "..." }`. Returns text chunks. |
| `POST` | `/api/retrieval-test` | Dev only. JSON body: `{ "query": "...", "limit?": number, "documentId?": "uuid" }`. Returns matching chunks. |
| `GET` | `/api/health/db` | Returns database connection info (`current_database`, `current_user`, `version`). |

### Chat response

On success, `POST /api/chat` returns a **plain-text stream** (not JSON). Errors return JSON with `{ "message": "..." }`. If no READY system documents exist, the API returns **400**.

---

## Database schema

### `documents`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `title` | text | Derived from filename |
| `filename` | text | Original upload name |
| `mime_type` | text | Must be `application/pdf` |
| `status` | enum | `UPLOADING`, `PROCESSING`, `READY`, `FAILED` |
| `source` | enum | `system` (company KB) or `user` (legacy upload). Default `user`. |
| `storage_path` | text | Seeded docs: path under `knowledge/`. Legacy uploads: `uploads/` or `memory://...` |
| `created_at` / `updated_at` | timestamp | Auto-managed |

### `document_chunks`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | Primary key |
| `document_id` | uuid | FK → `documents.id` (cascade delete) |
| `chunk_index` | integer | Order within the document |
| `page_number` | integer | Optional (not populated yet) |
| `content` | text | Chunk text |
| `embedding` | vector(1536) | Gemini `gemini-embedding-2` output stored at 1536 dimensions |
| `created_at` | timestamp | Auto-managed |

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate a new SQL migration after schema changes in `db/` |
| `npm run db:migrate` | Apply pending migrations to the database |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |
| `npm run knowledge:seed` | Ingest all PDFs from `knowledge/` as system documents |

`drizzle-kit push` is **disabled**. Use `db:generate` + `db:migrate` instead.

---

## Coding conventions

- **Path alias:** `@/*` maps to the project root
- **Layers:** API routes call services; services call repositories
- **Services / repositories:** class-based with singleton exports (e.g. `documentService`, `chunkRepository`)
- **File naming:** `kebab-case` for files and folders
- **DB columns:** `snake_case` in PostgreSQL, `camelCase` in TypeScript via Drizzle

When adding features, follow the existing service → repository pattern and keep API contracts stable unless intentionally changing them.

---

## Troubleshooting

### `database "rag_db" does not exist`

The Postgres container is running but the database was never created. See [Initialize the database](#4-initialize-the-database) above.

### `type "vector" does not exist`

Run the pgvector extension command:

```bash
docker exec -it rag-postgres psql -U postgres -d rag_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Seed fails because knowledge folder is empty

Add at least one `.pdf` file to `knowledge/`, then run `npm run knowledge:seed`.

### Chat says knowledge is not ready

1. Confirm PDFs exist in `knowledge/`
2. Run `npm run knowledge:seed`
3. Check `GET /api/knowledge/status`
4. Confirm migrations include `document_source` (`npm run db:migrate`)

### Only PDF files are accepted

Seed validation is limited to `.pdf` files with a maximum size of **25 MB**.

### Chat answers come from the company knowledge base

Retrieval searches all READY `source = system` documents. Legacy `user` uploads (if any) are ignored by the chat UI.

### `uploads/` folder (legacy local uploads)

Only used by the legacy `/api/documents/upload` path. Company knowledge lives in `knowledge/` and is indexed via `npm run knowledge:seed`.

---

## Development notes

- The home page at `app/(dashboard)/page.tsx` renders a single centered chat workspace.
- End users do not upload PDFs. Admins seed `knowledge/` with `npm run knowledge:seed`.
- `embedding.service.ts` and `chat.service.ts` both use Vercel AI SDK (`ai` + `@ai-sdk/google`).
- Chunking defaults: **1000 characters** per chunk, **200 character** overlap, with word-boundary awareness.
- Retrieval uses a similarity threshold before building the chat prompt to reduce weak/generic answers.
- Dev test routes (`/api/chunk-test`, `/api/documents/extract`, `/api/retrieval-test`) are for local debugging only — not used by the UI.
- See [Code tour](#code-tour--main-files-and-how-they-connect) for a full walkthrough of how files connect.

---

## License

Private project.

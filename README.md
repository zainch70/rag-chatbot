# RAG Chatbot

A Next.js **RAG (Retrieval-Augmented Generation)** chatbot over your own PDF documents. Upload PDFs, extract and chunk their text, store embeddings in PostgreSQL with pgvector, and chat with Gemini using retrieved context.

## What works today

- PDF upload via the web UI
- Local file storage in `uploads/`
- PDF text extraction (`pdf2json`)
- Text chunking (character-based, with overlap)
- Gemini embeddings via Vercel AI SDK (`gemini-embedding-2`, 1536 dimensions) — during ingestion and query retrieval
- Vector similarity retrieval over stored chunks
- RAG prompt building from retrieved chunks (`lib/prompts.ts`)
- Streaming chat API and UI powered by Vercel AI SDK + Gemini (`gemini-2.5-flash`)
- Document and chunk persistence in PostgreSQL
- Document status lifecycle: `UPLOADING` → `PROCESSING` → `READY` / `FAILED`
- Dev-only test endpoints for extraction, chunking, and retrieval

## Planned enhancements

These are **not** implemented yet:

- Document list / management UI
- Navbar and sidebar layout
- Document picker in chat (the API supports `documentId`, but the UI does not send it yet)
- Source citations in the chat UI

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

**Ingestion flow (current):**

```
Upload PDF
  → save file to uploads/
  → create document record (status: PROCESSING)
  → extract text from PDF
  → split text into chunks
  → generate embeddings for each chunk
  → save chunks + embeddings to document_chunks
  → mark document READY
```

**RAG chat flow (current):**

```
User question
  → embed query (Gemini)
  → vector search over document_chunks
  → build prompt with retrieved context
  → stream Gemini answer to the UI
```

---

## Project structure

```
rag-chatbot/
├── app/
│   ├── (dashboard)/page.tsx      # Home page (upload + chat)
│   ├── api/
│   │   ├── chat/                 # Streaming RAG chat
│   │   ├── documents/upload/     # Upload + ingest endpoint
│   │   ├── documents/extract/    # Dev: extract text from a file path
│   │   ├── chunk-test/           # Dev: test the text chunker
│   │   ├── retrieval-test/       # Dev: test vector search
│   │   └── health/db/            # Database health check
│   └── layout.tsx
├── components/
│   ├── upload/upload-form.tsx    # Upload UI
│   ├── chat/                     # Chat UI (streaming)
│   └── ui/                       # shadcn/ui primitives
├── services/                     # Business logic (see Code tour below)
├── repositories/                 # Database access (Drizzle)
├── db/                           # Schema, client, enums
├── drizzle/                      # SQL migrations
├── lib/
│   ├── prompts.ts                # RAG prompt builder
│   └── utils.ts                  # Shared utilities (cn helper)
├── types/                        # TypeScript types
├── scripts/drizzle-kit.cjs       # Drizzle CLI wrapper (blocks push)
├── uploads/                      # Stored PDF files (local)
└── docker-compose.yaml           # PostgreSQL + pgvector
```

---

## Code tour — main files and how they connect

This section explains the **implemented** ingestion, retrieval, and chat API pipeline. Read it top-to-bottom to follow one PDF upload from UI to database, then a query through retrieval into Gemini answer generation.

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

### End-to-end upload flow

```
upload-form.tsx
  → POST /api/documents/upload
    → document.service.ts        (save file + create document row)
    → ingestion.service.ts       (orchestrate processing)
      → document-processor.service.ts  (PDF → text)
      → text-chunker.service.ts        (text → chunks)
      → embedding.service.ts           (chunks → vectors)
      → chunk.repository.ts            (save chunks)
    → document.service.ts        (mark READY or FAILED)
```

### End-to-end chat flow

```
chat-window.tsx
  → POST /api/chat
    → chat.service.ts
      → retrieval.service.ts
        → embedding.service.ts   (query embedding)
        → chunk.repository.ts    (vector search)
      → lib/prompts.ts           (build RAG prompt)
      → streamText (Gemini)      (stream answer to UI)
```

### Frontend

| File | Role |
| --- | --- |
| `app/(dashboard)/page.tsx` | Home page — upload form and chat side by side |
| `components/upload/upload-form.tsx` | File picker, calls `POST /api/documents/upload`, shows loading + toasts |
| `components/chat/chat-window.tsx` | Chat UI — streams answers from `POST /api/chat` |
| `components/chat/chat-input.tsx` | Message input and send button |
| `components/chat/chat-message.tsx` | User/assistant message bubbles |
| `app/layout.tsx` | Root layout and Sonner toaster |

### API routes

| File | Role |
| --- | --- |
| `app/api/documents/upload/route.ts` | **Main endpoint.** Receives PDF, calls `documentService.upload()` then `ingestionService.process()` |
| `app/api/documents/extract/route.ts` | Dev only — extract text from a file path (tests `document-processor.service`) |
| `app/api/chunk-test/route.ts` | Dev only — chunk raw text (tests `text-chunker.service`) |
| `app/api/retrieval-test/route.ts` | Dev only — embeds a query and returns the top matching chunks |
| `app/api/chat/route.ts` | Chat API — retrieves relevant chunks, builds a prompt, and streams a Gemini answer |
| `app/api/health/db/route.ts` | DB connectivity check |

### Services (business logic)

| File | Role |
| --- | --- |
| `services/document.service.ts` | Validates PDF, saves to `uploads/{id}.pdf`, creates `documents` row, updates status |
| `services/ingestion.service.ts` | **Pipeline orchestrator** — extract → chunk → save → set READY/FAILED |
| `services/document-processor.service.ts` | Reads PDF from disk via `pdf2json`, returns plain text |
| `services/text-chunker.service.ts` | Splits text into chunks (1000 chars, 200 overlap, word-boundary aware) |
| `services/embedding.service.ts` | Gemini embeddings via Vercel AI SDK (`gemini-embedding-2`, 1536 dimensions) — used during ingestion and retrieval |
| `services/retrieval.service.ts` | Embeds the user query and performs vector similarity search over stored chunks |
| `services/chat.service.ts` | Retrieves sources, builds the RAG prompt, and streams the answer with Vercel AI SDK |

### Supporting modules

| File | Role |
| --- | --- |
| `lib/prompts.ts` | Builds the RAG system/user prompt from the question and retrieved chunks |
| `lib/utils.ts` | `cn()` helper for Tailwind class merging |

### Repositories (database access)

| File | Role |
| --- | --- |
| `repositories/document.repository.ts` | `create`, `findById`, `updateStatus` on `documents` |
| `repositories/chunk.repository.ts` | `createMany`, `findByDocumentId`, `findSimilar` on `document_chunks` |

### Database layer

| File | Role |
| --- | --- |
| `db/schema.ts` | Table definitions: `documents`, `document_chunks` (with `vector(1536)` embedding column) |
| `db/enums.ts` | `document_status` enum: `UPLOADING`, `PROCESSING`, `READY`, `FAILED` |
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

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a PDF, then ask questions in the chat panel on the right.

---

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/documents/upload` | Upload a PDF (`multipart/form-data`, field: `file`). Runs the full ingest pipeline. |
| `POST` | `/api/documents/extract` | Dev only. JSON body: `{ "filePath": "/absolute/path/to/file.pdf" }`. Returns extracted text. |
| `POST` | `/api/chunk-test` | Dev only. JSON body: `{ "text": "..." }`. Returns text chunks. |
| `POST` | `/api/retrieval-test` | Dev only. JSON body: `{ "query": "...", "limit?": number, "documentId?": "uuid" }`. Returns matching chunks. |
| `POST` | `/api/chat` | JSON body: `{ "message": "...", "documentId?": "uuid", "limit?": number }`. Streams the assistant answer as plain text. |
| `GET` | `/api/health/db` | Returns database connection info (`current_database`, `current_user`, `version`). |

### Upload response

```json
{
  "documentId": "uuid",
  "status": "READY"
}
```

On failure, the API returns `{ "message": "..." }` with an appropriate HTTP status.

### Chat response

On success, `POST /api/chat` returns a **plain-text stream** (not JSON). Errors return JSON with `{ "message": "..." }`.

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
| `storage_path` | text | Absolute path to file in `uploads/` |
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

### Upload fails with a database error

1. Confirm Docker is running: `docker compose ps`
2. Confirm `.env` `DATABASE_URL` matches `docker-compose.yaml` (port `5433`, password `12345`)
3. Run migrations: `npm run db:migrate`
4. Hit the health endpoint: `GET /api/health/db`

### Only PDF files are accepted

Upload validation is intentionally limited to `application/pdf`. Other formats are not supported yet.

### `uploads/` folder

PDFs are stored locally at `uploads/{document-id}.pdf`. This folder is created automatically on first upload. Do not commit uploaded files to git.

---

## Development notes

- The home page at `app/(dashboard)/page.tsx` renders upload and chat side by side.
- `embedding.service.ts` and `chat.service.ts` both use Vercel AI SDK (`ai` + `@ai-sdk/google`).
- Chunking defaults: **1000 characters** per chunk, **200 character** overlap, with word-boundary awareness.
- Dev test routes (`/api/chunk-test`, `/api/documents/extract`, `/api/retrieval-test`) are for local debugging only — not used by the UI.
- See [Code tour](#code-tour--main-files-and-how-they-connect) for a full walkthrough of how files connect.

---

## License

Private project.

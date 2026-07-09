# RAG Chatbot

A Next.js **RAG (Retrieval-Augmented Generation)** chatbot over your own PDF documents. Upload PDFs, extract and chunk their text, store embeddings in PostgreSQL with pgvector, and chat with Gemini using retrieved context.

## What works today

- Chat-first UI with PDF upload via a `+` button in the composer (ChatGPT-style)
- One active PDF at a time — chat is scoped to the uploaded document via `documentId`
- Starter prompt suggestions on the empty chat screen
- Custom replace-document dialog when switching PDFs
- PDF upload validation (`.pdf` only, max 25 MB, basic PDF signature check)
- Local file storage in `uploads/` during development; in-memory processing on Vercel (no writable disk)
- PDF text extraction (`pdf2json`)
- Text chunking (character-based, with overlap)
- Gemini embeddings via Vercel AI SDK (`gemini-embedding-2`, 1536 dimensions) — during ingestion and query retrieval
- Vector similarity retrieval over stored chunks for the active document only
- RAG prompt building with natural fallback responses (`lib/prompts.ts`)
- Retrieval relevance guard before prompting the model (`services/chat.service.ts`)
- Streaming chat API and UI powered by Vercel AI SDK + Gemini (`gemini-2.5-flash`)
- Document and chunk persistence in PostgreSQL
- Document status lifecycle: `UPLOADING` → `PROCESSING` → `READY` / `FAILED`
- Dev-only test endpoints for extraction, chunking, and retrieval
- Dismissible upload/chat toasts via Sonner

## Planned enhancements

These are **not** implemented yet:

- Document list / management UI
- Multi-document picker (switch between previously uploaded PDFs without re-uploading)
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

**Ingestion flow (current):**

```
Upload PDF
  → validate file (type, size, PDF signature)
  → store PDF:
      • local dev: save to uploads/{id}.pdf
      • Vercel/serverless: keep in server memory only (storage_path: memory://...)
  → create document record (status: PROCESSING)
  → extract text from PDF (buffer or disk path)
  → split text into chunks
  → generate embeddings for each chunk
  → save chunks + embeddings to document_chunks
  → mark document READY
```

On Vercel, the original PDF is **not** persisted to disk. Only document metadata and chunks/embeddings remain in PostgreSQL. That is enough for RAG chat, but not for re-downloading or re-processing the raw PDF later without uploading again.

**RAG chat flow (current):**

```
User question + active documentId
  → verify document exists and is READY
  → embed query (Gemini)
  → vector search over that document's chunks only
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
│   │   ├── chat/                 # Streaming RAG chat
│   │   ├── documents/upload/     # Upload + ingest endpoint
│   │   ├── documents/extract/    # Dev: extract text from a file path
│   │   ├── chunk-test/           # Dev: test the text chunker
│   │   ├── retrieval-test/       # Dev: test vector search
│   │   └── health/db/            # Database health check
│   ├── icon.tsx                  # App favicon (generated route)
│   ├── apple-icon.tsx            # Apple touch icon (generated route)
│   └── layout.tsx
├── components/
│   ├── chat/                     # Chat UI (streaming, upload, prompts)
│   └── ui/                       # shadcn/ui primitives
├── services/                     # Business logic (see Code tour below)
├── repositories/                 # Database access (Drizzle)
├── db/                           # Schema, client, enums
├── drizzle/                      # SQL migrations
├── lib/
│   ├── prompts.ts                # RAG prompt builder
│   ├── brand-icon.ts             # Shared flower icon markup for favicon + UI
│   ├── parse-pdf-text.ts         # Shared pdf2json text extraction helper
│   ├── runtime-storage.ts        # Detects serverless runtimes (Vercel/Lambda)
│   ├── upload-document.ts        # Client upload helper
│   ├── validate-pdf-upload.ts    # Shared PDF validation rules
│   └── utils.ts                  # Shared utilities (cn helper)
├── types/                        # TypeScript types
├── scripts/drizzle-kit.cjs       # Drizzle CLI wrapper (blocks push)
├── uploads/                      # Stored PDF files (local dev only)
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
chat-input.tsx (+ button)
  → validate PDF client-side (lib/validate-pdf-upload.ts)
  → POST /api/documents/upload (lib/upload-document.ts)
    → document.service.ts        (validate + save locally or keep in memory + create document row)
    → ingestion.service.ts       (orchestrate processing)
      → document-processor.service.ts  (PDF buffer or file path → text)
      → text-chunker.service.ts        (text → chunks)
      → embedding.service.ts           (chunks → vectors)
      → chunk.repository.ts            (save chunks)
    → document.service.ts        (mark READY or FAILED)
  → chat-window.tsx stores active documentId + filename
```

If a PDF is already active, the UI shows a custom replace dialog before switching documents and clearing the current chat.

### End-to-end chat flow

```
chat-window.tsx
  → POST /api/chat { message, documentId }
    → chat.service.ts
      → document.repository.ts   (verify document is READY)
      → retrieval.service.ts
        → embedding.service.ts   (query embedding)
        → chunk.repository.ts    (vector search for active document only)
      → relevance filter on similarity scores
      → lib/prompts.ts           (build RAG prompt)
      → streamText (Gemini)      (stream answer to UI)
```

### Frontend

| File | Role |
| --- | --- |
| `app/(dashboard)/page.tsx` | Home page — centered chat workspace |
| `components/chat/chat-window.tsx` | Chat UI, starter prompts, active document state, streams answers from `POST /api/chat` |
| `components/chat/chat-input.tsx` | Composer with `+` upload, message input, and send button |
| `components/chat/replace-document-dialog.tsx` | Custom confirmation when replacing the active PDF |
| `components/chat/chat-message.tsx` | User/assistant message bubbles |
| `components/chat/chat-empty-icon.tsx` | Empty-state icon |
| `app/layout.tsx` | Root layout, metadata, and Sonner toaster |
| `app/icon.tsx` | Favicon |
| `app/apple-icon.tsx` | Apple touch icon |

### API routes

| File | Role |
| --- | --- |
| `app/api/documents/upload/route.ts` | **Main endpoint.** Receives PDF, calls `documentService.upload()` then `ingestionService.process()`. Uses Node.js runtime with `maxDuration = 60` for serverless ingestion. |
| `app/api/documents/extract/route.ts` | Dev only — extract text from a file path (tests `document-processor.service`) |
| `app/api/chunk-test/route.ts` | Dev only — chunk raw text (tests `text-chunker.service`) |
| `app/api/retrieval-test/route.ts` | Dev only — embeds a query and returns the top matching chunks |
| `app/api/chat/route.ts` | Chat API — requires `documentId`, retrieves relevant chunks for that document, builds a prompt, and streams a Gemini answer |
| `app/api/health/db/route.ts` | DB connectivity check |

### Services (business logic)

| File | Role |
| --- | --- |
| `services/document.service.ts` | Validates PDF, saves to `uploads/{id}.pdf` locally or uses `memory://...` on serverless, creates `documents` row, updates status |
| `services/ingestion.service.ts` | **Pipeline orchestrator** — extract from buffer or disk → chunk → save → set READY/FAILED |
| `services/document-processor.service.ts` | Extracts text via `pdf2json` from an in-memory buffer or a file path |
| `services/text-chunker.service.ts` | Splits text into chunks (1000 chars, 200 overlap, word-boundary aware) |
| `services/embedding.service.ts` | Gemini embeddings via Vercel AI SDK (`gemini-embedding-2`, 1536 dimensions) — used during ingestion and retrieval |
| `services/retrieval.service.ts` | Embeds the user query and performs vector similarity search over stored chunks |
| `services/chat.service.ts` | Verifies active document, retrieves sources, filters weak matches, builds the RAG prompt, and streams the answer with Vercel AI SDK |

### Supporting modules

| File | Role |
| --- | --- |
| `lib/prompts.ts` | Builds the RAG system/user prompt from the question and retrieved chunks |
| `lib/parse-pdf-text.ts` | Converts pdf2json output into plain text |
| `lib/runtime-storage.ts` | Detects Vercel/Lambda and chooses local disk vs in-memory upload handling |
| `lib/upload-document.ts` | Client helper for `POST /api/documents/upload` |
| `lib/validate-pdf-upload.ts` | Shared PDF validation rules used by client and server |
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

Open [http://localhost:3000](http://localhost:3000), tap `+` to upload a PDF, then ask questions in the chat panel.

### Using the UI

1. Tap the `+` button in the chat composer and choose a PDF.
2. Wait for the upload and ingestion to finish — the active document badge appears when ready.
3. Ask a question or use one of the starter prompts.
4. To switch PDFs, tap `+` again and confirm in the replace dialog. Only one PDF is active at a time, and the chat resets for the new document.

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

Vercel sets `VERCEL=1` automatically. The app uses that to skip local disk writes during upload.

### 3. File storage on serverless

Vercel serverless functions have a **read-only filesystem**. The app does not write to `/var/task/uploads`.

Instead, on Vercel:

- The uploaded PDF stays in the function's memory for the duration of the upload request
- Text is extracted from that in-memory buffer
- Chunks and embeddings are saved to PostgreSQL
- The raw PDF is discarded when the request ends

This is enough for RAG chat. If you later need durable PDF storage or re-download support, add object storage such as Vercel Blob or S3.

### 4. Timeouts

Large PDFs can take time to parse, chunk, and embed. The upload route sets `maxDuration = 60` seconds. On Vercel Hobby, function limits may still be lower than Pro, so very large documents may time out during ingestion.

---

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/documents/upload` | Upload a PDF (`multipart/form-data`, field: `file`). Validates file type/size/signature, then runs the full ingest pipeline. |
| `POST` | `/api/documents/extract` | Dev only. JSON body: `{ "filePath": "/absolute/path/to/file.pdf" }`. Returns extracted text. |
| `POST` | `/api/chunk-test` | Dev only. JSON body: `{ "text": "..." }`. Returns text chunks. |
| `POST` | `/api/retrieval-test` | Dev only. JSON body: `{ "query": "...", "limit?": number, "documentId?": "uuid" }`. Returns matching chunks. |
| `POST` | `/api/chat` | JSON body: `{ "message": "...", "documentId": "uuid", "limit?": number }`. Requires `documentId`. Streams the assistant answer as plain text. |
| `GET` | `/api/health/db` | Returns database connection info (`current_database`, `current_user`, `version`). |

### Upload response

```json
{
  "documentId": "uuid",
  "status": "READY"
}
```

On failure, the API returns `{ "message": "..." }` with an appropriate HTTP status. Validation errors (invalid type, empty file, file too large, invalid PDF signature) return **400**.

### Chat response

On success, `POST /api/chat` returns a **plain-text stream** (not JSON). Errors return JSON with `{ "message": "..." }`. Missing `documentId`, unknown documents, and documents still processing return **400**.

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
| `storage_path` | text | Local dev: path in `uploads/`. Vercel: `memory://{id}.pdf` (marker only; file is not stored on disk) |
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

Upload validation is limited to `.pdf` files with a maximum size of **25 MB**. The client and server both check file extension, MIME type, and a basic `%PDF` file signature.

### Chat answers come from the active PDF only

The UI tracks one active `documentId` at a time. Chat requests only retrieve chunks from that document, so answers do not mix in older PDFs already stored in the database.

### `uploads/` folder (local dev only)

On your machine, PDFs are stored at `uploads/{document-id}.pdf`. This folder is created automatically on first upload. Do not commit uploaded files to git.

On Vercel, this folder is not used.

### `ENOENT: no such file or directory, mkdir '/var/task/uploads'`

This means the app tried to write uploads to disk on Vercel. Deploy a version that uses `lib/runtime-storage.ts` and in-memory upload handling in `services/document.service.ts`. Vercel must have `VERCEL=1` set (automatic on Vercel deployments).

### Upload succeeds locally but times out on Vercel

Ingestion runs inside the upload request. Try a smaller PDF first, upgrade the Vercel plan for longer function duration, or move ingestion to a background job later.

---

## Development notes

- The home page at `app/(dashboard)/page.tsx` renders a single centered chat workspace.
- PDF upload happens from the `+` button in `components/chat/chat-input.tsx`.
- `embedding.service.ts` and `chat.service.ts` both use Vercel AI SDK (`ai` + `@ai-sdk/google`).
- Chunking defaults: **1000 characters** per chunk, **200 character** overlap, with word-boundary awareness.
- Retrieval uses a similarity threshold before building the chat prompt to reduce weak/generic answers.
- Dev test routes (`/api/chunk-test`, `/api/documents/extract`, `/api/retrieval-test`) are for local debugging only — not used by the UI.
- See [Code tour](#code-tour--main-files-and-how-they-connect) for a full walkthrough of how files connect.

---

## License

Private project.

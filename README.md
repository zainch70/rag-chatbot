# RAG Chatbot

A Next.js application for building a **Retrieval-Augmented Generation (RAG)** chatbot over your own PDF documents. Upload PDFs, extract and chunk their text, store the chunks in PostgreSQL with pgvector, and (planned) chat with an LLM using retrieved context.

## What works today

- PDF upload via the web UI
- Local file storage in `uploads/`
- PDF text extraction (`pdf2json`)
- Text chunking (character-based, with overlap)
- Document and chunk persistence in PostgreSQL
- Document status lifecycle: `UPLOADING` → `PROCESSING` → `READY` / `FAILED`

## Planned (not yet implemented)

- Generating and storing embeddings during ingestion
- Vector similarity search (pgvector retrieval)
- Chat API and chat UI
- Document list / management UI
- Sidebar, navbar, and richer upload UX (dropzone, progress)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui, Lucide icons |
| Database | PostgreSQL 17 + pgvector (Docker) |
| ORM | Drizzle ORM + Drizzle Kit |
| AI | OpenAI SDK (`text-embedding-3-small` — service exists, not wired yet) |
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
  → save chunks to document_chunks
  → mark document READY
```

**Target RAG flow (upcoming):**

```
User question
  → embed query
  → vector search over document_chunks
  → build prompt with retrieved context
  → LLM response
```

---

## Project structure

```
rag-chatbot/
├── app/
│   ├── (dashboard)/page.tsx      # Home page (upload form)
│   ├── api/
│   │   ├── documents/upload/   # Upload + ingest endpoint
│   │   ├── documents/extract/  # Dev: extract text from a file path
│   │   ├── chunk-test/         # Dev: test the text chunker
│   │   └── health/db/          # Database health check
│   └── layout.tsx
├── components/
│   ├── upload/                   # Upload UI (implemented)
│   ├── chat/                     # Chat UI (stubs)
│   ├── documents/                # Document list UI (stubs)
│   ├── layout/                   # Navbar / sidebar (stubs)
│   └── ui/                       # shadcn/ui primitives
├── services/                     # Business logic
├── repositories/                 # Database access (Drizzle)
├── db/                           # Schema, client, enums
├── drizzle/                      # SQL migrations
├── lib/                          # Shared utilities
├── types/                        # TypeScript types
├── uploads/                      # Stored PDF files (local)
└── docker-compose.yaml           # PostgreSQL + pgvector
```

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

Create a `.env` file in the project root (or copy from the example below):

```env
DATABASE_URL=postgres://postgres:12345@localhost:5433/rag_db

# Required later for embeddings and chat (not wired into ingestion yet)
OPENAI_API_KEY=your_openai_api_key_here
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Default matches `docker-compose.yaml` (port `5433`, db `rag_db`). |
| `OPENAI_API_KEY` | OpenAI API key. Needed when embedding and chat features are enabled. |

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
npx drizzle-kit migrate
```

Confirm the database is reachable:

```bash
curl http://localhost:3000/api/health/db
```

Or open Drizzle Studio:

```bash
npx drizzle-kit studio
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and upload a PDF.

---

## API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/documents/upload` | Upload a PDF (`multipart/form-data`, field: `file`). Runs the full ingest pipeline. |
| `POST` | `/api/documents/extract` | Dev only. JSON body: `{ "filePath": "/absolute/path/to/file.pdf" }`. Returns extracted text. |
| `POST` | `/api/chunk-test` | Dev only. JSON body: `{ "text": "..." }`. Returns text chunks. |
| `GET` | `/api/health/db` | Returns database connection info (`current_database`, `current_user`, `version`). |

### Upload response

```json
{
  "documentId": "uuid",
  "status": "READY"
}
```

On failure, the API returns `{ "message": "..." }` with an appropriate HTTP status.

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
| `embedding` | vector(1536) | OpenAI `text-embedding-3-small` dimensions (nullable until embeddings are wired) |
| `created_at` | timestamp | Auto-managed |

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Production build |
| `npm run start` | Run the production server |
| `npm run lint` | Run ESLint |
| `npx drizzle-kit migrate` | Apply database migrations |
| `npx drizzle-kit studio` | Open Drizzle Studio (DB browser) |
| `npx drizzle-kit push` | Push schema changes directly (useful in early dev) |

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
3. Run migrations: `npx drizzle-kit migrate`
4. Hit the health endpoint: `GET /api/health/db`

### Only PDF files are accepted

Upload validation is intentionally limited to `application/pdf`. Other formats are not supported yet.

### `uploads/` folder

PDFs are stored locally at `uploads/{document-id}.pdf`. This folder is created automatically on first upload. Do not commit uploaded files to git.

---

## Development notes

- The home page lives at `app/(dashboard)/page.tsx` and currently renders only the upload form.
- Several UI and service files exist as **empty stubs** (`chat`, `retrieval`, `layout` components, etc.) — placeholders for upcoming work.
- `embedding.service.ts` can generate OpenAI embeddings but is **not yet called** during ingestion.
- Chunking defaults: **1000 characters** per chunk, **200 character** overlap, with word-boundary awareness.

---

## License

Private project.

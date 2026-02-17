# Task: Build a REAL AI-Powered Knowledge Graph

## Overview
Build a knowledge graph that uses an LLM (Gemini 3 Flash via OpenRouter) to analyze uploaded file contents and automatically extract entities, topics, and relationships. This should create a rich, interconnected graph that grows organically as users upload files.

## LLM Integration

### Provider: OpenRouter
- API URL: `https://openrouter.ai/api/v1/chat/completions`
- API Key: from env var `OPENROUTER_API_KEY`
- Model: `google/gemini-3-flash` (cheap & fast)

### Analysis Pipeline
When a file is uploaded, trigger async analysis:

1. **Extract text content:**
   - Text/code files: read directly
   - PDFs: extract text (or just use filename + metadata if too complex)
   - Images: send to LLM with vision (Gemini supports images)
   - Other: use filename + mime type + size as context

2. **LLM Prompt** — Ask the LLM to return structured JSON:
```
Analyze this file and extract knowledge graph data.
File: {filename}, Type: {mime_type}, Size: {size}
Content: {first 2000 chars of text content, or "image attached"}

Return JSON:
{
  "entities": [{"name": "Entity Name", "type": "person|organization|topic|technology|location|concept|project"}],
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "One sentence summary",
  "relationships": [{"from": "entity1", "to": "entity2", "type": "relates_to|uses|created_by|part_of|references"}]
}
```

3. **Store results** in DB and build graph edges between files that share entities/tags.

## Database Schema (add to existing)

```sql
-- Entities extracted by LLM
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- person, org, topic, technology, location, concept, project
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(name, type, user_id)
);

-- File-Entity relationships
CREATE TABLE IF NOT EXISTS file_entities (
  file_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  PRIMARY KEY (file_id, entity_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- Tags (LLM-generated + user-defined)
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  user_id TEXT NOT NULL,
  auto_generated INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(name, user_id)
);

-- File-Tag relationships
CREATE TABLE IF NOT EXISTS file_tags (
  file_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (file_id, tag_id),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- File summaries from LLM
CREATE TABLE IF NOT EXISTS file_analysis (
  file_id TEXT PRIMARY KEY,
  summary TEXT,
  analyzed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
```

## API Routes

### `POST /api/files/[id]/analyze` — Trigger LLM analysis for a file
- Reads file content (text) or sends image to vision model
- Calls OpenRouter API
- Parses response, stores entities/tags/summary
- Returns the extracted data

### `GET /api/graph` — Build knowledge graph (update existing)
- Nodes: files, folders, entities (from LLM), tags, shared users
- Edges:
  - file → entity (extracted_from)
  - file → tag (tagged)
  - entity → entity (relationships from LLM)
  - file → file (share common entities = "related")
  - folder → file (contains)
  - file → user (shared)
- Node size based on connection count
- Entity nodes colored by type

### `POST /api/analyze/batch` — Analyze all unanalyzed files
- Processes files that haven't been analyzed yet
- Rate-limited (1 per second to not spam API)

### Tag management:
- `GET /api/tags` — list tags
- `POST /api/tags` — create manual tag
- `POST /api/files/[id]/tags` — add tag to file
- `DELETE /api/files/[id]/tags/[tagId]` — remove tag

## Graph UI Updates (`/src/app/graph/page.tsx`)

### Node Types & Colors:
- Files: indigo (existing)
- Folders: cyan (existing)
- Entities: colored by type:
  - person: rose
  - organization: amber
  - technology: emerald
  - topic: violet
  - location: sky
  - concept: fuchsia
  - project: orange
- Tags: purple (existing)
- Users: red (existing)

### New UI Features:
- **"Analyze All" button** — triggers batch analysis
- **Analysis status indicator** — shows how many files analyzed vs total
- **Entity detail panel** — click entity node to see which files reference it
- **Edge type legend** with toggles to show/hide edge types
- **Search** — filter nodes by name
- **Auto-analyze on upload** — after file upload, auto-trigger analysis

### Graph Rendering:
- Node size proportional to edge count (min 8, max 30 radius)
- Entity nodes have a double-ring glow effect
- Animated edges with flowing particles for "related" connections
- Cluster similar entities together

## Auto-analyze on Upload
In the file upload API (`/api/files/route.ts` or `/api/files/upload/route.ts`), after saving the file, trigger analysis in the background (don't await it, fire-and-forget with a setTimeout or just call the analyze endpoint).

## Important
- OpenRouter API key from env var `OPENROUTER_API_KEY` 
- Model: `google/gemini-3-flash`
- For images, use the vision API (send image as base64 data URL in the message content)
- Keep text content to first 4000 chars to stay cheap
- Handle API errors gracefully (don't crash if OpenRouter is down)
- Update `db.ts` with new tables in the init function
- Don't break existing auth/upload/download functionality
- Run `npm run build` at the end to verify everything compiles

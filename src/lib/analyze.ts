import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3-flash';

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx', '.css', '.html', '.xml',
  '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.sh', '.bash', '.py',
  '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
  '.sql', '.graphql', '.env', '.gitignore', '.dockerfile', '.csv', '.log',
  '.svg', '.vue', '.svelte', '.astro', '.mdx',
]);

function isTextFile(mimeType: string, filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (TEXT_EXTENSIONS.has(ext)) return true;
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript') || mimeType.includes('typescript')) return true;
  return false;
}

function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg');
}

interface LLMAnalysis {
  entities: { name: string; type: string }[];
  tags: string[];
  summary: string;
  relationships: { from: string; to: string; type: string }[];
}

async function callOpenRouter(messages: any[]): Promise<LLMAnalysis> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://filecloud.app',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Extract JSON from response (may be wrapped in markdown code blocks)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
  };
}

export async function analyzeFile(fileId: string, userId: string): Promise<{ success: boolean; data?: LLMAnalysis; error?: string }> {
  if (!OPENROUTER_API_KEY) {
    return { success: false, error: 'OPENROUTER_API_KEY not configured' };
  }

  const file = db.getFile(fileId);
  if (!file) return { success: false, error: 'File not found' };

  const filePath = path.join(UPLOAD_DIR, file.storage_path);

  const prompt = `Analyze this file and extract knowledge graph data.
File: ${file.original_name}, Type: ${file.mime_type}, Size: ${file.size} bytes

{CONTENT_PLACEHOLDER}

Return JSON (and ONLY valid JSON, no markdown around it):
{
  "entities": [{"name": "Entity Name", "type": "person|organization|topic|technology|location|concept|project"}],
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "One sentence summary of this file",
  "relationships": [{"from": "entity1", "to": "entity2", "type": "relates_to|uses|created_by|part_of|references"}]
}

Extract meaningful entities and relationships. Be specific with entity names. Return 2-8 entities and 2-6 tags.`;

  try {
    let messages: any[];

    if (isImageFile(file.mime_type)) {
      // Vision API for images
      let base64 = '';
      try {
        const imgBuf = fs.readFileSync(filePath);
        base64 = imgBuf.toString('base64');
      } catch {
        return { success: false, error: 'Could not read image file' };
      }
      const contentPrompt = prompt.replace('{CONTENT_PLACEHOLDER}', 'Content: See attached image');
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: contentPrompt },
          { type: 'image_url', image_url: { url: `data:${file.mime_type};base64,${base64}` } },
        ],
      }];
    } else if (isTextFile(file.mime_type, file.original_name)) {
      // Read text content
      let textContent = '';
      try {
        textContent = fs.readFileSync(filePath, 'utf-8').slice(0, 4000);
      } catch {
        textContent = '(Could not read file content)';
      }
      const contentPrompt = prompt.replace('{CONTENT_PLACEHOLDER}', `Content (first 4000 chars):\n${textContent}`);
      messages = [{ role: 'user', content: contentPrompt }];
    } else {
      // For binary/other files, use metadata only
      const contentPrompt = prompt.replace('{CONTENT_PLACEHOLDER}', `Content: Binary file, analyze based on filename and type only`);
      messages = [{ role: 'user', content: contentPrompt }];
    }

    const analysis = await callOpenRouter(messages);

    // Store entities and link them to file
    const entityIdMap: Record<string, string> = {};
    for (const entity of analysis.entities) {
      const entityName = entity.name?.trim();
      const entityType = entity.type?.trim()?.toLowerCase();
      if (!entityName || !entityType) continue;
      const validTypes = ['person', 'organization', 'topic', 'technology', 'location', 'concept', 'project'];
      const finalType = validTypes.includes(entityType) ? entityType : 'concept';
      const entityId = db.upsertEntity({ id: uuidv4(), name: entityName, type: finalType, userId });
      entityIdMap[entityName] = entityId;
      db.linkFileEntity(fileId, entityId);
    }

    // Store relationships between entities
    for (const rel of analysis.relationships) {
      const fromId = entityIdMap[rel.from];
      const toId = entityIdMap[rel.to];
      if (fromId && toId && fromId !== toId) {
        db.upsertEntityRelationship({
          id: uuidv4(),
          fromEntityId: fromId,
          toEntityId: toId,
          type: rel.type || 'relates_to',
          userId,
        });
      }
    }

    // Store tags and link them to file
    for (const tagName of analysis.tags) {
      const name = tagName?.trim()?.toLowerCase();
      if (!name) continue;
      const tagId = db.upsertTag({ id: uuidv4(), name, userId, autoGenerated: true });
      db.linkFileTag(fileId, tagId);
    }

    // Store analysis summary
    if (analysis.summary) {
      db.setFileAnalysis(fileId, analysis.summary);
    }

    return { success: true, data: analysis };
  } catch (err: any) {
    return { success: false, error: err.message || 'Analysis failed' };
  }
}

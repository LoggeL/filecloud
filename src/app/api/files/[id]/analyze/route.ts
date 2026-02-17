import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { analyzeFile } from '@/lib/analyze';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const file = db.getFile(params.id);
  if (!file || file.user_id !== user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const result = await analyzeFile(params.id, user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    analysis: result.data,
    entities: db.getEntitiesForFile(params.id),
    tags: db.getTagsForFile(params.id),
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const file = db.getFile(params.id);
  if (!file || file.user_id !== user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const analysis = db.getFileAnalysis(params.id);
  const entities = db.getEntitiesForFile(params.id);
  const tags = db.getTagsForFile(params.id);

  return NextResponse.json({
    analyzed: !!analysis,
    summary: analysis?.summary || null,
    entities,
    tags,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const file = db.getFile(id);
  if (!file || file.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const tags = db.getTagsForFile(id);
  const analysis = db.getFileAnalysis(id);
  const breadcrumbs = db.getBreadcrumbs(file.folder_id);

  return NextResponse.json({ file, tags, analysis, breadcrumbs });
}

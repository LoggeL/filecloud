import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') || '';
  if (q.trim().length === 0) return NextResponse.json({ files: [], folders: [] });

  const files = db.searchFiles(user.id, q);
  const folders = db.searchFolders(user.id, q);
  return NextResponse.json({ files, folders });
}

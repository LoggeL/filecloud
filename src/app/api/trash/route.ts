import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const files = db.getTrashedFiles(user.id);
  const folders = db.getTrashedFolders(user.id);
  return NextResponse.json({ files, folders });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  db.emptyTrash(user.id);
  return NextResponse.json({ success: true });
}

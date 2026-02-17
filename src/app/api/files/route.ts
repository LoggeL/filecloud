import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const folderId = req.nextUrl.searchParams.get('folder_id');
  const db = getDb();
  const files = db.prepare(
    folderId
      ? 'SELECT * FROM files WHERE user_id = ? AND folder_id = ? ORDER BY name'
      : 'SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL ORDER BY name'
  ).all(...(folderId ? [user.id, folderId] : [user.id]));
  return NextResponse.json(files);
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await req.json();
  const db = getDb();
  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(id, user.id) as any;
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const fs = require('fs');
  const { getFilePath } = require('@/lib/files');
  try { fs.unlinkSync(getFilePath(file.storage_path)); } catch {}
  db.prepare('DELETE FROM files WHERE id = ?').run(id);
  db.prepare('UPDATE users SET storage_used = storage_used - ? WHERE id = ?').run(file.size, user.id);
  return NextResponse.json({ ok: true });
}

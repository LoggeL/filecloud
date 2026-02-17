import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const parentId = req.nextUrl.searchParams.get('parentId') || null;
  const folders = db.getFoldersInFolder(user.id, parentId);
  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { name, parentId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const id = uuidv4();
  db.createFolder({ id, name: name.trim(), parentId: parentId || null, userId: user.id });
  return NextResponse.json({ success: true, folder: db.getFolder(id) });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await req.json();
  const folder = db.getFolder(id);
  if (!folder || folder.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.deleteFolder(id);
  return NextResponse.json({ success: true });
}

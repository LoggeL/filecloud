import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const folder = db.getFolder(id);
  if (!folder || folder.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();

  if (body.name !== undefined) db.updateFolder(id, { name: body.name.trim() });
  if ('parentId' in body) {
    if (body.parentId === id) return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 });
    db.updateFolder(id, { parentId: body.parentId });
  }
  if (body.trashed === true) db.trashFolder(id);
  if (body.trashed === false) db.restoreFolder(id);

  return NextResponse.json({ success: true, folder: db.getFolder(id) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const folder = db.getFolder(id);
  if (!folder || folder.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.permanentDeleteFolder(id);
  return NextResponse.json({ success: true });
}

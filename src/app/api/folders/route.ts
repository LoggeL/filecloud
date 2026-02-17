import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, parentId } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const id = uuidv4();
  db.createFolder({ id, name, parentId: parentId || null });
  return NextResponse.json({ id, name });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  db.deleteFolder(id);
  return NextResponse.json({ success: true });
}

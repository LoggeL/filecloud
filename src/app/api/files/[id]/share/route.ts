import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const file = db.getFile(id);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const token = uuidv4().replace(/-/g, '').slice(0, 12);
  db.setShareToken(id, token);
  return NextResponse.json({ shareToken: token });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  db.setShareToken(id, null);
  return NextResponse.json({ success: true });
}

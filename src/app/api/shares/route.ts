import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const shares = db.getSharesForUser(user.id);
  return NextResponse.json({ shares });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { itemId, itemType, email, permission } = await req.json();
  if (!itemId || !itemType || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const targetUser = db.getUserByEmail(email);
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (targetUser.id === user.id) return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });

  const access = db.hasAccess(user.id, itemId, itemType);
  if (!access.access) return NextResponse.json({ error: 'No access' }, { status: 403 });

  const id = uuidv4();
  db.createShare({ id, itemId, itemType, ownerId: user.id, sharedWithId: targetUser.id, permission: permission || 'view' });
  return NextResponse.json({ success: true, id });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  db.deleteShare(id);
  return NextResponse.json({ success: true });
}

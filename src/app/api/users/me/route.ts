import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { displayName, avatarUrl } = await req.json();
  db.updateUser(user.id, { displayName, avatarUrl });
  return NextResponse.json({ user: db.getUser(user.id) });
}

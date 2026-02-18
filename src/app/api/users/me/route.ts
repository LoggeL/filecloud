import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ user: db.getUser(user.id) });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { displayName, avatarUrl, currentPassword, newPassword } = body;

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 });
    const fullUser = db.getUserByEmail(user.email);
    const valid = await bcrypt.compare(currentPassword, fullUser.password_hash);
    if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    const hash = await bcrypt.hash(newPassword, 12);
    db.updateUser(user.id, { passwordHash: hash });
  }

  if (displayName !== undefined) db.updateUser(user.id, { displayName });
  if (avatarUrl !== undefined) db.updateUser(user.id, { avatarUrl });

  return NextResponse.json({ user: db.getUser(user.id) });
}

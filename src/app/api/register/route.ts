import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { email, password, displayName } = await req.json();
  if (!email || !password || !displayName) return NextResponse.json({ error: 'All fields required' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

  const existing = db.getUserByEmail(email);
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

  const isAdmin = db.getUserCount() === 0;
  const userId = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.createUser({ id: userId, email, passwordHash, displayName, isAdmin });

  // Auto login
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.createSession({ id: sessionId, userId, expiresAt });

  const res = NextResponse.json({ success: true, user: db.getUser(userId) });
  res.cookies.set('session_id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
  return res;
}

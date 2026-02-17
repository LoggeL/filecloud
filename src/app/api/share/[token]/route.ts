import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const file = db.getFileByShareToken(token);
  if (!file) return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
  if (file.share_expires_at && new Date(file.share_expires_at) < new Date()) return NextResponse.json({ error: 'Share link expired' }, { status: 410 });
  if (file.share_password) return NextResponse.json({ needsPassword: true });
  return NextResponse.json({ file: { id: file.id, original_name: file.original_name, mime_type: file.mime_type, size: file.size } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const file = db.getFileByShareToken(token);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { password } = await req.json();
  if (file.share_password !== password) return NextResponse.json({ error: 'Wrong password' }, { status: 403 });
  return NextResponse.json({ file: { id: file.id, original_name: file.original_name, mime_type: file.mime_type, size: file.size } });
}

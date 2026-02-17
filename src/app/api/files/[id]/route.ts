import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = db.getFile(id);
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Check access: share token or authenticated user with access
  const shareToken = req.nextUrl.searchParams.get('share');
  if (shareToken) {
    if (file.share_token !== shareToken) return NextResponse.json({ error: 'Invalid share' }, { status: 403 });
    if (file.share_expires_at && new Date(file.share_expires_at) < new Date()) return NextResponse.json({ error: 'Share expired' }, { status: 410 });
  } else {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const access = db.hasAccess(user.id, id, 'file');
    if (!access.access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const filePath = path.join(UPLOAD_DIR, file.storage_path);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File missing' }, { status: 404 });

  const stat = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);
  const inline = req.nextUrl.searchParams.get('inline') === '1';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.mime_type,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': inline ? `inline; filename="${file.original_name}"` : `attachment; filename="${file.original_name}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

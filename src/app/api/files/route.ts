import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { lookup } from 'mime-types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const folderId = req.nextUrl.searchParams.get('folderId') || null;
  const files = db.getFilesInFolder(user.id, folderId);
  const folders = db.getFoldersInFolder(user.id, folderId);
  const breadcrumbs = db.getBreadcrumbs(folderId);
  const storage = db.getStorageUsage(user.id);

  return NextResponse.json({ files, folders, breadcrumbs, storage });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folderId = formData.get('folderId') as string | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const fileId = uuidv4();
  const ext = path.extname(file.name);
  const storageName = fileId + ext;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(UPLOAD_DIR, storageName);
  fs.writeFileSync(filePath, buffer);

  const mimeType = lookup(file.name) || file.type || 'application/octet-stream';

  db.createFile({
    id: fileId,
    name: storageName,
    originalName: file.name,
    mimeType,
    size: buffer.length,
    folderId: folderId || null,
    userId: user.id,
    storagePath: storageName,
  });

  return NextResponse.json({ success: true, file: db.getFile(fileId) });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await req.json();
  const file = db.getFile(id);
  if (!file || file.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.deleteFile(id);
  return NextResponse.json({ success: true });
}

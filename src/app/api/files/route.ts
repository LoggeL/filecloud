import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const folderId = req.nextUrl.searchParams.get('folderId') || null;
  const files = db.getFilesInFolder(folderId);
  const folders = db.getFoldersInFolder(folderId);
  const breadcrumbs = db.getBreadcrumbs(folderId);
  const storage = db.getStorageUsage();
  return NextResponse.json({ files, folders, breadcrumbs, storage });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folderId = formData.get('folderId') as string | null;

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const id = uuidv4();
  const ext = path.extname(file.name);
  const storageName = `${id}${ext}`;
  const storagePath = storageName;

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, storagePath), buffer);

  const mimeType = mime.lookup(file.name) || 'application/octet-stream';

  db.createFile({
    id,
    name: file.name,
    originalName: file.name,
    mimeType,
    size: file.size,
    folderId: folderId || null,
    storagePath,
  });

  return NextResponse.json({ id, name: file.name, size: file.size });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  db.deleteFile(id);
  return NextResponse.json({ success: true });
}

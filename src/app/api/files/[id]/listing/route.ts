import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import yauzl from 'yauzl';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const file = db.getFile(id);
  if (!file || file.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const filePath = path.join(UPLOAD_DIR, file.storage_path);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'File missing' }, { status: 404 });

  const entries: { name: string; size: number; compressedSize: number }[] = [];

  await new Promise<void>((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', (entry: any) => {
        entries.push({
          name: entry.fileName,
          size: entry.uncompressedSize,
          compressedSize: entry.compressedSize,
        });
        zipfile.readEntry();
      });
      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  }).catch(() => {});

  return NextResponse.json({ entries });
}

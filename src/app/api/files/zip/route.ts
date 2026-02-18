import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { Readable } from 'stream';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'No files specified' }, { status: 400 });

  const archive = archiver('zip', { zlib: { level: 5 } });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', resolve);
    archive.on('error', reject);

    for (const id of ids) {
      const file = db.getFile(id);
      if (!file || file.user_id !== user.id) continue;
      const filePath = path.join(UPLOAD_DIR, file.storage_path);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.original_name });
      }
    }
    archive.finalize();
  });

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="download.zip"',
      'Content-Length': buffer.length.toString(),
    },
  });
}

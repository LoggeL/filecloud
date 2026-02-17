import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: { id: string; tagId: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const file = db.getFile(params.id);
  if (!file || file.user_id !== user.id) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  db.unlinkFileTag(params.id, params.tagId);
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const parentId = req.nextUrl.searchParams.get('parent_id');
  const db = getDb();
  const folders = db.prepare(
    parentId
      ? 'SELECT * FROM folders WHERE user_id = ? AND parent_id = ? ORDER BY name'
      : 'SELECT * FROM folders WHERE user_id = ? AND parent_id IS NULL ORDER BY name'
  ).all(...(parentId ? [user.id, parentId] : [user.id]));
  return NextResponse.json(folders);
}

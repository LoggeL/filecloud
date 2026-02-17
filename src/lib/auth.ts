import { cookies } from 'next/headers';
import { db } from './db';

export async function getSessionUser(): Promise<{ id: string; email: string; display_name: string; avatar_url: string | null; is_admin: number } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('session_id')?.value;
  if (!sessionId) return null;
  const session = db.getSession(sessionId);
  if (!session) return null;
  return db.getUser(session.user_id);
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

import { cookies } from 'next/headers';

const PASSWORD = process.env.AUTH_PASSWORD || 'files2026';

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value === hashPassword(PASSWORD);
}

export function verifyPassword(password: string): boolean {
  return password === PASSWORD;
}

export function hashPassword(password: string): string {
  // Simple hash for cookie - not security critical since it's a shared password
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fc_' + Math.abs(hash).toString(36);
}

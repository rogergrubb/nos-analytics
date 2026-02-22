import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_PASSWORD, createSessionToken } from '@/lib/config';
import { logAudit } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             req.headers.get('x-real-ip') || '0.0.0.0';
  const ua = req.headers.get('user-agent') || '';

  const { password } = await req.json();

  if (password === DASHBOARD_PASSWORD) {
    await logAudit('login', ip, ua, true);
    const token = createSessionToken();
    const res = NextResponse.json({ ok: true });
    res.cookies.set('nos-auth', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400 * 30,
      path: '/',
    });
    return res;
  }

  await logAudit('login_failed', ip, ua, false);
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

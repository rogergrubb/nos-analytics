import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_PASSWORD } from '@/lib/config';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password === DASHBOARD_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('nos-auth', Buffer.from(DASHBOARD_PASSWORD).toString('base64'), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 86400 * 30,
      path: '/',
    });
    return res;
  }
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * S3-P1-001 FIX: Server-side MFA requirement.
 * Sets mfa_pending as HttpOnly cookie so client JS cannot manipulate it.
 * Called after successful login if user has MFA enabled.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has MFA enabled (TOTP or passkey)
    const [totpRes, passkeyRes] = await Promise.all([
      supabase
        .from('user_totp')
        .select('id')
        .eq('user_id', user.id)
        .eq('verified', true)
        .maybeSingle(),
      supabase
        .from('user_passkeys')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ]);

    const hasMfa = !!(totpRes.data || (passkeyRes.count && passkeyRes.count > 0));

    if (!hasMfa) {
      return NextResponse.json({ mfa_required: false });
    }

    // Set HttpOnly cookie — client JS CANNOT delete or modify this
    const response = NextResponse.json({ mfa_required: true });
    response.cookies.set('mfa_pending', '1', {
      path: '/',
      maxAge: 300, // 5 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Clear any mfa_verified from previous sessions
    response.cookies.delete('mfa_verified');

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

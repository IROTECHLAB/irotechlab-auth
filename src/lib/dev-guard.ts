import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Guards the /api/dev/* diagnostic endpoints.
 *
 * These routes exist to help operators debug their own deployment.
 * They must NOT be publicly callable in production.
 *
 * Behaviour:
 *   - If DEV_DIAGNOSTIC_SECRET is not set → routes return 404 (as if they don't exist)
 *   - If set → caller must send X-Dev-Secret matching the value
 *
 * Usage in a route handler:
 *   const guard = requireDevSecret(req);
 *   if (guard) return guard;
 */
export function requireDevSecret(req: NextRequest): NextResponse | null {
  const expected = process.env.DEV_DIAGNOSTIC_SECRET;

  // Not configured → hide the route entirely
  if (!expected) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const provided = req.headers.get('x-dev-secret');
  if (!provided) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Constant-time compare
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}

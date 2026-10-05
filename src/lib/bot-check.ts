import { NextRequest } from 'next/server';

/**
 * Checks the request headers for signals that only real browsers send.
 * Rejects raw HTTP clients (curl, python-requests, Postman, axios, etc.).
 *
 * This is NOT a defense against headless browsers — Puppeteer sends real
 * headers. It IS a defense against everything that doesn't run a real JS
 * engine and layout engine.
 */
export function looksLikeBrowser(req: NextRequest): { ok: boolean; reason?: string } {
  const ua = req.headers.get('user-agent') ?? '';
  const accept = req.headers.get('accept') ?? '';
  const acceptLang = req.headers.get('accept-language') ?? '';
  const secFetchSite = req.headers.get('sec-fetch-site');
  const secFetchMode = req.headers.get('sec-fetch-mode');
  const secFetchDest = req.headers.get('sec-fetch-dest');
  const secChUa = req.headers.get('sec-ch-ua');

  if (!ua) return { ok: false, reason: 'no-user-agent' };

  const scriptUA =
    /^(curl|wget|python|node|axios|okhttp|postman|insomnia|httpie|java|go-http|libwww|powershell|ruby|php|dart)/i;
  if (scriptUA.test(ua)) return { ok: false, reason: 'script-user-agent' };

  if (!accept) return { ok: false, reason: 'no-accept' };
  if (!acceptLang) return { ok: false, reason: 'no-accept-language' };

  // Modern browsers always send sec-fetch-* on fetch/XHR from a page
  if (!secFetchSite) return { ok: false, reason: 'no-sec-fetch-site' };
  if (!secFetchMode) return { ok: false, reason: 'no-sec-fetch-mode' };
  if (!secFetchDest) return { ok: false, reason: 'no-sec-fetch-dest' };

  // Chrome/Edge always send sec-ch-ua. If UA claims Chrome but header is
  // missing, the UA was spoofed.
  if (/Chrome\/\d/.test(ua) && !secChUa) {
    return { ok: false, reason: 'chrome-ua-without-sec-ch-ua' };
  }

  return { ok: true };
}

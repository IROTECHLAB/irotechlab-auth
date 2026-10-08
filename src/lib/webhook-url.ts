import { promises as dns } from 'dns';

/**
 * Webhook URL validation. Blocks SSRF vectors:
 *
 * - Non-HTTPS schemes
 * - Private IPv4 ranges (RFC 1918, loopback, link-local, multicast, reserved)
 * - IPv6 loopback, link-local, unique-local, multicast
 * - Hostnames that resolve to private IPs (defeats DNS rebinding)
 * - Obvious metadata service addresses (169.254.169.254, fd00:ec2::254)
 *
 * Call validateWebhookUrl() at BOTH registration and delivery time.
 * Between the two, an attacker can rebind DNS; re-checking at delivery
 * closes that window.
 */

export interface UrlCheckResult {
  ok: boolean;
  reason?: string;
}

export async function validateWebhookUrl(rawUrl: string): Promise<UrlCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Not a valid URL' };
  }

  // 1. HTTPS only
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'Webhook URL must use https://' };
  }

  // 2. Host must not be empty
  if (!url.hostname) {
    return { ok: false, reason: 'URL has no hostname' };
  }

  // 3. Reject obvious bad hostnames
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'metadata' ||
    hostname === 'instance-data'
  ) {
    return { ok: false, reason: 'Hostname is not allowed' };
  }

  // 4. If the host is a literal IP, check it directly
  const literalIp = normalizeIpLiteral(hostname);
  if (literalIp) {
    const ipCheck = isPrivateOrReservedIp(literalIp);
    if (!ipCheck.ok) return ipCheck;
    return { ok: true };
  }

  // 5. Resolve the hostname and check every returned IP
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, reason: 'Hostname could not be resolved' };
  }

  if (addresses.length === 0) {
    return { ok: false, reason: 'Hostname did not resolve to any address' };
  }

  for (const { address } of addresses) {
    const ipCheck = isPrivateOrReservedIp(address);
    if (!ipCheck.ok) {
      return {
        ok: false,
        reason: `Hostname resolves to a private or reserved IP (${address})`,
      };
    }
  }

  return { ok: true };
}

/**
 * If the hostname is a raw IP (v4 or v6), return it normalized. Else null.
 */
function normalizeIpLiteral(host: string): string | null {
  // IPv6 in URLs is wrapped in brackets: [::1]
  if (host.startsWith('[') && host.endsWith(']')) {
    return host.slice(1, -1);
  }
  // IPv4 dotted-quad
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return host;
  }
  // IPv6 without brackets (rare but possible)
  if (host.includes(':')) {
    return host;
  }
  return null;
}

/**
 * Returns ok:false if the IP is private, loopback, link-local, multicast,
 * or otherwise reserved. Handles both IPv4 and IPv6.
 */
export function isPrivateOrReservedIp(ip: string): UrlCheckResult {
  // --- IPv6 ---
  if (ip.includes(':')) {
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');

    // Loopback ::1
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') {
      return { ok: false, reason: 'IPv6 loopback is not allowed' };
    }
    // Unspecified ::
    if (lower === '::' || lower === '0:0:0:0:0:0:0:0') {
      return { ok: false, reason: 'IPv6 unspecified is not allowed' };
    }
    // Link-local fe80::/10
    if (/^fe[89ab]/.test(lower)) {
      return { ok: false, reason: 'IPv6 link-local is not allowed' };
    }
    // Unique-local fc00::/7 (fc00 – fdff)
    if (/^f[cd]/.test(lower)) {
      return { ok: false, reason: 'IPv6 unique-local is not allowed' };
    }
    // Multicast ff00::/8
    if (lower.startsWith('ff')) {
      return { ok: false, reason: 'IPv6 multicast is not allowed' };
    }
    // AWS IPv6 metadata
    if (lower.startsWith('fd00:ec2')) {
      return { ok: false, reason: 'Metadata service IP is not allowed' };
    }
    // IPv4-mapped ::ffff:a.b.c.d
    const m = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (m) return isPrivateOrReservedIp(m[1]);

    return { ok: true };
  }

  // --- IPv4 ---
  const parts = ip.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return { ok: false, reason: 'Malformed IP address' };
  }
  const [a, b] = parts;

  // 0.0.0.0/8 — "this" network
  if (a === 0) return { ok: false, reason: 'Reserved IPv4 range' };
  // 10.0.0.0/8 — private
  if (a === 10) return { ok: false, reason: 'Private IPv4 range' };
  // 127.0.0.0/8 — loopback
  if (a === 127) return { ok: false, reason: 'IPv4 loopback is not allowed' };
  // 169.254.0.0/16 — link-local + AWS/GCP/Azure metadata
  if (a === 169 && b === 254) {
    return { ok: false, reason: 'Link-local or metadata IP is not allowed' };
  }
  // 172.16.0.0/12 — private
  if (a === 172 && b >= 16 && b <= 31) {
    return { ok: false, reason: 'Private IPv4 range' };
  }
  // 192.0.0.0/24 — IETF protocol assignments
  if (a === 192 && b === 0 && parts[2] === 0) {
    return { ok: false, reason: 'Reserved IPv4 range' };
  }
  // 192.0.2.0/24 — documentation
  if (a === 192 && b === 0 && parts[2] === 2) {
    return { ok: false, reason: 'Reserved IPv4 range' };
  }
  // 192.168.0.0/16 — private
  if (a === 192 && b === 168) {
    return { ok: false, reason: 'Private IPv4 range' };
  }
  // 198.18.0.0/15 — benchmarking
  if (a === 198 && (b === 18 || b === 19)) {
    return { ok: false, reason: 'Reserved IPv4 range' };
  }
  // 224.0.0.0/4 — multicast
  if (a >= 224 && a <= 239) {
    return { ok: false, reason: 'Multicast IPv4 is not allowed' };
  }
  // 240.0.0.0/4 — reserved
  if (a >= 240) {
    return { ok: false, reason: 'Reserved IPv4 range' };
  }

  return { ok: true };
}

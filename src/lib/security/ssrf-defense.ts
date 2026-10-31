// ==============================================================================
// CELEBRA — Server-Side Request Forgery (SSRF) Defense & URL Sanitizer
// ASVS Level 2: Prevention of Internal Network Probing & Cloud Metadata Abuse
// ==============================================================================

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/GCP/Azure link-local instance metadata
  'metadata.google.internal',
  'instance-data',
]);

const PRIVATE_IP_RANGES = [
  /^10\./,                          // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,                    // 192.168.0.0/16
  /^127\./,                        // 127.0.0.0/8 (Loopback)
  /^169\.254\./,                    // 169.254.0.0/16 (Link-local / Cloud metadata)
  /^0\./,                          // 0.0.0.0/8
  /^fc00:/i,                       // IPv6 Unique Local Address
  /^fe80:/i,                       // IPv6 Link-Local
  /^::ffff:127\./i,                // IPv4-mapped IPv6 loopback
];

/**
 * Validates that an outbound URL does not target loopback, private intranet, or cloud metadata.
 */
export function validateExternalUrl(urlString: string): {
  isSafe: boolean;
  reason?: string;
  normalizedUrl?: string;
} {
  if (!urlString || typeof urlString !== 'string') {
    return { isSafe: false, reason: 'URL string is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { isSafe: false, reason: 'Malformed URL syntax' };
  }

  // Only allow standard http and https schemes
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isSafe: false,
      reason: `Prohibited URL protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return {
      isSafe: false,
      reason: `Blocked target host "${hostname}": Internal or cloud metadata endpoint`,
    };
  }

  // Check private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return {
        isSafe: false,
        reason: `Blocked target host "${hostname}": Private or loopback IP range`,
      };
    }
  }

  return { isSafe: true, normalizedUrl: parsed.toString() };
}


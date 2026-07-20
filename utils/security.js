import net from 'node:net';
import dns from 'node:dns/promises';

const BLOCKED_PORTS = [
  22, // SSH
  23, // Telnet
  25, // SMTP
  445, // SMB
  3306, // MySQL
  3389, // RDP
];

// Private, loopback, link-local and otherwise non-routable/reserved ranges that
// must never be reachable through the proxy (SSRF protection).
const BLOCKED_V4_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8', // Private
  '100.64.0.0/10', // Carrier-grade NAT
  '127.0.0.0/8', // Loopback
  '169.254.0.0/16', // Link-local (incl. cloud metadata 169.254.169.254)
  '172.16.0.0/12', // Private
  '192.0.0.0/24', // IETF protocol assignments
  '192.0.2.0/24', // TEST-NET-1
  '192.168.0.0/16', // Private
  '198.18.0.0/15', // Benchmarking
  '198.51.100.0/24', // TEST-NET-2
  '203.0.113.0/24', // TEST-NET-3
  '224.0.0.0/4', // Multicast
  '240.0.0.0/4', // Reserved
  '255.255.255.255/32', // Broadcast
];

const BLOCKED_V6_CIDRS = [
  '::1/128', // Loopback
  '::/128', // Unspecified
  'fc00::/7', // Unique local address
  'fe80::/10', // Link-local
  'ff00::/8', // Multicast
  '2001:db8::/32', // Documentation
];

// Convert an IPv4 dotted-quad string to a BigInt.
const ipv4ToBigInt = (ip) =>
  ip.split('.').reduce((acc, octet) => (acc << 8n) + BigInt(parseInt(octet, 10)), 0n);

// Expand and convert an IPv6 string to a BigInt.
const ipv6ToBigInt = (ip) => {
  // Handle IPv4-mapped/embedded addresses (e.g. ::ffff:1.2.3.4).
  const embeddedV4 = ip.match(/(.*:)((\d+)\.(\d+)\.(\d+)\.(\d+))$/);
  let head = ip;
  let tailValue = null;
  if (embeddedV4) {
    head = embeddedV4[1];
    tailValue = ipv4ToBigInt(embeddedV4[2]);
  }

  const [left, right] = head.split('::');
  const leftGroups = left ? left.split(':').filter(Boolean) : [];
  const rightGroups = right !== undefined ? right.split(':').filter(Boolean) : [];

  // How many 16-bit groups the embedded v4 (if any) occupies.
  const v4Groups = tailValue !== null ? 2 : 0;
  const totalExplicit = leftGroups.length + rightGroups.length + v4Groups;
  const missing = 8 - totalExplicit;

  const groups = [
    ...leftGroups,
    ...(right !== undefined ? Array(Math.max(missing, 0)).fill('0') : []),
    ...rightGroups,
  ];

  let value = 0n;
  for (const group of groups) {
    value = (value << 16n) + BigInt(parseInt(group || '0', 16));
  }
  if (tailValue !== null) {
    value = (value << 32n) + tailValue;
  }
  return value;
};

const cidrToRange = (cidr, version) => {
  const [addr, prefixStr] = cidr.split('/');
  const prefix = BigInt(prefixStr);
  const totalBits = version === 4 ? 32n : 128n;
  const base = version === 4 ? ipv4ToBigInt(addr) : ipv6ToBigInt(addr);
  const hostBits = totalBits - prefix;
  const mask = hostBits === 0n ? 0n : (1n << hostBits) - 1n;
  const network = base & ~mask & ((1n << totalBits) - 1n);
  return { start: network, end: network | mask };
};

const isIpBlocked = (ip) => {
  const version = net.isIP(ip);
  if (version === 4) {
    const value = ipv4ToBigInt(ip);
    return BLOCKED_V4_CIDRS.some((cidr) => {
      const { start, end } = cidrToRange(cidr, 4);
      return value >= start && value <= end;
    });
  }
  if (version === 6) {
    const value = ipv6ToBigInt(ip);
    // IPv4-mapped IPv6 addresses (::ffff:0:0/96) embed an IPv4 address in the
    // low 32 bits; classify them by their underlying IPv4 address.
    if (value >> 32n === 0xffffn) {
      const v4 = value & 0xffffffffn;
      const dotted = [
        Number((v4 >> 24n) & 0xffn),
        Number((v4 >> 16n) & 0xffn),
        Number((v4 >> 8n) & 0xffn),
        Number(v4 & 0xffn),
      ].join('.');
      if (isIpBlocked(dotted)) {
        return true;
      }
    }
    return BLOCKED_V6_CIDRS.some((cidr) => {
      const { start, end } = cidrToRange(cidr, 6);
      return value >= start && value <= end;
    });
  }
  // Unknown format => treat as unsafe.
  return true;
};

/**
 * Validate that a URL is a safe Gemini target. Resolves the hostname to its
 * IP address(es) and rejects any that fall within private, loopback,
 * link-local or otherwise reserved ranges. This is more robust than substring
 * matching (which is bypassable via alternate IP encodings) and mitigates a
 * class of SSRF attacks. Returns a Promise<boolean>.
 */
export const isUrlSafe = async (url) => {
  try {
    const parsed = new URL(url);

    // Only allow gemini protocol
    if (parsed.protocol !== 'gemini:') {
      return false;
    }

    // Check for blocked ports
    const port = parsed.port || 1965; // Default Gemini port
    if (BLOCKED_PORTS.includes(parseInt(port, 10))) {
      return false;
    }

    // Strip brackets from IPv6 literals for classification.
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!hostname) {
      return false;
    }

    // Never allow localhost by name.
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
      return false;
    }

    // If the host is a literal IP, check it directly.
    if (net.isIP(hostname)) {
      return !isIpBlocked(hostname);
    }

    // Otherwise resolve the hostname and reject if ANY resolved address is
    // within a blocked range (defends against DNS rebinding to internal IPs).
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return false;
    }
    return addresses.every(({ address }) => !isIpBlocked(address));
  } catch {
    return false;
  }
};

// Rate limiting configuration
export const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
};

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now - record.windowStart > RATE_LIMIT.windowMs) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function applyRateLimit(req, res) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress;
  const now = Date.now();
  const { windowMs, max } = RATE_LIMIT;
  let record = rateLimitStore.get(ip);

  if (!record || now - record.windowStart > windowMs) {
    record = { count: 1, windowStart: now };
  } else {
    record.count++;
  }

  rateLimitStore.set(ip, record);

  if (record.count > max) {
    res.status(429).json({ error: 'Too Many Requests' });
    return false;
  }

  return true;
}
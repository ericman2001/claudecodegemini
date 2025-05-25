// List of blocked hosts/patterns for security
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.', // Link-local
  '10.', // Private network
  '172.16.', // Private network  
  '192.168.', // Private network
  'fc00::', // IPv6 private
  'fe80::', // IPv6 link-local
];

const BLOCKED_PORTS = [
  22, // SSH
  23, // Telnet
  25, // SMTP
  445, // SMB
  3306, // MySQL
  3389, // RDP
];

export const isUrlSafe = (url) => {
  try {
    const parsed = new URL(url);
    
    // Only allow gemini protocol
    if (parsed.protocol !== 'gemini:') {
      return false;
    }
    
    // Check for blocked hosts
    const hostname = parsed.hostname.toLowerCase();
    for (const blocked of BLOCKED_HOSTS) {
      if (hostname.includes(blocked)) {
        return false;
      }
    }
    
    // Check for blocked ports
    const port = parsed.port || 1965; // Default Gemini port
    if (BLOCKED_PORTS.includes(parseInt(port))) {
      return false;
    }
    
    return true;
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
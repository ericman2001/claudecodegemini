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
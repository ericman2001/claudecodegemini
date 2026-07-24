/**
 * @jest-environment node
 */
import dns from 'node:dns/promises';
import { resolveSafeAddress } from '../security';

jest.mock('node:dns/promises', () => ({
  __esModule: true,
  default: { lookup: jest.fn() },
}));

// dns.lookup is heavily overloaded; treat the mock as a plain jest.Mock so
// resolving with the { all: true } LookupAddress[] shape type-checks cleanly.
const mockLookup = dns.lookup as unknown as jest.Mock;

describe('resolveSafeAddress', () => {
  beforeEach(() => {
    mockLookup.mockReset();
  });

  // For a literal IP host the function returns the IP itself as `address`
  // (it is what the connection would be pinned to); only `safe` reflects the
  // block decision.
  describe('literal IPs (no DNS lookup)', () => {
    it('blocks private IPv4 ranges', async () => {
      expect((await resolveSafeAddress('gemini://10.0.0.1/')).safe).toBe(false);
      expect((await resolveSafeAddress('gemini://192.168.1.5/')).safe).toBe(false);
      expect((await resolveSafeAddress('gemini://127.0.0.1/')).safe).toBe(false);
    });

    it('allows public IPv4 addresses and pins the address', async () => {
      await expect(resolveSafeAddress('gemini://8.8.8.8/')).resolves.toEqual({
        safe: true,
        address: '8.8.8.8',
      });
    });

    it('blocks IPv6 loopback / link-local / ULA ranges', async () => {
      expect((await resolveSafeAddress('gemini://[::1]/')).safe).toBe(false);
      expect((await resolveSafeAddress('gemini://[fe80::1]/')).safe).toBe(false);
      expect((await resolveSafeAddress('gemini://[fc00::1]/')).safe).toBe(false);
    });

    it('allows public IPv6 addresses', async () => {
      const result = await resolveSafeAddress('gemini://[2606:4700:4700::1111]/');
      expect(result.safe).toBe(true);
    });

    it('classifies IPv4-mapped IPv6 by the embedded IPv4 (blocks loopback)', async () => {
      expect(
        (await resolveSafeAddress('gemini://[::ffff:127.0.0.1]/')).safe
      ).toBe(false);
    });

    it('blocks IPv4-mapped IPv6 pointing at private ranges', async () => {
      expect((await resolveSafeAddress('gemini://[::ffff:10.0.0.1]/')).safe).toBe(
        false
      );
    });
  });

  describe('hostname / protocol / port validation', () => {
    it('rejects localhost by name', async () => {
      await expect(resolveSafeAddress('gemini://localhost/')).resolves.toEqual({
        safe: false,
        address: null,
      });
    });

    it('rejects *.localhost by name', async () => {
      await expect(
        resolveSafeAddress('gemini://foo.localhost/')
      ).resolves.toEqual({ safe: false, address: null });
    });

    it('rejects non-gemini protocols', async () => {
      await expect(resolveSafeAddress('https://example.org/')).resolves.toEqual({
        safe: false,
        address: null,
      });
      await expect(resolveSafeAddress('http://example.org/')).resolves.toEqual({
        safe: false,
        address: null,
      });
    });

    it('rejects blocked ports (e.g. SSH 22)', async () => {
      await expect(
        resolveSafeAddress('gemini://example.org:22/')
      ).resolves.toEqual({ safe: false, address: null });
    });
  });

  describe('DNS resolution path', () => {
    it('allows hosts that resolve to a public address', async () => {
      mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
      const result = await resolveSafeAddress('gemini://example.com/');
      expect(result).toEqual({ safe: true, address: '93.184.216.34' });
    });

    it('blocks hosts that resolve to any private address (DNS rebinding)', async () => {
      mockLookup.mockResolvedValue([
        { address: '93.184.216.34', family: 4 },
        { address: '10.1.2.3', family: 4 },
      ]);
      const result = await resolveSafeAddress('gemini://rebind.example/');
      expect(result).toEqual({ safe: false, address: null });
    });

    it('rejects hosts that fail to resolve', async () => {
      mockLookup.mockResolvedValue([]);
      const result = await resolveSafeAddress('gemini://nope.example/');
      expect(result).toEqual({ safe: false, address: null });
    });
  });
});

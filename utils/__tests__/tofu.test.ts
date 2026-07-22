/**
 * @jest-environment node
 */

// Mocked in-memory view of the on-disk fingerprint store so we never touch the
// real filesystem.
jest.mock('node:fs', () => {
  const store = {
    statSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
  return { __esModule: true, default: store };
});

interface FsMock {
  statSync: jest.Mock;
  readFileSync: jest.Mock;
  writeFileSync: jest.Mock;
}

type VerifyFingerprint = typeof import('../tofu').verifyFingerprint;

// Load fresh copies of fs (mock) and tofu so tofu's module-level cache is reset
// between tests, and seed the mocked store with `existing`.
async function loadWith(existing: Record<string, unknown> | null): Promise<{
  fs: FsMock;
  verifyFingerprint: VerifyFingerprint;
}> {
  jest.resetModules();
  const fs = (await import('node:fs')).default as unknown as FsMock;
  fs.statSync.mockReset();
  fs.readFileSync.mockReset();
  fs.writeFileSync.mockReset();

  if (existing === null) {
    // No store file on disk.
    fs.statSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
  } else {
    fs.statSync.mockReturnValue({ mtimeMs: 1 });
    fs.readFileSync.mockReturnValue(JSON.stringify(existing));
  }

  const { verifyFingerprint } = await import('../tofu');
  return { fs, verifyFingerprint };
}

describe('verifyFingerprint', () => {
  const HOST = 'example.org:1965';

  it('trusts and stores the fingerprint on first use', async () => {
    const { fs, verifyFingerprint } = await loadWith(null);
    const result = verifyFingerprint(HOST, 'AA:BB', 9999999999999);
    expect(result).toMatchObject({ trusted: true, firstUse: true, changed: false });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(fs.writeFileSync.mock.calls[0][1] as string);
    expect(persisted[HOST]).toEqual({ fingerprint: 'AA:BB', validTo: 9999999999999 });
  });

  it('trusts an unchanged fingerprint without rewriting the store', async () => {
    const { fs, verifyFingerprint } = await loadWith({
      [HOST]: { fingerprint: 'AA:BB', validTo: 9999999999999 },
    });
    const result = verifyFingerprint(HOST, 'AA:BB', 9999999999999);
    expect(result).toMatchObject({ trusted: true, firstUse: false, changed: false });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('flags a changed fingerprint on a non-expired cert as a possible MITM', async () => {
    const { fs, verifyFingerprint } = await loadWith({
      [HOST]: { fingerprint: 'AA:BB', validTo: Date.now() + 60_000 },
    });
    const result = verifyFingerprint(HOST, 'CC:DD', Date.now() + 120_000);
    expect(result).toMatchObject({
      trusted: false,
      changed: true,
      expected: 'AA:BB',
      actual: 'CC:DD',
    });
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('accepts a changed fingerprint when the stored cert has expired (rotation)', async () => {
    const { fs, verifyFingerprint } = await loadWith({
      [HOST]: { fingerprint: 'AA:BB', validTo: Date.now() - 60_000 },
    });
    const result = verifyFingerprint(HOST, 'CC:DD', Date.now() + 120_000);
    expect(result).toMatchObject({ trusted: true, changed: false, rotated: true });
    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(fs.writeFileSync.mock.calls[0][1] as string);
    expect(persisted[HOST].fingerprint).toBe('CC:DD');
  });

  it('does not block when no fingerprint is available', async () => {
    const { verifyFingerprint } = await loadWith(null);
    expect(verifyFingerprint(HOST, null)).toMatchObject({ trusted: true });
  });
});

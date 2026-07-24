import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Trust-On-First-Use (TOFU) certificate store for the Gemini proxy.
 *
 * Gemini servers commonly use self-signed certificates, so certificate-authority
 * validation is not applicable. Instead we record the fingerprint of the
 * certificate presented the first time we connect to a given host, then compare
 * it on every subsequent connection. A changed fingerprint may indicate a
 * man-in-the-middle attack and is surfaced to the caller.
 *
 * Fingerprints are persisted to disk so trust survives server restarts. If the
 * store location is not writable (e.g. read-only serverless filesystem) the
 * store degrades gracefully to an in-memory map for the lifetime of the process.
 */

const STORE_PATH =
  process.env.GEMINI_TOFU_STORE_PATH ||
  path.join(os.tmpdir(), 'gemini-browser-tofu.json');

// In-memory cache of the on-disk store, keyed by the file's last-modified time
// so edits/deletions to the store file are picked up at runtime (without them,
// clearing a fingerprint to recover from a false alarm would require a restart).
interface CertRecord {
  fingerprint: string;
  validTo: number | null;
}

// The on-disk store may also contain the legacy plain-string form (fingerprint only).
type TofuStore = Record<string, CertRecord | string>;

let cache: TofuStore | null = null;
let cacheMtimeMs: number | null = null;

function loadStore(): TofuStore {
  try {
    const stat = fs.statSync(STORE_PATH);
    // Reuse the cache only if the file is unchanged since we last read it.
    if (cache && cacheMtimeMs === stat.mtimeMs) {
      return cache;
    }
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    cache = parsed && typeof parsed === 'object' ? parsed : {};
    cacheMtimeMs = stat.mtimeMs;
  } catch {
    // No readable file on disk.
    if (cacheMtimeMs !== null) {
      // A store file we previously loaded has since been removed => treat as an
      // intentional reset and drop the cached fingerprints.
      cache = {};
      cacheMtimeMs = null;
    } else if (!cache) {
      // Never had a persisted file (e.g. read-only filesystem): start empty and
      // keep trust in memory for the lifetime of the process.
      cache = {};
    }
  }
  return cache ?? {};
}

function saveStore(store: TofuStore): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store), 'utf8');
    cache = store;
    try {
      cacheMtimeMs = fs.statSync(STORE_PATH).mtimeMs;
    } catch {
      cacheMtimeMs = null;
    }
  } catch (err) {
    // Non-fatal: persistence is best-effort. Trust still works in-memory.
    const message = err instanceof Error ? err.message : String(err);
    console.error('TOFU: failed to persist certificate store:', message);
  }
}

/**
 * Compare a freshly observed certificate fingerprint against the stored one for
 * a host, recording it on first use.
 *
 * A changed fingerprint is treated as a possible MITM and reported as
 * `changed: true` — UNLESS the previously trusted certificate has already
 * expired, in which case the change is accepted as a legitimate certificate
 * rotation and the store is updated (Gemini servers routinely rotate
 * self-signed certs on expiry).
 *
 * @param host - Host identifier (should include port), e.g. "example.org:1965".
 * @param fingerprint - Certificate fingerprint (e.g. SHA-256).
 * @param validTo - Epoch ms when the presented cert expires (optional).
 */
export interface FingerprintVerification {
  trusted: boolean;
  firstUse: boolean;
  changed: boolean;
  rotated?: boolean;
  expected?: string;
  actual?: string;
}

export function verifyFingerprint(
  host: string | null | undefined,
  fingerprint: string | null | undefined,
  validTo: number | null = null
): FingerprintVerification {
  // Without a fingerprint we cannot make a trust decision; do not block.
  if (!host || !fingerprint) {
    return { trusted: true, firstUse: false, changed: false };
  }

  const store = loadStore();
  const known = store[host];

  if (!known) {
    store[host] = { fingerprint, validTo: validTo ?? null };
    saveStore(store);
    return { trusted: true, firstUse: true, changed: false };
  }

  // Support both the current object form and the legacy plain-string form.
  const knownFingerprint = typeof known === 'string' ? known : known.fingerprint;
  const knownValidTo = typeof known === 'string' ? null : known.validTo;

  if (knownFingerprint === fingerprint) {
    return { trusted: true, firstUse: false, changed: false };
  }

  // Fingerprint changed. If the previously trusted certificate has expired,
  // accept the new one as a routine rotation rather than a MITM.
  if (typeof knownValidTo === 'number' && Date.now() > knownValidTo) {
    store[host] = { fingerprint, validTo: validTo ?? null };
    saveStore(store);
    return { trusted: true, firstUse: false, changed: false, rotated: true };
  }

  return {
    trusted: false,
    firstUse: false,
    changed: true,
    expected: knownFingerprint,
    actual: fingerprint,
  };
}

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

// In-memory cache of the on-disk store. Populated lazily.
let cache = null;

function loadStore() {
  if (cache) {
    return cache;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    cache = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Missing or corrupt store starts empty.
    cache = {};
  }
  return cache;
}

function saveStore(store) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store), 'utf8');
  } catch (err) {
    // Non-fatal: persistence is best-effort. Trust still works in-memory.
    console.error('TOFU: failed to persist certificate store:', err.message);
  }
}

/**
 * Compare a freshly observed certificate fingerprint against the stored one for
 * a host, recording it on first use.
 *
 * @param {string} host - Host identifier (should include port), e.g. "example.org:1965".
 * @param {string} fingerprint - Certificate fingerprint (e.g. SHA-256).
 * @returns {{trusted: boolean, firstUse: boolean, changed: boolean, expected?: string, actual?: string}}
 */
export function verifyFingerprint(host, fingerprint) {
  // Without a fingerprint we cannot make a trust decision; do not block.
  if (!host || !fingerprint) {
    return { trusted: true, firstUse: false, changed: false };
  }

  const store = loadStore();
  const known = store[host];

  if (!known) {
    store[host] = fingerprint;
    saveStore(store);
    return { trusted: true, firstUse: true, changed: false };
  }

  if (known === fingerprint) {
    return { trusted: true, firstUse: false, changed: false };
  }

  return {
    trusted: false,
    firstUse: false,
    changed: true,
    expected: known,
    actual: fingerprint,
  };
}

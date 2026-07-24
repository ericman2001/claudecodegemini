import { resolveGeminiUrl } from '../urlResolver';

describe('resolveGeminiUrl', () => {
  const base = 'gemini://example.org/dir/page.gmi';

  it('returns absolute gemini:// URLs unchanged', () => {
    expect(resolveGeminiUrl('gemini://other.org/foo', base)).toBe(
      'gemini://other.org/foo'
    );
  });

  it('resolves root-relative URLs against the current host', () => {
    expect(resolveGeminiUrl('/about', base)).toBe('gemini://example.org/about');
  });

  it('resolves relative URLs against the current directory', () => {
    expect(resolveGeminiUrl('sibling.gmi', base)).toBe(
      'gemini://example.org/dir/sibling.gmi'
    );
  });

  it('resolves relative URLs against a directory base ending in /', () => {
    expect(resolveGeminiUrl('child.gmi', 'gemini://example.org/dir/')).toBe(
      'gemini://example.org/dir/child.gmi'
    );
  });

  it('leaves non-gemini absolute URLs (with a scheme) untouched', () => {
    expect(resolveGeminiUrl('https://example.com/page', base)).toBe(
      'https://example.com/page'
    );
  });

  it('throws on an invalid current URL for root-relative targets', () => {
    expect(() => resolveGeminiUrl('/about', 'not a url')).toThrow(
      'Invalid URL format'
    );
  });
});

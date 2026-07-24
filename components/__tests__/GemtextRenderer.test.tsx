import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GemtextRenderer from '../GemtextRenderer';

describe('GemtextRenderer', () => {
  it('renders headers at the correct levels', () => {
    render(
      <GemtextRenderer
        content={'# Title\n## Section\n### Subsection'}
        onLinkClick={jest.fn()}
      />
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Section');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Subsection');
  });

  it('renders internal gemini links and invokes onLinkClick without leaving the page', async () => {
    const onLinkClick = jest.fn();
    render(
      <GemtextRenderer
        content={'=> /page Internal page'}
        onLinkClick={onLinkClick}
      />
    );
    const link = screen.getByRole('link', { name: /Internal page/ });
    // Internal links stay in-app: no target=_blank, click is intercepted.
    expect(link).toHaveAttribute('href', '#');
    expect(link).not.toHaveAttribute('target');

    await userEvent.click(link);
    expect(onLinkClick).toHaveBeenCalledWith('/page');
  });

  it('renders external (non-gemini) links as new-tab anchors and does not proxy them', async () => {
    const onLinkClick = jest.fn();
    render(
      <GemtextRenderer
        content={'=> https://example.com Example site'}
        onLinkClick={onLinkClick}
      />
    );
    const link = screen.getByRole('link', { name: /Example site/ });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));

    await userEvent.click(link);
    expect(onLinkClick).not.toHaveBeenCalled();
  });

  it('uses the URL as link text when no description is given', () => {
    render(
      <GemtextRenderer content={'=> gemini://example.org/foo'} onLinkClick={jest.fn()} />
    );
    expect(
      screen.getByRole('link', { name: /gemini:\/\/example\.org\/foo/ })
    ).toBeInTheDocument();
  });

  it('renders preformatted blocks verbatim inside pre/code', () => {
    const { container } = render(
      <GemtextRenderer
        content={'```\nline one\n  indented two\n```'}
        onLinkClick={jest.fn()}
      />
    );
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    const code = pre?.querySelector('code');
    expect(code).not.toBeNull();
    expect(code).toHaveTextContent('line one');
    // Fence lines themselves are not rendered as content.
    expect(code?.textContent).not.toContain('```');
  });

  it('flushes an unterminated preformatted block so its content is not dropped', () => {
    const { container } = render(
      <GemtextRenderer content={'```\nunclosed body'} onLinkClick={jest.fn()} />
    );
    const code = container.querySelector('pre code');
    expect(code).toHaveTextContent('unclosed body');
  });

  it('shows a truncation notice when content exceeds the rendered-line cap', () => {
    const bigContent = Array.from({ length: 5001 }, (_, i) => `line ${i}`).join('\n');
    render(<GemtextRenderer content={bigContent} onLinkClick={jest.fn()} />);
    expect(screen.getByText(/Content truncated/i)).toBeInTheDocument();
  });

  it('does not show a truncation notice for small content', () => {
    render(<GemtextRenderer content={'# Small'} onLinkClick={jest.fn()} />);
    expect(screen.queryByText(/Content truncated/i)).not.toBeInTheDocument();
  });
});

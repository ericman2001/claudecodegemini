import { ExternalLink } from 'lucide-react';

/**
 * GemtextRenderer Component
 * 
 * Parses and renders Gemtext format (the markup language used by Gemini protocol)
 * into HTML elements with appropriate styling.
 * 
 * Supports the following Gemtext elements:
 * - Headers (# ## ###)
 * - Links (=>)
 * - Lists (*)
 * - Quotes (>)
 * - Preformatted text (```)
 * - Regular paragraphs
 * 
 * @param {string} content - Raw Gemtext content to render
 * @param {Function} onLinkClick - Callback function for handling link clicks
 */
const GemtextRenderer = ({ content, onLinkClick }) => {
  // Split content into individual lines for parsing
  const lines = content.split('\n');
  const elements = [];
  
  // Track preformatted block state
  let inPreformatted = false;
  let preformattedContent = [];

  // Parse each line according to Gemtext format rules
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle preformatted text blocks (```)
    if (line.startsWith('```')) {
      if (inPreformatted) {
        elements.push(
          <pre key={i} className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm font-mono mb-4">
            <code>{preformattedContent.join('\n')}</code>
          </pre>
        );
        preformattedContent = [];
        inPreformatted = false;
      } else {
        inPreformatted = true;
      }
      continue;
    }

    // Collect lines inside preformatted blocks
    if (inPreformatted) {
      preformattedContent.push(line);
      continue;
    }

    // Parse link lines (=> URL optional text)
    if (line.startsWith('=>')) {
      const linkMatch = line.slice(2).trim();
      const parts = linkMatch.split(/\s+/);
      const url = parts[0];
      const text = parts.length > 1 ? parts.slice(1).join(' ') : url; // Use URL as text if no text provided
      
      elements.push(
        <div key={i} className="mb-2">
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              onLinkClick(url);
            }}
            className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
          >
            <ExternalLink size={14} />
            {text}
          </a>
        </div>
      );
    }
    // Parse headers - check in order of specificity (### before ## before #)
    else if (line.startsWith('###')) {
      elements.push(<h3 key={i} className="text-lg font-semibold mb-2 mt-4">{line.slice(3).trim()}</h3>);
    }
    else if (line.startsWith('##')) {
      elements.push(<h2 key={i} className="text-xl font-bold mb-3 mt-4">{line.slice(2).trim()}</h2>);
    }
    else if (line.startsWith('#')) {
      elements.push(<h1 key={i} className="text-2xl font-bold mb-4 mt-4">{line.slice(1).trim()}</h1>);
    }
    // Parse list items
    else if (line.startsWith('*')) {
      elements.push(<li key={i} className="ml-4 mb-1">{line.slice(1).trim()}</li>);
    }
    // Parse quotes
    else if (line.startsWith('>')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
          {line.slice(1).trim()}
        </blockquote>
      );
    }
    // Handle regular text paragraphs
    else if (line.trim()) {
      elements.push(<p key={i} className="mb-3">{line}</p>);
    }
    // Empty lines become spacers
    else {
      elements.push(<div key={i} className="mb-2"></div>);
    }
  }

  // Render all parsed elements with prose styling
  return <div className="prose max-w-none">{elements}</div>;
};

export default GemtextRenderer;
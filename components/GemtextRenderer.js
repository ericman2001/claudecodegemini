import { ExternalLink } from 'lucide-react';

const GemtextRenderer = ({ content, onLinkClick }) => {
  const lines = content.split('\n');
  const elements = [];
  let inPreformatted = false;
  let preformattedContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
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

    if (inPreformatted) {
      preformattedContent.push(line);
      continue;
    }

    if (line.startsWith('=>')) {
      const linkMatch = line.slice(2).trim();
      const parts = linkMatch.split(/\s+/);
      const url = parts[0];
      const text = parts.length > 1 ? parts.slice(1).join(' ') : url;
      
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
    else if (line.startsWith('###')) {
      elements.push(<h3 key={i} className="text-lg font-semibold mb-2 mt-4">{line.slice(3).trim()}</h3>);
    }
    else if (line.startsWith('##')) {
      elements.push(<h2 key={i} className="text-xl font-bold mb-3 mt-4">{line.slice(2).trim()}</h2>);
    }
    else if (line.startsWith('#')) {
      elements.push(<h1 key={i} className="text-2xl font-bold mb-4 mt-4">{line.slice(1).trim()}</h1>);
    }
    else if (line.startsWith('*')) {
      elements.push(<li key={i} className="ml-4 mb-1">{line.slice(1).trim()}</li>);
    }
    else if (line.startsWith('>')) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-2">
          {line.slice(1).trim()}
        </blockquote>
      );
    }
    else if (line.trim()) {
      elements.push(<p key={i} className="mb-3">{line}</p>);
    }
    else {
      elements.push(<div key={i} className="mb-2"></div>);
    }
  }

  return <div className="prose max-w-none">{elements}</div>;
};

export default GemtextRenderer;
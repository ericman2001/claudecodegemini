import { X, ExternalLink } from 'lucide-react';
import pkg from '../package.json';

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Dependency {
  name: string;
  version: string;
  license: string;
}

// Combined dependency map so we can read versions straight from package.json
// and never let this table drift out of sync with the manifest.
const allDeps: Record<string, string> = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

// SPDX license of each package we surface in the About dialog. Only packages
// listed here are shown; versions are always read from package.json above.
const DISPLAYED_LICENSES: Record<string, string> = {
  '@derhuerst/gemini': 'ISC',
  'lucide-react': 'ISC',
  next: 'MIT',
  react: 'MIT',
  'react-dom': 'MIT',
  autoprefixer: 'MIT',
  postcss: 'MIT',
  tailwindcss: 'MIT',
};

const dependencies: Dependency[] = Object.entries(DISPLAYED_LICENSES)
  .filter(([name]) => name in allDeps)
  .map(([name, license]) => ({ name, version: allDeps[name], license }));

/**
 * AboutDialog Component
 *
 * Displays information about the Gemini Browser application including:
 * - Application description
 * - Credits for developers
 * - Dependencies and their licenses (versions read from package.json)
 * - Application license
 */
const AboutDialog = ({ isOpen, onClose }: AboutDialogProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">About Gemini Browser</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Application Info */}
              <section>
                <h3 className="text-lg font-semibold mb-2">What is Gemini Browser?</h3>
                <p className="text-gray-600">
                  Gemini Browser is a web-based client for exploring Geminispace, built with Next.js 
                  and React. It allows you to browse Gemini protocol content through a familiar web 
                  interface, complete with navigation controls and proper Gemtext rendering.
                </p>
              </section>

              {/* Credits */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Credits</h3>
                <div className="space-y-1 text-gray-600">
                  <p>
                    <strong>Primary Development:</strong> Claude (Anthropic&apos;s AI Assistant) 🤖
                  </p>
                  <p>
                    <strong>Human Collaboration:</strong> The repository owner who provided guidance, 
                    debugging assistance, and the vision for this project 🧑‍💻
                  </p>
                  <p className="text-sm mt-2 italic">
                    &quot;Thanks Claude!&quot; - Human collaborator
                  </p>
                </div>
              </section>

              {/* Dependencies */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Dependencies & Licenses</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="pb-2">Package</th>
                        <th className="pb-2">Version</th>
                        <th className="pb-2">License</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {dependencies.map((dep) => (
                        <tr key={dep.name}>
                          <td className="py-2 font-mono text-xs">{dep.name}</td>
                          <td className="py-2 text-gray-600">{dep.version}</td>
                          <td className="py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {dep.license}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* License */}
              <section>
                <h3 className="text-lg font-semibold mb-2">License</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-semibold mb-2">MIT License</p>
                  <p className="text-sm text-gray-600">
                    This project is licensed under the MIT License, which means you are free to use, 
                    modify, and distribute this software for any purpose, provided you include the 
                    original copyright notice and license terms.
                  </p>
                  <a 
                    href="https://github.com/ericman2001/claudecodegemini/blob/main/LICENSE"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View full license <ExternalLink size={14} />
                  </a>
                </div>
              </section>

              {/* Links */}
              <section>
                <h3 className="text-lg font-semibold mb-2">Learn More</h3>
                <div className="flex gap-4">
                  <a 
                    href="https://github.com/ericman2001/claudecodegemini"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    GitHub Repository <ExternalLink size={14} />
                  </a>
                  <a 
                    href="https://geminiprotocol.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Gemini Protocol <ExternalLink size={14} />
                  </a>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutDialog;
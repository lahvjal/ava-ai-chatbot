import Head from 'next/head';
import { useEffect } from 'react';

export default function EmbedDemo() {
  useEffect(() => {
    // Load the embed script dynamically
    const script = document.createElement('script');
    script.src = '/embed/ava-widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src="/embed/ava-widget.js"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Remove widget elements
      const button = document.getElementById('ava-chat-button');
      const widget = document.getElementById('ava-chat-widget');
      if (button) button.remove();
      if (widget) widget.remove();
    };
  }, []);

  return (
    <>
      <Head>
        <title>Ava Widget Demo - Aveyo Solar</title>
        <meta name="description" content="Demo page showing the Ava chat widget embedded on a website" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">Demo Website</h1>
              </div>
              <nav className="hidden md:flex space-x-8">
                <a href="#" className="text-gray-500 hover:text-gray-900">Home</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">About</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">Services</a>
                <a href="#" className="text-gray-500 hover:text-gray-900">Contact</a>
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-blue-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-6">
                Ava Widget Embed Demo
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                This page demonstrates how the Ava chat widget appears on external websites
              </p>
              <div className="bg-blue-500 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold mb-4">How to Test:</h3>
                <ol className="text-left space-y-2">
                  <li>1. Look for the blue chat button in the bottom-right corner</li>
                  <li>2. Click the button to open the chat widget</li>
                  <li>3. Ask Ava questions about solar installations</li>
                  <li>4. Test the responsive design on different screen sizes</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Integration Instructions
                </h3>
                <div className="bg-gray-900 rounded-lg p-6 text-green-400 font-mono text-sm">
                  <div className="text-gray-400 mb-2">// Add to your website:</div>
                  <div>&lt;script src="https://your-domain.com/embed/ava-widget.js"&gt;&lt;/script&gt;</div>
                </div>
                <p className="mt-4 text-gray-600">
                  Just add this single line of code before the closing &lt;/body&gt; tag 
                  on any website to embed the Ava chat widget.
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Widget Features
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span>Floating chat button with smooth animations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span>Responsive design for all screen sizes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span>AI-powered solar installation assistance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span>No dependencies or framework requirements</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-3">✓</span>
                    <span>CORS enabled for cross-domain embedding</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-4">Ava Solar Assistant</h4>
              <p className="text-gray-400">
                Powered by Aveyo Solar - Making solar installation simple and accessible
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

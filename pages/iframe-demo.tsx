import Head from 'next/head';
import { useEffect } from 'react';

export default function IframeDemo() {
  useEffect(() => {
    // Load the iframe embed script dynamically
    const script = document.createElement('script');
    script.src = '/embed/iframe-embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector('script[src="/embed/iframe-embed.js"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Remove widget elements
      const button = document.getElementById('ava-iframe-button');
      const widget = document.getElementById('ava-iframe-widget');
      if (button) button.remove();
      if (widget) widget.remove();
    };
  }, []);

  return (
    <>
      <Head>
        <title>iframe Widget Demo - Ava Solar Assistant</title>
        <meta name="description" content="Demo page showing the Ava iframe chat widget embedded on a website" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">iframe Demo Website</h1>
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
                Ava iframe Widget Demo
              </h2>
              <p className="text-xl mb-8 text-blue-100">
                This page demonstrates the iframe-based embedded chat widget
              </p>
              <div className="bg-blue-500 rounded-lg p-6 max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold mb-4">✨ New iframe Features:</h3>
                <ol className="text-left space-y-2">
                  <li>1. 🔘 Look for the blue chat button in the bottom-right corner</li>
                  <li>2. 💬 Click to open the iframe chat widget</li>
                  <li>3. ❌ Use the close button inside the widget to collapse it</li>
                  <li>4. 🚀 No CORS issues - everything works seamlessly!</li>
                  <li>5. 🔐 Full authentication and project lookup functionality</li>
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
                  iframe vs Script Widget
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">✅ iframe Widget (This Demo)</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• No CORS issues</li>
                      <li>• Full authentication works</li>
                      <li>• Secure sandboxed environment</li>
                      <li>• Easy maintenance and updates</li>
                      <li>• Close button functionality</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Script Widget (Legacy)</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• CORS complexity</li>
                      <li>• Authentication challenges</li>
                      <li>• Cross-origin limitations</li>
                      <li>• More complex integration</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Integration Code
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">iframe Embed (Recommended):</h4>
                    <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                      <div className="text-gray-400 mb-1">{'<!-- Add to any website -->'}</div>
                      <div>{'<script src="http://localhost:3000/embed/iframe-embed.js"></script>'}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Script Embed (Legacy):</h4>
                    <div className="bg-gray-900 rounded-lg p-4 text-yellow-400 font-mono text-sm overflow-x-auto">
                      <div className="text-gray-400 mb-1">{'<!-- Legacy approach -->'}</div>
                      <div>{'<script src="http://localhost:3000/embed/ava-widget.js"></script>'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              iframe Widget Features
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h4 className="font-semibold mb-2">Secure Authentication</h4>
                <p className="text-gray-600 text-sm">Full login functionality with no CORS issues</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <h4 className="font-semibold mb-2">Project Lookup</h4>
                <p className="text-gray-600 text-sm">Access project data and personalized responses</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <h4 className="font-semibold mb-2">Real-time Chat</h4>
                <p className="text-gray-600 text-sm">AI-powered responses with full functionality</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testing Instructions */}
        <section className="py-16 bg-gray-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                🧪 Testing Instructions
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">1</span>
                  <div>
                    <h4 className="font-semibold">Open the Widget</h4>
                    <p className="text-gray-600">Click the blue chat button in the bottom-right corner</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">2</span>
                  <div>
                    <h4 className="font-semibold">Test Authentication</h4>
                    <p className="text-gray-600">Click "Login" and use your credentials - no CORS errors!</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">3</span>
                  <div>
                    <h4 className="font-semibold">Try Project Lookup</h4>
                    <p className="text-gray-600">After login, use "Project Status" to lookup project information</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">4</span>
                  <div>
                    <h4 className="font-semibold">Test Chat Functionality</h4>
                    <p className="text-gray-600">Ask questions and verify AI responses work normally</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">5</span>
                  <div>
                    <h4 className="font-semibold">Use Close Button</h4>
                    <p className="text-gray-600">Click the ❌ close button inside the widget to collapse it</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-4">Ava Solar Assistant - iframe Demo</h4>
              <p className="text-gray-400">
                Powered by Aveyo Solar - iframe-based embedding for seamless integration
              </p>
              <div className="mt-4 space-x-4">
                <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                  ✅ No CORS Issues
                </span>
                <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  🔒 Secure iframe
                </span>
                <span className="inline-block bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                  ⚡ Full Functionality
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

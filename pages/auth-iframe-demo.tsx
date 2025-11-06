import { useState } from 'react';
import Head from 'next/head';

export default function AuthIframeDemo() {
  const [sessionData, setSessionData] = useState({
    email: 'demo@example.com',
    userId: 'user123',
    name: 'John Doe',
    token: 'demo-token-123',
    customData: { role: 'customer', plan: 'premium' }
  });

  const [isWidgetLoaded, setIsWidgetLoaded] = useState(false);

  const handleSetSession = () => {
    if (window.AvaAuth) {
      window.AvaAuth.setSession(sessionData);
    } else {
      alert('Ava widget not loaded yet. Please wait a moment and try again.');
    }
  };

  const handleClearSession = () => {
    if (window.AvaAuth) {
      window.AvaAuth.clearSession();
    }
  };

  const handleOpenWidget = () => {
    if (window.AvaAuth) {
      window.AvaAuth.open();
    }
  };

  const handleCloseWidget = () => {
    if (window.AvaAuth) {
      window.AvaAuth.close();
    }
  };

  const updateSessionField = (field: string, value: string) => {
    setSessionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <>
      <Head>
        <title>Authenticated Iframe Demo - Ava AI</title>
        <meta name="description" content="Demo of authenticated iframe embedding for Ava AI" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <script 
          src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"
          onLoad={() => setIsWidgetLoaded(true)}
        ></script>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Authenticated Iframe Demo
            </h1>
            
            <div className="mb-8">
              <p className="text-gray-600 mb-4">
                This demo shows how to embed the Ava AI chatbot with authentication pass-through 
                from your parent website. The chatbot will automatically be authenticated with 
                the session data you provide.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                <ol className="list-decimal list-inside text-blue-800 space-y-1">
                  <li>Load the authenticated embed script on your website</li>
                  <li>Set session data using <code className="bg-blue-100 px-1 rounded">window.AvaAuth.setSession()</code></li>
                  <li>The chatbot automatically authenticates the user</li>
                  <li>Users can access their project information without additional login</li>
                </ol>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Session Configuration */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Session Configuration</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={sessionData.email}
                      onChange={(e) => updateSessionField('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={sessionData.userId}
                      onChange={(e) => updateSessionField('userId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={sessionData.name}
                      onChange={(e) => updateSessionField('name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Token
                    </label>
                    <input
                      type="text"
                      value={sessionData.token}
                      onChange={(e) => updateSessionField('token', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Widget Controls</h2>
                
                <div className="space-y-3">
                  <button
                    onClick={handleSetSession}
                    disabled={!isWidgetLoaded}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Set Session Data
                  </button>
                  
                  <button
                    onClick={handleClearSession}
                    disabled={!isWidgetLoaded}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Clear Session
                  </button>
                  
                  <button
                    onClick={handleOpenWidget}
                    disabled={!isWidgetLoaded}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Open Widget
                  </button>
                  
                  <button
                    onClick={handleCloseWidget}
                    disabled={!isWidgetLoaded}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Close Widget
                  </button>
                </div>
                
                {!isWidgetLoaded && (
                  <div className="mt-4 text-sm text-gray-500">
                    Loading widget...
                  </div>
                )}
              </div>
            </div>

            {/* Code Example */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">Integration Code</h2>
              
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm">
{`<!-- 1. Include the authenticated embed script -->
<script src="https://ava-ai-chatbot.vercel.app/embed/ava-auth-embed.js"></script>

<script>
// 2. Set session data when user logs in to your website
window.AvaAuth.setSession({
  email: 'user@example.com',
  userId: 'user123',
  name: 'John Doe',
  token: 'your-auth-token',
  customData: { role: 'customer', plan: 'premium' }
});

// 3. Optional: Programmatically control the widget
window.AvaAuth.open();    // Open widget
window.AvaAuth.close();   // Close widget
window.AvaAuth.clearSession(); // Clear session
</script>`}
                </pre>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Try it out:</h3>
              <ol className="list-decimal list-inside text-yellow-800 space-y-1">
                <li>Modify the session data above</li>
                <li>Click "Set Session Data"</li>
                <li>Click the floating Ava button (bottom right) or use "Open Widget"</li>
                <li>Notice the chatbot is pre-authenticated with your session data</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    AvaAuth: {
      setSession: (data: any) => void;
      clearSession: () => void;
      getSession: () => any;
      open: () => void;
      close: () => void;
      isOpen: () => boolean;
    };
  }
}

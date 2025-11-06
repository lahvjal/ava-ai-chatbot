import { useState } from 'react';
import Head from 'next/head';
import PortalChatWidget from '../components/PortalChatWidget';

export default function PortalDemo() {
  const [selectedUser, setSelectedUser] = useState({
    email: 'john.doe@example.com',
    name: 'John Doe',
    id: 'user_123'
  });

  const [isChatOpen, setIsChatOpen] = useState(false);

  // Mock user data for demo purposes
  const mockUsers = [
    { email: 'john.doe@example.com', name: 'John Doe', id: 'user_123' },
    { email: 'jane.smith@example.com', name: 'Jane Smith', id: 'user_456' },
    { email: 'mike.johnson@example.com', name: 'Mike Johnson', id: 'user_789' },
  ];

  return (
    <>
      <Head>
        <title>Portal Integration Demo - Ava AI</title>
        <meta name="description" content="Demo of Ava AI integrated into customer portal" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Mock Portal Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <img src="/ava-logo.svg" alt="Aveyo" className="h-8" />
                <h1 className="text-xl font-semibold text-gray-900">Customer Portal</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Welcome, {selectedUser.name}</span>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {selectedUser.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mock Portal Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Demo Controls */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Demo Controls</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Simulate User
                    </label>
                    <select
                      value={selectedUser.email}
                      onChange={(e) => {
                        const user = mockUsers.find(u => u.email === e.target.value);
                        if (user) setSelectedUser(user);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {mockUsers.map(user => (
                        <option key={user.id} value={user.email}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Chat Status</h3>
                    <p className="text-sm text-gray-600">
                      Chat is {isChatOpen ? 'open' : 'closed'}
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Integration Info</h3>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>API Endpoint:</strong> /api/portal-chat</p>
                      <p><strong>User Email:</strong> {selectedUser.email}</p>
                      <p><strong>User Name:</strong> {selectedUser.name}</p>
                      <p><strong>User ID:</strong> {selectedUser.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mock Dashboard Content */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Dashboard</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900">Current Status</h3>
                      <p className="text-blue-700 text-sm mt-1">Installation in Progress</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-medium text-green-900">Next Step</h3>
                      <p className="text-green-700 text-sm mt-1">Final Inspection</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Portal Integration Demo</h2>
                  <div className="prose text-gray-600">
                    <p>
                      This demonstrates how Ava AI can be integrated into your existing customer portal.
                      The chat widget appears in the bottom-right corner and automatically knows who the
                      logged-in user is.
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">Key Features:</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>No authentication required - uses portal's existing auth</li>
                      <li>Automatically accesses user's project information</li>
                      <li>Customizable styling to match your portal</li>
                      <li>Seamless integration with existing user session</li>
                      <li>Full access to Ava's knowledge base and AI capabilities</li>
                    </ul>
                    
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800">
                        <strong>Try it out:</strong> Click the chat button in the bottom-right corner to start
                        a conversation with Ava. She already knows who you are and can access your project information!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Portal Chat Widget */}
        <PortalChatWidget
          userEmail={selectedUser.email}
          userName={selectedUser.name}
          userId={selectedUser.id}
          apiEndpoint="/api/portal-chat"
          onToggle={setIsChatOpen}
          headerColor="#2563eb"
          accentColor="#3b82f6"
        />
      </div>
    </>
  );
}

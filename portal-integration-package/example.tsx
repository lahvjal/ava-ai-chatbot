import React from 'react';
import PortalChatWidget from './components/PortalChatWidget';

// Example integration in your portal
function CustomerPortal() {
  // Get user from your auth system
  const user = {
    email: 'customer@example.com',
    name: 'John Doe',
    id: 'user_123'
  };

  return (
    <div className="portal-container">
      {/* Your portal content */}
      <h1>Customer Portal</h1>
      
      {/* Ava Chat Widget */}
      <PortalChatWidget
        userEmail={user.email}
        userName={user.name}
        userId={user.id}
        apiEndpoint="https://ava-ai-chatbot.vercel.app/api/portal-chat"
        headerColor="#2563eb"
        accentColor="#3b82f6"
      />
    </div>
  );
}

export default CustomerPortal;

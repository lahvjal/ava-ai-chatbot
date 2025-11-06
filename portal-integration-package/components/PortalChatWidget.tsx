import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PortalChatWidgetProps {
  // User information passed from the portal
  userEmail: string;
  userName?: string;
  userId?: string;
  
  // Optional configuration
  apiEndpoint?: string;
  isMinimized?: boolean;
  onToggle?: (isOpen: boolean) => void;
  
  // Styling options
  className?: string;
  headerColor?: string;
  accentColor?: string;
}

const PortalChatWidget: React.FC<PortalChatWidgetProps> = ({
  userEmail,
  userName,
  userId,
  apiEndpoint = 'https://ava-ai-chatbot.vercel.app/api/chat',
  isMinimized = false,
  onToggle,
  className = '',
  headerColor = '#2563eb',
  accentColor = '#3b82f6'
}) => {
  const [isOpen, setIsOpen] = useState(!isMinimized);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('🔗 [PORTAL-CHAT] Sending message to API:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass user information in headers for the portal integration
          'X-Portal-User-Email': userEmail,
          'X-Portal-User-Name': userName || '',
          'X-Portal-User-Id': userId || '',
        },
        body: JSON.stringify({
          message: inputValue,
          conversationHistory: messages,
          portalUser: {
            email: userEmail,
            name: userName,
            id: userId
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('❌ [PORTAL-CHAT] Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact customer support at (385) 469-3838.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={handleToggle}
          className="rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
          style={{ backgroundColor: headerColor }}
        >
          <MessageCircle size={24} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 ${className}`} style={{ width: '350px', height: '500px' }}>
      {/* Header */}
      <div 
        className="text-white p-4 rounded-t-lg flex items-center justify-between"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center space-x-2">
          <img src="https://ava-ai-chatbot.vercel.app/ava-logo.svg" alt='Ava Logo' className='w-20 h-5' />
        </div>
        <button
          onClick={handleToggle}
          className="hover:bg-opacity-80 p-1 rounded"
        >
          <X size={18} />
        </button>
      </div>

      {/* Welcome message for portal users */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <p className="text-sm text-blue-800">
          Welcome{userName ? ` ${userName}` : ''}! I can help you with your solar project questions.
        </p>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-4">
            <img src="https://ava-ai-chatbot.vercel.app/ava-logo-button.svg" alt='Ava Logo' className='w-16 h-16' />
            <p>Hi{userName ? ` ${userName}` : ''}! I'm Ava from Aveyo. I can help you with your solar installation questions and project status.</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start items-start space-x-2'}`}
          >
            {message.role === 'assistant' && (
              <img 
                src="https://ava-ai-chatbot.vercel.app/ava-logo-button.svg" 
                alt="Ava Logo" 
                className="w-8 h-8 flex-shrink-0 mt-1" 
              />
            )}
            <div
              className={`${
                message.role === 'user' 
                  ? 'max-w-xs lg:max-w-md' 
                  : 'max-w-sm lg:max-w-lg xl:max-w-xl'
              } px-4 py-2 rounded-lg ${
                message.role === 'user' 
                  ? 'text-white ml-auto' 
                  : 'bg-gray-100 text-gray-800'
              }`}
              style={message.role === 'user' ? { backgroundColor: accentColor } : {}}
            >
              <div 
                className="text-sm"
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start items-start space-x-2">
            <img 
              src="https://ava-ai-chatbot.vercel.app/ava-logo-button.svg" 
              alt="Ava Logo" 
              className="w-8 h-8 flex-shrink-0 mt-1 animate-spin" 
            />
            <div className="bg-gray-100 text-gray-800 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me about your solar project..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default PortalChatWidget;

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, User, LogIn, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  isEmbedded?: boolean;
  apiEndpoint?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  isEmbedded = false, 
  apiEndpoint = '/api/chat' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showProjectLookup, setShowProjectLookup] = useState(false);
  const [projectEmail, setProjectEmail] = useState('');
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for existing auth session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        console.log('🔐 [AUTH] Found existing session:', session.user.email);
      }
    };
    
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 [AUTH] State change:', event, session?.user?.email);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        console.error('❌ [AUTH] Login error:', error);
        // Add error message to chat
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Login failed: ${error.message}. Please check your credentials or contact support.`,
          timestamp: new Date()
        }]);
      } else {
        console.log('✅ [AUTH] Login successful:', data.user?.email);
        setShowLogin(false);
        setLoginEmail('');
        setLoginPassword('');
        // Add success message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Welcome back! I can now access your project information. How can I help you today?`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('❌ [AUTH] Login exception:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessages([]);
    console.log('🔐 [AUTH] Logged out');
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add auth token if user is logged in
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: inputValue,
          conversationHistory: messages,
          projectLookup: projectEmail ? { email: projectEmail } : undefined
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearProjectForm = () => {
    setProjectEmail('');
    setShowProjectLookup(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isEmbedded && !isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
        >
          <MessageCircle size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className={`${isEmbedded ? 'fixed bottom-4 right-4 z-50' : 'w-full max-w-md mx-auto'} bg-white rounded-lg shadow-xl border border-gray-200`}>
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageCircle size={20} />
          <h3 className="font-semibold">Ava - Aveyo Solar Assistant</h3>
        </div>
        {isEmbedded && (
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-blue-700 p-1 rounded"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>Hi! I'm Ava from Aveyo. I'm here to help you with your solar installation questions!</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
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

      {/* Login Form */}
      {showLogin && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Customer Login</h4>
            <button
              onClick={() => setShowLogin(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="Your email address"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            ℹ️ Login to access your project information and get personalized assistance
          </div>
        </div>
      )}

      {/* Project Lookup Form */}
      {showProjectLookup && user && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Project Lookup</h4>
            <button
              onClick={clearProjectForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Email Address"
              value={projectEmail}
              onChange={(e) => setProjectEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {projectEmail && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
              ✓ Email will be used to lookup your project
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          {!user ? (
            <button
              onClick={() => setShowLogin(true)}
              className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center space-x-1"
            >
              <LogIn size={12} />
              <span>Login</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowProjectLookup(!showProjectLookup)}
                className={`text-xs px-2 py-1 rounded ${
                  showProjectLookup 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } transition-colors`}
              >
                📋 Project Status
              </button>
              <button
                onClick={handleLogout}
                className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                Logout
              </button>
            </>
          )}
          {projectEmail && (
            <span className="text-xs text-blue-600 font-medium">
              Email ready
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about solar installation..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 transition-colors duration-200"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

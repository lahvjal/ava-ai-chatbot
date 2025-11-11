import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, User, LogIn, MessageCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PreAuthenticatedUser {
  email?: string;
  userId?: string;
  name?: string;
  customData?: any;
}

interface ChatWidgetProps {
  isEmbedded?: boolean;
  apiEndpoint?: string;
  actingAsEmail?: string | null;
  preAuthenticatedUser?: PreAuthenticatedUser | null;
  forceOpen?: boolean;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  isEmbedded = false, 
  apiEndpoint = '/api/chat',
  actingAsEmail = null,
  preAuthenticatedUser = null,
  forceOpen = false,
}) => {
  // Always use Vercel domain for API calls when embedded
  const resolvedApiEndpoint = apiEndpoint.startsWith('/') 
    ? `https://ava-ai-chatbot.vercel.app${apiEndpoint}` 
    : apiEndpoint;
  const [isOpen, setIsOpen] = useState(forceOpen);
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
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Conversation persistence functions
  const saveConversation = (msgs: Message[]) => {
    try {
      sessionStorage.setItem('ava-chat-messages', JSON.stringify(msgs));
    } catch (error) {
      console.warn('Failed to save conversation to sessionStorage:', error);
    }
  };

  const loadConversation = (): Message[] => {
    try {
      const saved = sessionStorage.getItem('ava-chat-messages');
      if (!saved) return [];
      
      const messages = JSON.parse(saved);
      // Convert timestamp strings back to Date objects
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.warn('Failed to load conversation from sessionStorage:', error);
      return [];
    }
  };

  const clearConversation = () => {
    try {
      sessionStorage.removeItem('ava-chat-messages');
    } catch (error) {
      console.warn('Failed to clear conversation from sessionStorage:', error);
    }
  };

  // Custom function to update messages and save to sessionStorage
  const updateMessages = (updater: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const newMessages = updater(prev);
      saveConversation(newMessages);
      return newMessages;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for existing auth session or pre-authenticated user
  useEffect(() => {
    const checkSession = async () => {
      // Load saved conversation first
      const savedMessages = loadConversation();
      const hasExistingConversation = savedMessages.length > 0;
      
      if (hasExistingConversation) {
        setMessages(savedMessages);
        console.log('🔄 [CHAT] Loaded saved conversation with', savedMessages.length, 'messages');
      }
      
      // If we have a pre-authenticated user, use that instead of checking Supabase
      if (preAuthenticatedUser?.email) {
        console.log('🔐 [AUTH] Using pre-authenticated user:', preAuthenticatedUser.email);
        setUser({
          id: preAuthenticatedUser.userId || preAuthenticatedUser.email,
          email: preAuthenticatedUser.email,
          user_metadata: {
            name: preAuthenticatedUser.name,
            customData: preAuthenticatedUser.customData
          }
        });
        
        // Add welcome message for pre-authenticated user only if no saved messages
        if (!hasExistingConversation) {
          const welcomeMessage = [{
            role: 'assistant' as const,
            content: `Hello${preAuthenticatedUser.name ? ` ${preAuthenticatedUser.name}` : ''}! I'm Ava, and I can see you're logged in. I'm here to help you with your solar installation questions and project updates.`,
            timestamp: new Date()
          }];
          setMessages(welcomeMessage);
          saveConversation(welcomeMessage);
        }
        return;
      }
      
      // Otherwise check for existing Supabase session
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
  }, [preAuthenticatedUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🔐 [AUTH] Attempting login via API endpoint...');
      
      // Use API endpoint for authentication instead of direct Supabase client
      const apiUrl = 'https://ava-ai-chatbot.vercel.app/api/auth/login';
      console.log('🔗 [AUTH] Using API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('❌ [AUTH] Login failed:', result.error);
        updateMessages(prev => [...prev, {
          role: 'assistant',
          content: `Login failed: ${result.error || 'Invalid credentials'}. Please check your email and password or contact support.`,
          timestamp: new Date()
        }]);
      } else {
        console.log('✅ [AUTH] Login successful via API:', result.user?.email);
        
        // Set the session in Supabase client
        if (result.access_token) {
          await supabase.auth.setSession({
            access_token: result.access_token,
            refresh_token: result.refresh_token || result.access_token
          });
        }
        
        setShowLogin(false);
        setLoginEmail('');
        setLoginPassword('');
        
        // Add success message
        updateMessages(prev => [...prev, {
          role: 'assistant',
          content: `Welcome back! I can now access your project information. How can I help you today?`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('❌ [AUTH] Login exception:', error);
      updateMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Login failed due to a network error. Please check your connection and try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessages([]);
    clearConversation(); // Clear saved conversation on logout
    console.log('🔐 [AUTH] Logged out');
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    updateMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Keep focus on input after sending message
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

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

      console.log('🔗 [CHAT] Using API URL:', resolvedApiEndpoint);
      const response = await fetch(resolvedApiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: inputValue,
          conversationHistory: messages,
          projectLookup: projectEmail ? { email: projectEmail } : undefined,
          actingAsEmail: actingAsEmail || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          timestamp: new Date(),
        };
        updateMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      updateMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Restore focus after loading is complete
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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

  if (isEmbedded && !isOpen && !forceOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105"
        >
          <img src="https://ava-ai-chatbot.vercel.app/ava-logo-button.svg" alt='Ava Logo' className='w-16 h-16' />
        </button>
      </div>
    );
  }

  return (
    <div className={`${
      forceOpen 
        ? 'w-full h-screen flex flex-col' 
        : isEmbedded 
          ? 'fixed bottom-4 right-4 z-50' 
          : 'w-full max-w-md mx-auto'
    } bg-white ${forceOpen ? '' : 'rounded-lg shadow-xl border border-gray-200'}`}>
      {/* Header */}
      <div 
        className={`text-white p-4 flex items-center justify-between ${forceOpen ? '' : 'rounded-t-lg'}`}
        style={{
          background: 'radial-gradient(146.96% 389.93% at 53.39% -106.95%, rgba(76, 142, 212, 0.50) 0%, rgba(76, 142, 212, 0.00) 100%), radial-gradient(510.44% 138.09% at -8.09% 156.8%, rgba(118, 90, 243, 0.50) 0%, rgba(187, 90, 243, 0.00) 100%), #F0F0F0'
        }}
      >
        <div className="flex items-center space-x-2">
          <img src="https://ava-ai-chatbot.vercel.app/ava-logo.svg" alt='Ava Logo' className='w-20 h-5' />
          {/* <MessageCircle size={20} />
          <h3 className="font-semibold">Ava - Aveyo Solar Assistant</h3> */}
        </div>
        {isEmbedded && (
          <button
            onClick={() => {
              if (forceOpen) {
                // For authenticated iframe, send message to parent to close
                console.log('Sending CLOSE_AVA_WIDGET message to parent');
                window.parent.postMessage({ type: 'CLOSE_AVA_WIDGET' }, '*');
              } else {
                // For regular embedded mode, just close locally
                setIsOpen(false);
              }
            }}
            className="hover:bg-blue-700 p-1 rounded"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className={`${forceOpen ? 'flex-1' : 'h-96'} overflow-y-auto p-4 space-y-4`} id='chat-container'>
        {actingAsEmail && (
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">
            Admin test mode: impersonating <span className="font-medium">{actingAsEmail}</span>
          </div>
        )}
        {messages.length === 0 && (
          <div className="text-gray-500 text-center py-8 flex flex-col items-center gap-[14px]">
            <img src="https://ava-ai-chatbot.vercel.app/ava-logo-button.svg" alt='Ava Logo' className='w-16 h-16' />
            <p>Hi! I'm Ava from Aveyo. I'm here to help you with your solar installation questions!</p>
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm">
                {message.role === 'assistant' ? (
                  <div 
                    className="prose prose-sm max-w-none [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800 [&_a]:transition-colors"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
              </div>
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

      {/* Login Form */}
      {showLogin && (
        <div className="p-4 border-t border-gray-200 bg-gray-50" id='login-container'>
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
      <div className={`p-4 border-t border-gray-200 ${forceOpen ? '' : 'fixed bottom-0 w-full'}`}>
        {!forceOpen && (
          <div className="flex items-center space-x-2 mb-2">
            {!user ? (
              <div className='flex gap-[10px]'>
              <button
                onClick={() => setShowLogin(true)}
                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center space-x-1"
              >
                <LogIn size={12} />
                <span>Login</span>
              </button>
              <button
                onClick={() => {
                  if (isEmbedded) {
                    // For iframe embeds, send message to parent to redirect
                    window.parent.postMessage({ 
                      type: 'REDIRECT_PARENT', 
                      url: 'https://goaveyo.com/forgot-password' 
                    }, '*');
                  } else {
                    // For standalone use, redirect current window
                    window.location.href = 'https://goaveyo.com/forgot-password';
                  }
                }}
                className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center space-x-1"
              >
                <AlertCircle size={12} />
                <span>Forgot Password</span>
              </button>
              </div>
            ) : (
              <>
                {/* <button
                  onClick={() => setShowProjectLookup(!showProjectLookup)}
                  className={`text-xs px-2 py-1 rounded ${
                    showProjectLookup 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } transition-colors`}
                >
                  📋 Project Status
                </button> */}
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
        )}
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about solar"
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
};

export default ChatWidget;

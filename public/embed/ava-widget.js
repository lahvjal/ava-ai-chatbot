(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: window.location.origin + '/api/chat', // Use same origin for API calls
    widgetId: 'ava-chat-widget',
    buttonId: 'ava-chat-button'
  };

  // Supabase configuration (embedded version)
  const SUPABASE_CONFIG = {
    url: 'https://wpbewhesecvlnldhppwx.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwYmV3aGVzZWN2bG5saGhwcHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4MzI0ODYsImV4cCI6MjA0NjQwODQ4Nn0.wKlWBgJHXdWZlLKdEyGYzJPood9VbJYk'
  };

  // Simple Supabase client
  class SimpleSupabase {
    constructor(url, key) {
      this.url = url;
      this.key = key;
      this.session = null;
    }

    async signInWithPassword(credentials) {
      try {
        const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`,
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const data = await response.json();
        
        if (response.ok && data.access_token) {
          this.session = {
            access_token: data.access_token,
            user: data.user || { email: credentials.email }
          };
          return { data: this.session, error: null };
        } else {
          return { data: null, error: data.error || { message: 'Login failed' } };
        }
      } catch (error) {
        console.error('Supabase auth error:', error);
        return { data: null, error: { message: 'Network error. Please try again.' } };
      }
    }

    async signOut() {
      if (this.session?.access_token) {
        try {
          await fetch(`${this.url}/auth/v1/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.session.access_token}`,
              'apikey': this.key,
            },
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      }
      this.session = null;
      return { error: null };
    }

    getSession() {
      return { data: { session: this.session } };
    }
  }

  // Initialize Supabase
  const supabase = new SimpleSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

  // Widget HTML template
  const WIDGET_HTML = `
    <div id="${CONFIG.widgetId}" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: none;
      flex-direction: column;
    ">
      <!-- Header -->
      <div style="
        background: #2563eb;
        color: white;
        padding: 16px;
        border-radius: 12px 12px 0 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04.97 4.37L1 23l6.63-1.97C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"/>
          </svg>
          <span style="font-weight: 600;">Ava - Aveyo Solar Assistant</span>
        </div>
        <button id="ava-close-btn" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        ">
          <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div id="ava-messages" style="
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #f9fafb;
      ">
        <div id="ava-welcome" style="
          text-align: center;
          color: #6b7280;
          padding: 32px 16px;
        ">
          <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 16px; opacity: 0.5;">
            <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04.97 4.37L1 23l6.63-1.97C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"/>
          </svg>
          <p>Hi! I'm Ava from Aveyo. I'm here to help you with your solar installation questions!</p>
        </div>
      </div>

      <!-- Login Form -->
      <div id="ava-login-form" style="
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
        display: none;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h4 style="margin: 0; font-weight: 600; color: #374151;">Customer Login</h4>
          <button id="ava-close-login" style="
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
          ">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div style="margin-bottom: 12px;">
          <input 
            id="ava-login-email" 
            type="email" 
            placeholder="Your email address"
            style="
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-size: 14px;
              outline: none;
              box-sizing: border-box;
            "
          />
        </div>
        <div style="margin-bottom: 12px;">
          <input 
            id="ava-login-password" 
            type="password" 
            placeholder="Password"
            style="
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              font-size: 14px;
              outline: none;
              box-sizing: border-box;
            "
          />
        </div>
        <button id="ava-login-submit" style="
          width: 100%;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          margin-bottom: 8px;
        ">
          Login
        </button>
        <div style="
          padding: 8px;
          background: #dbeafe;
          border-radius: 6px;
          font-size: 12px;
          color: #1d4ed8;
        ">
          ℹ️ Login to access your project information and get personalized assistance
        </div>
      </div>

      <!-- Project Lookup Form -->
      <div id="ava-project-form" style="
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
        display: none;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <h4 style="margin: 0; font-weight: 600; color: #374151;">Project Status</h4>
          <button id="ava-close-project" style="
            background: none;
            border: none;
            color: #6b7280;
            cursor: pointer;
            padding: 4px;
          ">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <input 
          id="ava-project-email" 
          type="email" 
          placeholder="Email Address"
          style="
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            outline: none;
            box-sizing: border-box;
            margin-bottom: 8px;
          "
        />
        <div id="ava-project-status" style="
          padding: 8px;
          background: #dbeafe;
          border-radius: 6px;
          font-size: 12px;
          color: #1d4ed8;
          display: none;
        ">
          ✓ Email will be used to lookup your project
        </div>
      </div>

      <!-- Input -->
      <div style="
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
        border-radius: 0 0 12px 12px;
      ">
        <div id="ava-controls" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
          <button id="ava-login-btn" style="
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: #dbeafe;
            color: #1d4ed8;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5z"/>
            </svg>
            Login
          </button>
          <button id="ava-project-btn" style="
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: #f3f4f6;
            color: #374151;
            border: none;
            cursor: pointer;
            display: none;
          ">
            📋 Project Status
          </button>
          <button id="ava-logout-btn" style="
            font-size: 12px;
            padding: 4px 8px;
            border-radius: 4px;
            background: #fef2f2;
            color: #dc2626;
            border: none;
            cursor: pointer;
            display: none;
          ">
            Logout
          </button>
          <span id="ava-email-status" style="
            font-size: 12px;
            color: #2563eb;
            font-weight: 500;
            display: none;
          ">
            Email ready
          </span>
        </div>
        <div style="display: flex; gap: 8px;">
          <input 
            id="ava-input" 
            type="text" 
            placeholder="Ask me about solar installation..."
            style="
              flex: 1;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              padding: 8px 12px;
              font-size: 14px;
              outline: none;
            "
          />
          <button id="ava-send-btn" style="
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 8px 12px;
            cursor: pointer;
            font-size: 14px;
          ">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  const BUTTON_HTML = `
    <button id="${CONFIG.buttonId}" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background: #2563eb;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    ">
      <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04.97 4.37L1 23l6.63-1.97C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"/>
      </svg>
    </button>
  `;

  // Widget state
  let isOpen = false;
  let messages = [];
  let isLoading = false;
  let user = null;
  let showLogin = false;
  let showProjectLookup = false;
  let projectEmail = '';

  // Initialize widget
  function initWidget() {
    try {
      // Add button and widget to page
      document.body.insertAdjacentHTML('beforeend', BUTTON_HTML);
      document.body.insertAdjacentHTML('beforeend', WIDGET_HTML);

      // Get elements and add event listeners
      setupEventListeners();
      
      console.log('✅ Ava widget initialized');
    } catch (error) {
      console.error('❌ Ava widget initialization failed:', error);
      // Fallback: create a simple error message
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #fee2e2;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          font-size: 12px;
          z-index: 10000;
          max-width: 250px;
        ">
          Ava widget failed to load. Please refresh the page or contact support.
        </div>
      `;
      document.body.appendChild(errorDiv);
    }
  }

  function setupEventListeners() {
    try {
      // Main controls
      const button = document.getElementById(CONFIG.buttonId);
      const closeBtn = document.getElementById('ava-close-btn');
      const sendBtn = document.getElementById('ava-send-btn');
      const input = document.getElementById('ava-input');

      if (button) button.addEventListener('click', toggleWidget);
      if (closeBtn) closeBtn.addEventListener('click', toggleWidget);
      if (sendBtn) sendBtn.addEventListener('click', sendMessage);
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') sendMessage();
        });
      }

      // Login controls
      const loginBtn = document.getElementById('ava-login-btn');
      const closeLogin = document.getElementById('ava-close-login');
      const loginSubmit = document.getElementById('ava-login-submit');
      const logoutBtn = document.getElementById('ava-logout-btn');
      const loginPassword = document.getElementById('ava-login-password');

      if (loginBtn) loginBtn.addEventListener('click', showLoginForm);
      if (closeLogin) closeLogin.addEventListener('click', hideLoginForm);
      if (loginSubmit) loginSubmit.addEventListener('click', handleLogin);
      if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
      if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') handleLogin();
        });
      }

      // Project controls
      const projectBtn = document.getElementById('ava-project-btn');
      const closeProject = document.getElementById('ava-close-project');
      const projectEmail = document.getElementById('ava-project-email');

      if (projectBtn) projectBtn.addEventListener('click', showProjectForm);
      if (closeProject) closeProject.addEventListener('click', hideProjectForm);
      if (projectEmail) projectEmail.addEventListener('input', handleProjectEmailChange);

    } catch (error) {
      console.error('❌ Failed to setup event listeners:', error);
    }
  }

  function toggleWidget() {
    const button = document.getElementById(CONFIG.buttonId);
    const widget = document.getElementById(CONFIG.widgetId);
    
    isOpen = !isOpen;
    
    if (isOpen) {
      button.style.display = 'none';
      widget.style.display = 'flex';
      document.getElementById('ava-input').focus();
    } else {
      button.style.display = 'flex';
      widget.style.display = 'none';
    }
  }

  function showLoginForm() {
    document.getElementById('ava-login-form').style.display = 'block';
    showLogin = true;
    document.getElementById('ava-login-email').focus();
  }

  function hideLoginForm() {
    document.getElementById('ava-login-form').style.display = 'none';
    showLogin = false;
  }

  function showProjectForm() {
    document.getElementById('ava-project-form').style.display = 'block';
    showProjectLookup = true;
    document.getElementById('ava-project-email').focus();
  }

  function hideProjectForm() {
    document.getElementById('ava-project-form').style.display = 'none';
    showProjectLookup = false;
  }

  function handleProjectEmailChange(e) {
    projectEmail = e.target.value;
    const status = document.getElementById('ava-project-status');
    const emailStatus = document.getElementById('ava-email-status');
    
    if (projectEmail) {
      status.style.display = 'block';
      emailStatus.style.display = 'inline';
      emailStatus.textContent = 'Email ready';
    } else {
      status.style.display = 'none';
      emailStatus.style.display = 'none';
    }
  }

  async function handleLogin() {
    const email = document.getElementById('ava-login-email').value;
    const password = document.getElementById('ava-login-password').value;
    
    if (!email || !password) {
      addMessage('assistant', 'Please enter both email and password.');
      return;
    }

    const submitBtn = document.getElementById('ava-login-submit');
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    try {
      // Use the main site's auth endpoint instead of direct Supabase calls
      const response = await fetch(`${window.location.origin}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        user = { email: email, access_token: result.access_token };
        updateUIForLoggedInUser();
        hideLoginForm();
        // Clear login form
        document.getElementById('ava-login-email').value = '';
        document.getElementById('ava-login-password').value = '';
        addMessage('assistant', 'Welcome back! I can now access your project information. How can I help you today?');
      } else {
        console.error('Login error:', result);
        addMessage('assistant', `Login failed: ${result.error || 'Please check your credentials'}. For support, contact <a href="tel:+13854693838">(385) 469-3838</a> or <a href="mailto:customercare@aveyo.com">customercare@aveyo.com</a>.`);
      }
    } catch (error) {
      console.error('Login exception:', error);
      addMessage('assistant', 'Network error during login. Please check your connection and try again.');
    } finally {
      submitBtn.textContent = 'Login';
      submitBtn.disabled = false;
    }
  }

  async function handleLogout() {
    try {
      // Call logout endpoint if available
      if (user && user.access_token) {
        await fetch(`${window.location.origin}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    user = null;
    projectEmail = '';
    updateUIForLoggedOutUser();
    messages = [];
    clearMessages();
    showWelcomeMessage();
  }

  function updateUIForLoggedInUser() {
    document.getElementById('ava-login-btn').style.display = 'none';
    document.getElementById('ava-project-btn').style.display = 'inline-flex';
    document.getElementById('ava-logout-btn').style.display = 'inline-flex';
  }

  function updateUIForLoggedOutUser() {
    document.getElementById('ava-login-btn').style.display = 'inline-flex';
    document.getElementById('ava-project-btn').style.display = 'none';
    document.getElementById('ava-logout-btn').style.display = 'none';
    document.getElementById('ava-email-status').style.display = 'none';
    hideProjectForm();
  }

  function clearMessages() {
    const messagesContainer = document.getElementById('ava-messages');
    messagesContainer.innerHTML = '';
  }

  function showWelcomeMessage() {
    const messagesContainer = document.getElementById('ava-messages');
    messagesContainer.innerHTML = `
      <div style="
        text-align: center;
        color: #6b7280;
        padding: 32px 16px;
      ">
        <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 16px; opacity: 0.5;">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04.97 4.37L1 23l6.63-1.97C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"/>
        </svg>
        <p>Hi! I'm Ava from Aveyo. I'm here to help you with your solar installation questions!</p>
      </div>
    `;
  }

  function addMessage(role, content) {
    const messagesContainer = document.getElementById('ava-messages');
    
    // Remove welcome message if present
    const welcome = document.getElementById('ava-welcome');
    if (welcome) welcome.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      display: flex;
      ${role === 'user' ? 'justify-content: flex-end' : 'justify-content: flex-start'};
      margin-bottom: 12px;
    `;

    const messageBubble = document.createElement('div');
    messageBubble.style.cssText = `
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      ${role === 'user' 
        ? 'background: #2563eb; color: white;' 
        : 'background: white; color: #374151; border: 1px solid #e5e7eb;'
      }
    `;

    messageBubble.innerHTML = content;
    messageDiv.appendChild(messageBubble);
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function showLoading() {
    const messagesContainer = document.getElementById('ava-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'ava-loading';
    loadingDiv.style.cssText = `
      display: flex;
      justify-content: flex-start;
      margin-bottom: 12px;
    `;

    loadingDiv.innerHTML = `
      <div style="
        background: white;
        border: 1px solid #e5e7eb;
        padding: 8px 12px;
        border-radius: 12px;
        display: flex;
        gap: 4px;
        align-items: center;
      ">
        <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out;"></div>
        <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; animation-delay: 0.16s;"></div>
        <div style="width: 6px; height: 6px; background: #9ca3af; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; animation-delay: 0.32s;"></div>
      </div>
    `;

    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideLoading() {
    const loading = document.getElementById('ava-loading');
    if (loading) loading.remove();
  }

  async function sendMessage() {
    const input = document.getElementById('ava-input');
    const message = input.value.trim();
    
    if (!message || isLoading) return;

    // Add user message
    addMessage('user', message);
    messages.push({ role: 'user', content: message });
    
    // Clear input
    input.value = '';
    isLoading = true;
    showLoading();

    try {
      const headers = {
        'Content-Type': 'application/json',
      };

      // Add auth token if user is logged in
      if (user && user.access_token) {
        headers['Authorization'] = `Bearer ${user.access_token}`;
      }

      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          conversationHistory: messages,
          projectLookup: projectEmail ? { email: projectEmail } : undefined,
          domain: window.location.hostname
        }),
      });

      const data = await response.json();
      hideLoading();

      if (response.ok) {
        addMessage('assistant', data.reply);
        messages.push({ role: 'assistant', content: data.reply });
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      hideLoading();
      addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      console.error('Ava widget error:', error);
    } finally {
      isLoading = false;
    }
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();

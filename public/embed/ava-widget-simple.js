(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    apiUrl: 'https://ava-ai-chatbot.vercel.app/api/embed/chat', // Update with your actual domain
    widgetId: 'ava-chat-widget',
    buttonId: 'ava-chat-button'
  };

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
          <span style="font-weight: 600;">Ava - Solar Assistant</span>
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
      </div>

      <!-- Input -->
      <div style="
        padding: 16px;
        border-top: 1px solid #e5e7eb;
        background: white;
        border-radius: 0 0 12px 12px;
      ">
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
            Send
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
    // Add button and widget to page
    document.body.insertAdjacentHTML('beforeend', BUTTON_HTML);
    document.body.insertAdjacentHTML('beforeend', WIDGET_HTML);

    // Get elements
    const button = document.getElementById(CONFIG.buttonId);
    const widget = document.getElementById(CONFIG.widgetId);
    const closeBtn = document.getElementById('ava-close-btn');
    const input = document.getElementById('ava-input');
    const sendBtn = document.getElementById('ava-send-btn');

    // Event listeners
    button.addEventListener('click', toggleWidget);
    closeBtn.addEventListener('click', toggleWidget);
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    console.log('✅ Ava widget initialized');
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

  function addMessage(role, content) {
    const messagesContainer = document.getElementById('ava-messages');
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
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages,
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

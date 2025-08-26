(function() {
  // Prevent multiple instances
  if (window.AIChatbotWidget) return;

  // Configuration
  const config = {
    apiEndpoint: window.location.origin + '/api/chat',
    position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
    theme: 'blue' // blue, green, purple, dark
  };

  // CSS Styles
  const styles = `
    .ai-chatbot-widget * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .ai-chatbot-widget {
      position: fixed;
      z-index: 999999;
      ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
    }
    
    .ai-chatbot-toggle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #2563eb;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .ai-chatbot-toggle:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
    }
    
    .ai-chatbot-toggle svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    
    .ai-chatbot-container {
      position: absolute;
      ${config.position.includes('bottom') ? 'bottom: 70px;' : 'top: 70px;'}
      ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      border: 1px solid #e5e7eb;
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    
    .ai-chatbot-container.open {
      display: flex;
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .ai-chatbot-header {
      background: #2563eb;
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .ai-chatbot-title {
      font-weight: 600;
      font-size: 16px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .ai-chatbot-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    
    .ai-chatbot-close:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .ai-chatbot-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .ai-chatbot-message {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
    }
    
    .ai-chatbot-message.user {
      background: #2563eb;
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }
    
    .ai-chatbot-message.assistant {
      background: #f3f4f6;
      color: #374151;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    
    .ai-chatbot-input-container {
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    
    .ai-chatbot-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      outline: none;
      resize: none;
      min-height: 36px;
      max-height: 100px;
    }
    
    .ai-chatbot-input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
    }
    
    .ai-chatbot-send {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.2s;
      min-width: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .ai-chatbot-send:hover:not(:disabled) {
      background: #1d4ed8;
    }
    
    .ai-chatbot-send:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    
    .ai-chatbot-loading {
      display: flex;
      gap: 4px;
      padding: 8px 12px;
    }
    
    .ai-chatbot-loading-dot {
      width: 6px;
      height: 6px;
      background: #9ca3af;
      border-radius: 50%;
      animation: bounce 1.4s ease-in-out infinite both;
    }
    
    .ai-chatbot-loading-dot:nth-child(1) { animation-delay: -0.32s; }
    .ai-chatbot-loading-dot:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes bounce {
      0%, 80%, 100% {
        transform: scale(0);
      } 40% {
        transform: scale(1);
      }
    }
    
    .ai-chatbot-welcome {
      text-align: center;
      color: #6b7280;
      padding: 40px 20px;
    }
    
    @media (max-width: 480px) {
      .ai-chatbot-container {
        width: calc(100vw - 40px);
        height: calc(100vh - 140px);
        ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      }
    }
  `;

  // Create and inject styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Widget class
  class AIChatbotWidget {
    constructor() {
      this.isOpen = false;
      this.messages = [];
      this.isLoading = false;
      this.init();
    }

    init() {
      this.createWidget();
      this.bindEvents();
    }

    createWidget() {
      // Create main container
      this.container = document.createElement('div');
      this.container.className = 'ai-chatbot-widget';

      // Toggle button
      this.toggleButton = document.createElement('button');
      this.toggleButton.className = 'ai-chatbot-toggle';
      this.toggleButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      `;

      // Chat container
      this.chatContainer = document.createElement('div');
      this.chatContainer.className = 'ai-chatbot-container';
      this.chatContainer.innerHTML = `
        <div class="ai-chatbot-header">
          <h3 class="ai-chatbot-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            Ava - Solar Assistant
          </h3>
          <button class="ai-chatbot-close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div class="ai-chatbot-messages">
          <div class="ai-chatbot-welcome">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#9ca3af" style="margin-bottom: 12px;">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            <p>Hi! I'm Ava from Aveyo. I'm here to help you with your solar installation questions!</p>
          </div>
        </div>
        <div class="ai-chatbot-project-form" style="display: none;">
          <div style="padding: 12px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 500; font-size: 14px; color: #374151;">Project Lookup</span>
              <button class="ai-chatbot-close-form" style="background: none; border: none; color: #6b7280; cursor: pointer;">×</button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <input class="ai-chatbot-email" placeholder="Email Address" type="email" style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
            </div>
            <div class="ai-chatbot-form-status" style="margin-top: 8px; padding: 6px; background: #dbeafe; color: #1e40af; border-radius: 4px; font-size: 11px; display: none;">
              ✓ Email will be used to lookup your project
            </div>
          </div>
        </div>
        <div class="ai-chatbot-input-container">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <button class="ai-chatbot-project-toggle" style="background: #f3f4f6; color: #4b5563; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">📋 Project Status</button>
            <span class="ai-chatbot-project-indicator" style="font-size: 11px; color: #2563eb; font-weight: 500; display: none;">Project info ready</span>
          </div>
          <textarea class="ai-chatbot-input" placeholder="Ask me about solar installation..." rows="1"></textarea>
          <button class="ai-chatbot-send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      `;

      this.container.appendChild(this.toggleButton);
      this.container.appendChild(this.chatContainer);
      document.body.appendChild(this.container);

      // Get references
      this.messagesContainer = this.chatContainer.querySelector('.ai-chatbot-messages');
      this.input = this.chatContainer.querySelector('.ai-chatbot-input');
      this.sendButton = this.chatContainer.querySelector('.ai-chatbot-send');
      this.closeButton = this.chatContainer.querySelector('.ai-chatbot-close');
      this.projectForm = this.chatContainer.querySelector('.ai-chatbot-project-form');
      this.projectToggle = this.chatContainer.querySelector('.ai-chatbot-project-toggle');
      this.closeFormButton = this.chatContainer.querySelector('.ai-chatbot-close-form');
      this.emailInput = this.chatContainer.querySelector('.ai-chatbot-email');
      this.formStatus = this.chatContainer.querySelector('.ai-chatbot-form-status');
      this.projectIndicator = this.chatContainer.querySelector('.ai-chatbot-project-indicator');
    }

    bindEvents() {
      this.toggleButton.addEventListener('click', () => this.toggle());
      this.closeButton.addEventListener('click', () => this.close());
      this.sendButton.addEventListener('click', () => this.sendMessage());
      
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      this.input.addEventListener('input', () => {
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 100) + 'px';
      });

      // Project form events
      this.projectToggle.addEventListener('click', () => this.toggleProjectForm());
      this.closeFormButton.addEventListener('click', () => this.hideProjectForm());
      
      this.emailInput.addEventListener('input', () => this.updateProjectFormStatus());
    }

    toggleProjectForm() {
      const isVisible = this.projectForm.style.display !== 'none';
      this.projectForm.style.display = isVisible ? 'none' : 'block';
      this.projectToggle.style.background = isVisible ? '#f3f4f6' : '#dbeafe';
      this.projectToggle.style.color = isVisible ? '#4b5563' : '#1e40af';
    }

    hideProjectForm() {
      this.projectForm.style.display = 'none';
      this.projectToggle.style.background = '#f3f4f6';
      this.projectToggle.style.color = '#4b5563';
    }

    updateProjectFormStatus() {
      const hasData = this.emailInput.value;
      this.formStatus.style.display = hasData ? 'block' : 'none';
      this.projectIndicator.style.display = hasData ? 'inline' : 'none';
    }

    getProjectData() {
      const email = this.emailInput.value.trim();
      
      if (email) {
        return { email };
      }
      return null;
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    open() {
      this.isOpen = true;
      this.chatContainer.classList.add('open');
      this.input.focus();
    }

    close() {
      this.isOpen = false;
      this.chatContainer.classList.remove('open');
    }

    async sendMessage() {
      const message = this.input.value.trim();
      if (!message || this.isLoading) return;

      this.addMessage('user', message);
      this.input.value = '';
      this.input.style.height = 'auto';
      this.setLoading(true);

      try {
        const requestBody = {
          message,
          conversationHistory: this.messages.slice(-10) // Keep last 10 messages for context
        };

        // Add project lookup data if provided
        const projectData = this.getProjectData();
        if (projectData) {
          requestBody.projectLookup = projectData;
        }

        const response = await fetch(config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        
        if (response.ok) {
          this.addMessage('assistant', data.reply);
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
      } catch (error) {
        this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      } finally {
        this.setLoading(false);
      }
    }

    addMessage(role, content) {
      // Remove welcome message if it exists
      const welcome = this.messagesContainer.querySelector('.ai-chatbot-welcome');
      if (welcome) welcome.remove();

      const message = { role, content, timestamp: new Date() };
      this.messages.push(message);

      const messageElement = document.createElement('div');
      messageElement.className = `ai-chatbot-message ${role}`;
      messageElement.textContent = content;

      this.messagesContainer.appendChild(messageElement);
      this.scrollToBottom();
    }

    setLoading(loading) {
      this.isLoading = loading;
      this.sendButton.disabled = loading;

      // Remove existing loading indicator
      const existingLoader = this.messagesContainer.querySelector('.ai-chatbot-loading');
      if (existingLoader) existingLoader.remove();

      if (loading) {
        const loader = document.createElement('div');
        loader.className = 'ai-chatbot-loading ai-chatbot-message assistant';
        loader.innerHTML = `
          <div class="ai-chatbot-loading-dot"></div>
          <div class="ai-chatbot-loading-dot"></div>
          <div class="ai-chatbot-loading-dot"></div>
        `;
        this.messagesContainer.appendChild(loader);
        this.scrollToBottom();
      }
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.AIChatbotWidget = new AIChatbotWidget();
    });
  } else {
    window.AIChatbotWidget = new AIChatbotWidget();
  }
})();

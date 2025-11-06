(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    iframeUrl: 'https://ava-ai-chatbot.vercel.app/embed-auth-iframe',
    widgetId: 'ava-auth-iframe-widget',
    buttonId: 'ava-auth-iframe-button'
  };

  // Widget state
  let isOpen = false;
  let iframe = null;
  let sessionData = null;

  // Create the floating button
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
      padding: 0 !important;
    ">
      <img src="https://ava-ai-chatbot.vercel.app/ava-logo-button.svg" alt="Ava Logo" style="width: 100%; height: 100%; object-fit: contain;" />
    </button>
  `;

  // Create the iframe container
  const IFRAME_HTML = `
    <div id="${CONFIG.widgetId}" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 350px;
      height: 500px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      display: none;
      overflow: hidden;
    ">
      <iframe 
        src="" 
        style="
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 12px;
        "
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      ></iframe>
    </div>
  `;

  // Initialize the widget
  function initWidget() {
    // Add button to page
    document.body.insertAdjacentHTML('beforeend', BUTTON_HTML);
    
    // Add iframe container to page
    document.body.insertAdjacentHTML('beforeend', IFRAME_HTML);
    
    // Get references
    const button = document.getElementById(CONFIG.buttonId);
    const widget = document.getElementById(CONFIG.widgetId);
    iframe = widget.querySelector('iframe');
    
    // Button click handler
    button.addEventListener('click', toggleWidget);
    
    // Close widget when clicking outside
    document.addEventListener('click', function(e) {
      if (isOpen && !widget.contains(e.target) && !button.contains(e.target)) {
        closeWidget();
      }
    });
    
    // Listen for close messages from iframe
    window.addEventListener('message', function(event) {
      console.log('Received message:', event.data, 'from origin:', event.origin);
      if (event.data && event.data.type === 'CLOSE_AVA_WIDGET') {
        console.log('Closing widget via message');
        closeWidget();
      }
    });
    
    console.log('Ava authenticated widget initialized');
  }

  // Toggle widget visibility
  function toggleWidget() {
    if (isOpen) {
      closeWidget();
    } else {
      openWidget();
    }
  }

  // Open widget
  function openWidget() {
    const widget = document.getElementById(CONFIG.widgetId);
    
    // Build iframe URL with session data
    let iframeUrl = CONFIG.iframeUrl;
    if (sessionData) {
      const params = new URLSearchParams();
      
      // Add session data as URL parameters
      if (sessionData.email) params.set('email', sessionData.email);
      if (sessionData.userId) params.set('userId', sessionData.userId);
      if (sessionData.token) params.set('token', sessionData.token);
      if (sessionData.name) params.set('name', sessionData.name);
      
      // Add any custom data
      if (sessionData.customData) {
        params.set('customData', JSON.stringify(sessionData.customData));
      }
      
      iframeUrl += '?' + params.toString();
    }
    
    // Set iframe source
    iframe.src = iframeUrl;
    
    // Show widget
    widget.style.display = 'block';
    isOpen = true;
    
    console.log('Ava widget opened with session:', sessionData);
  }

  // Close widget
  function closeWidget() {
    const widget = document.getElementById(CONFIG.widgetId);
    widget.style.display = 'none';
    isOpen = false;
    
    console.log('Ava widget closed');
  }

  // Public API for setting session data
  window.AvaAuth = {
    // Set session data from parent website
    setSession: function(data) {
      sessionData = data;
      console.log('Ava session data set:', data);
      
      // If widget is already open, reload with new session
      if (isOpen) {
        openWidget();
      }
    },
    
    // Clear session data
    clearSession: function() {
      sessionData = null;
      console.log('Ava session data cleared');
      
      // If widget is open, reload without session
      if (isOpen) {
        openWidget();
      }
    },
    
    // Get current session data
    getSession: function() {
      return sessionData;
    },
    
    // Open widget programmatically
    open: function() {
      openWidget();
    },
    
    // Close widget programmatically
    close: function() {
      closeWidget();
    },
    
    // Check if widget is open
    isOpen: function() {
      return isOpen;
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();

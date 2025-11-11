(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    iframeUrl: 'https://ava-ai-chatbot.vercel.app/embed-iframe', // Production URL for embedding
    widgetId: 'ava-iframe-widget',
    buttonId: 'ava-iframe-button'
  };

  // Widget state
  let isOpen = false;
  let iframe = null;

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
        src="${CONFIG.iframeUrl}"
        style="
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 12px;
        "
        allow="microphone; camera"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      ></iframe>
    </div>
  `;

  function initWidget() {
    try {
      // Add button and iframe to page
      document.body.insertAdjacentHTML('beforeend', BUTTON_HTML);
      document.body.insertAdjacentHTML('beforeend', IFRAME_HTML);

      // Get elements
      const button = document.getElementById(CONFIG.buttonId);
      const widget = document.getElementById(CONFIG.widgetId);
      iframe = widget.querySelector('iframe');

      // Event listeners
      button.addEventListener('click', toggleWidget);

      // Listen for messages from iframe
      window.addEventListener('message', handleIframeMessage);

      console.log('✅ Ava iframe widget initialized');
    } catch (error) {
      console.error('❌ Ava iframe widget initialization failed:', error);
    }
  }

  function toggleWidget() {
    const button = document.getElementById(CONFIG.buttonId);
    const widget = document.getElementById(CONFIG.widgetId);
    
    isOpen = !isOpen;
    
    if (isOpen) {
      button.style.display = 'none';
      widget.style.display = 'block';
    } else {
      button.style.display = 'flex';
      widget.style.display = 'none';
    }
  }

  function handleIframeMessage(event) {
    // Only accept messages from our iframe (allow localhost for development)
    const allowedOrigins = [
      'https://ava-ai-chatbot.vercel.app',
      'http://localhost:3000',
      'https://localhost:3000'
    ];
    
    if (!allowedOrigins.includes(event.origin)) {
      return;
    }

    switch (event.data.type) {
      case 'WIDGET_READY':
        console.log('✅ Iframe widget ready');
        break;
      case 'CLOSE_WIDGET':
        console.log('📱 Close widget requested from iframe');
        toggleWidget();
        break;
      case 'RESIZE_WIDGET':
        const widget = document.getElementById(CONFIG.widgetId);
        if (widget && event.data.height) {
          widget.style.height = event.data.height + 'px';
        }
        break;
      case 'REDIRECT_PARENT':
        console.log('🔗 Parent redirect requested to:', event.data.url);
        if (event.data.url) {
          window.location.href = event.data.url;
        }
        break;
      default:
        console.log('🔔 Unknown message from iframe:', event.data.type);
        break;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

})();

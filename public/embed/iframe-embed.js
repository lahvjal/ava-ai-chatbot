(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    iframeUrl: 'https://ava-ai-chatbot.vercel.app/embed-iframe',
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
    ">
      <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3.04.97 4.37L1 23l6.63-1.97C9.96 21.64 11.46 22 13 22h7c1.1 0 2-.9 2-2V12c0-5.52-4.48-10-10-10z"/>
      </svg>
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
    // Only accept messages from our iframe
    if (event.origin !== 'https://ava-ai-chatbot.vercel.app') {
      return;
    }

    switch (event.data.type) {
      case 'WIDGET_READY':
        console.log('✅ Iframe widget ready');
        break;
      case 'CLOSE_WIDGET':
        toggleWidget();
        break;
      case 'RESIZE_WIDGET':
        const widget = document.getElementById(CONFIG.widgetId);
        if (widget && event.data.height) {
          widget.style.height = event.data.height + 'px';
        }
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

import { useEffect, useState } from 'react';
import Head from 'next/head';
import ChatWidget from '../components/ChatWidget';

interface IframeMessage {
  type: 'WIDGET_READY' | 'RESIZE_WIDGET' | 'CLOSE_WIDGET';
  height?: number;
}

export default function EmbedIframe() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    
    // Apply styles directly to DOM
    if (typeof window !== 'undefined') {
      console.log('🎨 [IFRAME] Applying styles...');
      
      // Set body and html styles
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
      document.documentElement.style.height = '100vh';
      document.documentElement.style.overflow = 'hidden';

      // Create and inject CSS styles with a delay to ensure ChatWidget is rendered
      setTimeout(() => {
        const styleElement = document.createElement('style');
        styleElement.id = 'iframe-styles';
        styleElement.textContent = `
          * {
            box-sizing: border-box !important;
          }
          #buttons-container {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            z-index: 20 !important;
            margin: 0 !important;
          }
          #login-container {
            position: fixed !important;
            top: 50px !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            z-index: 20 !important;
            margin: 0 !important;
          }
          #reset-container {
            position: fixed !important;
            top: 50px !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            z-index: 20 !important;
            margin: 0 !important;
          }
          /* Close button styling */
          .iframe-close-button {
            position: fixed !important;
            top: 12px !important;
            right: 12px !important;
            width: 32px !important;
            height: 32px !important;
            border: none !important;
            background: rgba(255, 255, 255, 0.9) !important;
            border-radius: 50% !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 1000 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            transition: all 0.2s ease !important;
          }
          
          /* ChatWidget iframe overrides */
          .iframe-chat-container {
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
            position: relative !important;
          }
          .iframe-chat-container > div {
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            position: relative !important;
          }
          /* Messages container - leave space for fixed input */
          .iframe-chat-container .h-96,
          .iframe-chat-container div[class*="h-96"],
          .iframe-chat-container #chat-container {
            height: calc(100vh - 180px) !important;
            max-height: calc(100vh - 180px) !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            padding-bottom: 10px !important;
            margin-bottom: 0 !important;
          }
          /* Header styling */
          .iframe-chat-container .bg-blue-600 {
            position: relative !important;
            z-index: 10 !important;
          }
          /* Fix input area to bottom */
          .iframe-chat-container .p-4.border-t,
          .iframe-chat-container div[style*="position: fixed"] {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: white !important;
            border-top: 1px solid #e5e7eb !important;
            z-index: 20 !important;
            margin: 0 !important;
          }
        `;
        document.head.appendChild(styleElement);
        console.log('✅ [IFRAME] Styles injected');
      }, 100);
    }
    
    // Post message to parent when ready
    if (typeof window !== 'undefined' && window.parent !== window) {
      const message: IframeMessage = { type: 'WIDGET_READY' };
      window.parent.postMessage(message, '*');
    }

    // Listen for messages from parent
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      // Validate message structure
      if (!event.data || typeof event.data.type !== 'string') {
        return;
      }

      switch (event.data.type) {
        case 'RESIZE_WIDGET':
          if (event.data.height && typeof event.data.height === 'number') {
            document.body.style.height = `${event.data.height}px`;
          }
          break;
        case 'CLOSE_WIDGET':
          // Handle close request if needed
          break;
        default:
          // Unknown message type
          break;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#6b7280'
      }}>
        Loading Ava...
      </div>
    );
  }

  const handleClose = () => {
    // Send close message to parent
    if (typeof window !== 'undefined' && window.parent !== window) {
      const message: IframeMessage = { type: 'CLOSE_WIDGET' };
      window.parent.postMessage(message, '*');
    }
  };

  return (
    <>
      <Head>
        <title>Ava Solar Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={{ 
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: 'white'
      }}>
        {/* Close button */}
        <button
          className="iframe-close-button"
          onClick={handleClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="16" height="16" fill="#6b7280" viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        {/* Chat widget container with aggressive sizing */}
        <div className="iframe-chat-container">
          <ChatWidget />
        </div>
      </div>
    </>
  );
}

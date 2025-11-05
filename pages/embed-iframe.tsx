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

  return (
    <>
      <Head>
        <title>Ava Solar Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={{ 
        margin: 0, 
        padding: 0, 
        height: '100vh',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <ChatWidget />
      </div>
    </>
  );
}

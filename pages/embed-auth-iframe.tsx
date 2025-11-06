import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ChatWidget from '../components/ChatWidget';
import { supabase } from '../lib/supabase';

interface SessionData {
  email?: string;
  userId?: string;
  token?: string;
  name?: string;
  customData?: any;
}

export default function EmbedAuthIframe() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract session data from URL parameters
    const { email, userId, token, name, customData } = router.query;
    
    if (router.isReady) {
      const session: SessionData = {};
      
      if (email && typeof email === 'string') session.email = email;
      if (userId && typeof userId === 'string') session.userId = userId;
      if (token && typeof token === 'string') session.token = token;
      if (name && typeof name === 'string') session.name = name;
      if (customData && typeof customData === 'string') {
        try {
          session.customData = JSON.parse(customData);
        } catch (e) {
          console.warn('Failed to parse customData:', e);
        }
      }
      
      console.log('🔐 [AUTH-IFRAME] Received session data:', session);
      setSessionData(session);
      
      // If we have session data, authenticate with Supabase
      if (session.email || session.token) {
        authenticateWithSession(session);
      } else {
        setLoading(false);
      }
    }
  }, [router.isReady, router.query]);

  const authenticateWithSession = async (session: SessionData) => {
    try {
      console.log('🔐 [AUTH-IFRAME] Authenticating with session data...');
      
      // If we have a token, try to use it directly
      if (session.token) {
        try {
          // Try to set the session with the provided token
          const { data, error } = await supabase.auth.setSession({
            access_token: session.token,
            refresh_token: session.token // Use same token as refresh for simplicity
          });
          
          if (!error && data.user) {
            console.log('✅ [AUTH-IFRAME] Authenticated with token:', data.user.email);
            setIsAuthenticated(true);
            setLoading(false);
            return;
          }
        } catch (tokenError) {
          console.warn('⚠️ [AUTH-IFRAME] Token authentication failed:', tokenError);
        }
      }
      
      // If we have email but no valid token, create a temporary authenticated state
      if (session.email) {
        console.log('✅ [AUTH-IFRAME] Using email-based authentication:', session.email);
        setIsAuthenticated(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ [AUTH-IFRAME] Authentication error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Ava - Solar Assistant</title>
        <meta name="description" content="Ava AI Solar Assistant - Authenticated Embed" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ChatWidget 
            isEmbedded={true}
            apiEndpoint="/api/chat"
            actingAsEmail={sessionData?.email || null}
            preAuthenticatedUser={isAuthenticated ? {
              email: sessionData?.email,
              userId: sessionData?.userId,
              name: sessionData?.name,
              customData: sessionData?.customData
            } : null}
          />
        </div>
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 left-4 bg-white p-4 rounded shadow-lg text-xs max-w-sm">
            <h3 className="font-bold mb-2">Debug - Auth Session</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify({
                sessionData,
                isAuthenticated,
                query: router.query
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

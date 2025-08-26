import { createClient } from '@supabase/supabase-js';

// Enhanced debug logging for production troubleshooting
console.log('🔧 [SUPABASE] Environment debug:', {
  NODE_ENV: process.env.NODE_ENV,
  isVercel: !!process.env.VERCEL,
  hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length,
  anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length,
  serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
  timestamp: new Date().toISOString()
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ugolpzpaykhrumlwcpue.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb2xwenBheWtocnVtbHdjcHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwNDYxMjQsImV4cCI6MjA1OTYyMjEyNH0.6QBjm_II-N1NcZQnzeF5QXwDWMUp8s4zuHX5AXgRdG0';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for public operations (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key (bypasses RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase;

// Types for project data
export interface Project {
  id: string;
  email: string;
  project_id: string;
  milestone: string;
  raw_payload: any; // JSON data from Podio containing address and other details
  updated_at: string;
  parsed_payload?: any; // Parsed version of raw_payload
}

// Database functions for project queries
export async function getProjectByEmail(email: string, userSession?: any): Promise<Project[]> {
  console.log('🔍 [SUPABASE] Searching podio_data by email:', {
    email: `"${email}"`,
    emailLength: email.length,
    emailTrimmed: email.trim(),
    hasUserSession: !!userSession,
    sessionTokenLength: userSession?.access_token?.length || 0,
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });

  // Use anon key with session context - Supabase handles authentication automatically
  console.log('🔐 [SUPABASE] Using anon key with session context');
  
  // Create client with anon key - session will be set separately
  const authenticatedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Use JWT token authentication for all environments
  let clientToUse = authenticatedClient;
  
  if (userSession && userSession.access_token) {
    console.log('🔑 [SUPABASE] Creating authenticated client with JWT token');
    
    // Create a new client with the JWT token in the Authorization header
    clientToUse = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${userSession.access_token}`
          }
        }
      }
    );
    
    // Verify the token works by getting user info
    const { data: { user }, error: userError } = await clientToUse.auth.getUser();
    
    if (userError) {
      console.error('❌ [SUPABASE] Failed to authenticate with token:', {
        error: userError.message,
        code: userError.status,
        details: userError,
        environment: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        tokenLength: userSession.access_token?.length,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        timestamp: new Date().toISOString()
      });
      console.log('⚠️ [SUPABASE] Using anon client as fallback');
      clientToUse = authenticatedClient; // Fallback to anon client
    } else {
      console.log('✅ [SUPABASE] User authenticated successfully');
      console.log('👤 [SUPABASE] Current user:', {
        userId: user?.id,
        userEmail: user?.email,
        userRole: user?.role,
        isAuthenticated: !!user,
        environment: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    console.log('⚠️ [SUPABASE] No user session available - using anon access only');
  }

  console.log('🔧 [SUPABASE] Using client:', {
    hasUserSession: !!userSession,
    hasAccessToken: !!(userSession?.access_token),
    accessTokenLength: userSession?.access_token?.length || 0,
    clientType: (userSession && userSession.access_token) ? 'authenticated' : 'anon',
    environment: process.env.NODE_ENV || 'development'
  });

  // First, let's check if the table exists and what data is in it
  console.log('🔧 [SUPABASE] Testing table access...');
  
  // Test RLS policies and table access
  console.log('🔒 [SUPABASE] Testing RLS and table access...');
  
  // First, try a simple count to test basic access
  const { count, error: countError } = await clientToUse
    .from('podio_data')
    .select('*', { count: 'exact', head: true });
    
  console.log('📊 [SUPABASE] Table count test:', {
    totalRows: count,
    hasError: !!countError,
    errorCode: countError?.code,
    errorMessage: countError?.message,
    errorDetails: countError?.details,
    errorHint: countError?.hint,
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });
  
  // Try to get table info first
  const { data: tableTest, error: tableError } = await clientToUse
    .from('podio_data')
    .select('*')
    .limit(1);
  
  if (tableError) {
    console.error('❌ [SUPABASE] Table access error:', {
      code: tableError.code,
      message: tableError.message,
      details: tableError.details,
      hint: tableError.hint,
      possibleCause: tableError.code === '42501' ? 'RLS Policy Blocking Access' : 'Unknown',
      environment: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      clientType: userSession ? 'authenticated' : 'anon',
      timestamp: new Date().toISOString()
    });
    
    // If it's a permission error, check if RLS is enabled
    if (tableError.code === '42501') {
      console.log('🔒 [SUPABASE] RLS Permission Error - Check if:');
      console.log('   1. RLS is enabled on podio_data table');
      console.log('   2. Policy exists for authenticated users');
      console.log('   3. User email matches policy conditions');
    }
    
    return [];
  }
  
  // Get all data to see what's actually in the table
  const { data: allData, error: allError } = await clientToUse
    .from('podio_data')
    .select('*')
    .limit(10);
  
  console.log('🔍 [SUPABASE] Table structure and sample data:', {
    count: allData?.length || 0,
    columns: allData?.[0] ? Object.keys(allData[0]) : [],
    sampleEmails: allData?.map(p => p.email) || [],
    emailComparison: allData?.map(p => ({
      stored: p.email,
      searching: email,
      exactMatch: p.email === email,
      caseInsensitiveMatch: p.email?.toLowerCase() === email?.toLowerCase(),
      trimmedMatch: p.email?.trim() === email?.trim()
    })) || [],
    searchingFor: email,
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });

  // Try exact match first with all columns
  const { data, error } = await clientToUse
    .from('podio_data')
    .select('*')
    .eq('email', email.trim());
  
  // If no exact match, try multiple search strategies
  if (data && data.length === 0) {
    console.log('🔍 [SUPABASE] No exact match, trying alternative searches...');
    
    // Try case-insensitive search
    const { data: caseInsensitiveData, error: caseInsensitiveError } = await clientToUse
      .from('podio_data')
      .select('*')
      .ilike('email', email.trim());
    
    // Try searching without domain (just username part)
    const emailUsername = email.split('@')[0];
    const { data: usernameData, error: usernameError } = await clientToUse
      .from('podio_data')
      .select('*')
      .ilike('email', `%${emailUsername}%`);
    
    console.log('🔍 [SUPABASE] Alternative search results:', {
      caseInsensitive: caseInsensitiveData?.length || 0,
      usernameSearch: usernameData?.length || 0,
      emailUsername: emailUsername
    });
    
    if (caseInsensitiveData && caseInsensitiveData.length > 0) {
      console.log('✅ [SUPABASE] Found match with case-insensitive search');
      // Process the case-insensitive data the same way as exact match
      const processedCaseInsensitiveData = caseInsensitiveData?.map(project => {
        let parsedPayload = null;
        if (project.raw_payload) {
          try {
            parsedPayload = typeof project.raw_payload === 'string' 
              ? JSON.parse(project.raw_payload) 
              : project.raw_payload;
          } catch (parseError) {
            console.error('❌ [SUPABASE] Error parsing raw_payload:', parseError);
          }
        }

        return {
          id: project.id,
          email: project.email,
          project_id: project.project_id || project.id,
          milestone: project.milestone || 'Unknown',
          raw_payload: project.raw_payload,
          updated_at: project.updated_at,
          parsed_payload: parsedPayload
        };
      }) || [];
      
      return processedCaseInsensitiveData;
    }
    
    // If case-insensitive didn't work, try username search
    if (usernameData && usernameData.length > 0) {
      console.log('✅ [SUPABASE] Found match with username search');
      const processedUsernameData = usernameData?.map(project => {
        let parsedPayload = null;
        if (project.raw_payload) {
          try {
            parsedPayload = typeof project.raw_payload === 'string' 
              ? JSON.parse(project.raw_payload) 
              : project.raw_payload;
          } catch (parseError) {
            console.error('❌ [SUPABASE] Error parsing raw_payload:', parseError);
          }
        }

        return {
          id: project.id,
          email: project.email,
          project_id: project.project_id || project.id,
          milestone: project.milestone || 'Unknown',
          raw_payload: project.raw_payload,
          updated_at: project.updated_at,
          parsed_payload: parsedPayload
        };
      }) || [];
      
      return processedUsernameData;
    }
  }
  
  if (error) {
    console.error('❌ [SUPABASE] Error fetching from podio_data:', error);
    return [];
  }
  
  console.log('✅ [SUPABASE] Query successful. Found records:', {
    count: data?.length || 0,
    exactMatchFound: (data?.length || 0) > 0,
    records: data?.map(p => ({ 
      id: p.id, 
      email: p.email, 
      project_id: p.project_id,
      hasRawPayload: !!p.raw_payload,
      updated_at: p.updated_at
    })) || [],
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    timestamp: new Date().toISOString()
  });
  
  // Parse raw_payload JSON data for each project
  const processedData = data?.map(project => {
    let parsedPayload = null;
    if (project.raw_payload) {
      try {
        parsedPayload = typeof project.raw_payload === 'string' 
          ? JSON.parse(project.raw_payload) 
          : project.raw_payload;
        console.log('📋 [SUPABASE] Parsed raw_payload for project:', {
          project_id: project.id,
          payload_keys: Object.keys(parsedPayload || {}),
          payload_size: JSON.stringify(parsedPayload).length
        });
      } catch (parseError) {
        console.error('❌ [SUPABASE] Failed to parse raw_payload for project:', project.id, parseError);
      }
    }
    
    return {
      ...project,
      parsed_payload: parsedPayload
    };
  }) || [];
  
  return processedData;
}

export async function searchPodioData(searchTerm: string): Promise<Project[]> {
  console.log('🔍 [SUPABASE] Searching podio_data with term:', {
    searchTerm: `"${searchTerm}"`,
    searchFields: ['email', 'project_id', 'milestone'],
    timestamp: new Date().toISOString()
  });

  const { data, error } = await supabaseAdmin
    .from('podio_data')
    .select('id, email, project_id, milestone, raw_payload, updated_at')
    .or(`email.ilike.%${searchTerm}%,project_id.ilike.%${searchTerm}%,milestone.ilike.%${searchTerm}%`)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('❌ [SUPABASE] Error searching podio_data:', error);
    return [];
  }
  
  console.log('✅ [SUPABASE] Search results:', {
    searchTerm: searchTerm,
    count: data?.length || 0,
    records: data?.map(p => ({
      id: p.id,
      email: p.email,
      project_id: p.project_id,
      milestone: p.milestone,
      hasRawPayload: !!p.raw_payload
    })) || []
  });

  // Parse raw_payload JSON data for each project
  const processedData = data?.map(project => {
    let parsedPayload = null;
    if (project.raw_payload) {
      try {
        parsedPayload = typeof project.raw_payload === 'string' 
          ? JSON.parse(project.raw_payload) 
          : project.raw_payload;
        console.log('📋 [SUPABASE] Parsed raw_payload for search result:', {
          project_id: project.id,
          payload_keys: Object.keys(parsedPayload || {}),
          payload_size: JSON.stringify(parsedPayload).length
        });
      } catch (parseError) {
        console.error('❌ [SUPABASE] Failed to parse raw_payload for project:', project.id, parseError);
      }
    }
    
    return {
      ...project,
      parsed_payload: parsedPayload
    };
  }) || [];
  
  return processedData;
}

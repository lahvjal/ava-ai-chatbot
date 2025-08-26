import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for project data
export interface Project {
  id: string;
  customer_name: string;
  email?: string;
  customer_phone?: string;
  address: string;
  status: string;
  progress_percentage: number;
  installation_date?: string;
  completion_date?: string;
  system_size?: number;
  project_type?: string;
  notes?: string;
  raw_payload?: any; // JSON data from Podio
  created_at: string;
  updated_at: string;
}

// Database functions for project queries
export async function getProjectByEmail(email: string): Promise<Project[]> {
  console.log('🔍 [SUPABASE] Searching podio_data by email:', {
    email: `"${email}"`,
    timestamp: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('podio_data')
    .select('*, raw_payload')
    .eq('email', email);
  
  if (error) {
    console.error('❌ [SUPABASE] Error fetching from podio_data:', error);
    return [];
  }
  
  console.log('✅ [SUPABASE] Query successful. Found records:', {
    count: data?.length || 0,
    records: data?.map(p => ({
      id: p.id,
      customer_name: p.customer_name,
      email: p.email,
      status: p.status,
      progress_percentage: p.progress_percentage,
      has_raw_payload: !!p.raw_payload
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
    searchFields: ['customer_name', 'address', 'notes'],
    timestamp: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('podio_data')
    .select('*, raw_payload')
    .or(`customer_name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ [SUPABASE] Error searching podio_data:', error);
    return [];
  }
  
  console.log('✅ [SUPABASE] Search results:', {
    searchTerm: searchTerm,
    count: data?.length || 0,
    records: data?.map(p => ({
      id: p.id,
      customer_name: p.customer_name,
      email: p.email,
      address: p.address,
      status: p.status,
      progress_percentage: p.progress_percentage,
      has_raw_payload: !!p.raw_payload
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

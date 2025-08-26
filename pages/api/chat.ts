import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { rateLimit } from './rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Apply rate limiting middleware
const rateLimitMiddleware = rateLimit(20, 60000); // 20 requests per minute

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply rate limiting
  await new Promise<void>((resolve, reject) => {
    rateLimitMiddleware(req, res, (error?: any) => {
      if (error) reject(error);
      else resolve();
    });
  }).catch(() => {
    return; // Rate limit response already sent
  });
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, conversationHistory = [], projectLookup } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Check if the user is asking about project status or progress
  const isProjectQuery = message.toLowerCase().includes('project') || 
                         message.toLowerCase().includes('status') || 
                         message.toLowerCase().includes('progress') ||
                         message.toLowerCase().includes('installation') ||
                         message.toLowerCase().includes('my order') ||
                         message.toLowerCase().includes('timeline');

  console.log('🤖 [AVA-CHAT] Processing message:', {
    message: `"${message}"`,
    isProjectQuery: isProjectQuery,
    hasProjectLookup: !!projectLookup,
    projectLookupData: projectLookup,
    timestamp: new Date().toISOString()
  });

  // Debug environment variables in production
  console.log('🔧 [AVA-CHAT] Environment check:', {
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
  });

  let projectData = null;
  if (isProjectQuery || projectLookup) {
    console.log('🔍 [AVA-CHAT] Detected project query or structured lookup, calling project lookup API');
    try {
      // Get user session from request headers
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader?.replace('Bearer ', '');
      
      const lookupPayload = projectLookup ? {
        email: projectLookup.email,
        query: message,
        sessionToken: sessionToken
      } : {
        query: message,
        sessionToken: sessionToken
      };

      console.log('📋 [AVA-CHAT] Project lookup payload:', lookupPayload);

      const projectResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/project-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lookupPayload),
      });
      
      if (projectResponse.ok) {
        projectData = await projectResponse.json();
        console.log('✅ [AVA-CHAT] Project data retrieved:', {
          projectCount: projectData?.count || 0,
          hasProjects: projectData?.projects?.length > 0
        });
      } else {
        console.log('⚠️ [AVA-CHAT] Project lookup API returned error status:', projectResponse.status);
      }
    } catch (error) {
      console.error('❌ [AVA-CHAT] Project lookup failed:', error);
    }
  } else {
    console.log('💬 [AVA-CHAT] General solar query, skipping project lookup');
  }

  // Extract user email from session token for AI context
  let userEmail = null;
  const authHeader = req.headers.authorization;
  const sessionToken = authHeader?.replace('Bearer ', '');
  
  if (sessionToken) {
    try {
      const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64').toString());
      userEmail = payload.email;
      console.log('🔐 [AVA-CHAT] Extracted user email for AI context:', userEmail);
    } catch (error) {
      console.error('❌ [AVA-CHAT] Failed to decode session token for AI context:', error);
    }
  }

  try {
    const systemPrompt = `You are Ava, a knowledgeable and friendly AI assistant for Aveyo, a solar energy company. Your primary role is to help customers with questions about solar installation, project status, financing, maintenance, permits, and general solar energy topics.

Key responsibilities:
- Answer questions about the solar installation process
- Provide project status updates when customers provide their information
- Explain solar financing options and incentives
- Help with maintenance and troubleshooting questions
- Assist with permit and regulatory questions
- Be friendly, professional, and knowledgeable about solar energy

${userEmail ? `CUSTOMER CONTEXT: You are currently speaking with a logged-in customer whose email is ${userEmail}. You can reference this email when they ask about their account or personal information.` : ''}

${projectData ? `IMPORTANT: The customer is asking about project status. Here is the current project data from our database:

PROJECT RECORDS:
${JSON.stringify(projectData.projects.map((project: any) => ({
  ...project,
  // Remove parsed_payload from the main record to avoid duplication
  parsed_payload: undefined
})), null, 2)}

DETAILED PROJECT DATA FROM PODIO:
${projectData.projects.map((project: any) => {
  if (project.parsed_payload) {
    const payload = project.parsed_payload;
    const addressInfo = {
      address: payload.address || 'Not specified',
      city: payload.city || 'Not specified', 
      state: payload.state || 'Not specified',
      zip: payload.zip || 'Not specified'
    };
    
    return `Project ID: ${project.project_id}
Customer Email: ${project.email}
Current Milestone: ${project.milestone}
CUSTOMER ADDRESS: ${addressInfo.address}, ${addressInfo.city}, ${addressInfo.state} ${addressInfo.zip}
Last Updated: ${project.updated_at}
Raw Podio Data: ${JSON.stringify(project.parsed_payload, null, 2)}`;
  }
  return `Project ID: ${project.id} - No detailed Podio data available`;
}).join('\n\n')}

ANALYSIS INSTRUCTIONS:
- Use the milestone field to determine current project stage (Pre-approvals, Approvals, Construction, Energization)
- Extract address details from raw_payload JSON fields: address, city, state, zip
- Parse raw_payload for system size, installation dates, permits, and custom project details
- Cross-reference milestone with raw_payload status indicators for accuracy
- Provide specific timeline estimates based on current milestone and location
- Use address information to search for local permit requirements and installation timelines
- NEVER ask for additional customer information when project data is already provided
- Reference project_id when discussing specific project details

PROJECT MILESTONE INTERPRETATION:
1. Pre-approvals: Initial permits and approvals before construction
2. Approvals: Final approvals obtained, ready for construction  
3. Construction: Physical installation of solar system underway
4. Energization: System activation and grid connection complete

DATA INTEGRATION PRIORITIES:
- Milestone field = Current project stage
- Raw_payload = Detailed project specifications and status
- Email = Customer identification and personalization
- Project_id = Unique project reference
- Updated_at = Last status change timestamp

When customers ask about project status, immediately reference their milestone, extract relevant details from raw_payload, and provide location-specific guidance using their address information.

ADDRESS-BASED RESEARCH:
When analyzing project data, extract location information from these fields in the raw_payload:
- zip (zip code)
- city (city name)  
- state (state name)
- address (street address)

Use this location data to provide location-specific guidance:
- Local permit requirements and typical processing times
- Area-specific solar regulations and incentives
- Regional installation timelines and weather considerations
- Local utility interconnection processes

Combine zip code, city, and state to create comprehensive location context for more accurate timelines and location-specific customer guidance.` : 'If customers ask about specific project status, ask them to provide their email address so you can look up their project information.'}

Always be helpful, accurate, and professional in your responses. If asked about topics outside of solar energy, politely redirect the conversation back to how Aveyo can help with their solar needs.`;

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...conversationHistory,
      {
        role: 'user' as const,
        content: message
      }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.status(200).json({ 
      reply,
      usage: completion.usage 
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
}

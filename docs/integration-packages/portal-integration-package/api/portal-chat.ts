import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { rateLimit } from './rate-limit';
import { supabaseAdmin } from '../../lib/supabase';
import { handleCorsPreflightAndContinue } from '../../lib/cors';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Apply rate limiting middleware
const rateLimitMiddleware = rateLimit(30, 60000); // 30 requests per minute for portal users

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS and preflight requests
  if (!handleCorsPreflightAndContinue(req, res)) {
    return; // Preflight request was handled, exit early
  }

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

  const { message, conversationHistory = [], portalUser } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!portalUser?.email) {
    return res.status(400).json({ error: 'Portal user information is required' });
  }

  // Extract portal user information
  const userEmail = portalUser.email;
  const userName = portalUser.name || '';
  const userId = portalUser.id || '';

  console.log('🏢 [PORTAL-CHAT] Processing message:', {
    message: `"${message}"`,
    userEmail: userEmail,
    userName: userName,
    userId: userId,
    timestamp: new Date().toISOString()
  });

  // Load all admin training sections for knowledge grounding
  let trainingSections: Array<{ section: string; title?: string; content?: string; updated_at?: string }> = [];
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_training_docs')
      .select('section, title, content, updated_at')
      .order('section', { ascending: true });
    if (!error && data) {
      trainingSections = (data as any[]).filter(s => (s.content || '').trim().length > 0);
      console.log('📚 [PORTAL-CHAT] Loaded training sections', {
        count: trainingSections.length,
        sections: trainingSections.map(s => s.section),
      });
    } else if (error) {
      console.warn('⚠️ [PORTAL-CHAT] Could not load training doc:', error);
    }
  } catch (e) {
    console.warn('⚠️ [PORTAL-CHAT] Training doc fetch failed:', e);
  }

  // Fetch project data for the authenticated portal user
  let projectData = null;
  try {
    console.log('🔍 [PORTAL-CHAT] Fetching project data for portal user:', userEmail);

    const projectResponse = await fetch(`${req.headers.origin || 'https://ava-ai-chatbot.vercel.app'}/api/project-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        query: message,
        portalIntegration: true
      }),
    });
    
    if (projectResponse.ok) {
      projectData = await projectResponse.json();
      console.log('✅ [PORTAL-CHAT] Project data retrieved:', {
        projectCount: projectData?.count || 0,
        hasProjects: projectData?.projects?.length > 0
      });
    } else {
      console.log('⚠️ [PORTAL-CHAT] Project lookup API returned error status:', projectResponse.status);
    }
  } catch (error) {
    console.error('❌ [PORTAL-CHAT] Project lookup failed:', error);
  }

  try {
    // Build a combined knowledge base string from sections
    const knowledgeBase = trainingSections.length
      ? trainingSections.map(s => {
          const label = (s.section || '').toUpperCase().replace(/_/g, ' ');
          const titleSuffix = s.title ? ` (${s.title})` : '';
          const updatedSuffix = s.updated_at ? ` [updated ${s.updated_at}]` : '';
          return `${label}${titleSuffix}${updatedSuffix}:\n${s.content}\n`;
        }).join('\n')
      : '';

    const systemPrompt = `You are Ava, a knowledgeable and friendly AI assistant for Aveyo, a solar energy company. You are integrated into the customer portal where users are already authenticated.

Key responsibilities:
- Answer questions about the solar installation process
- Explain solar financing options and incentives
- Help with maintenance and troubleshooting questions
- Assist with permit and regulatory questions
- Be friendly, professional, and knowledgeable about solar energy
- Provide personalized project information since users are authenticated through the portal

PORTAL INTEGRATION CONTEXT:
You are running inside the customer portal where the user is already logged in and authenticated. The user's information:
- Email: ${userEmail}
- Name: ${userName || 'Not provided'}
- User ID: ${userId || 'Not provided'}

Since this is a portal integration, you can freely share all personal project information including address, project details, timeline, and any data from their project records. The portal's authentication system ensures users only access their own data.

${knowledgeBase ? `KNOWLEDGE BASE (Admin-maintained sections):\n\n${knowledgeBase}\nUse this knowledge to answer questions. Prioritize company-specific policies, FAQs, processes, tone, and product knowledge.` : ''}

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
FINANCE COMPANY: ${project.finance_company || 'Not specified'}
Raw Podio Data: ${JSON.stringify(project.parsed_payload, null, 2)}`;
  }
  return `Project ID: ${project.id} - No detailed Podio data available`;
}).join('\n\n')}

PRIORITY HIERARCHY:
1. HIGHEST PRIORITY: Always prioritize information from your training documents (policies, FAQs, processes, tone guidelines, product knowledge)
2. Use the instructions below only for technical data processing and response structure
3. When training documents conflict with these instructions, follow the training documents

STRICT DATA SOURCE RULES:
1. PROJECT INFORMATION: ONLY use data from the Supabase project data provided above
2. PRODUCT KNOWLEDGE: ONLY use information from your product knowledge training document
3. ALL OTHER QUESTIONS: If not covered by project data or product knowledge training doc, connect to human support

CUSTOMER SUPPORT CONTACT GUIDANCE:
- When suggesting customers contact support, ALWAYS include contact information
- Use these clickable links: <a href="tel:+13854693838">(385) 469-3838</a> or <a href="mailto:customercare@aveyo.com">customercare@aveyo.com</a>

RESPONSE FORMAT:
- Use a warm, reassuring customer-care tone
- Be concise and helpful
- Reference specific project details when available
- Provide actionable next steps when appropriate

Always be helpful, accurate, and professional in your responses.` : `The customer is authenticated through the portal but I don't have specific project information available. I can help with general solar questions and direct them to customer support for project-specific details.`}`;

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
    console.error('❌ [PORTAL-CHAT] OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
}

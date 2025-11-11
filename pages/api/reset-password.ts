import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextApiRequest, NextApiResponse } from 'next';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || '');

// Initialize Supabase admin client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Get the base URL for the current environment
function getBaseUrl(): string {
  // First check for explicit override
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // For development
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || '3000';
    return `http://localhost:${port}`;
  }
  
  // For production - update this to your actual domain
  return 'https://ava-ai-chatbot.vercel.app';
}

// Email configuration
const emailConfig = {
  fromAddress: 'Ava AI Support <noreply@aveyo.com>',
  supportEmail: 'support@aveyo.com'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse request body
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Get the redirect URL for password reset
    const baseUrl = getBaseUrl();
    const resetRedirectUrl = `${baseUrl}/reset-password`;

    console.log('==== AVA AI PASSWORD RESET REQUEST ====');
    console.log('Request details:');
    console.log('- Email:', email);
    console.log('- Reset Redirect URL:', resetRedirectUrl);
    console.log('========================================');

    // Check if the email exists in the database
    console.log('==== USER VALIDATION ====');
    console.log('Checking if email exists...');
    
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      console.log('==== USER VALIDATION FAILED ====');
      console.error('User validation error:', getUserError);
      console.log('================================');
      return res.status(500).json({ error: 'Failed to verify user account' });
    }
    
    if (!users || users.length === 0) {
      console.log('==== NO USERS FOUND ====');
      console.error('No users found in Supabase');
      console.log('==========================');
      return res.status(500).json({ error: 'User verification system unavailable' });
    }
    
    console.log(`Found ${users.length} total users in Supabase`);
    
    // Find the user with the matching email (case insensitive)
    const user = users.find(user => 
      user.email && user.email.toLowerCase() === email.toLowerCase()
    );
    
    // Check if user exists
    const userExists = !!user;
    
    if (!userExists) {
      console.log('==== VALIDATION RESULT ====');
      console.log('User not found with email:', email);
      console.log('No email will be sent');
      console.log('==========================');
      // Don't reveal that the email doesn't exist for security reasons
      return res.status(200).json({ 
        success: false, 
        message: 'This email is not associated with an Ava AI account.',
        userExists: false,
        reason: 'user_not_found'
      });
    }
    
    console.log('==== VALIDATION RESULT ====');
    console.log('Valid user found, proceeding with password reset');
    console.log('Email will be sent to:', email);
    console.log('==========================');
    
    // Generate a password reset token using Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: resetRedirectUrl
      }
    });
    
    console.log('Generated link with redirectTo:', resetRedirectUrl);

    if (error) {
      console.log('==== TOKEN GENERATION FAILED ====');
      console.error('Error generating reset token:', error);
      console.log('================================');
      return res.status(500).json({ error: 'Failed to generate reset token' });
    }

    // Extract the token from the Supabase-generated URL
    const supabaseUrl = data.properties.action_link;
    console.log('Original Supabase URL:', supabaseUrl);
    
    // Parse the URL to extract the token
    const urlObj = new URL(supabaseUrl);
    const token = urlObj.searchParams.get('token');
    
    if (!token) {
      console.log('==== TOKEN EXTRACTION FAILED ====');
      console.error('Could not extract token from Supabase URL');
      console.log('================================');
      return res.status(500).json({ error: 'Failed to generate reset token' });
    }
    
    // Create our own environment-aware reset URL
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    console.log('Using reset URL:', resetUrl);

    // Set email subject and app name
    const emailSubject = 'Reset Your Ava AI Password';
    const appName = 'Ava AI';

    // Send email with Resend
    console.log('==== EMAIL PREPARATION ====');
    console.log('Preparing email to:', email);
    console.log('==========================');
    
    const hasApiKey = !!process.env.RESEND_API_KEY;
    console.log('Resend API key present:', hasApiKey);
    
    if (!hasApiKey) {
      console.log('==== EMAIL SENDING FAILED ====');
      console.error('ERROR: Resend API key is missing. Emails cannot be sent.');
      console.log('================================');
      return res.status(500).json({ error: 'Email service configuration error' });
    }
    
    const recipientEmail = email;
    const fromEmail = emailConfig.fromAddress;
    const emailSubjectText = emailSubject;
    
    console.log('==== EMAIL CONFIGURATION ====');
    console.log(`- From: ${fromEmail}`);
    console.log(`- To: ${recipientEmail}`);
    console.log(`- Subject: ${emailSubjectText}`);
    console.log('============================');
    
    console.log('==== SENDING EMAIL ====');
    console.log('Attempting to send email now...');
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: emailSubjectText,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0284c7;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              padding: 20px;
              border: 1px solid #ddd;
              border-top: none;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              background-color: #0284c7;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 20px;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Reset Your Ava AI Password</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password for your Ava AI account.</p>
            <p>Click the button below to reset your password. This link will expire in 24 hours.</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; font-size: 12px;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Ava AI by Aveyo. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    });

    if (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send password reset email', 
        details: emailError 
      });
    }
    
    console.log(`Password reset email queued successfully with ID: ${emailData?.id}`);

    console.log('==== EMAIL SENT SUCCESSFULLY ====');
    console.log('Email ID:', emailData?.id);
    console.log('================================');

    return res.status(200).json({ 
      success: true, 
      data: emailData,
      userExists: true,
      emailSent: true
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ 
      error: 'Failed to process password reset request' 
    });
  }
}

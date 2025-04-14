// pages/api/auth/magic-link.js
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'user@example.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  },
  from: process.env.EMAIL_FROM || 'noreply@sturij.com'
};

export default async function handler(req, res) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    // Generate magic link token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store token in database
    const { error: tokenError } = await supabase
      .from('magic_link_tokens')
      .insert([
        {
          token,
          email,
          expires_at: expiresAt.toISOString(),
          used: false
        }
      ]);

    if (tokenError) {
      throw tokenError;
    }

    // Check if user exists in database
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      // User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            email,
            auth_provider: 'magic_link'
          }
        ])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      user = newUser;
    }

    // Generate magic link URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const magicLinkUrl = `${baseUrl}/auth-callback.html?token=${token}`;

    // Get email template
    let { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('key', 'magic-link')
      .eq('active', true)
      .single();

    if (templateError) {
      // Use default template
      template = {
        name: 'Magic Link Email',
        subject: 'Your login link for {{company.name}}',
        content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Login Link</title>
</head>
<body>
    <h1>Your Login Link</h1>
    <p>Hello,</p>
    <p>You requested a login link for {{company.name}}. Click the link below to log in:</p>
    <p><a href="{{links.magic}}">Log In</a></p>
    <p>This link will expire in 10 minutes and can only be used once.</p>
    <p>If you didn't request this link, you can safely ignore this email.</p>
    <p>Best regards,<br>{{company.name}} Team</p>
</body>
</html>`
      };
    }

    // Compile template with Handlebars
    const compiledSubject = Handlebars.compile(template.subject);
    const compiledContent = Handlebars.compile(template.content);

    // Prepare data for template
    const templateData = {
      customer: {
        email
      },
      company: {
        name: process.env.COMPANY_NAME || 'Sturij',
        email: process.env.COMPANY_EMAIL || 'contact@sturij.com',
        phone: process.env.COMPANY_PHONE || '',
        address: process.env.COMPANY_ADDRESS || '',
        website: process.env.COMPANY_WEBSITE || 'https://sturij.com'
      },
      links: {
        magic: magicLinkUrl
      }
    };

    // Render email subject and content
    const subject = compiledSubject(templateData);
    const html = compiledContent(templateData);

    // Create email transport
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'Sturij'}" <${emailConfig.from}>`,
      to: email,
      subject,
      html
    });

    // Log email sending in database
    await supabase
      .from('email_logs')
      .insert([
        {
          template_key: 'magic-link',
          recipient_email: email,
          subject,
          status: 'sent',
          message_id: info.messageId,
          sent_at: new Date().toISOString()
        }
      ]);

    return res.status(200).json({
      success: true,
      message: 'Magic link sent to email'
    });
  } catch (error) {
    console.error('Error sending magic link:', error);
    return res.status(500).json({ error: 'Failed to send magic link' });
  }
}

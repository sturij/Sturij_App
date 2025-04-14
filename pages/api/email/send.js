// pages/api/email/send.js
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import emailTemplates from '../../../lib/emailTemplates';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { templateKey, recipient, data, testMode } = req.body;
    
    if (!templateKey || !recipient || !recipient.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get template from database
    let { data: templateData, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('key', templateKey)
      .eq('active', true)
      .single();
    
    // Use template from database or default template
    let templateToUse;
    
    if (templateError) {
      // If template not found in database, try to use default templates
      if (!emailTemplates[templateKey]) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      templateToUse = emailTemplates[templateKey];
    } else {
      templateToUse = templateData;
    }
    
    // Compile template with Handlebars
    const compiledSubject = Handlebars.compile(templateToUse.subject);
    const compiledContent = Handlebars.compile(templateToUse.content);
    
    // Prepare data for template
    const templateDataForRendering = {
      customer: {
        name: recipient.name || '',
        email: recipient.email || '',
        phone: recipient.phone || ''
      },
      booking: data?.booking || {},
      company: {
        name: process.env.COMPANY_NAME || 'Sturij',
        email: process.env.COMPANY_EMAIL || 'contact@sturij.com',
        phone: process.env.COMPANY_PHONE || '',
        address: process.env.COMPANY_ADDRESS || '',
        website: process.env.COMPANY_WEBSITE || 'https://sturij.com'
      },
      links: data?.links || {}
    };
    
    // Render email subject and content
    const subject = compiledSubject(templateDataForRendering);
    const html = compiledContent(templateDataForRendering);
    
    // Create email transport
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });
    
    // If in test mode, just return the rendered email
    if (testMode) {
      return res.status(200).json({
        success: true,
        testMode: true,
        email: {
          to: recipient.email,
          subject,
          html
        }
      });
    }
    
    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.COMPANY_NAME || 'Sturij'}" <${emailConfig.from}>`,
      to: recipient.email,
      subject,
      html
    });
    
    // Log email sending in database
    await supabase
      .from('email_logs')
      .insert([
        {
          template_key: templateKey,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject,
          status: 'sent',
          message_id: info.messageId,
          sent_at: new Date().toISOString(),
          sent_by: session.user.id
        }
      ]);
    
    return res.status(200).json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

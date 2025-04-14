// pages/api/auth/custom-magic-link.js
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { supabase } from '../../../lib/supabaseClient';
import * as emailTemplates from '../../../lib/emailTemplates';

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
    const { email, redirectTo, customData } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Generate magic link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: redirectTo || process.env.NEXT_PUBLIC_BASE_URL,
        data: customData || {}
      }
    });
    
    if (error) {
      console.error('Error generating magic link:', error);
      return res.status(500).json({ error: 'Failed to generate magic link' });
    }
    
    // Get magic link template
    const template = emailTemplates.generateMagicLinkEmail(data.properties.action_link);
    
    if (!template) {
      return res.status(404).json({ error: 'Email template not found' });
    }
    
    // Compile template with Handlebars
    const compiledSubject = Handlebars.compile(template.subject);
    const compiledContent = Handlebars.compile(template.content);
    
    // Prepare data for template
    const templateData = {
      customer: {
        email,
        ...customData
      },
      company: {
        name: process.env.COMPANY_NAME || 'Sturij',
        email: process.env.COMPANY_EMAIL || 'contact@sturij.com',
        phone: process.env.COMPANY_PHONE || '',
        address: process.env.COMPANY_ADDRESS || '',
        website: process.env.COMPANY_WEBSITE || 'https://sturij.com'
      },
      links: {
        magic: data.properties.action_link
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
          sent_at: new Date().toISOString(),
          metadata: customData
        }
      ]);
    
    return res.status(200).json({
      success: true,
      message: 'Custom magic link sent successfully'
    });
  } catch (error) {
    console.error('Error sending custom magic link:', error);
    return res.status(500).json({ error: 'Failed to send custom magic link' });
  }
}

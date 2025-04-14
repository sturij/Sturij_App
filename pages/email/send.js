// pages/api/email/send.js
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';

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
    let { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('key', templateKey)
      .eq('active', true)
      .single();
    
    if (templateError) {
      // If template not found in database, try to use default templates
      const defaultTemplates = {
        'booking-confirmation': {
          name: 'Booking Confirmation',
          subject: 'Your booking confirmation - {{booking.id}}',
          content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Confirmation</title>
</head>
<body>
    <h1>Booking Confirmation</h1>
    <p>Hello {{customer.name}},</p>
    <p>Your booking has been confirmed. Here are the details:</p>
    <p><strong>Booking ID:</strong> {{booking.id}}</p>
    <p><strong>Date:</strong> {{booking.date}}</p>
    <p><strong>Time:</strong> {{booking.time}}</p>
    <p><strong>Service:</strong> {{booking.service}}</p>
    <p>We look forward to seeing you!</p>
    <p>Best regards,<br>{{company.name}} Team</p>
</body>
</html>`
        },
        'booking-reminder': {
          name: 'Booking Reminder',
          subject: 'Reminder: Your appointment tomorrow',
          content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Reminder</title>
</head>
<body>
    <h1>Appointment Reminder</h1>
    <p>Hello {{customer.name}},</p>
    <p>This is a friendly reminder about your appointment tomorrow:</p>
    <p><strong>Date:</strong> {{booking.date}}</p>
    <p><strong>Time:</strong> {{booking.time}}</p>
    <p><strong>Service:</strong> {{booking.service}}</p>
    <p>We look forward to seeing you tomorrow!</p>
    <p>Best regards,<br>{{company.name}} Team</p>
</body>
</html>`
        },
        'booking-reschedule': {
          name: 'Booking Reschedule',
          subject: 'Your booking has been rescheduled',
          content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Rescheduled</title>
</head>
<body>
    <h1>Booking Rescheduled</h1>
    <p>Hello {{customer.name}},</p>
    <p>Your booking has been rescheduled. Here are the new details:</p>
    <p><strong>Booking ID:</strong> {{booking.id}}</p>
    <p><strong>New Date:</strong> {{booking.date}}</p>
    <p><strong>New Time:</strong> {{booking.time}}</p>
    <p><strong>Service:</strong> {{booking.service}}</p>
    <p>We look forward to seeing you at your new appointment time!</p>
    <p>Best regards,<br>{{company.name}} Team</p>
</body>
</html>`
        },
        'booking-cancellation': {
          name: 'Booking Cancellation',
          subject: 'Your booking has been cancelled',
          content: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Cancelled</title>
</head>
<body>
    <h1>Booking Cancelled</h1>
    <p>Hello {{customer.name}},</p>
    <p>Your booking has been cancelled as requested. Here are the details of the cancelled booking:</p>
    <p><strong>Booking ID:</strong> {{booking.id}}</p>
    <p><strong>Date:</strong> {{booking.date}}</p>
    <p><strong>Time:</strong> {{booking.time}}</p>
    <p><strong>Service:</strong> {{booking.service}}</p>
    <p>We hope to see you again soon!</p>
    <p>Best regards,<br>{{company.name}} Team</p>
</body>
</html>`
        },
        'magic-link': {
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
        }
      };
      
      if (!defaultTemplates[templateKey]) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      template = defaultTemplates[templateKey];
    }
    
    // Compile template with Handlebars
    const compiledSubject = Handlebars.compile(template.subject);
    const compiledContent = Handlebars.compile(template.content);
    
    // Prepare data for template
    const templateData = {
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
    const subject = compiledSubject(templateData);
    const html = compiledContent(templateData);
    
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

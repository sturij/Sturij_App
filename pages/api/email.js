// pages/api/email.js
import { sendEmail } from '../../lib/emailService';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, content, htmlContent } = req.body;
    
    // Use default recipient for testing if not provided
    const recipient = to || process.env.TEST_EMAIL_RECIPIENT || 'test@example.com';
    
    const result = await sendEmail({
      to: recipient,
      subject: subject || 'Test Email from Sturij Calendar',
      content: content || 'This is a test email from your Sturij Calendar Booking system.',
      htmlContent: htmlContent
    });

    if (result.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: result.error,
        details: result.details 
      });
    }
  } catch (error) {
    console.error('Error in email API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      message: error.message 
    });
  }
}

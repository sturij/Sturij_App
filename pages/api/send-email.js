// pages/api/send-email.js
import sgMail from '@sendgrid/mail';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('SendGrid API key is missing');
      return res.status(500).json({ 
        success: false, 
        error: 'Configuration error',
        message: 'SendGrid API key is not configured' 
      });
    }

    // Set SendGrid API key
    sgMail.setApiKey(apiKey);

    const sender = process.env.EMAIL_SENDER || 'contact@sturij.com';
    const recipient = req.body.to || process.env.TEST_EMAIL_RECIPIENT || 'test@example.com';
    const subject = req.body.subject || 'Message from Sturij Calendar';
    const text = req.body.text || 'This is a test email from your Sturij Calendar Booking system.';
    const html = req.body.html || '<p>This is a test email from your Sturij Calendar Booking system.</p>';

    console.log(`Attempting to send email from ${sender} to ${recipient}`);

    const msg = {
      to: recipient,
      from: sender,
      subject: subject,
      text: text,
      html: html,
    };

    await sgMail.send(msg);
    console.log('Email sent successfully');
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      message: error.message,
      details: error.response ? error.response.body : null
    });
  }
}

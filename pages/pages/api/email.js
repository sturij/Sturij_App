// pages/api/email.js
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

    const sender = process.env.EMAIL_SENDER || 'contact@sturij.com';
    const recipient = process.env.TEST_EMAIL_RECIPIENT || 'test@example.com';

    console.log(`Attempting to send email from ${sender} to ${recipient}`);

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: recipient }],
            subject: 'Test Email from Sturij Calendar',
          },
        ],
        from: { email: sender },
        content: [
          {
            type: 'text/plain',
            value: 'This is a test email from your Sturij Calendar Booking system.',
          },
        ],
      }),
    });

    if (response.ok) {
      console.log('Email sent successfully');
      return res.status(200).json({ success: true });
    } else {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: await response.text() };
      }
      
      console.error('SendGrid API error:', errorData);
      return res.status(response.status).json({ 
        success: false, 
        error: 'Failed to send email',
        details: errorData 
      });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      message: error.message 
    });
  }
}

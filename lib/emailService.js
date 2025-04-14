// lib/emailService.js
/**
 * Email service for sending emails via SendGrid
 */

/**
 * Send an email using SendGrid API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.content - Email content (plain text)
 * @param {string} options.htmlContent - Optional HTML content
 * @returns {Promise<Object>} Response from SendGrid API
 */
export async function sendEmail(options) {
  const { to, subject, content, htmlContent } = options;
  const apiKey = process.env.SENDGRID_API_KEY;
  const sender = process.env.EMAIL_SENDER || 'contact@sturij.com';
  
  if (!apiKey) {
    console.error('SendGrid API key is missing');
    throw new Error('SendGrid API key is not configured');
  }

  if (!to || !subject || !content) {
    throw new Error('Missing required email parameters');
  }

  console.log(`Attempting to send email from ${sender} to ${to}`);

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to }],
            subject: subject,
          },
        ],
        from: { email: sender },
        content: [
          {
            type: 'text/plain',
            value: content,
          },
          ...(htmlContent ? [{
            type: 'text/html',
            value: htmlContent,
          }] : []),
        ],
      }),
    });

    if (response.ok) {
      console.log('Email sent successfully');
      return { success: true };
    } else {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: await response.text() };
      }
      
      console.error('SendGrid API error:', errorData);
      return { 
        success: false, 
        error: 'Failed to send email',
        details: errorData 
      };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: 'Failed to send email',
      message: error.message 
    };
  }
}

/**
 * Email templates for the application
 */

/**
 * Generate a magic link email template
 * @param {string} magicLink - The magic link URL
 * @param {string} userName - Optional user name
 * @returns {Object} Email template object with subject and content
 */
export function generateMagicLinkEmail(magicLink, userName = 'there') {
  return {
    subject: 'Your Sturij Login Link',
    content: `
Hello ${userName},

You requested to sign in to your Sturij account. Click the link below to sign in:

${magicLink}

This link will expire in 24 hours. If you didn't request this link, you can safely ignore this email.

Thank you,
The Sturij Team
    `,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Your Sturij Login Link</h2>
    </div>
    <p>Hello ${userName},</p>
    <p>You requested to sign in to your Sturij account. Click the button below to sign in:</p>
    <p style="text-align: center;">
      <a href="${magicLink}" class="button">Sign In to Sturij</a>
    </p>
    <p>Or copy and paste this link into your browser:</p>
    <p>${magicLink}</p>
    <p>This link will expire in 24 hours. If you didn't request this link, you can safely ignore this email.</p>
    <p>Thank you,<br>The Sturij Team</p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Sturij. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  };
}

/**
 * Generate a booking confirmation email template
 * @param {Object} booking - The booking details
 * @returns {Object} Email template object with subject and content
 */
export function generateBookingConfirmationEmail(booking) {
  return {
    subject: 'Your Sturij Design Visit Confirmation',
    content: `
Hello ${booking.customerName},

Your design visit has been confirmed for ${booking.date} at ${booking.time}.

Booking Details:
- Date: ${booking.date}
- Time: ${booking.time}
- Address: ${booking.address}
- Reference: ${booking.reference}

If you need to reschedule or cancel, please contact us or use the link in your account.

Thank you for choosing Sturij!
    `,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Your Design Visit is Confirmed!</h2>
    </div>
    <p>Hello ${booking.customerName},</p>
    <p>Your design visit has been confirmed for ${booking.date} at ${booking.time}.</p>
    <div class="details">
      <h3>Booking Details:</h3>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
      <p><strong>Address:</strong> ${booking.address}</p>
      <p><strong>Reference:</strong> ${booking.reference}</p>
    </div>
    <p>If you need to reschedule or cancel, please contact us or use the link in your account.</p>
    <p>Thank you for choosing Sturij!</p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Sturij. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  };
}

/**
 * Generate a booking reminder email template
 * @param {Object} booking - The booking details
 * @returns {Object} Email template object with subject and content
 */
export function generateBookingReminderEmail(booking) {
  return {
    subject: 'Reminder: Your Sturij Design Visit Tomorrow',
    content: `
Hello ${booking.customerName},

This is a friendly reminder that your design visit is scheduled for tomorrow, ${booking.date} at ${booking.time}.

Booking Details:
- Date: ${booking.date}
- Time: ${booking.time}
- Address: ${booking.address}
- Reference: ${booking.reference}

If you need to reschedule, please contact us as soon as possible.

We look forward to meeting you!
The Sturij Team
    `,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .details { background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Reminder: Your Design Visit Tomorrow</h2>
    </div>
    <p>Hello ${booking.customerName},</p>
    <p>This is a friendly reminder that your design visit is scheduled for tomorrow, ${booking.date} at ${booking.time}.</p>
    <div class="details">
      <h3>Booking Details:</h3>
      <p><strong>Date:</strong> ${booking.date}</p>
      <p><strong>Time:</strong> ${booking.time}</p>
      <p><strong>Address:</strong> ${booking.address}</p>
      <p><strong>Reference:</strong> ${booking.reference}</p>
    </div>
    <p>If you need to reschedule, please contact us as soon as possible.</p>
    <p>We look forward to meeting you!<br>The Sturij Team</p>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Sturij. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  };
}

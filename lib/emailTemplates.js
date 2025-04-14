// lib/emailTemplates.js
/**
 * Email templates for the application
 * These templates can be used with the email API
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
    `
  };
}

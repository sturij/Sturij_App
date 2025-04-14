// lib/emailTemplates.js
const emailTemplates = {
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

export default emailTemplates;

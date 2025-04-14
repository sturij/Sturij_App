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
    <!-- Template content -->
</body>
</html>`
  },
  // Other templates...
};

export default emailTemplates;

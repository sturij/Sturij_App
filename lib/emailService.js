const nodemailer = require('nodemailer');
const { emailTemplates } = require('./emailTemplates');

/**
 * Email Service
 * 
 * This service handles all email communications for the booking system,
 * including booking confirmations, reminders, and AI assistant interactions.
 */
class EmailService {
  constructor(config = {}) {
    this.config = {
      host: process.env.EMAIL_HOST || config.host,
      port: process.env.EMAIL_PORT || config.port || 587,
      secure: process.env.EMAIL_SECURE === 'true' || config.secure || false,
      auth: {
        user: process.env.EMAIL_USER || config.user,
        pass: process.env.EMAIL_PASS || config.pass
      },
      from: process.env.EMAIL_FROM || config.from || 'Sturij Furniture Design <bookings@sturij.com>'
    };

    this.transporter = nodemailer.createTransport(this.config);
    this.templates = emailTemplates;
  }

  /**
   * Send a booking confirmation email
   * 
   * @param {Object} booking - Booking details
   * @param {Object} user - User details
   * @returns {Promise} - Email sending result
   */
  async sendBookingConfirmation(booking, user) {
    try {
      const template = this.templates.bookingConfirmation;
      const html = template({
        name: user.name || user.email,
        date: new Date(booking.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: booking.time,
        purpose: booking.purpose || 'Consultation',
        bookingId: booking.id
      });

      const mailOptions = {
        from: this.config.from,
        to: user.email,
        subject: 'Your Booking Confirmation - Sturij Furniture Design',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending booking confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send a booking reminder email
   * 
   * @param {Object} booking - Booking details
   * @param {Object} user - User details
   * @returns {Promise} - Email sending result
   */
  async sendBookingReminder(booking, user) {
    try {
      const template = this.templates.bookingReminder;
      const html = template({
        name: user.name || user.email,
        date: new Date(booking.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: booking.time,
        purpose: booking.purpose || 'Consultation',
        bookingId: booking.id
      });

      const mailOptions = {
        from: this.config.from,
        to: user.email,
        subject: 'Reminder: Your Upcoming Appointment - Sturij Furniture Design',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending booking reminder email:', error);
      throw error;
    }
  }

  /**
   * Send a booking cancellation email
   * 
   * @param {Object} booking - Booking details
   * @param {Object} user - User details
   * @returns {Promise} - Email sending result
   */
  async sendBookingCancellation(booking, user) {
    try {
      const template = this.templates.bookingCancellation;
      const html = template({
        name: user.name || user.email,
        date: new Date(booking.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: booking.time,
        bookingId: booking.id
      });

      const mailOptions = {
        from: this.config.from,
        to: user.email,
        subject: 'Your Booking Has Been Cancelled - Sturij Furniture Design',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending booking cancellation email:', error);
      throw error;
    }
  }

  /**
   * Send a booking rescheduling email
   * 
   * @param {Object} booking - New booking details
   * @param {Object} oldBooking - Old booking details
   * @param {Object} user - User details
   * @returns {Promise} - Email sending result
   */
  async sendBookingReschedule(booking, oldBooking, user) {
    try {
      const template = this.templates.bookingReschedule;
      const html = template({
        name: user.name || user.email,
        oldDate: new Date(oldBooking.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        oldTime: oldBooking.time,
        newDate: new Date(booking.date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        newTime: booking.time,
        purpose: booking.purpose || 'Consultation',
        bookingId: booking.id
      });

      const mailOptions = {
        from: this.config.from,
        to: user.email,
        subject: 'Your Booking Has Been Rescheduled - Sturij Furniture Design',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending booking reschedule email:', error);
      throw error;
    }
  }

  /**
   * Send a magic link email
   * 
   * @param {string} email - User email
   * @param {string} magicLink - Magic link URL
   * @returns {Promise} - Email sending result
   */
  async sendMagicLink(email, magicLink) {
    try {
      const template = this.templates.magicLink;
      const html = template({
        email,
        magicLink
      });

      const mailOptions = {
        from: this.config.from,
        to: email,
        subject: 'Your Sign-In Link - Sturij Furniture Design',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending magic link email:', error);
      throw error;
    }
  }

  /**
   * Send a welcome email
   * 
   * @param {Object} user - User details
   * @returns {Promise} - Email sending result
   */
  async sendWelcomeEmail(user) {
    try {
      const template = this.templates.welcome;
      const html = template({
        name: user.name || user.email
      });

      const mailOptions = {
        from: this.config.from,
        to: user.email,
        subject: 'Welcome to Sturij Furniture Design',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw error;
    }
  }

  /**
   * Send an AI chat transcript email
   * 
   * @param {Object} user - User details
   * @param {Array} messages - Chat messages
   * @returns {Promise} - Email sending result
   */
  async sendChatTranscript(user, messages) {
    try {
      // Format messages for email
      const formattedMessages = messages.map(msg => {
        const role = msg.role === 'assistant' ? 'Sturij Assistant' : 'You';
        return `<p><strong>${role}:</strong> ${msg.content}</p>`;
      }).join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Conversation with Sturij Design Assistant</h2>
          <p>Hello ${user.name || user.email},</p>
          <p>Here is a transcript of your recent conversation with our design assistant:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            ${formattedMessages}
          </div>
          <p>If you have any further questions, feel free to chat with our assistant again or contact us directly.</p>
          <p>Best regards,<br>Sturij Furniture Design Team</p>
        </div>
      `;

      const mailOptions = {
        from: this.config.from,
        to: user.email,
        subject: 'Your Conversation with Sturij Design Assistant',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending chat transcript email:', error);
      throw error;
    }
  }

  /**
   * Send an AI-generated design recommendation email
   * 
   * @param {Object} user - User details
   * @param {Object} recommendation - Design recommendation
   * @returns {Promise} - Email sending result
   */
  async sendDesignRecommendation(user, recommendation) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Your Personalized Design Recommendations</h2>
          <p>Hello ${user.name || user.email},</p>
          <p>Based on your recent conversation with our design assistant, we've prepared some personalized recommendations for you:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>${recommendation.title}</h3>
            <p>${recommendation.description}</p>
            ${recommendation.items ? `
              <ul>
                ${recommendation.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
          <p>Would you like to discuss these recommendations further? You can book a consultation with one of our designers.</p>
          <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://sturij.com'}/calendar" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">Book a Consultation</a></p>
          <p>Best regards,<br>Sturij Furniture Design Team</p>
        </div>
      `;

      const mailOptions = {
        from: this.config.from,
        to: user.email,
        subject: 'Your Personalized Design Recommendations',
        html
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending design recommendation email:', error);
      throw error;
    }
  }

  /**
   * Send a custom email
   * 
   * @param {Object} options - Email options
   * @returns {Promise} - Email sending result
   */
  async sendCustomEmail(options) {
    try {
      const mailOptions = {
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending custom email:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const emailService = new EmailService();

module.exports = {
  emailService,
  EmailService
};

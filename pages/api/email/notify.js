// pages/api/email/notify.js
import { supabase } from '../../../lib/supabaseClient';
import { format, addDays } from 'date-fns';

export default async function handler(req, res) {
  // This endpoint can be called by a cron job or manually by an admin
  // Check for API key if called by cron job
  const apiKey = req.headers['x-api-key'];
  let isAdmin = false;

  if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
    // If no valid API key, check for user authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    isAdmin = true;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, bookingId } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Notification type is required' });
    }

    switch (type) {
      case 'booking-confirmation':
        return await sendBookingConfirmation(req, res, bookingId);
      case 'booking-reminder':
        return await sendBookingReminders(req, res);
      case 'booking-follow-up':
        return await sendFollowUps(req, res);
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
    return res.status(500).json({ error: 'Failed to send notifications' });
  }
}

// Send booking confirmation email
async function sendBookingConfirmation(req, res, bookingId) {
  if (!bookingId) {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Generate links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sturij.com';
    const links = {
      reschedule: `${baseUrl}/reschedule/${booking.id}`,
      cancel: `${baseUrl}/cancel/${booking.id}`,
      calendar: `${baseUrl}/calendar/add/${booking.id}`
    };

    // Prepare data for email
    const emailData = {
      templateKey: 'booking-confirmation',
      recipient: {
        name: booking.customer_name,
        email: booking.customer_email,
        phone: booking.customer_phone
      },
      data: {
        booking: {
          id: booking.id,
          date: booking.date,
          time: booking.time,
          service: booking.service_type,
          status: booking.status,
          notes: booking.notes
        },
        links
      }
    };

    // Send email using the email API
    const response = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send confirmation email');
    }

    // Update booking to mark confirmation email as sent
    await supabase
      .from('bookings')
      .update({
        confirmation_sent: true,
        confirmation_sent_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    return res.status(200).json({
      success: true,
      message: 'Booking confirmation email sent',
      booking: booking.id
    });
  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return res.status(500).json({ error: 'Failed to send booking confirmation' });
  }
}

// Send booking reminder emails for tomorrow's bookings
async function sendBookingReminders(req, res) {
  try {
    // Get tomorrow's date in YYYY-MM-DD format
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Get all confirmed bookings for tomorrow
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', tomorrow)
      .eq('status', 'confirmed')
      .eq('reminder_sent', false);

    if (bookingsError) throw bookingsError;

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No bookings to send reminders for',
        count: 0
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sturij.com';
    const results = [];

    // Send reminder email for each booking
    for (const booking of bookings) {
      try {
        // Generate links
        const links = {
          reschedule: `${baseUrl}/reschedule/${booking.id}`,
          cancel: `${baseUrl}/cancel/${booking.id}`
        };

        // Prepare data for email
        const emailData = {
          templateKey: 'booking-reminder',
          recipient: {
            name: booking.customer_name,
            email: booking.customer_email,
            phone: booking.customer_phone
          },
          data: {
            booking: {
              id: booking.id,
              date: booking.date,
              time: booking.time,
              service: booking.service_type,
              status: booking.status,
              notes: booking.notes
            },
            links
          }
        };

        // Send email using the email API
        const response = await fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send reminder email');
        }

        // Update booking to mark reminder email as sent
        await supabase
          .from('bookings')
          .update({
            reminder_sent: true,
            reminder_sent_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        results.push({
          booking: booking.id,
          success: true
        });
      } catch (error) {
        console.error(`Error sending reminder for booking ${booking.id}:`, error);
        results.push({
          booking: booking.id,
          success: false,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Booking reminders processed',
      count: bookings.length,
      results
    });
  } catch (error) {
    console.error('Error sending booking reminders:', error);
    return res.status(500).json({ error: 'Failed to send booking reminders' });
  }
}

// Send follow-up emails for yesterday's bookings
async function sendFollowUps(req, res) {
  try {
    // Get yesterday's date in YYYY-MM-DD format
    const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');

    // Get all completed bookings from yesterday
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', yesterday)
      .eq('status', 'completed')
      .eq('followup_sent', false);

    if (bookingsError) throw bookingsError;

    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No bookings to send follow-ups for',
        count: 0
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sturij.com';
    const results = [];

    // Send follow-up email for each booking
    for (const booking of bookings) {
      try {
        // Generate links
        const links = {
          feedback: `${baseUrl}/feedback/${booking.id}`,
          book: `${baseUrl}/book`
        };

        // Prepare data for email
        const emailData = {
          templateKey: 'follow-up',
          recipient: {
            name: booking.customer_name,
            email: booking.customer_email,
            phone: booking.customer_phone
          },
          data: {
            booking: {
              id: booking.id,
              date: booking.date,
              time: booking.time,
              service: booking.service_type,
              status: booking.status,
              notes: booking.notes
            },
            links
          }
        };

        // Send email using the email API
        const response = await fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send follow-up email');
        }

        // Update booking to mark follow-up email as sent
        await supabase
          .from('bookings')
          .update({
            followup_sent: true,
            followup_sent_at: new Date().toISOString()
          })
          .eq('id', booking.id);

        results.push({
          booking: booking.id,
          success: true
        });
      } catch (error) {
        console.error(`Error sending follow-up for booking ${booking.id}:`, error);
        results.push({
          booking: booking.id,
          success: false,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Follow-up emails processed',
      count: bookings.length,
      results
    });
  } catch (error) {
    console.error('Error sending follow-up emails:', error);
    return res.status(500).json({ error: 'Failed to send follow-up emails' });
  }
}